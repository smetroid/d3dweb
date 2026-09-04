# Social Auth — OAuth Registration & Deployment Runbook

Setting up Google and GitHub sign-in for d3d, and deploying both the API and the
frontend to Fly.

**Topology this builds:**

|          | Host                  | Platform            |
| -------- | --------------------- | ------------------- |
| Frontend | `app.incisiveera.com` | Fly (nginx, static) |
| API      | `api.incisiveera.com` | Fly (container)     |

Both sit under `incisiveera.com`, so `app → api` is cross-origin but **same-site**.
That is what lets the `SameSite=Lax` session cookie travel on both API calls and the
collab WebSocket handshake. There is no proxy: the frontend addresses the API host
directly, so the cookie is scoped to `api.incisiveera.com`, where both go.

> **The custom domains are not cosmetic.** `fly.dev` is on the Public Suffix List,
> exactly as `vercel.app` is, so `d3dweb.fly.dev` and `d3d-api.fly.dev` are separate
> _sites_ — a cookie set by one is third-party to the other, and Safari blocks it
> outright. Deploying both apps to Fly does not by itself put them on the same site.
> Only the `incisiveera.com` hostnames do.

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

### 1.7 Verify share-token scoping

Steps 1.1–1.6 cover sign-in. These cover the share-token work, which is
separate machinery and has its own failure modes — a share JWT is sent in the
`Authorization` header, and the API reads that header **before** the session
cookie. Getting this wrong locks out real users rather than leaking anything,
which makes it easy to ship unnoticed.

You need one diagram you own and one share link. Create the link from the share
dialog on that diagram, role **view**, and keep the URL.

#### The share-after-session flow

The important one. A signed-in user who opens a share link ends up holding a
share token _and_ a session cookie at once, and `JoinView` stores the token
whether or not they are signed in.

1. Signed in, open the share URL **in the same browser profile**
2. Navigate back to `/` and open the diagram list

| Check                              | Expect                       |
| ---------------------------------- | ---------------------------- |
| Diagram list                       | your own diagrams            |
| Storage-mode label                 | **Server**, not LocalStorage |
| Network: `GET /dags`               | **200**                      |
| Open a _different_ diagram you own | **200**                      |
| Create a diagram, then delete it   | both succeed                 |

A 401 on `/dags` means the share token is being attached to routes that reject
it. `LocalStorage` in the mode label means the opposite mistake — a real
session being treated as a share session.

#### Revocation

Nothing in the UI calls `revokeShare`; it is API-only, so this needs curl.
Take `jwt_token` from DevTools → Application → Cookies.

```bash
psql "postgres://postgres:postgres@localhost:5432/samus" \
  -c "SELECT jti, dag_id, role FROM shares ORDER BY created_at DESC LIMIT 1;"

curl -i -X POST "http://localhost:3001/dag/<DAG_ID>/shares/<JTI>/revoke" \
  -H "Cookie: jwt_token=<VALUE>"
```

Reload the recipient's tab → **403**. Revocation writes to `share_denylist`
without deleting the `shares` row, so a revoked link that still works is the
expected symptom when the denylist is not consulted.

#### Route and diagram scoping

The frontend will not send a token to a diagram it was not minted for, so
exercising the **server** guards means bypassing the client. Take the share
token from the recipient's `localStorage.shareToken`.

```bash
# bound to another diagram → 403
curl -i "http://localhost:3001/dag/<OTHER_DAG_ID>" -H "Authorization: Bearer <SHARE_TOKEN>"

# not a share-accessible route → 401
curl -i "http://localhost:3001/dags" -H "Authorization: Bearer <SHARE_TOKEN>"

# share-accessible, no diagram id → 200
curl -i "http://localhost:3001/menus" -H "Authorization: Bearer <SHARE_TOKEN>"
```

After revoking, all three fail — a revoked link reaches nothing, `/menus`
included.

#### View-only enforcement

As the recipient of a **view** link: edits must not persist across a reload,
and the share and edit actions must not be offered. The server rejects them
regardless of what the UI shows, so if an action is visible, that is a UI bug
rather than an authorization hole — worth reporting either way.

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
  FRONTEND_ORIGIN="https://app.incisiveera.com" \
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

- `SIGNING_KEY`, `FRONTEND_ORIGIN`, `DATABASE_URL`, `PORT`, `AUTH_PROVIDER`, `LOG_*`, `TLS_*` are rendered
  into `samus.toml` at container start by `gomplate` (see `entrypoint.sh` / `samus.tmpl`)
- the `D3D_*` variables are applied by the Go config layer _after_ the TOML is parsed,
  and override it

`FRONTEND_ORIGIN` and `D3D_FRONTEND_ORIGIN` both appear above deliberately — set both.
The template renders the first; the Go layer overrides with the second. **The app calls
`log.Fatal` at boot if the frontend origin is empty**, which is intentional: an empty
value silently blocks every CORS response, so this fails loudly instead.

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

## Phase 3 — Deploy the frontend to Fly

The frontend is a static Vite build served by nginx — `fly/web/Dockerfile`,
`fly/web/nginx.conf`, `fly/web/fly.toml`. nginx serves the SPA and nothing else: it
does **not** proxy the API, which is why the two hosts must share a registrable
domain rather than sitting behind one origin.

### 3.1 Create the app

```bash
cd <d3dweb worktree>
fly launch --no-deploy --name d3dweb --config fly/web/fly.toml
```

### 3.2 Set the API base URL — at build time, not runtime

`VITE_API_BASE_URL` is inlined into the bundle by Vite **when the image is built**.
It is not a runtime setting, and this trips people up in two specific ways:

- `fly secrets set VITE_API_BASE_URL=…` does nothing. Secrets are runtime
  environment for the nginx container; the bundle was fixed at build time.
- The `[env]` block in `fly/web/fly.toml` also does nothing, despite listing
  `VITE_API_BASE_URL`. Those entries exist to document the knobs; the values must
  reach `docker build` as `--build-arg`.

The committed `.env` deliberately carries **no** `VITE_API_BASE_URL`, so a
production build cannot silently inline localhost. That makes the build arg
**required, not an override** — omit it and the deployed app has no API base at all.

Manual deploy:

```bash
fly deploy --remote-only \
  --app d3dweb \
  --config fly/web/fly.toml \
  --dockerfile fly/web/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.incisiveera.com \
  --build-arg VITE_COLLAB_ENABLED=false
```

CI does the same on every push to `main` via `.github/workflows/deploy-fly.yml`.
Set these repository secrets (Settings → Secrets and variables → Actions):

| Secret                | Value                         |
| --------------------- | ----------------------------- |
| `FLY_API_TOKEN`       | `fly tokens create deploy`    |
| `VITE_API_BASE_URL`   | `https://api.incisiveera.com` |
| `VITE_COLLAB_ENABLED` | `false`                       |

A missing `VITE_API_BASE_URL` secret expands to an empty build arg, which builds
and deploys perfectly happily and then fails every API call in the browser. If
sign-in breaks right after a deploy, check this first.

### 3.3 Custom domain

```bash
fly ips allocate-v4 --shared --app d3dweb
fly ips allocate-v6 --app d3dweb
fly certs add app.incisiveera.com --app d3dweb
fly certs show app.incisiveera.com --app d3dweb   # prints the records to create
```

For a subdomain, a `CNAME` from `app` to `d3dweb.fly.dev` is the simplest record.
Trust `fly certs show` over this page — it states exactly what the app needs and
reports validation status. Wait for it to read **Ready** before testing.

### 3.4 Confirm the origins agree

`D3D_FRONTEND_ORIGIN` on the API (Phase 2.3) must be exactly
`https://app.incisiveera.com` — scheme included, no trailing slash. A mismatch
surfaces as a CORS error in the console, not as a sign-in failure, so it is easy
to misdiagnose.

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
why both apps had to move under one registrable domain rather than staying on their
platform hostnames. `fly.dev` is on the Public Suffix List just as `vercel.app` is, so
`d3dweb.fly.dev` → `d3d-api.fly.dev` is cross-**site** and the session cookie is
third-party. Testing on the `*.fly.dev` URLs will therefore fail in Safari even when
the deployment is otherwise correct — use the `incisiveera.com` hostnames.

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
| Collab shows no other users                   | More than one API machine. `fly scale count 1 --app d3d-api` (the Hub is in-process)         |
| API calls go to the wrong host, or nowhere    | `VITE_API_BASE_URL` was missing or wrong at **build** time. Rebuild; secrets cannot fix it   |
| Sign-in works on `*.fly.dev`, fails in Safari | `fly.dev` is a public suffix, so those hosts are cross-site. Use the `incisiveera.com` names |

## Rollback

The frontend and API deploy independently.

- **Frontend:** `fly releases --app d3dweb`, then `fly deploy --image <previous>`.
  The API base URL is baked into each image, so rolling back also rolls back which
  API that build talks to — check the target image was built with the base URL you
  still want. Do NOT try to fix a bad base URL by unsetting the build arg; there is
  no committed fallback, and an empty value deploys cleanly and fails in the browser
- **API:** `fly releases --app d3d-api`, then `fly deploy --image <previous>`

Migration `006_social_auth.sql` is additive — new columns with defaults plus one index —
and has a working goose `Down`. Local login is unaffected by rolling back the frontend,
since `/auth/login` still returns the token in the response body as well as setting the
cookie.
