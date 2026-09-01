# Social Auth — OAuth Registration & Deployment Runbook

Setting up Google and GitHub sign-in for d3d, and deploying the API to Fly.

**Topology this builds:**

|          | Host                  | Platform        |
| -------- | --------------------- | --------------- |
| Frontend | `app.incisiveera.com` | Vercel (static) |
| API      | `api.incisiveera.com` | Fly (container) |

Both sit under `incisiveera.com`, so `app → api` is cross-origin but **same-site**.
That is what lets the `SameSite=Lax` session cookie travel on both API calls and the
collab WebSocket handshake. There is no proxy: the frontend addresses the API host
directly, so the cookie is scoped to `api.incisiveera.com`, where both go.

> **Do Phase 1 first.** It proves the whole flow works on your laptop before any
> DNS or deployment is involved. If something is wrong, you want to find out there.

---

## Phase 1 — Verify locally

### 1.1 Register a GitHub OAuth app (development)

GitHub allows **one callback URL per app**, so dev and production need separate apps.

<https://github.com/settings/developers> → **New OAuth App**

| Field                      | Value                                 |
| -------------------------- | ------------------------------------- |
| Application name           | `d3d (local dev)`                     |
| Homepage URL               | `http://localhost:5173`               |
| Authorization callback URL | `http://localhost:5173/auth/callback` |

Generate a client secret and keep both values to hand.

The app requests scopes `read:user` and `user:email`. You do not configure those in
the GitHub UI — the code requests them at authorization time.

### 1.2 Register a Google OAuth client

Google allows **multiple redirect URIs on one client**, so a single client covers dev
and production.

<https://console.cloud.google.com/apis/credentials> → **Create Credentials** →
**OAuth client ID** → **Web application**

Add both redirect URIs now:

```
http://localhost:5173/auth/callback
https://app.incisiveera.com/auth/callback
```

If prompted to configure the OAuth consent screen, do so — for personal use, an
**External** app left in **Testing** mode is fine; add your own Google account under
Test users.

Scopes requested by the code: `openid`, `email`, `profile`.

### 1.3 Fill in local config

`samus_dev.toml` is gitignored. Copy the example if you don't have one:

```bash
cd ~/projects/d3d-api
cp samus_dev.toml.example samus_dev.toml   # skip if it already exists
git check-ignore samus_dev.toml            # must print the filename
```

Set these blocks:

```toml
[samus]
    bind_addr       = ":3001"
    signing_key     = "<any long random string for dev>"
    frontend_origin = "http://localhost:5173"
    cookie_secure   = false          # dev is plain HTTP

[google]
    client_id     = "<google client id>"
    client_secret = "<google client secret>"
    redirect_url  = "http://localhost:5173/auth/callback"

[github]
    client_id     = "<github dev client id>"
    client_secret = "<github dev client secret>"
    redirect_url  = "http://localhost:5173/auth/callback"
```

**`redirect_url` must match what you registered, character for character.** A trailing
slash or `http` vs `https` mismatch produces a provider-side error before your code
ever runs.

`cookie_secure = false` matters: a `Secure` cookie is dropped over plain HTTP, so
leaving it `true` in dev makes login appear to succeed and then silently not persist.

### 1.4 Run both sides

```bash
# terminal 1 — API on :3001, with Postgres
cd ~/projects/d3d-api && make start-api-service

# terminal 2 — frontend on :5173
cd <d3dweb worktree> && npm run dev
```

### 1.5 Verify the flow

At <http://localhost:5173>:

1. Open the login dialog → both "Continue with GitHub" and "Continue with Google" appear
2. Click **Continue with GitHub** → GitHub consent screen
3. Approve → back to `/auth/callback` → redirected to `/`
4. DevTools → Application → Cookies → `http://localhost:3001`:
   `jwt_token` present, **HttpOnly ✓**, `SameSite=Lax`, `Secure` unticked
5. DevTools → Console: `localStorage.getItem('token')` → **`null`**
6. Reload — still signed in, and Network shows `GET /auth/me` returning **200**
7. Diagram list shows **Server** mode, not LocalStorage
8. Sign out → `jwt_token` gone, and `/auth/me` now returns **401**
9. Sign in with the local username/password form → same cookie, same result
10. Repeat 2–8 with **Continue with Google**

### 1.6 Check the database

```bash
psql "postgres://postgres:postgres@localhost:5432/samus" \
  -c "SELECT username, provider, provider_id, email, display_name FROM users;"
```

Expect social rows with namespaced usernames (`github:<login>`, `google:<numeric id>`),
a non-empty `provider_id`, and an empty `password_hash`. Local accounts still read
`provider = 'local'`.

**If you have a local account sharing a name with your GitHub login, confirm there are
two distinct rows with different ids.** A social login must never adopt an existing
local account — that is deliberate, because an unverified provider email would
otherwise be an account-takeover path.

---

## Phase 2 — Deploy the API to Fly

### 2.1 Create the app

```bash
cd ~/projects/d3d-api
fly launch --no-deploy --name d3d-api      # pick a region near you and your DB
```

Fly will detect `Dockerfile.vercel`. Point `fly.toml` at it explicitly and set the
port. The container's `entrypoint.sh` binds to `0.0.0.0:${PORT:-8081}`, so `PORT` and
`internal_port` must agree:

```toml
app = "d3d-api"
primary_region = "<your region>"

[build]
  dockerfile = "Dockerfile.vercel"

[env]
  PORT = "8080"
  AUTH_PROVIDER = "localauth"
  LOG_DAG_REQUESTS = "true"
  LOG_EDGE_REQUESTS = "true"
  LOG_NODE_REQUESTS = "true"
  LOG_MENU_REQUESTS = "true"
  TLS_ENABLED = "false"          # Fly terminates TLS at the edge
  TLS_AUTO_ENABLED = "false"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false     # see the note below
  auto_start_machines = true
  min_machines_running = 1
```

> **`auto_stop_machines = false` and exactly one machine.** The collab hub keeps
> connected clients in process memory (`map[dagId] → clients`). If Fly scales you to
> two machines, users editing the same diagram land on different ones and cannot see
> each other — silently, with no error. Keep `fly scale count 1` until the hub is
> backed by Redis or similar.

### 2.2 Provision Postgres

Either attach Fly Postgres:

```bash
fly postgres create --name d3d-db
fly postgres attach d3d-db --app d3d-api    # sets DATABASE_URL for you
```

…or set `DATABASE_URL` yourself if you host Postgres elsewhere (Neon, Supabase, RDS).
Migrations run automatically at boot via goose.

### 2.3 Set the secrets

```bash
fly secrets set --app d3d-api \
  SIGNING_KEY="<long random string — NOT the dev one>" \
  D3D_FRONTEND_ORIGIN="https://app.incisiveera.com" \
  D3D_COOKIE_SECURE="true" \
  D3D_GOOGLE_CLIENT_ID="..." \
  D3D_GOOGLE_CLIENT_SECRET="..." \
  D3D_GOOGLE_REDIRECT_URL="https://app.incisiveera.com/auth/callback" \
  D3D_GITHUB_CLIENT_ID="..." \
  D3D_GITHUB_CLIENT_SECRET="..." \
  D3D_GITHUB_REDIRECT_URL="https://app.incisiveera.com/auth/callback"
```

Two mechanisms feed config, and both work:

- `SIGNING_KEY`, `DATABASE_URL`, `PORT`, `AUTH_PROVIDER`, `LOG_*`, `TLS_*` are rendered
  into `samus.toml` at container start by `gomplate` (see `entrypoint.sh` / `samus.tmpl`)
- the `D3D_*` variables are applied by the Go config layer _after_ the TOML is parsed,
  and override it

An empty variable is ignored rather than treated as a value — a host exporting a name
blank cannot wipe working config.

Generate a signing key with `openssl rand -base64 48`. **Do not reuse the dev key.**
Every session token, share link, and OAuth state parameter is signed with it.

### 2.4 Deploy and add the domain

```bash
fly deploy --app d3d-api
fly certs add api.incisiveera.com --app d3d-api
```

Fly prints the DNS records to create. Add them at your registrar, then:

```bash
fly certs show api.incisiveera.com --app d3d-api    # wait for "Ready"
curl -s https://api.incisiveera.com/auth/github/url  # expect {"url":"https://github.com/login/oauth/..."}
```

A **404** here means the credentials didn't reach the app — check `fly secrets list`.

---

## Phase 3 — Point the frontend at it

### 3.1 Vercel custom domain

In the d3dweb Vercel project → Settings → Domains → add `app.incisiveera.com`, and
create the DNS record Vercel specifies.

### 3.2 Production environment variable

Vercel project → Settings → Environment Variables:

```
VITE_API_BASE_URL = https://api.incisiveera.com     (Production)
```

The committed `.env` holds the dev value (`http://localhost:3001`); this overrides it
for production builds. Redeploy after setting it — Vite inlines env vars at build time,
so an existing deployment will not pick it up.

---

## Phase 4 — Production GitHub app

GitHub needs a second app, since it permits only one callback URL.

<https://github.com/settings/developers> → **New OAuth App**

| Field                      | Value                                       |
| -------------------------- | ------------------------------------------- |
| Application name           | `d3d`                                       |
| Homepage URL               | `https://app.incisiveera.com`               |
| Authorization callback URL | `https://app.incisiveera.com/auth/callback` |

Use these credentials for `D3D_GITHUB_CLIENT_ID` / `D3D_GITHUB_CLIENT_SECRET` in
Phase 2.3 — not the dev app's.

Google needs nothing further; you added the production redirect URI in Phase 1.2.

---

## Phase 5 — Verify production

Repeat the Phase 1.5 checks against <https://app.incisiveera.com>, with the cookie now
showing **Secure ✓** and scoped to `api.incisiveera.com`.

### Test in Safari specifically

This is not optional, and not a formality. Safari's Intelligent Tracking Prevention is
the reason this whole topology exists: it blocks third-party cookies outright, which is
why the API had to move under the same registrable domain as the frontend rather than
staying on `*.vercel.app`.

**If sign-in survives a page reload in Safari, the design holds.** If it does not, the
cookie is being treated as third-party and something in the domain setup is wrong —
check that both hosts really are under `incisiveera.com` and that `D3D_FRONTEND_ORIGIN`
matches the frontend origin exactly.

### Confirm no local account was absorbed

Same check as Phase 1.6, against the production database.

---

## Troubleshooting

| Symptom                                       | Likely cause                                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/auth/<provider>/url` returns 404            | Credentials not set. `fly secrets list`                                                      |
| Provider rejects with `redirect_uri_mismatch` | Registered URI ≠ `D3D_*_REDIRECT_URL`. They must match exactly                               |
| Sign-in succeeds, reload signs you out        | Cookie not stored. Check `Secure` vs scheme, and that both hosts are under `incisiveera.com` |
| Works in Chrome, fails in Safari              | Cookie is being seen as third-party — a domain problem, not a code one                       |
| Browser console shows a CORS error            | `D3D_FRONTEND_ORIGIN` doesn't exactly match the frontend origin (scheme included)            |
| `401` on every API call after login           | `TokenLookup` isn't seeing the cookie, or `withCredentials` is missing                       |
| Collab shows no other users                   | More than one Fly machine. `fly scale count 1`                                               |

## Rollback

The frontend and API deploy independently.

- **Frontend:** redeploy the previous Vercel deployment, or unset `VITE_API_BASE_URL`
- **API:** `fly releases --app d3d-api`, then `fly deploy --image <previous>`

Migration `006_social_auth.sql` is additive — new columns with defaults plus one index —
and has a working goose `Down`. Local login is unaffected by rolling back the frontend,
since `/auth/login` still returns the token in the response body as well as setting the
cookie.
