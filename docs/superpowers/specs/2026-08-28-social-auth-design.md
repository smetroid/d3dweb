# Social Auth (Google + GitHub) — Design

**Date:** 2026-08-28
**Project board:** https://github.com/users/smetroid/projects/5
**Repos:** `smetroid/d3d-api` (Go/Echo backend), `smetroid/d3dweb` (Vue 3 frontend)
**Trackers:** d3d-api#50 (backend), d3dweb#66 (frontend)

## Summary

Add Google and GitHub OAuth 2.0 sign-in alongside the existing
username/password login, and move the session from a `localStorage` JWT to an
httpOnly cookie so the token is no longer reachable from JavaScript.

The board's 15 issues describe this feature coherently, but were written
against a stale reading of both repos. This design keeps their substance,
corrects four factual errors, and fills the gaps they leave.

## Findings that changed the design

The board's plan does not survive contact with the repos in four places.

### 1. The base branch is stale

Backend issues #41–#49 say "branch from `feat/postgresql-migration`". That
branch is already fully merged into `d3d-api` main (`git rev-list --count
main..origin/feat/postgresql-migration` = 0). Meanwhile
`fix/dag-id-validation` is **38 commits ahead of main** and carries the shares
work, including migrations `003_shareable_elements.sql`,
`004_element_share_title.sql`, and `005_reconcile_element_shares.sql`.

The frontend is ahead of the backend here: d3dweb main already has the catalog
and shares work merged (`4a10a58`), while its d3d-api counterpart is not on
main.

**Decision:** land `fix/dag-id-validation` into d3d-api main first, then branch
`feat/social-auth` from main.

### 2. The migration number collides

Issue #42 specifies `002_social_auth.sql`. `002_embed.sql` already exists on
main, and 003–005 arrive with the shares merge.

**Decision:** the migration is `006_social_auth.sql`.

### 3. Cross-site cookies do not work in this deployment

The frontend is `d3dweb.vercel.app` and the API is `d3d-api.vercel.app`
(`src/helpers/D3Util.js:274`). **`vercel.app` is on the Public Suffix List**,
so these are different *registrable sites*, not sibling subdomains. A
`SameSite=None; Secure` cookie set by the API is therefore a third-party
cookie from the frontend's perspective: Safari's ITP blocks it outright,
Firefox's Total Cookie Protection partitions it, and Chrome is phasing it out.

Issues #46, #47, and #48 all specify `SameSite=None`. As written, the cookie
migration would fail in Safari entirely.

**Decision:** proxy the API under the frontend origin so the cookie is
first-party `SameSite=Lax`. See "Topology" below.

### 4. `api.js` is not the only place the token lives

Issue #65 migrates `src/services/api.js` (26 `localStorage` token
references). Ten other files also read the key, and the token does four
distinct jobs today — only the first of which a cookie can replace:

| Job | Call sites | Survives httpOnly? |
|---|---|---|
| Bearer header on API calls | `api.js` (26) | Yes — cookie replaces it |
| Decode JWT client-side for the username | `D3Util.js:616-618`, `DiagramGraphView.vue:158-167,761`, `DiagramGraph.js:637` | **No** |
| "Am I logged in?" → Server vs LocalStorage mode | `App.vue:440`, `DiagramList.vue:241,263,360`, `D3Util.js:605` | **No** |
| WebSocket auth via query param | `collab.js:17` | **No** |

Separately, `JoinView.vue:42` stores a *share* token under the same `'token'`
key as the session token. The two are already conflated; the migration must
resolve that deliberately rather than inherit it.

**Decision:** add `GET /auth/me` and a small reactive session store; migrate
every identity and session-check call site; rename the share-token key.
WebSocket auth is deferred (see "Deferred").

## Topology

The Vercel rewrite makes the API same-origin in production. Vite mirrors it in
dev, so both environments behave identically and the cookie is never
cross-site.

| | Frontend origin | API reached at | Cookie attributes |
|---|---|---|---|
| Dev | `localhost:5173` | `/api/*` → Vite proxy → `localhost:3001` | `HttpOnly; SameSite=Lax; Path=/` |
| Prod | `d3dweb.vercel.app` | `/api/*` → Vercel rewrite → `d3d-api.vercel.app` | `HttpOnly; Secure; SameSite=Lax; Path=/` |

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://d3d-api.vercel.app/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

`.env` sets `VITE_API_BASE_URL=/api`. `D3Util.serverUrl()` already resolves a
relative base against `window.location.origin`
(`src/helpers/D3Util.js:284-288`), so no change is needed there.

Because dev is plain HTTP, the `Secure` flag cannot be hardcoded. It becomes
config-driven via `samus.cookie_secure` (default `true`).

OAuth redirect URIs register against the **frontend** origin, unchanged from
the board:

- Dev: `http://localhost:5173/auth/callback`
- Prod: `https://d3dweb.vercel.app/auth/callback`

## Backend design (`d3d-api`)

### Migration `006_social_auth.sql`

Four columns on `users` plus a partial unique index, exactly as #42 specifies.
The existing `users` table (`001_init.sql`) is `id uuid PK, username text NOT
NULL UNIQUE, password_hash text NOT NULL, created_at timestamptz NOT NULL`.

```sql
-- +goose Up
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS provider     text NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS provider_id  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email        text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_id_idx
  ON users (provider, provider_id)
  WHERE provider != 'local';
```

Existing rows default to `provider = 'local'`, so no data migration is needed.

### Package `app/auth/socialauth/`

Three files, per #44: `socialauth.go` (`SocialUserProfile`, `GenerateState`,
`ValidateState`), `google.go`, `github.go`. State is a 10-minute signed JWT
reusing the existing `app/auth/token` package, giving stateless CSRF
protection with no server-side store.

This package sits beside the existing `app/auth/oauth/`, which is an unrelated
**password-grant** provider (`app/auth/oauth/oauth.go` posts Basic-auth
credentials to an `/oauth/authorize` endpoint). The names are confusingly
close. `oauth/` is left untouched in this work; renaming it is out of scope.

### Account model

`UpsertSocialUser` is keyed on `(provider, provider_id)` only. A social login
**never** auto-links to an existing local account by email address.
Email-based linking is an account-takeover vector when the provider's email is
unverified, and GitHub's `/user` frequently returns no public email at all.
Signing in with GitHub creates a distinct account.

### Username derivation

`users.username` is `NOT NULL UNIQUE`, so a social user's username must not be
able to collide with a local one. Usernames are namespaced by provider:

```
username     = "github:smetroid"
provider     = "github"
provider_id  = "583231"
display_name = "Enrique Carranco"
email        = "info@incisiveera.com"
```

Collision is structurally impossible, so no retry loop is needed. The raw
provider handle remains available in `provider_id`. The UI renders
`display_name`, falling back to `username`.

### Routes

`SocialAuthController` in `app/controllers/socialauth.go`. All routes are
public except `/auth/me`.

| Route | Auth | Behaviour |
|---|---|---|
| `GET /auth/google/url` | public | Returns `{url}` with a freshly generated `state` |
| `GET /auth/github/url` | public | Same, for GitHub |
| `POST /auth/social/callback` | public | Validates state, exchanges code, upserts user, sets cookie, returns `{user}` |
| `POST /auth/logout` | public | Clears the cookie (`MaxAge=-1`) |
| `GET /auth/me` | **JWT middleware** | Returns `{user}` for the current session |

`/auth/me` is new — it is not on the board, and the frontend cannot function
without it once the JWT becomes unreadable.

### Existing files changed

- **`app/models/user.go`** — add `Provider`, `ProviderID`, `Email`,
  `DisplayName` (#43).
- **`app/db/postgres/postgres.go`** — add `GetUserByProvider` and
  `UpsertSocialUser` (#45), using `INSERT ... ON CONFLICT (provider,
  provider_id) DO UPDATE` so profile data stays fresh.
- **`app/controllers/auth.go`** — `LoginHandler` sets the same cookie after a
  successful local login (#47). Lines 36–42 already hold a commented-out
  cookie block that is the seed for this.
- **`app/app.go`** (#48) — register the controller; extend `TokenLookup` to
  `"header:Authorization,query:api-key,query:token,cookie:jwt_token"`; replace
  `AllowOrigins: []string{"*"}` with the configured frontend origin **and add
  `AllowCredentials: true`**. #48 omits `AllowCredentials`, which browsers
  require for credentialed cross-origin requests — still needed for direct
  API access in dev.
- **`app/config/config.go`** (#49) — `SocialProvider` struct, `Google` and
  `GitHub` fields on `SamusConfig`, plus `FrontendOrigin` and `CookieSecure`
  on the `samus` struct.
- **`samus_dev.toml`** — empty credential stubs. Production credentials are
  injected as environment variables, never committed.

## Frontend design (`d3dweb`)

### New: `src/services/session.js`

A single reactive source of truth for who is signed in, replacing every
client-side JWT decode and every `localStorage.getItem('token')` truthiness
check.

```js
export const session = reactive({ user: null, loaded: false })
// hydrated once on boot: GET /auth/me -> 200 {user} | 401
```

### Changed files

- **`src/services/api.js`** (#65) — `withCredentials: true` on the axios
  instance; remove all 26 `Authorization` headers; add `getOAuthUrl(provider)`,
  `logout()`, and `me()`.
- **`src/router/index.js`** (#62) — add the `/auth/callback` route. It is *not*
  added to `FULLSCREEN_ROUTES`; `AuthCallback.vue` redirects before the editor
  matters.
- **`src/components/AuthCallback.vue`** (#63, new) — reads `code`, `state`,
  `provider` from the query; POSTs to `/auth/social/callback`; hydrates
  `session`; `router.replace('/')` on success, inline error with a retry link
  on failure.
- **`src/components/Login.vue`** (#64) — two social buttons using existing
  `fx-btn` styles; remove the `localStorage.setItem('token', ...)` at line 121.
- **Identity migration** (new) — `D3Util.js:616-618`,
  `DiagramGraphView.vue:158-167,761`, `DiagramGraph.js:637` read
  `session.user.username` instead of decoding a JWT. The local `_decodeJwt`
  helper in `DiagramGraphView.vue` is deleted.
- **Session-check migration** (new) — `App.vue:440`, `DiagramList.vue:241,263,360`,
  `D3Util.js:605` branch on `session.user` instead of token presence.
- **`src/components/JoinView.vue`** (new) — store the share token under
  `shareToken` at line 42, ending the key collision with the session token.
- **Config** — `vercel.json` rewrite, `vite.config.js` dev proxy, `.env`.

## Data flow

```
User clicks "Continue with GitHub"
  -> GET  /api/auth/github/url            -> {url} (state = signed 10-min JWT)
  -> window.location = url
  -> GitHub consent
  -> redirect to /auth/callback?code=..&state=..&provider=github
  -> AuthCallback.vue mounts
  -> POST /api/auth/social/callback {code, state, provider}
       validate state JWT
       exchange code -> GitHub /user + /user/emails
       UpsertSocialUser(profile)          -> username "github:<login>"
       CreateExpiringToken(username, key, 48h, "github")
       Set-Cookie: jwt_token=...; HttpOnly; Secure; SameSite=Lax; Max-Age=172800
  -> 200 {user} -> session.user = user -> router.replace('/')
```

Subsequent requests carry the cookie automatically. On reload, boot calls
`GET /auth/me` to rehydrate `session`.

## Error handling

| Condition | Response | Frontend behaviour |
|---|---|---|
| `state` invalid or expired | `401` | `AuthCallback.vue` shows an inline error with a retry link |
| Provider code exchange fails | `502` | Same |
| GitHub returns no verified email | `200` | Proceed with `email = ''` |
| `GET /auth/me` returns `401` | — | `session.user = null`; app falls back to LocalStorage mode |
| Cookie rejected by browser | — | Not expected now the cookie is first-party; `/auth/me` is the single detection point |

The `/auth/me` 401 path deliberately degrades into the app's *existing*
unauthenticated behaviour — `DiagramList.vue:241` already switches to
`'LocalStorage'` mode without a token — so a failed session looks exactly like
being logged out today rather than surfacing an error.

## Testing

**Go.** `GenerateState`/`ValidateState` round-trip and expiry rejection;
`FetchGoogleProfile` and `FetchGitHubProfile` against `httptest` servers
(including the GitHub no-public-email path); `UpsertSocialUser` insert-then-update
against the test Postgres already used by `app/db/postgres/postgres_test.go`;
one controller test per route, asserting cookie attributes on the callback and
logout responses.

**Vue (Vitest).** The session store; `api.js` credential behaviour and the new
methods; `AuthCallback.vue` success and failure paths; the Login buttons.
Existing suites need updating: `src/helpers/DiagramGraph.test.js` (11 token
references) and `src/services/collab.test.js:111`.

## Deferred

**WebSocket collab auth.** `src/services/collab.js:17` builds
`?token=<jwt>` from `localStorage`, which JavaScript can no longer read. Vercel
rewrites do not proxy WebSockets, so collab cannot ride the same-origin path
either; it needs a short-lived single-use ticket endpoint. `VITE_COLLAB_ENABLED`
is `false` by default, so this is tracked as a follow-up rather than a blocker.
Until it lands, collab stays disabled.

**Renaming `app/auth/oauth/`.** Confusing beside `socialauth/`, but unrelated
to this feature.

## Board reconciliation

The project goes from 15 items to 22.

**Stand as written (3):** d3dweb#62, #63, #64.

**Need amending (10):** every d3d-api issue (#41–#49) names the stale base
branch and needs that line corrected to `main`. Beyond that:

| Issue | Additional amendment |
|---|---|
| d3d-api#42 | Rename migration to `006_social_auth.sql` |
| d3d-api#46, #47 | Cookie is `SameSite=Lax` (+ config-driven `Secure`), not `SameSite=None` |
| d3d-api#48 | Add `AllowCredentials: true` |
| d3d-api#49 | Add `cookie_secure` alongside `frontend_origin` |
| d3dweb#65 | Note that it covers `api.js` only; identity call sites are separate issues |

**New issues (7):** `/auth/me` endpoint (backend); session store, identity
migration, session-check migration, proxy config, JoinView key rename
(frontend); collab WebSocket ticket (follow-up).

**Trackers:** update d3d-api#50 and d3dweb#66 checklists.

## Sequencing

| Phase | Work | Issues |
|---|---|---|
| 0 | Merge `fix/dag-id-validation` → d3d-api main; verify d3dweb main against it | — |
| 1 | Backend foundation: dependency, migration, model, config | #41, #42→006, #43, #49 |
| 2 | `socialauth` package + DB methods | #44, #45 |
| 3 | Controllers + wiring + `/auth/me` | #46, #47, #48, new |
| 4 | Frontend transport: proxy config, `api.js`, session store | #65, new |
| 5 | Frontend identity + session-check migration, JoinView rename | new |
| 6 | OAuth UI: route, callback component, login buttons | #62, #63, #64 |
| 7 | Register Google/GitHub OAuth apps, inject secrets, end-to-end verification | — |

Phases 1–3 and 4–6 are internally sequential. Phase 4 depends only on Phase 3's
route *contract*, not its implementation, so the two tracks can run in parallel
once the routes above are agreed.
