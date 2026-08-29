# Social Auth (Google + GitHub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google and GitHub OAuth sign-in alongside the existing username/password login, and move the session from a `localStorage` JWT to a first-party httpOnly cookie.

**Architecture:** The Go backend gains an `app/auth/socialauth` package (authorization-code flow, stateless CSRF via a short-lived signed JWT as the OAuth `state`) and a `SocialAuthController` exposing provider-URL, callback, logout, and `/auth/me` routes. The Vue frontend stops reading the JWT entirely: a Vercel rewrite puts the API under the frontend origin so the session cookie is first-party, and a small reactive session store hydrated from `/auth/me` replaces every client-side JWT decode.

**Tech Stack:** Go 1.23.3, Echo v3, pgx/v5, goose, `golang.org/x/oauth2` (new) · Vue 3, Vite, Vitest, axios

**Spec:** `docs/superpowers/specs/2026-08-28-social-auth-design.md`

## Global Constraints

- **Two repos.** Tasks 1–8 run in `~/projects/d3d-api`. Tasks 9–15 run in the d3dweb worktree. Task 16 spans both. Each task states its working directory.
- **Branch:** `feat/social-auth` in both repos, cut from each repo's `main` (see Task 1).
- **Go version:** 1.23.3. The **only** new Go dependency permitted is `golang.org/x/oauth2`.
- **JWT library:** `github.com/dgrijalva/jwt-go v3.2.0` — already vendored and used everywhere. Do **not** introduce a second JWT library.
- **Echo import path:** `github.com/labstack/echo` (v3). Not `echo/v4`.
- **Cookie:** name `jwt_token`; attributes `HttpOnly`, `Path=/`, `MaxAge=172800`, `SameSite=Lax`, and `Secure` driven by config. **Never `SameSite=None`** — see spec finding 3.
- **TTLs:** session 48h (172800s); OAuth `state` 10 minutes.
- **Social usernames** are namespaced `provider + ":" + handle` (e.g. `github:smetroid`). Never a bare handle.
- **Account linking:** social logins are keyed on `(provider, provider_id)` only. A social login must **never** auto-link to an existing local account by email.
- **Migration:** `app/db/postgres/migrations/006_social_auth.sql`, goose `-- +goose Up` / `-- +goose Down` format.
- **Go tests:** integration tests skip when `TEST_DATABASE_URL` is unset (`t.Skipf`), matching `app/db/postgres/postgres_test.go`. Run Postgres with `make postgres-start`.
- **Vue tests:** Vitest. `@vue/test-utils` is **not installed** — mount with `createApp`/`h` from `vue` and add `// @vitest-environment jsdom` as line 1, matching `src/components/JoinView.test.js`.
- **Commits:** conventional-commit format, enforced by commitlint (`.commitlintrc.json`).

---

## File Structure

### `d3d-api`

| File | Responsibility |
|---|---|
| `app/db/postgres/migrations/006_social_auth.sql` | Create: four `users` columns + partial unique index |
| `app/models/user.go` | Modify: add `Provider`, `ProviderID`, `Email`, `DisplayName` |
| `app/config/config.go` | Modify: `SocialProvider` struct, `Google`/`GitHub`, `FrontendOrigin`, `CookieSecure` |
| `app/auth/socialauth/socialauth.go` | Create: `SocialUserProfile`, `GenerateState`, `ValidateState` |
| `app/auth/socialauth/google.go` | Create: Google config + profile fetch |
| `app/auth/socialauth/github.go` | Create: GitHub config + profile fetch |
| `app/db/postgres/postgres.go` | Modify: `GetUserByProvider`, `UpsertSocialUser`; widen `GetUser` |
| `app/controllers/session_cookie.go` | Create: shared cookie set/clear helpers (used by both auth controllers) |
| `app/controllers/socialauth.go` | Create: `SocialAuthController` — URL, callback, logout, me |
| `app/controllers/auth.go` | Modify: set the cookie on local login |
| `app/app.go` | Modify: register controller, `TokenLookup`, CORS |

`app/auth/oauth/` is a pre-existing **password-grant** provider, unrelated to this work. Do not modify or rename it.

### `d3dweb`

| File | Responsibility |
|---|---|
| `vercel.json`, `vite.config.js`, `.env` | Modify: route the API under the frontend origin |
| `src/services/session.js` | Create: reactive session store, the single source of identity |
| `src/services/api.js` | Modify: credentials, drop 26 auth headers, add 3 methods |
| `src/helpers/D3Util.js` | Modify: drop token decode + legacy `serverUrl` override |
| `src/App.vue`, `src/components/DiagramList.vue`, `src/components/DiagramGraphView.vue`, `src/helpers/DiagramGraph.js` | Modify: read `session` instead of decoding a JWT |
| `src/components/JoinView.vue` | Modify: share token moves to its own key |
| `src/router/index.js` | Modify: add `/auth/callback` |
| `src/components/AuthCallback.vue` | Create: completes the OAuth redirect loop |
| `src/components/Login.vue` | Modify: two social buttons, drop `localStorage` write |

---

## Task 1: Prerequisite merge and branch setup

**Working directory:** `~/projects/d3d-api`

This is a git operation, not a code change, so it has no test cycle. It is a separate task because everything downstream is blocked on it and a reviewer may want to gate it independently.

**Files:** none created or modified.

**Interfaces:**
- Consumes: nothing.
- Produces: `feat/social-auth` branch in `d3d-api`, based on a `main` that contains migrations `001`–`005`.

- [ ] **Step 1: Confirm the starting state**

```bash
cd ~/projects/d3d-api
git fetch --all
# Expect 0 — feat/postgresql-migration is already merged, the issues are stale
git rev-list --count main..origin/feat/postgresql-migration
# Expect 38 — the unmerged shares work
git rev-list --count main..fix/dag-id-validation
```

- [ ] **Step 2: Merge the shares work into main**

```bash
git checkout main
git merge --no-ff fix/dag-id-validation
```

Resolve conflicts if any. Do not squash — the migration files must land individually.

- [ ] **Step 3: Verify migrations 001–005 are present and the suite passes**

```bash
ls app/db/postgres/migrations/
# Expect: 001_init.sql 002_embed.sql 003_shareable_elements.sql
#         004_element_share_title.sql 005_reconcile_element_shares.sql
make postgres-start
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" go test ./...
```

Expected: PASS. If anything fails, stop — do not start social auth on a red main.

- [ ] **Step 4: Cut the feature branch**

```bash
git checkout -b feat/social-auth
git push -u origin feat/social-auth
```

---

## Task 2: Migration 006 and the widened User model

**Working directory:** `~/projects/d3d-api`

**Files:**
- Create: `app/db/postgres/migrations/006_social_auth.sql`
- Modify: `app/models/user.go`
- Modify: `app/db/postgres/postgres.go:795-805` (`GetUser`)
- Test: `app/db/postgres/postgres_test.go`

**Interfaces:**
- Consumes: Task 1's branch.
- Produces: `models.User` with fields `Provider string`, `ProviderID string`, `Email string`, `DisplayName string`. `GetUser(username string) (models.User, error)` now populates all four.

- [ ] **Step 1: Write the failing test**

Append to `app/db/postgres/postgres_test.go`:

```go
func TestGetUserReturnsLocalProviderDefaults(t *testing.T) {
	p := newTestPostgres(t)

	u := models.User{
		Id:           uuid.New().String(),
		Username:     "alice",
		PasswordHash: "hash",
		CreatedAt:    time.Now().UTC().Truncate(time.Second),
	}
	if err := p.CreateUser(u); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := p.GetUser("alice")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Provider != "local" {
		t.Errorf("Provider = %q, want %q", got.Provider, "local")
	}
	if got.ProviderID != "" || got.Email != "" || got.DisplayName != "" {
		t.Errorf("expected empty social fields, got %+v", got)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
make postgres-start
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" \
  go test ./app/db/postgres/ -run TestGetUserReturnsLocalProviderDefaults -v
```

Expected: FAIL — `got.Provider undefined (type models.User has no field or method Provider)`.

- [ ] **Step 3: Write the migration**

Create `app/db/postgres/migrations/006_social_auth.sql`:

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

-- +goose Down
DROP INDEX IF EXISTS users_provider_id_idx;
ALTER TABLE users
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS provider_id,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS display_name;
```

- [ ] **Step 4: Widen the model**

Replace the struct in `app/models/user.go`:

```go
type User struct {
	Id           string    `db:"id" json:"id"`
	Username     string    `db:"username" json:"username"`
	PasswordHash string    `db:"password_hash" json:"-"`
	CreatedAt    time.Time `db:"created_at" json:"createdAt"`
	Provider     string    `db:"provider" json:"provider"`
	ProviderID   string    `db:"provider_id" json:"providerId"`
	Email        string    `db:"email" json:"email"`
	DisplayName  string    `db:"display_name" json:"displayName"`
}
```

- [ ] **Step 5: Widen `GetUser`**

Replace `app/db/postgres/postgres.go:795-805`:

```go
func (p *Postgres) GetUser(username string) (models.User, error) {
	var u models.User
	err := p.pool.QueryRow(context.Background(), `
		SELECT id, username, password_hash, created_at,
		       provider, provider_id, email, display_name
		FROM users WHERE username = $1 LIMIT 1`, username).Scan(
		&u.Id, &u.Username, &u.PasswordHash, &u.CreatedAt,
		&u.Provider, &u.ProviderID, &u.Email, &u.DisplayName)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, nil
	}
	return u, err
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" \
  go test ./app/db/postgres/ -run TestGetUserReturnsLocalProviderDefaults -v
```

Expected: PASS.

- [ ] **Step 7: Run the full suite**

```bash
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" go test ./...
```

Expected: PASS. `CreateUser` still inserts only the original four columns; the new ones take their defaults.

- [ ] **Step 8: Commit**

```bash
git add app/db/postgres/migrations/006_social_auth.sql app/models/user.go \
        app/db/postgres/postgres.go app/db/postgres/postgres_test.go
git commit -m "feat(auth): add social auth columns to users"
```

---

## Task 3: Social provider configuration

**Working directory:** `~/projects/d3d-api`

**Files:**
- Modify: `app/config/config.go`
- Modify: `samus_dev.toml.example`
- Test: `app/config/config_test.go` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `config.SocialProvider{ClientID, ClientSecret, RedirectURL string}`; `SamusConfig.Google` and `SamusConfig.GitHub` of that type; `SamusConfig.Samus.FrontendOrigin string`; `SamusConfig.Samus.CookieSecure bool`.

- [ ] **Step 1: Write the failing test**

Create `app/config/config_test.go`:

```go
package config

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/BurntSushi/toml"
)

func TestDecodesSocialProviderBlocks(t *testing.T) {
	body := `
[samus]
frontend_origin = "http://localhost:5173"
cookie_secure = false

[google]
client_id = "g-id"
client_secret = "g-secret"
redirect_url = "http://localhost:5173/auth/callback"

[github]
client_id = "gh-id"
client_secret = "gh-secret"
redirect_url = "http://localhost:5173/auth/callback"
`
	path := filepath.Join(t.TempDir(), "c.toml")
	if err := os.WriteFile(path, []byte(body), 0o600); err != nil {
		t.Fatalf("write: %v", err)
	}

	var cfg SamusConfig
	if _, err := toml.DecodeFile(path, &cfg); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if cfg.Samus.FrontendOrigin != "http://localhost:5173" {
		t.Errorf("FrontendOrigin = %q", cfg.Samus.FrontendOrigin)
	}
	if cfg.Samus.CookieSecure {
		t.Error("CookieSecure = true, want false")
	}
	if cfg.Google.ClientID != "g-id" || cfg.Google.ClientSecret != "g-secret" {
		t.Errorf("Google = %+v", cfg.Google)
	}
	if cfg.GitHub.ClientID != "gh-id" || cfg.GitHub.RedirectURL == "" {
		t.Errorf("GitHub = %+v", cfg.GitHub)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./app/config/ -run TestDecodesSocialProviderBlocks -v
```

Expected: FAIL — `cfg.Google undefined`.

- [ ] **Step 3: Add the config types**

In `app/config/config.go`, add the struct and wire it into `SamusConfig`:

```go
// SocialProvider holds one OAuth application's credentials. Empty ClientID
// means the provider is not configured and its routes return 501.
type SocialProvider struct {
	ClientID     string `toml:"client_id"`
	ClientSecret string `toml:"client_secret"`
	RedirectURL  string `toml:"redirect_url"`
}
```

Add these two fields to the `SamusConfig` struct:

```go
	Google SocialProvider `toml:"google"`
	GitHub SocialProvider `toml:"github"`
```

And these two to the nested `samus` struct, beside the existing `SigningKey`:

```go
	// FrontendOrigin is the single allowed CORS origin and the base for OAuth
	// redirect URLs. CookieSecure is false only for plain-HTTP local dev.
	FrontendOrigin string `toml:"frontend_origin"`
	CookieSecure   bool   `toml:"cookie_secure"`
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
go test ./app/config/ -run TestDecodesSocialProviderBlocks -v
```

Expected: PASS.

- [ ] **Step 5: Add the config stubs**

Append to `samus_dev.toml.example` (and to your local `samus_dev.toml`, which is gitignored):

```toml
[samus]
    frontend_origin = "http://localhost:5173"
    cookie_secure   = false

[google]
    client_id     = ""
    client_secret = ""
    redirect_url  = "http://localhost:5173/auth/callback"

[github]
    client_id     = ""
    client_secret = ""
    redirect_url  = "http://localhost:5173/auth/callback"
```

Merge the `[samus]` keys into the existing `[samus]` block rather than adding a second one. Never commit real credentials.

- [ ] **Step 6: Commit**

```bash
git add app/config/config.go app/config/config_test.go samus_dev.toml.example
git commit -m "feat(config): add Google/GitHub provider and cookie settings"
```

---

## Task 4: `socialauth` package — profile type and OAuth state

**Working directory:** `~/projects/d3d-api`

**Files:**
- Create: `app/auth/socialauth/socialauth.go`
- Test: `app/auth/socialauth/socialauth_test.go`

**Interfaces:**
- Consumes: `token.CreateToken(signingKey string, claims jwt.MapClaims) (string, error)` from `app/auth/token`.
- Produces:
  - `type SocialUserProfile struct { Provider, ProviderID, Email, DisplayName, Username string }`
  - `func GenerateState(signingKey string) (string, error)`
  - `func ValidateState(state, signingKey string) error`
  - `const StateTTL = 10 * time.Minute`

- [ ] **Step 1: Add the dependency**

```bash
go get golang.org/x/oauth2@latest
go mod tidy
```

This is the only new dependency the feature needs (d3d-api#41).

- [ ] **Step 2: Write the failing test**

Create `app/auth/socialauth/socialauth_test.go`:

```go
package socialauth

import (
	"testing"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/smetroid/d3d-api/app/auth/token"
)

const testKey = "test-signing-key"

func TestStateRoundTrip(t *testing.T) {
	state, err := GenerateState(testKey)
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if err := ValidateState(state, testKey); err != nil {
		t.Fatalf("validate: %v", err)
	}
}

func TestValidateStateRejectsWrongKey(t *testing.T) {
	state, err := GenerateState(testKey)
	if err != nil {
		t.Fatalf("generate: %v", err)
	}
	if err := ValidateState(state, "other-key"); err == nil {
		t.Fatal("expected error for a state signed with a different key")
	}
}

func TestValidateStateRejectsExpired(t *testing.T) {
	expired, err := token.CreateToken(testKey, jwt.MapClaims{
		"iss": stateIssuer,
		"exp": time.Now().Add(-time.Minute).Unix(),
		"jti": "expired",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := ValidateState(expired, testKey); err == nil {
		t.Fatal("expected error for an expired state")
	}
}

func TestValidateStateRejectsForeignIssuer(t *testing.T) {
	foreign, err := token.CreateToken(testKey, jwt.MapClaims{
		"iss": "some-other-issuer",
		"exp": time.Now().Add(time.Minute).Unix(),
		"jti": "foreign",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := ValidateState(foreign, testKey); err == nil {
		t.Fatal("expected error for a token issued for another purpose")
	}
}

func TestValidateStateRejectsGarbage(t *testing.T) {
	if err := ValidateState("not-a-jwt", testKey); err == nil {
		t.Fatal("expected error for a malformed state")
	}
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
go test ./app/auth/socialauth/ -v
```

Expected: FAIL — the package does not exist yet.

- [ ] **Step 4: Write the implementation**

Create `app/auth/socialauth/socialauth.go`:

```go
// Package socialauth implements the OAuth 2.0 authorization-code flow for
// Google and GitHub sign-in.
//
// It is unrelated to app/auth/oauth, which is a password-grant provider for a
// different backend despite the similar name.
package socialauth

import (
	"errors"
	"fmt"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/google/uuid"
	"github.com/smetroid/d3d-api/app/auth/token"
)

// StateTTL bounds how long an in-flight OAuth handshake may take.
const StateTTL = 10 * time.Minute

// stateIssuer scopes the state JWT to this purpose so a session token can
// never be replayed as a state parameter, or vice versa.
const stateIssuer = "d3d-social-state"

// SocialUserProfile is the provider-agnostic shape both fetchers return.
// Username is the raw provider handle; the namespaced `provider:handle`
// account name is built later, in the database layer.
type SocialUserProfile struct {
	Provider    string
	ProviderID  string
	Email       string
	DisplayName string
	Username    string
}

// GenerateState mints the signed, expiring OAuth state parameter. Signing it
// gives stateless CSRF protection: no server-side store is needed because the
// signature and expiry alone prove we issued it recently.
func GenerateState(signingKey string) (string, error) {
	return token.CreateToken(signingKey, jwt.MapClaims{
		"iss": stateIssuer,
		"exp": time.Now().Add(StateTTL).Unix(),
		"jti": uuid.New().String(),
	})
}

// ValidateState reports whether state is one we issued and has not expired.
func ValidateState(state, signingKey string) error {
	parsed, err := jwt.Parse(state, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return []byte(signingKey), nil
	})
	if err != nil {
		return fmt.Errorf("invalid oauth state: %w", err)
	}
	if !parsed.Valid {
		return errors.New("invalid oauth state")
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return errors.New("invalid oauth state claims")
	}
	if iss, _ := claims["iss"].(string); iss != stateIssuer {
		return errors.New("oauth state was issued for another purpose")
	}
	return nil
}
```

`jwt.Parse` validates `exp` itself, so the expiry test passes without extra code.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
go test ./app/auth/socialauth/ -v
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add go.mod go.sum app/auth/socialauth/
git commit -m "feat(auth): add socialauth package with signed OAuth state"
```

---

## Task 5: Google and GitHub profile fetchers

**Working directory:** `~/projects/d3d-api`

**Files:**
- Create: `app/auth/socialauth/google.go`, `app/auth/socialauth/github.go`
- Test: `app/auth/socialauth/providers_test.go`

**Interfaces:**
- Consumes: `SocialUserProfile` from Task 4.
- Produces:
  - `func NewGoogleConfig(clientID, secret, redirectURL string) *oauth2.Config`
  - `func NewGitHubConfig(clientID, secret, redirectURL string) *oauth2.Config`
  - `func FetchGoogleProfile(ctx context.Context, cfg *oauth2.Config, code string) (SocialUserProfile, error)`
  - `func FetchGitHubProfile(ctx context.Context, cfg *oauth2.Config, code string) (SocialUserProfile, error)`
  - Package vars `googleUserInfoURL`, `githubUserURL`, `githubEmailsURL` — overridable by tests.

Both fetchers read their endpoint URLs from package variables so tests can point them at `httptest` servers. The token-exchange endpoint comes from `cfg.Endpoint`, which tests override the same way.

- [ ] **Step 1: Write the failing test**

Create `app/auth/socialauth/providers_test.go`:

```go
package socialauth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"golang.org/x/oauth2"
)

// oauthServer stands in for a provider: it answers the token exchange at
// /token and whatever profile paths the test registers.
func oauthServer(t *testing.T, routes map[string]string) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/token", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"access_token":"at-1","token_type":"Bearer"}`))
	})
	for path, body := range routes {
		body := body
		mux.HandleFunc(path, func(w http.ResponseWriter, r *http.Request) {
			if got := r.Header.Get("Authorization"); got != "Bearer at-1" {
				t.Errorf("Authorization = %q, want %q", got, "Bearer at-1")
			}
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(body))
		})
	}
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func testConfig(srv *httptest.Server) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     "id",
		ClientSecret: "secret",
		RedirectURL:  "http://localhost:5173/auth/callback",
		Endpoint: oauth2.Endpoint{
			AuthURL:  srv.URL + "/auth",
			TokenURL: srv.URL + "/token",
		},
	}
}

func TestFetchGoogleProfile(t *testing.T) {
	srv := oauthServer(t, map[string]string{
		"/userinfo": `{"id":"g-123","email":"ada@example.com","name":"Ada Lovelace"}`,
	})
	googleUserInfoURL = srv.URL + "/userinfo"

	got, err := FetchGoogleProfile(context.Background(), testConfig(srv), "code-1")
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}
	want := SocialUserProfile{
		Provider:    "google",
		ProviderID:  "g-123",
		Email:       "ada@example.com",
		DisplayName: "Ada Lovelace",
		Username:    "ada",
	}
	if got != want {
		t.Errorf("profile = %+v, want %+v", got, want)
	}
}

func TestFetchGoogleProfileFallsBackToIDWhenEmailMissing(t *testing.T) {
	srv := oauthServer(t, map[string]string{
		"/userinfo": `{"id":"g-456","name":"No Mail"}`,
	})
	googleUserInfoURL = srv.URL + "/userinfo"

	got, err := FetchGoogleProfile(context.Background(), testConfig(srv), "code-1")
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if got.Username != "g-456" {
		t.Errorf("Username = %q, want the provider id as fallback", got.Username)
	}
}

func TestFetchGitHubProfileUsesPrimaryVerifiedEmail(t *testing.T) {
	srv := oauthServer(t, map[string]string{
		"/user":        `{"id":583231,"login":"smetroid","name":"Enrique Carranco"}`,
		"/user/emails": `[{"email":"other@example.com","primary":false,"verified":true},
		                  {"email":"me@example.com","primary":true,"verified":true}]`,
	})
	githubUserURL = srv.URL + "/user"
	githubEmailsURL = srv.URL + "/user/emails"

	got, err := FetchGitHubProfile(context.Background(), testConfig(srv), "code-1")
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}
	want := SocialUserProfile{
		Provider:    "github",
		ProviderID:  "583231",
		Email:       "me@example.com",
		DisplayName: "Enrique Carranco",
		Username:    "smetroid",
	}
	if got != want {
		t.Errorf("profile = %+v, want %+v", got, want)
	}
}

func TestFetchGitHubProfileToleratesNoEmail(t *testing.T) {
	srv := oauthServer(t, map[string]string{
		"/user":        `{"id":99,"login":"ghost","name":""}`,
		"/user/emails": `[]`,
	})
	githubUserURL = srv.URL + "/user"
	githubEmailsURL = srv.URL + "/user/emails"

	got, err := FetchGitHubProfile(context.Background(), testConfig(srv), "code-1")
	if err != nil {
		t.Fatalf("fetch must tolerate a missing email: %v", err)
	}
	if got.Email != "" {
		t.Errorf("Email = %q, want empty", got.Email)
	}
	if got.DisplayName != "ghost" {
		t.Errorf("DisplayName = %q, want the login as fallback", got.DisplayName)
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./app/auth/socialauth/ -run TestFetch -v
```

Expected: FAIL — `undefined: FetchGoogleProfile`.

- [ ] **Step 3: Write `google.go`**

```go
package socialauth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// googleUserInfoURL is a variable rather than a constant so tests can point it
// at a local server.
var googleUserInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"

func NewGoogleConfig(clientID, secret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: secret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

// FetchGoogleProfile exchanges an authorization code and reads the profile.
func FetchGoogleProfile(ctx context.Context, cfg *oauth2.Config, code string) (SocialUserProfile, error) {
	tok, err := cfg.Exchange(ctx, code)
	if err != nil {
		return SocialUserProfile{}, fmt.Errorf("google code exchange: %w", err)
	}

	var body struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := getJSON(ctx, cfg.Client(ctx, tok), googleUserInfoURL, &body); err != nil {
		return SocialUserProfile{}, fmt.Errorf("google userinfo: %w", err)
	}

	// Google has no handle, so derive one from the email local part and fall
	// back to the opaque id when the account exposes no address.
	username := body.ID
	if at := strings.Index(body.Email, "@"); at > 0 {
		username = body.Email[:at]
	}

	return SocialUserProfile{
		Provider:    "google",
		ProviderID:  body.ID,
		Email:       body.Email,
		DisplayName: body.Name,
		Username:    username,
	}, nil
}

// getJSON performs a GET with the OAuth-authenticated client and decodes the
// response into out.
func getJSON(ctx context.Context, client *http.Client, url string, out interface{}) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%s returned %s", url, resp.Status)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}
```

- [ ] **Step 4: Write `github.go`**

```go
package socialauth

import (
	"context"
	"fmt"
	"strconv"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

var (
	githubUserURL   = "https://api.github.com/user"
	githubEmailsURL = "https://api.github.com/user/emails"
)

func NewGitHubConfig(clientID, secret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: secret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"read:user", "user:email"},
		Endpoint:     github.Endpoint,
	}
}

// FetchGitHubProfile exchanges an authorization code and reads the profile.
// A missing email is not an error: GitHub accounts routinely expose none, and
// the column is nullable by design.
func FetchGitHubProfile(ctx context.Context, cfg *oauth2.Config, code string) (SocialUserProfile, error) {
	tok, err := cfg.Exchange(ctx, code)
	if err != nil {
		return SocialUserProfile{}, fmt.Errorf("github code exchange: %w", err)
	}
	client := cfg.Client(ctx, tok)

	var user struct {
		ID    int64  `json:"id"`
		Login string `json:"login"`
		Name  string `json:"name"`
	}
	if err := getJSON(ctx, client, githubUserURL, &user); err != nil {
		return SocialUserProfile{}, fmt.Errorf("github user: %w", err)
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	// A failure here is tolerated: the profile is still usable without it.
	_ = getJSON(ctx, client, githubEmailsURL, &emails)

	var email string
	for _, e := range emails {
		if e.Primary && e.Verified {
			email = e.Email
			break
		}
	}

	displayName := user.Name
	if displayName == "" {
		displayName = user.Login
	}

	return SocialUserProfile{
		Provider:    "github",
		ProviderID:  strconv.FormatInt(user.ID, 10),
		Email:       email,
		DisplayName: displayName,
		Username:    user.Login,
	}, nil
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
go test ./app/auth/socialauth/ -v
```

Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add go.mod go.sum app/auth/socialauth/
git commit -m "feat(auth): add Google and GitHub profile fetchers"
```

---

## Task 6: Social user database methods

**Working directory:** `~/projects/d3d-api`

**Files:**
- Modify: `app/db/postgres/postgres.go` (append after `UpdateUserPassword`, around line 817)
- Test: `app/db/postgres/postgres_test.go`

**Interfaces:**
- Consumes: `socialauth.SocialUserProfile` (Task 4), widened `models.User` (Task 2).
- Produces:
  - `func (p *Postgres) GetUserByProvider(provider, providerID string) (models.User, error)` — zero `User` and nil error when absent, matching `GetUser`.
  - `func (p *Postgres) UpsertSocialUser(profile socialauth.SocialUserProfile) (models.User, error)`
  - `func SocialUsername(provider, handle string) string` — the `provider:handle` rule, exported so tests and callers agree.

- [ ] **Step 1: Write the failing test**

Append to `app/db/postgres/postgres_test.go`:

```go
func TestUpsertSocialUserCreatesThenUpdates(t *testing.T) {
	p := newTestPostgres(t)

	profile := socialauth.SocialUserProfile{
		Provider:    "github",
		ProviderID:  "583231",
		Email:       "me@example.com",
		DisplayName: "Enrique Carranco",
		Username:    "smetroid",
	}

	created, err := p.UpsertSocialUser(profile)
	if err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	if created.Username != "github:smetroid" {
		t.Errorf("Username = %q, want %q", created.Username, "github:smetroid")
	}
	if created.Id == "" {
		t.Error("expected a generated id")
	}

	// A second login must return the same row with refreshed profile data.
	profile.DisplayName = "E. Carranco"
	profile.Email = "new@example.com"
	updated, err := p.UpsertSocialUser(profile)
	if err != nil {
		t.Fatalf("second upsert: %v", err)
	}
	if updated.Id != created.Id {
		t.Errorf("id changed on re-login: %q -> %q", created.Id, updated.Id)
	}
	if updated.DisplayName != "E. Carranco" || updated.Email != "new@example.com" {
		t.Errorf("profile not refreshed: %+v", updated)
	}
}

func TestUpsertSocialUserDoesNotCollideWithLocalAccount(t *testing.T) {
	p := newTestPostgres(t)

	// A local account already owns the bare handle.
	local := models.User{
		Id:           uuid.New().String(),
		Username:     "smetroid",
		PasswordHash: "hash",
		CreatedAt:    time.Now().UTC().Truncate(time.Second),
	}
	if err := p.CreateUser(local); err != nil {
		t.Fatalf("create local: %v", err)
	}

	social, err := p.UpsertSocialUser(socialauth.SocialUserProfile{
		Provider:   "github",
		ProviderID: "583231",
		Username:   "smetroid",
	})
	if err != nil {
		t.Fatalf("upsert must not collide with the local account: %v", err)
	}
	if social.Id == local.Id {
		t.Fatal("social login must never adopt an existing local account")
	}
}

func TestGetUserByProviderMissingReturnsZero(t *testing.T) {
	p := newTestPostgres(t)

	got, err := p.GetUserByProvider("github", "nobody")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Id != "" {
		t.Errorf("expected zero User, got %+v", got)
	}
}
```

Add `"github.com/smetroid/d3d-api/app/auth/socialauth"` to the test file's imports.

- [ ] **Step 2: Run test to verify it fails**

```bash
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" \
  go test ./app/db/postgres/ -run 'TestUpsertSocialUser|TestGetUserByProvider' -v
```

Expected: FAIL — `p.UpsertSocialUser undefined`.

- [ ] **Step 3: Write the implementation**

Append to `app/db/postgres/postgres.go` after `UpdateUserPassword`:

```go
// ─── Social users ───────────────────────────────────────────────────────────

// SocialUsername namespaces a provider handle so a social account can never
// collide with — or be mistaken for — a local one. UNIQUE(username) then holds
// by construction, with no retry loop.
func SocialUsername(provider, handle string) string {
	return provider + ":" + handle
}

const socialUserColumns = `id, username, password_hash, created_at,
	provider, provider_id, email, display_name`

// GetUserByProvider finds a user by their provider identity. A missing user is
// not an error: it returns the zero User and nil, matching GetUser.
func (p *Postgres) GetUserByProvider(provider, providerID string) (models.User, error) {
	var u models.User
	err := p.pool.QueryRow(context.Background(), `
		SELECT `+socialUserColumns+`
		FROM users WHERE provider = $1 AND provider_id = $2 LIMIT 1`,
		provider, providerID).Scan(
		&u.Id, &u.Username, &u.PasswordHash, &u.CreatedAt,
		&u.Provider, &u.ProviderID, &u.Email, &u.DisplayName)
	if errors.Is(err, pgx.ErrNoRows) {
		return models.User{}, nil
	}
	return u, err
}

// UpsertSocialUser creates the account on first OAuth login and returns the
// existing row on later logins, refreshing the mutable profile fields.
//
// The conflict target is (provider, provider_id) only. Matching on email would
// let an unverified provider address take over a local account, so a social
// login never adopts an existing local user.
func (p *Postgres) UpsertSocialUser(profile socialauth.SocialUserProfile) (models.User, error) {
	var u models.User
	err := p.pool.QueryRow(context.Background(), `
		INSERT INTO users (id, username, password_hash, created_at,
		                   provider, provider_id, email, display_name)
		VALUES ($1, $2, '', $3, $4, $5, $6, $7)
		ON CONFLICT (provider, provider_id) WHERE provider != 'local'
		DO UPDATE SET email        = EXCLUDED.email,
		              display_name = EXCLUDED.display_name
		RETURNING `+socialUserColumns,
		uuid.New().String(),
		SocialUsername(profile.Provider, profile.Username),
		time.Now().UTC(),
		profile.Provider, profile.ProviderID, profile.Email, profile.DisplayName,
	).Scan(
		&u.Id, &u.Username, &u.PasswordHash, &u.CreatedAt,
		&u.Provider, &u.ProviderID, &u.Email, &u.DisplayName)
	return u, err
}
```

Add `"github.com/smetroid/d3d-api/app/auth/socialauth"` to the imports of `postgres.go`.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" \
  go test ./app/db/postgres/ -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/db/postgres/postgres.go app/db/postgres/postgres_test.go
git commit -m "feat(db): add social user lookup and upsert"
```

---

## Task 7: Session cookie helper and `SocialAuthController`

**Working directory:** `~/projects/d3d-api`

**Files:**
- Create: `app/controllers/session_cookie.go`
- Create: `app/controllers/socialauth.go`
- Test: `app/controllers/socialauth_test.go`

**Interfaces:**
- Consumes: `socialauth.GenerateState`/`ValidateState`/`NewGoogleConfig`/`NewGitHubConfig`/`FetchGoogleProfile`/`FetchGitHubProfile` (Tasks 4–5); `Postgres.UpsertSocialUser`, `Postgres.GetUser` (Tasks 2, 6); `config.SocialProvider` (Task 3).
- Produces:
  - `const SessionCookieName = "jwt_token"`, `const SessionTTL = 48 * time.Hour`
  - `func SetSessionCookie(ctx echo.Context, jwt string, secure bool)`
  - `func ClearSessionCookie(ctx echo.Context, secure bool)`
  - `type SocialAuthController struct { Echo *echo.Echo; DB *postgres.Postgres; SigningKey string; CookieSecure bool; Google, GitHub config.SocialProvider; AuthMiddleware echo.MiddlewareFunc }`
  - `func (sac *SocialAuthController) Init()`

The cookie helper lives in its own file because Task 8 also uses it from `auth.go`; keeping it apart stops the two controllers from drifting on cookie attributes.

The spec lists `GET /auth/google/url` and `GET /auth/github/url` as two routes; this task registers one parameterised `GET /auth/:provider/url` instead. The URLs a client sees are identical, and an unknown provider gets a clean 404 rather than a route that does not exist. `/auth/me`, `/auth/logout`, and `/auth/login` are all two-segment paths, so none of them collide with the three-segment parameterised route.

- [ ] **Step 1: Write the failing test**

Create `app/controllers/socialauth_test.go`:

```go
package controllers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/labstack/echo"
	"github.com/smetroid/d3d-api/app/auth/socialauth"
	"github.com/smetroid/d3d-api/app/config"
)

func newSocialController() *SocialAuthController {
	return &SocialAuthController{
		SigningKey:   testSigningKey,
		CookieSecure: true,
		Google: config.SocialProvider{
			ClientID:    "g-id",
			RedirectURL: "http://localhost:5173/auth/callback",
		},
		GitHub: config.SocialProvider{
			ClientID:    "gh-id",
			RedirectURL: "http://localhost:5173/auth/callback",
		},
	}
}

func TestProviderURLIncludesValidState(t *testing.T) {
	sac := newSocialController()
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/auth/github/url", nil)
	rec := httptest.NewRecorder()
	ctx := e.NewContext(req, rec)
	ctx.SetParamNames("provider")
	ctx.SetParamValues("github")

	if err := sac.providerURL(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var body struct {
		URL string `json:"url"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !strings.Contains(body.URL, "github.com") {
		t.Errorf("url = %q, want a GitHub authorize URL", body.URL)
	}

	parsed, err := url.Parse(body.URL)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	state := parsed.Query().Get("state")
	if state == "" {
		t.Fatal("authorize URL carries no state parameter")
	}
	if err := socialauth.ValidateState(state, testSigningKey); err != nil {
		t.Errorf("state does not validate: %v", err)
	}
}

func TestProviderURLRejectsUnknownProvider(t *testing.T) {
	sac := newSocialController()
	e := echo.New()
	rec := httptest.NewRecorder()
	ctx := e.NewContext(httptest.NewRequest(http.MethodGet, "/auth/myspace/url", nil), rec)
	ctx.SetParamNames("provider")
	ctx.SetParamValues("myspace")

	if err := sac.providerURL(ctx); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestCallbackRejectsInvalidState(t *testing.T) {
	sac := newSocialController()
	e := echo.New()
	body := strings.NewReader(`{"code":"c","state":"not-a-jwt","provider":"github"}`)
	req := httptest.NewRequest(http.MethodPost, "/auth/social/callback", body)
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()

	if err := sac.callback(e.NewContext(req, rec)); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Error("no cookie may be set for a rejected state")
	}
}

func TestLogoutClearsCookie(t *testing.T) {
	sac := newSocialController()
	e := echo.New()
	rec := httptest.NewRecorder()

	if err := sac.logout(e.NewContext(httptest.NewRequest(http.MethodPost, "/auth/logout", nil), rec)); err != nil {
		t.Fatalf("handler: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}

	cookies := rec.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("got %d cookies, want 1", len(cookies))
	}
	c := cookies[0]
	if c.Name != SessionCookieName {
		t.Errorf("name = %q, want %q", c.Name, SessionCookieName)
	}
	if c.MaxAge >= 0 {
		t.Errorf("MaxAge = %d, want negative so the browser drops it", c.MaxAge)
	}
	if !c.HttpOnly {
		t.Error("cleared cookie must still be HttpOnly")
	}
}

func TestSetSessionCookieAttributes(t *testing.T) {
	e := echo.New()
	rec := httptest.NewRecorder()
	SetSessionCookie(e.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), rec), "jwt-value", true)

	cookies := rec.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("got %d cookies, want 1", len(cookies))
	}
	c := cookies[0]
	if c.Value != "jwt-value" || c.Path != "/" {
		t.Errorf("cookie = %+v", c)
	}
	if !c.HttpOnly || !c.Secure {
		t.Errorf("HttpOnly = %v, Secure = %v; want both true", c.HttpOnly, c.Secure)
	}
	// SameSite=None would be a third-party cookie between the two vercel.app
	// sites and Safari would drop it. Lax is required.
	if c.SameSite != http.SameSiteLaxMode {
		t.Errorf("SameSite = %v, want Lax", c.SameSite)
	}
	if c.MaxAge != int(SessionTTL.Seconds()) {
		t.Errorf("MaxAge = %d, want %d", c.MaxAge, int(SessionTTL.Seconds()))
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./app/controllers/ -run 'TestProviderURL|TestCallback|TestLogout|TestSetSession' -v
```

Expected: FAIL — `undefined: SocialAuthController`.

- [ ] **Step 3: Write the cookie helper**

Create `app/controllers/session_cookie.go`:

```go
package controllers

import (
	"net/http"
	"time"

	"github.com/labstack/echo"
)

// SessionCookieName is the cookie the JWT middleware reads via
// TokenLookup "cookie:jwt_token".
const SessionCookieName = "jwt_token"

// SessionTTL matches the expiry baked into the JWT itself.
const SessionTTL = 48 * time.Hour

// SetSessionCookie writes the session JWT as an httpOnly cookie.
//
// SameSite is Lax, never None: the frontend reaches the API through a
// same-origin path rewrite, so the cookie is first-party. A None cookie would
// be third-party between two vercel.app sites (vercel.app is on the Public
// Suffix List) and Safari would refuse it outright.
//
// secure is configuration-driven because local dev runs over plain HTTP.
func SetSessionCookie(ctx echo.Context, jwt string, secure bool) {
	ctx.SetCookie(&http.Cookie{
		Name:     SessionCookieName,
		Value:    jwt,
		Path:     "/",
		MaxAge:   int(SessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// ClearSessionCookie expires the session cookie. Every attribute except MaxAge
// must match SetSessionCookie or the browser will keep the original.
func ClearSessionCookie(ctx echo.Context, secure bool) {
	ctx.SetCookie(&http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	})
}
```

- [ ] **Step 4: Write the controller**

Create `app/controllers/socialauth.go`:

```go
package controllers

import (
	"net/http"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/labstack/echo"
	"golang.org/x/oauth2"

	"github.com/smetroid/d3d-api/app/auth/socialauth"
	"github.com/smetroid/d3d-api/app/auth/token"
	"github.com/smetroid/d3d-api/app/config"
	"github.com/smetroid/d3d-api/app/db/postgres"
	"github.com/smetroid/d3d-api/app/models"
)

type SocialAuthController struct {
	Echo           *echo.Echo
	DB             *postgres.Postgres
	SigningKey     string
	CookieSecure   bool
	Google         config.SocialProvider
	GitHub         config.SocialProvider
	AuthMiddleware echo.MiddlewareFunc
}

type socialCallbackRequest struct {
	Code     string `json:"code"`
	State    string `json:"state"`
	Provider string `json:"provider"`
}

func (sac *SocialAuthController) Init() {
	// Public: the caller has no session yet.
	sac.Echo.GET("/auth/:provider/url", sac.providerURL)
	sac.Echo.POST("/auth/social/callback", sac.callback)
	sac.Echo.POST("/auth/logout", sac.logout)
	// Authenticated: reports who the cookie belongs to.
	sac.Echo.GET("/auth/me", sac.me, sac.AuthMiddleware)
}

// oauthConfig returns the OAuth client for a provider name, or nil if the
// provider is unknown or unconfigured.
func (sac *SocialAuthController) oauthConfig(provider string) *oauth2.Config {
	switch provider {
	case "google":
		if sac.Google.ClientID == "" {
			return nil
		}
		return socialauth.NewGoogleConfig(sac.Google.ClientID, sac.Google.ClientSecret, sac.Google.RedirectURL)
	case "github":
		if sac.GitHub.ClientID == "" {
			return nil
		}
		return socialauth.NewGitHubConfig(sac.GitHub.ClientID, sac.GitHub.ClientSecret, sac.GitHub.RedirectURL)
	default:
		return nil
	}
}

// providerURL hands the frontend a consent URL carrying a fresh signed state.
func (sac *SocialAuthController) providerURL(ctx echo.Context) error {
	cfg := sac.oauthConfig(ctx.Param("provider"))
	if cfg == nil {
		return ctx.JSON(http.StatusNotFound, models.ErrorResponse("Unknown or unconfigured provider"))
	}

	state, err := socialauth.GenerateState(sac.SigningKey)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, models.ErrorResponse("Could not start login"))
	}

	return ctx.JSON(http.StatusOK, map[string]string{
		"url": cfg.AuthCodeURL(state, oauth2.AccessTypeOnline),
	})
}

// callback completes the handshake: verify state, exchange the code, upsert
// the account, and hand back a session cookie.
func (sac *SocialAuthController) callback(ctx echo.Context) error {
	var req socialCallbackRequest
	if err := ctx.Bind(&req); err != nil || req.Code == "" || req.State == "" {
		return ctx.JSON(http.StatusBadRequest, models.ErrorResponse("Invalid callback request"))
	}

	if err := socialauth.ValidateState(req.State, sac.SigningKey); err != nil {
		return ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("Invalid or expired login attempt"))
	}

	cfg := sac.oauthConfig(req.Provider)
	if cfg == nil {
		return ctx.JSON(http.StatusNotFound, models.ErrorResponse("Unknown or unconfigured provider"))
	}

	var (
		profile socialauth.SocialUserProfile
		err     error
	)
	switch req.Provider {
	case "google":
		profile, err = socialauth.FetchGoogleProfile(ctx.Request().Context(), cfg, req.Code)
	case "github":
		profile, err = socialauth.FetchGitHubProfile(ctx.Request().Context(), cfg, req.Code)
	}
	if err != nil {
		// The provider, not the caller, is at fault.
		return ctx.JSON(http.StatusBadGateway, models.ErrorResponse("Could not reach the identity provider"))
	}

	user, err := sac.DB.UpsertSocialUser(profile)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, models.ErrorResponse("Could not create the account"))
	}

	SetSessionCookie(ctx, token.CreateExpiringToken(user.Username, sac.SigningKey, SessionTTL, profile.Provider), sac.CookieSecure)
	return ctx.JSON(http.StatusOK, map[string]interface{}{"user": user})
}

// logout drops the session cookie. It is public so an expired session can
// still be cleaned up.
func (sac *SocialAuthController) logout(ctx echo.Context) error {
	ClearSessionCookie(ctx, sac.CookieSecure)
	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// me reports the signed-in user. The frontend cannot read the httpOnly cookie,
// so this is its only way to learn who it is.
func (sac *SocialAuthController) me(ctx echo.Context) error {
	tok, ok := ctx.Get("user").(*jwt.Token)
	if !ok {
		return ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("Not signed in"))
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("Not signed in"))
	}
	username, _ := claims["jti"].(string)
	if username == "" {
		return ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("Not signed in"))
	}

	user, err := sac.DB.GetUser(username)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, models.ErrorResponse("Could not load the account"))
	}
	if user.Id == "" {
		return ctx.JSON(http.StatusUnauthorized, models.ErrorResponse("Not signed in"))
	}

	return ctx.JSON(http.StatusOK, map[string]interface{}{"user": user})
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
go test ./app/controllers/ -run 'TestProviderURL|TestCallback|TestLogout|TestSetSession' -v
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add app/controllers/session_cookie.go app/controllers/socialauth.go \
        app/controllers/socialauth_test.go
git commit -m "feat(auth): add social auth controller and session cookie"
```

---

## Task 8: Wire social auth into the app and cookie-enable local login

**Working directory:** `~/projects/d3d-api`

**Files:**
- Modify: `app/controllers/auth.go:20-45` (`LoginHandler`)
- Modify: `app/app.go:44-60` (CORS, `TokenLookup`, controller registration)
- Test: `app/controllers/auth_test.go` (create)

**Interfaces:**
- Consumes: `SetSessionCookie` (Task 7), `SocialAuthController` (Task 7), `config.SamusConfig` additions (Task 3).
- Produces: `AuthController` gains `SigningKey string` and `CookieSecure bool` fields. `/auth/login` sets the session cookie **and** keeps returning the token in the JSON body, so nothing that still reads the body breaks mid-migration.

- [ ] **Step 1: Write the failing test**

Create `app/controllers/auth_test.go`:

```go
package controllers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo"
)

// stubAuthProvider authenticates exactly one credential pair.
type stubAuthProvider struct{ token string }

func (s *stubAuthProvider) Authenticate(username, password string) (bool, string, error) {
	if username == "alice" && password == "correct" {
		return true, s.token, nil
	}
	return false, "", nil
}

func (s *stubAuthProvider) SetSigningKey(key string) {}
func (s *stubAuthProvider) Connect() error               { return nil }
func (s *stubAuthProvider) Close()                       {}

func postLogin(t *testing.T, ac *AuthController, body string) *httptest.ResponseRecorder {
	t.Helper()
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	if err := ac.LoginHandler(e.NewContext(req, rec)); err != nil {
		t.Fatalf("handler: %v", err)
	}
	return rec
}

func TestLoginSetsSessionCookie(t *testing.T) {
	ac := &AuthController{
		AuthProvider: &stubAuthProvider{token: "jwt-abc"},
		CookieSecure: true,
	}
	rec := postLogin(t, ac, `{"username":"alice","password":"correct"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	cookies := rec.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("got %d cookies, want 1", len(cookies))
	}
	c := cookies[0]
	if c.Name != SessionCookieName || c.Value != "jwt-abc" {
		t.Errorf("cookie = %+v", c)
	}
	if !c.HttpOnly || c.SameSite != http.SameSiteLaxMode {
		t.Errorf("HttpOnly = %v, SameSite = %v", c.HttpOnly, c.SameSite)
	}
	// The body still carries the token so any un-migrated caller keeps working.
	if !strings.Contains(rec.Body.String(), "jwt-abc") {
		t.Errorf("body = %s, want it to still contain the token", rec.Body.String())
	}
}

func TestFailedLoginSetsNoCookie(t *testing.T) {
	ac := &AuthController{
		AuthProvider: &stubAuthProvider{token: "jwt-abc"},
		CookieSecure: true,
	}
	rec := postLogin(t, ac, `{"username":"alice","password":"wrong"}`)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", rec.Code)
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Error("a failed login must not set a session cookie")
	}
}
```

`auth.AuthProvider` (in `app/auth/auth.go`) declares exactly four methods —
`Authenticate`, `SetSigningKey`, `Connect`, and `Close` — so the stub above
implements all four. `Connect` and `Close` are unused by `LoginHandler`.

- [ ] **Step 2: Run test to verify it fails**

```bash
go test ./app/controllers/ -run TestLogin -v
```

Expected: FAIL — `unknown field CookieSecure in struct literal`.

- [ ] **Step 3: Set the cookie on local login**

In `app/controllers/auth.go`, add the two fields to the struct:

```go
type AuthController struct {
	Echo         *echo.Echo
	AuthProvider auth.AuthProvider
	SigningKey   string
	CookieSecure bool
}
```

Then in `LoginHandler`, replace the commented-out cookie block (lines 36–42) and the return with:

```go
	authToken := models.AuthToken{Token: token}

	// Local logins get the same httpOnly cookie as social logins, so the
	// frontend has one session mechanism rather than two.
	SetSessionCookie(ctx, token, ac.CookieSecure)

	// The token also stays in the body during the migration; the frontend
	// stops reading it in the d3dweb work but other callers may not have.
	return ctx.JSON(http.StatusOK, authToken)
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
go test ./app/controllers/ -run TestLogin -v
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Wire it all into `app.go`**

In `app/app.go`, replace the CORS block (lines ~45-50):

```go
	// A single explicit origin, not "*": credentialed requests are rejected by
	// browsers when the allowed origin is a wildcard.
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{config.Samus.FrontendOrigin},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))
```

Extend `TokenLookup` so the middleware accepts the cookie:

```go
	authMiddleware := middleware.JWTWithConfig(middleware.JWTConfig{
		SigningKey:  []byte(config.Samus.SigningKey),
		TokenLookup: "header:Authorization,query:api-key,query:token,cookie:jwt_token",
	})
```

Pass the new fields to `AuthController`:

```go
	authController := controllers.AuthController{
		Echo:         e,
		AuthProvider: authProvider,
		SigningKey:   config.Samus.SigningKey,
		CookieSecure: config.Samus.CookieSecure,
	}
	authController.Init()
```

And register the new controller beside the others, before the `.Init()` calls:

```go
	socialAuthController := controllers.SocialAuthController{
		Echo:           e,
		DB:             db,
		SigningKey:     config.Samus.SigningKey,
		CookieSecure:   config.Samus.CookieSecure,
		Google:         config.Google,
		GitHub:         config.GitHub,
		AuthMiddleware: authMiddleware,
	}
	socialAuthController.Init()
```

- [ ] **Step 6: Verify the whole backend builds and passes**

```bash
go build ./...
make postgres-start
TEST_DATABASE_URL="postgres://postgres:postgres@localhost:5432/samus?sslmode=disable" go test ./...
golangci-lint run
```

Expected: build OK, tests PASS, lint clean.

- [ ] **Step 7: Smoke-test the routes by hand**

```bash
make start-api-service
# In another shell — expect a JSON {"url": "https://github.com/login/oauth/..."}
curl -s localhost:3001/auth/github/url
# Expect 401: no cookie yet
curl -s -o /dev/null -w '%{http_code}\n' localhost:3001/auth/me
```

With empty credentials in `samus_dev.toml`, `/auth/github/url` returns 404 until Task 16 fills them in. That is expected and correct.

- [ ] **Step 8: Commit**

```bash
git add app/app.go app/controllers/auth.go app/controllers/auth_test.go
git commit -m "feat(auth): wire social auth routes and cookie session"
git push
```

---

## Task 9: Route the API under the frontend origin

**Working directory:** d3dweb worktree

Cut the frontend branch first:

```bash
git checkout main && git pull && git checkout -b feat/social-auth
```

**Files:**
- Modify: `vercel.json`, `vite.config.js`, `.env`
- Modify: `src/helpers/D3Util.js:281-290` (`serverUrl`)
- Test: `src/helpers/D3Util.serverUrl.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `D3Util.serverUrl()` resolves to a same-origin `/api` base and ignores a stored setting that points at the legacy API origin.

A stored `settings.serverUrl` cookie takes priority over the env base today (`D3Util.js:282-283`). Existing users have `https://d3d-api.vercel.app` saved there, which would send them cross-site and silently break cookie auth. That override must be ignored.

- [ ] **Step 1: Write the failing test**

Create `src/helpers/D3Util.serverUrl.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }))
vi.mock('vue-cookies', () => ({ default: { get: mockGet } }))

import D3Util from '@/helpers/D3Util'

describe('D3Util.serverUrl', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockGet.mockReturnValue(null)
  })

  it('resolves a relative base against the page origin', () => {
    expect(D3Util.serverUrl()).toBe(window.location.origin + '/api')
  })

  it('ignores a stored setting pointing at the legacy API origin', () => {
    // Cookie auth only works same-origin, so a saved cross-site base must lose.
    mockGet.mockReturnValue({ serverUrl: 'https://d3d-api.vercel.app' })
    expect(D3Util.serverUrl()).toBe(window.location.origin + '/api')
  })

  it('still honours a self-hosted override', () => {
    mockGet.mockReturnValue({ serverUrl: 'https://api.internal.example/' })
    expect(D3Util.serverUrl()).toBe('https://api.internal.example')
  })
})
```

This test relies on `VITE_API_BASE_URL=/api`, set in Step 3.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/helpers/D3Util.serverUrl.test.js
```

Expected: FAIL — `serverUrl()` returns `https://d3d-api.vercel.app`.

- [ ] **Step 3: Point the frontend at the same-origin path**

`.env` — replace the empty value:

```
# API base URL. Relative by default so the session cookie stays first-party:
# /api is rewritten to the API host by vercel.json in production and by the
# Vite dev proxy locally.
VITE_API_BASE_URL=/api
```

`vercel.json` — the API rewrite must come **before** the SPA catch-all:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://d3d-api.vercel.app/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

`vite.config.js` — add a `server` block beside `resolve`:

```js
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
```

- [ ] **Step 4: Ignore the legacy stored origin**

Replace `serverUrl()` in `src/helpers/D3Util.js:281-290`:

```js
  serverUrl() {
    const s = VueCookies.get('settings')
    // A saved absolute URL pointing at the old API host would make every
    // request cross-site, and the session cookie is first-party only. Drop it
    // and fall through to the same-origin base.
    if (s && s.serverUrl && !/^https?:\/\/d3d-api\.vercel\.app/.test(s.serverUrl)) {
      return s.serverUrl.replace(/\/+$/, '')
    }
    const envBase = import.meta.env.VITE_API_BASE_URL
    if (envBase) {
      if (/^https?:\/\//.test(envBase)) return envBase.replace(/\/+$/, '')
      return (window.location.origin + envBase).replace(/\/+$/, '')
    }
    return '/api'
  },
```

Also update the default at `D3Util.js:274` from `'https://d3d-api.vercel.app'` to `'/api'`.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/helpers/D3Util.serverUrl.test.js
npm test
```

Expected: the new file PASSES. Other suites that assert on `serverUrl` may need their expectations updated to `/api` — update them, do not weaken them.

- [ ] **Step 6: Commit**

```bash
git add vercel.json vite.config.js .env src/helpers/D3Util.js \
        src/helpers/D3Util.serverUrl.test.js
git commit -m "feat(api): serve the API under the frontend origin"
```

---

## Task 10: Session store

**Working directory:** d3dweb worktree

**Files:**
- Create: `src/services/session.js`
- Test: `src/services/session.test.js`

**Interfaces:**
- Consumes: `api.me()` (added in Task 11 — this task mocks it, so the two can be built in either order).
- Produces:
  - `session` — a `reactive({ user, loaded })`
  - `async function loadSession(): Promise<object|null>`
  - `function setSession(user): void`
  - `function clearSession(): void`
  - `function isAuthenticated(): boolean`

`session.user` is `null` when signed out and the user object from `/auth/me` otherwise. `session.loaded` turns true once the first `loadSession()` settles, however it settles.

- [ ] **Step 1: Write the failing test**

Create `src/services/session.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockMe } = vi.hoisted(() => ({ mockMe: vi.fn() }))
vi.mock('@/services/api', () => ({ default: { me: mockMe } }))

import { session, loadSession, setSession, clearSession, isAuthenticated } from '@/services/session'

const alice = { username: 'alice', displayName: 'Alice', provider: 'local' }

describe('session', () => {
  beforeEach(() => {
    mockMe.mockReset()
    clearSession()
    session.loaded = false
  })

  it('starts signed out', () => {
    expect(session.user).toBeNull()
    expect(isAuthenticated()).toBe(false)
  })

  it('hydrates from /auth/me', async () => {
    mockMe.mockResolvedValue({ data: { user: alice } })
    const user = await loadSession()
    expect(user).toEqual(alice)
    expect(session.user).toEqual(alice)
    expect(session.loaded).toBe(true)
    expect(isAuthenticated()).toBe(true)
  })

  it('treats a 401 as signed out rather than an error', async () => {
    mockMe.mockRejectedValue({ response: { status: 401 } })
    await expect(loadSession()).resolves.toBeNull()
    expect(session.user).toBeNull()
    expect(session.loaded).toBe(true)
  })

  it('marks itself loaded even when the network fails', async () => {
    mockMe.mockRejectedValue(new Error('offline'))
    await loadSession()
    expect(session.loaded).toBe(true)
    expect(isAuthenticated()).toBe(false)
  })

  it('setSession populates without a request', () => {
    setSession(alice)
    expect(mockMe).not.toHaveBeenCalled()
    expect(isAuthenticated()).toBe(true)
  })

  it('clearSession signs out', () => {
    setSession(alice)
    clearSession()
    expect(session.user).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/session.test.js
```

Expected: FAIL — cannot resolve `@/services/session`.

- [ ] **Step 3: Write the implementation**

Create `src/services/session.js`:

```js
import { reactive } from 'vue'
import api from '@/services/api'

// The session JWT lives in an httpOnly cookie, so nothing here can read it.
// This store is the app's only source of identity: every "who am I" and "am I
// signed in" question reads it instead of decoding a token.
export const session = reactive({
  user: null, // {username, displayName, email, provider} or null
  loaded: false // true once the first loadSession() has settled
})

// loadSession asks the server who the cookie belongs to. A 401 is the normal
// signed-out answer, not a failure, so callers get null rather than a throw
// and the app falls back to LocalStorage mode exactly as it does when logged
// out today.
export async function loadSession() {
  try {
    const response = await api.me()
    session.user = response?.data?.user ?? null
  } catch {
    session.user = null
  } finally {
    session.loaded = true
  }
  return session.user
}

// setSession records a user we already have — after login, the server hands
// the account back in the response, so there is no need to re-fetch it.
export function setSession(user) {
  session.user = user ?? null
  session.loaded = true
}

export function clearSession() {
  session.user = null
}

export function isAuthenticated() {
  return session.user !== null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/services/session.test.js
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/session.js src/services/session.test.js
git commit -m "feat(auth): add reactive session store"
```

---

## Task 11: Migrate `api.js` to cookie auth

**Working directory:** d3dweb worktree

**Files:**
- Modify: `src/services/api.js` (all 26 `Authorization` headers)
- Test: `src/services/api.test.js` (create)

**Interfaces:**
- Consumes: `D3Util.serverUrl()` (Task 9).
- Produces: `api.me()` → axios promise of `{data: {user}}`; `api.getOAuthUrl(provider)` → `Promise<string>`; `api.logout()` → axios promise. Every existing method keeps its current name and signature.

- [ ] **Step 1: Write the failing test**

Create `src/services/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreate, mockGet, mockPost } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockGet: vi.fn(),
  mockPost: vi.fn()
}))

vi.mock('axios', () => ({ default: { create: mockCreate } }))
vi.mock('@/helpers/D3Util', () => ({ default: { serverUrl: () => '/api' } }))

import api from '@/services/api'

describe('api', () => {
  beforeEach(() => {
    mockGet.mockReset()
    mockPost.mockReset()
    mockCreate.mockReset()
    mockCreate.mockReturnValue({ get: mockGet, post: mockPost })
    mockGet.mockResolvedValue({ data: {} })
    mockPost.mockResolvedValue({ data: {} })
  })

  it('creates the client with credentials so the cookie is sent', async () => {
    await api.getDiagrams()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '/api', withCredentials: true })
    )
  })

  it('sends no Authorization header', async () => {
    await api.getDiagrams()
    const [, options] = mockGet.mock.calls[0]
    expect(options?.headers?.Authorization).toBeUndefined()
  })

  it('me() calls /auth/me', async () => {
    await api.me()
    expect(mockGet).toHaveBeenCalledWith('/auth/me')
  })

  it('getOAuthUrl returns the url string', async () => {
    mockGet.mockResolvedValue({ data: { url: 'https://github.com/login/oauth' } })
    await expect(api.getOAuthUrl('github')).resolves.toBe('https://github.com/login/oauth')
    expect(mockGet).toHaveBeenCalledWith('/auth/github/url')
  })

  it('logout posts to /auth/logout', async () => {
    await api.logout()
    expect(mockPost).toHaveBeenCalledWith('/auth/logout')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/api.test.js
```

Expected: FAIL — `withCredentials` missing and `api.me is not a function`.

- [ ] **Step 3: Add credentials to the client**

Replace the factory at the top of `src/services/api.js`:

```js
// withCredentials sends the httpOnly session cookie on every request. It works
// because serverUrl() is same-origin — see D3Util.serverUrl and vercel.json.
function api() {
  return axios.create({ baseURL: D3Util.serverUrl(), withCredentials: true })
}
```

- [ ] **Step 4: Strip every Authorization header**

Remove all 26 occurrences of the pattern below from `src/services/api.js`:

```js
{ headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }
```

Where it was a `get`'s only options argument, drop the argument entirely
(`.get('/menus', {headers:...})` becomes `.get('/menus')`). Where a `post`
carried it as a third argument after a payload, drop the third argument
(`.post('/dag', payload, {headers:...})` becomes `.post('/dag', payload)`).
Where other options sat alongside `headers`, keep those options and delete only
the `headers` key.

Verify none survive:

```bash
grep -c "localStorage" src/services/api.js   # expect 0
```

- [ ] **Step 5: Add the three new methods**

Add to the exported object in `src/services/api.js`:

```js
  // Reports the account behind the session cookie. 401 here means signed out.
  async me() {
    return api().get('/auth/me')
  },
  // Returns the provider consent URL to redirect the browser to.
  async getOAuthUrl(provider) {
    return api()
      .get('/auth/' + provider + '/url')
      .then((response) => response.data.url)
  },
  async logout() {
    return api().post('/auth/logout')
  },
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx vitest run src/services/api.test.js
npm test
```

Expected: the new file PASSES, 6 tests. Fix any other suite that asserted on the removed headers.

- [ ] **Step 7: Commit**

```bash
git add src/services/api.js src/services/api.test.js
git commit -m "feat(api): migrate to cookie-based auth"
```

---

## Task 12: Replace client-side JWT decoding with the session store

**Working directory:** d3dweb worktree

**Files:**
- Modify: `src/helpers/D3Util.js:603-630`
- Modify: `src/App.vue:440`
- Modify: `src/components/DiagramList.vue:241,263,360`
- Modify: `src/components/DiagramGraphView.vue:158-167,761`
- Modify: `src/helpers/DiagramGraph.js:637`
- Test: `src/helpers/DiagramGraph.test.js` (update — 11 token references)

**Interfaces:**
- Consumes: `session`, `loadSession`, `isAuthenticated` (Task 10).
- Produces: no `localStorage.getItem('token')` remains outside `src/services/collab.js`.

This is the task the board omitted entirely. `api.js` alone was never enough: the token also answered "who am I" and "am I signed in", and an httpOnly cookie can answer neither from JavaScript.

- [ ] **Step 1: Write the failing test**

Create `src/services/session.callsites.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// collab.js is the one sanctioned holdout: WebSocket auth needs a ticket
// endpoint that is deliberately out of scope. See the spec's Deferred section.
const FILES = [
  'src/services/api.js',
  'src/helpers/D3Util.js',
  'src/helpers/DiagramGraph.js',
  'src/App.vue',
  'src/components/DiagramList.vue',
  'src/components/DiagramGraphView.vue'
]

describe('session migration', () => {
  it.each(FILES)('%s does not read the session token from localStorage', (file) => {
    const source = readFileSync(file, 'utf-8')
    expect(source).not.toMatch(/localStorage\.(get|set|remove)Item\(\s*['"]token['"]/)
  })

  it('no file decodes a JWT by hand', () => {
    for (const file of FILES) {
      expect(readFileSync(file, 'utf-8')).not.toMatch(/atob\(/)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/session.callsites.test.js
```

Expected: FAIL for `D3Util.js`, `DiagramGraph.js`, `App.vue`, `DiagramList.vue`, and `DiagramGraphView.vue`.

`Login.vue` is deliberately absent from `FILES`: its `localStorage` write is Task 15's to remove, and Task 15 adds it to this list once it has.

- [ ] **Step 3: Migrate `D3Util.js`**

At `D3Util.js:603-630`, replace the token-presence check, the claims decoder,
and the token-validation request. Import the store at the top of the file:

```js
import { session, isAuthenticated } from '@/services/session'
```

Replace the `if (localStorage.getItem('token'))` guard at line 605 with
`if (isAuthenticated())`, and remove the `localStorage.removeItem('token')` at
line 612 — signing out is `api.logout()` plus `clearSession()` now.

Replace the claims decoder at lines 616-618:

```js
    // The session cookie is httpOnly, so identity comes from the store rather
    // than from decoding a token.
    return session.user
```

Replace the token-validation request at lines 625-629 with a call to
`loadSession()`, which performs the same round trip against `/auth/me`.

- [ ] **Step 4: Migrate `App.vue`**

Replace line 440's `if (localStorage.getItem('token'))` with `if (isAuthenticated())`, importing:

```js
import { loadSession, isAuthenticated } from '@/services/session'
```

Hydrate the store before that check runs. In the component's `async created()` (or `mounted()`, matching the file's existing lifecycle style), make `await loadSession()` the first statement.

- [ ] **Step 5: Migrate `DiagramList.vue`**

Import `{ isAuthenticated }` from `@/services/session` and replace all three
checks — line 241's `localStorage.getItem('token') ? 'Server' : 'LocalStorage'`
becomes `isAuthenticated() ? 'Server' : 'LocalStorage'`; lines 263 and 360's
`if (localStorage.getItem('token'))` become `if (isAuthenticated())`.

- [ ] **Step 6: Migrate `DiagramGraphView.vue`**

Delete the `_decodeJwt` helper at lines 158-160 entirely. Import
`{ session }` from `@/services/session`, then replace both call sites:

```js
// was: const claims = _decodeJwt(localStorage.getItem('token') || '')
//      ...claims.name / claims.jti
const username = session.user?.username ?? ''
```

Apply the same replacement at line 761. Where the old code read `claims.name`
or `claims.jti`, read `session.user?.username`; where it read a display value,
prefer `session.user?.displayName || session.user?.username`.

- [ ] **Step 7: Migrate `DiagramGraph.js`**

Replace the inline decode at line 637:

```js
// was: const claims = JSON.parse(atob((localStorage.getItem('token') || '').split('.')[1]))
import { session } from '@/services/session'
// ...
const username = session.user?.username ?? ''
```

- [ ] **Step 8: Update the existing suite**

`src/helpers/DiagramGraph.test.js` seeds `localStorage` with a fake JWT in 11
places. Replace that setup with the store:

```js
import { setSession, clearSession } from '@/services/session'

beforeEach(() => {
  setSession({ username: 'test', displayName: 'Test', provider: 'local' })
})

afterEach(() => {
  clearSession()
})
```

Delete the fake-JWT construction and every `localStorage.setItem('token', ...)`
line. Assertions on the resulting username stay as they are.

- [ ] **Step 9: Run the tests to verify they pass**

```bash
npx vitest run src/services/session.callsites.test.js
npm test
```

Expected: both PASS. `grep -rn "localStorage.*'token'" src/ --include=*.vue --include=*.js` should now match only `src/services/collab.js` and `src/services/collab.test.js`.

- [ ] **Step 10: Confirm collab is still gated off**

```bash
grep -n "VITE_COLLAB_ENABLED" src/components/DiagramGraphView.vue .env
```

Expected: the guards at lines 264 and 279 are intact and `.env` still has
`VITE_COLLAB_ENABLED=false`. `collab.js` will now build a WebSocket URL with an
empty token, which is harmless while the feature is off and is exactly what the
deferred ticket endpoint will fix.

- [ ] **Step 11: Commit**

```bash
git add src/helpers/D3Util.js src/App.vue src/components/DiagramList.vue \
        src/components/DiagramGraphView.vue src/helpers/DiagramGraph.js \
        src/helpers/DiagramGraph.test.js src/services/session.callsites.test.js
git commit -m "refactor(auth): read identity from the session store"
```

---

## Task 13: Separate the share token from the session token

**Working directory:** d3dweb worktree

**Files:**
- Modify: `src/components/JoinView.vue:42`
- Test: `src/components/JoinView.test.js` (update)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the share token is stored under `shareToken`; nothing writes the `token` key any more.

`JoinView.vue:42` writes a *share* JWT into the same `'token'` key the session used. The two have always been conflated; now that the session has moved to a cookie, the share token must stop squatting on that name.

- [ ] **Step 1: Write the failing test**

Add to `src/components/JoinView.test.js`:

```js
it('stores the share token under its own key, not the session key', async () => {
  localStorage.clear()
  mockExchangeShare.mockResolvedValue({ dagId: 'dag-1', title: 'Shared' })

  await mountJoin('share-jwt-123')
  await flush()

  expect(localStorage.getItem('shareToken')).toBe('share-jwt-123')
  expect(localStorage.getItem('token')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/JoinView.test.js
```

Expected: FAIL — `shareToken` is null and `token` holds the share JWT.

- [ ] **Step 3: Rename the key**

At `src/components/JoinView.vue:42`:

```js
// The share token is not a session token. The session lives in an httpOnly
// cookie; keeping this under 'token' made the two indistinguishable.
localStorage.setItem('shareToken', token)
```

- [ ] **Step 4: Update any reader**

```bash
grep -rn "shareToken\|'token'" src/ --include=*.vue --include=*.js | grep -v node_modules
```

Point any code that read the share token out of `'token'` at `'shareToken'`. If nothing else reads it, note that in the commit body.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/components/JoinView.test.js
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/JoinView.vue src/components/JoinView.test.js
git commit -m "fix(shares): stop storing the share token under the session key"
```

---

## Task 14: OAuth callback route and component

**Working directory:** d3dweb worktree

**Files:**
- Modify: `src/router/index.js`
- Create: `src/components/AuthCallback.vue`
- Test: `src/components/AuthCallback.test.js`

**Interfaces:**
- Consumes: `api.getOAuthUrl` is not needed here; this component calls `api` directly for the callback POST, plus `setSession` (Task 10).
- Produces: the named route `auth-callback` at path `/auth/callback`.

The route is deliberately **not** added to `FULLSCREEN_ROUTES` (`src/router/index.js:6`) — the component redirects immediately, so it never coexists with the editor.

- [ ] **Step 1: Write the failing test**

Create `src/components/AuthCallback.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'

const { mockSocialCallback, mockReplace } = vi.hoisted(() => ({
  mockSocialCallback: vi.fn(),
  mockReplace: vi.fn()
}))

vi.mock('@/services/api', () => ({ default: { socialCallback: mockSocialCallback } }))

import AuthCallback from '@/components/AuthCallback.vue'
import { session, clearSession } from '@/services/session'

const flush = async () => {
  await nextTick()
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountCallback(query) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp({
    render: () => h(AuthCallback)
  })
  app.config.globalProperties.$route = { query }
  app.config.globalProperties.$router = { replace: mockReplace }
  app.mount(el)
  return { app, el }
}

describe('AuthCallback', () => {
  beforeEach(() => {
    mockSocialCallback.mockReset()
    mockReplace.mockReset()
    clearSession()
  })

  it('exchanges the code and redirects home on success', async () => {
    const user = { username: 'github:smetroid', displayName: 'Enrique' }
    mockSocialCallback.mockResolvedValue({ data: { user } })

    mountCallback({ code: 'c1', state: 's1', provider: 'github' })
    await flush()

    expect(mockSocialCallback).toHaveBeenCalledWith({
      code: 'c1',
      state: 's1',
      provider: 'github'
    })
    expect(session.user).toEqual(user)
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('shows an error and does not redirect when the exchange fails', async () => {
    mockSocialCallback.mockRejectedValue({ response: { status: 401 } })

    const { el } = mountCallback({ code: 'c1', state: 'bad', provider: 'github' })
    await flush()

    expect(mockReplace).not.toHaveBeenCalled()
    expect(session.user).toBeNull()
    expect(el.textContent).toMatch(/sign in|try again/i)
  })

  it('errors immediately when the provider sent no code', async () => {
    const { el } = mountCallback({ error: 'access_denied' })
    await flush()

    expect(mockSocialCallback).not.toHaveBeenCalled()
    expect(el.textContent).toMatch(/sign in|try again/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/AuthCallback.test.js
```

Expected: FAIL — cannot resolve `@/components/AuthCallback.vue`.

- [ ] **Step 3: Add `socialCallback` to `api.js`**

```js
  // Completes the OAuth loop. The response sets the session cookie; the body
  // carries the account so the app need not immediately call /auth/me.
  async socialCallback({ code, state, provider }) {
    return api().post('/auth/social/callback', { code, state, provider })
  },
```

- [ ] **Step 4: Write the component**

Create `src/components/AuthCallback.vue`:

```vue
<template>
  <div class="auth-callback">
    <p v-if="pending" class="auth-callback__status">Signing you in…</p>
    <div v-else class="auth-callback__error">
      <p>{{ error }}</p>
      <a href="/">Try again</a>
    </div>
  </div>
</template>

<script>
import api from '@/services/api'
import { setSession } from '@/services/session'

// Handles the OAuth redirect so no other view needs to know the flow exists.
// The provider sends the browser here with ?code&state; we hand both to the
// backend, which validates the state, exchanges the code, and sets the
// session cookie.
export default {
  name: 'AuthCallback',
  data() {
    return {
      pending: true,
      error: ''
    }
  },
  async mounted() {
    const { code, state, provider } = this.$route.query

    if (!code || !state || !provider) {
      this.fail('Could not sign you in — the provider did not complete the request.')
      return
    }

    try {
      const response = await api.socialCallback({ code, state, provider })
      setSession(response.data.user)
      this.$router.replace('/')
    } catch {
      // The state is single-use and expires in ten minutes, so a stale or
      // replayed callback lands here. Retrying from the top is the fix.
      this.fail('Could not sign you in — the login attempt expired or was invalid.')
    }
  },
  methods: {
    fail(message) {
      this.error = message
      this.pending = false
    }
  }
}
</script>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
.auth-callback__error {
  text-align: center;
}
</style>
```

- [ ] **Step 5: Register the route**

Add to the `routes` array in `src/router/index.js`:

```js
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/components/AuthCallback.vue')
    },
```

Do **not** add `'auth-callback'` to `FULLSCREEN_ROUTES`.

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx vitest run src/components/AuthCallback.test.js
npm test
```

Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/router/index.js src/components/AuthCallback.vue \
        src/components/AuthCallback.test.js src/services/api.js
git commit -m "feat(auth): add OAuth callback route and component"
```

---

## Task 15: Social login buttons

**Working directory:** d3dweb worktree

**Files:**
- Modify: `src/components/Login.vue:121` and its template
- Test: `src/components/Login.test.js` (create)

**Interfaces:**
- Consumes: `api.getOAuthUrl(provider)` (Task 11), `setSession` (Task 10).
- Produces: the login view no longer writes `localStorage`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Login.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApp, h, nextTick } from 'vue'

const { mockGetOAuthUrl, mockAuth } = vi.hoisted(() => ({
  mockGetOAuthUrl: vi.fn(),
  mockAuth: vi.fn()
}))

vi.mock('@/services/api', () => ({
  default: { getOAuthUrl: mockGetOAuthUrl, auth: mockAuth }
}))

import Login from '@/components/Login.vue'

const flush = async () => {
  await nextTick()
  await new Promise((r) => setTimeout(r, 0))
}

function mountLogin() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  createApp({ render: () => h(Login) }).mount(el)
  return el
}

describe('Login social buttons', () => {
  beforeEach(() => {
    mockGetOAuthUrl.mockReset()
    mockAuth.mockReset()
    localStorage.clear()
  })

  it('renders a button per provider', () => {
    const el = mountLogin()
    expect(el.querySelector('[data-testid="login-github"]')).not.toBeNull()
    expect(el.querySelector('[data-testid="login-google"]')).not.toBeNull()
  })

  it('sends the browser to the provider URL', async () => {
    mockGetOAuthUrl.mockResolvedValue('https://github.com/login/oauth/authorize?x=1')
    // jsdom does not implement navigation and window.location is not
    // configurable by default, so redefine it outright.
    Object.defineProperty(window, 'location', {
      value: { href: '', assign: vi.fn() },
      writable: true,
      configurable: true
    })

    const el = mountLogin()
    el.querySelector('[data-testid="login-github"]').click()
    await flush()

    expect(mockGetOAuthUrl).toHaveBeenCalledWith('github')
    expect(window.location.href).toBe('https://github.com/login/oauth/authorize?x=1')
  })

  it('does not write the token to localStorage on local login', async () => {
    mockAuth.mockResolvedValue({ data: { token: 'jwt-abc' } })

    const el = mountLogin()
    const form = el.querySelector('form')
    if (form) form.dispatchEvent(new Event('submit'))
    await flush()

    expect(localStorage.getItem('token')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/Login.test.js
```

Expected: FAIL — the buttons do not exist.

- [ ] **Step 3: Add the buttons to the template**

Below the existing username/password form in `src/components/Login.vue`, reusing
the file's existing `fx-btn` class:

```vue
      <div class="login-divider"><span>or</span></div>

      <button
        type="button"
        class="fx-btn login-social"
        data-testid="login-github"
        @click="signInWith('github')"
      >
        Continue with GitHub
      </button>

      <button
        type="button"
        class="fx-btn login-social"
        data-testid="login-google"
        @click="signInWith('google')"
      >
        Continue with Google
      </button>

      <p v-if="socialError" class="login-error">{{ socialError }}</p>
```

- [ ] **Step 4: Add the handler and drop the localStorage write**

Add `socialError: ''` to the component's `data()`, and add the method:

```js
    // Leaves the SPA entirely: the provider redirects back to /auth/callback,
    // which AuthCallback.vue picks up.
    async signInWith(provider) {
      this.socialError = ''
      try {
        window.location.href = await api.getOAuthUrl(provider)
      } catch {
        this.socialError = 'That sign-in option is unavailable right now.'
      }
    },
```

Delete line 121 — `localStorage.setItem('token', ...)`. The backend now sets
the session cookie on local login too (Task 8), so there is nothing to store.
If the `login()` method used the stored token afterwards, call
`setSession(...)` or `await loadSession()` in its place, importing from
`@/services/session`.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/components/Login.test.js
npm test
npm run lint
npm run format
```

Expected: all PASS, lint clean.

- [ ] **Step 6: Add Login.vue to the call-site guard**

Now that the write is gone, add it to the `FILES` array in
`src/services/session.callsites.test.js`:

```js
  'src/components/DiagramGraphView.vue',
  'src/components/Login.vue'
]
```

Run `npx vitest run src/services/session.callsites.test.js` — expected PASS.

- [ ] **Step 7: Verify no session token remains outside collab**

```bash
grep -rn "localStorage.*'token'" src/ --include=*.vue --include=*.js
```

Expected: matches only in `src/services/collab.js` and `src/services/collab.test.js`.

- [ ] **Step 8: Commit and push**

```bash
git add src/components/Login.vue src/components/Login.test.js \
        src/services/session.callsites.test.js
git commit -m "feat(auth): add Google and GitHub sign-in buttons"
git push -u origin feat/social-auth
```

---

## Task 16: Register the OAuth apps and verify end to end

**Working directory:** both repos

**Files:** none committed — credentials are injected as environment variables and never committed.

**Interfaces:**
- Consumes: everything above.
- Produces: a working sign-in flow in dev and production.

- [ ] **Step 1: Register the GitHub OAuth app**

At https://github.com/settings/developers → New OAuth App:

- Homepage URL: `https://d3dweb.vercel.app`
- Authorization callback URL: `https://d3dweb.vercel.app/auth/callback`

Register a second app for development with `http://localhost:5173` and
`http://localhost:5173/auth/callback`. GitHub allows only one callback URL per
app, so dev and production need separate apps.

- [ ] **Step 2: Register the Google OAuth client**

At https://console.cloud.google.com/apis/credentials → Create Credentials →
OAuth client ID → Web application. Google accepts multiple redirect URIs on one
client, so add both:

- `http://localhost:5173/auth/callback`
- `https://d3dweb.vercel.app/auth/callback`

- [ ] **Step 3: Fill in local credentials**

Put the dev client IDs and secrets into `samus_dev.toml` (gitignored — confirm
with `git check-ignore samus_dev.toml`). Set `cookie_secure = false` and
`frontend_origin = "http://localhost:5173"`.

- [ ] **Step 4: Verify the dev flow end to end**

```bash
# Terminal 1
cd ~/projects/d3d-api && make start-api-service
# Terminal 2
cd <d3dweb worktree> && npm run dev
```

Then in the browser at `http://localhost:5173`:

1. Click "Continue with GitHub" → lands on GitHub consent
2. Approve → returns to `/auth/callback` → redirects to `/`
3. DevTools → Application → Cookies: `jwt_token` present, `HttpOnly` ✓, `SameSite=Lax`
4. DevTools → Console: `localStorage.getItem('token')` returns `null`
5. Reload the page — still signed in, and the Network tab shows `/api/auth/me` returning 200
6. The diagram list shows Server mode, not LocalStorage
7. Sign in with the local username/password form — same cookie, same result
8. Repeat 1–3 with Google

- [ ] **Step 5: Verify the database rows**

```bash
psql "postgres://postgres:postgres@localhost:5432/samus" \
  -c "SELECT username, provider, provider_id, email, display_name FROM users;"
```

Expected: social rows have namespaced usernames (`github:<login>`), a non-empty
`provider_id`, and an empty `password_hash`. Local accounts still read
`provider = 'local'`.

- [ ] **Step 6: Confirm no local account was absorbed**

If a local account shares a handle with your GitHub login, confirm there are two
distinct rows with different ids. A social login must never adopt a local
account.

- [ ] **Step 7: Deploy and verify production**

Set the production credentials as environment variables on the API host, with
`frontend_origin = https://d3dweb.vercel.app` and `cookie_secure = true`. Deploy
both repos, then repeat Step 4 against `https://d3dweb.vercel.app`.

**Verify in Safari specifically.** Safari's ITP is what the same-origin rewrite
exists to satisfy; if the cookie survives a reload there, the design holds.

- [ ] **Step 8: Open the follow-up issue**

```bash
gh issue create --repo smetroid/d3d-api \
  --title "feat/social-auth: WebSocket collab auth via short-lived ticket" \
  --body "$(cat <<'BODY'
`src/services/collab.js:17` builds the WebSocket URL with `?token=` read from
`localStorage`, which JavaScript can no longer do now the session is an
httpOnly cookie. Vercel rewrites do not proxy WebSockets, so collab cannot use
the same-origin path either.

Needs a `POST /auth/ws-ticket` endpoint returning a short-lived single-use
token that the frontend puts in the query string.

Blocked on: nothing. Blocks: enabling `VITE_COLLAB_ENABLED=true`.

See the Deferred section of `docs/superpowers/specs/2026-08-28-social-auth-design.md`.
BODY
)"
```

- [ ] **Step 9: Open both pull requests**

```bash
cd ~/projects/d3d-api && gh pr create --fill --base main
cd <d3dweb worktree> && gh pr create --fill --base main
```

Merge the d3d-api PR **first** — the frontend is useless against an API without
`/auth/me`.

---

## Board Reconciliation

Run after Task 1, so the issues match the plan while it is being executed.

- [ ] Amend d3d-api #41–#49: base branch is `main`, not `feat/postgresql-migration`
- [ ] Amend d3d-api #42: migration is `006_social_auth.sql`
- [ ] Amend d3d-api #46, #47: cookie is `SameSite=Lax` with config-driven `Secure`, not `SameSite=None`
- [ ] Amend d3d-api #48: add `AllowCredentials: true`
- [ ] Amend d3d-api #49: add `cookie_secure` alongside `frontend_origin`
- [ ] Amend d3dweb #65: covers `api.js` only; identity call sites are separate
- [ ] Open 7 new issues: `/auth/me` (Task 7), session store (Task 10), identity migration (Task 12), session-check migration (Task 12), proxy config (Task 9), JoinView key rename (Task 13), collab WS ticket (Task 16 Step 8)
- [ ] Update the checklists on d3d-api #50 and d3dweb #66

## Task-to-Issue Map

| Task | Issues |
|---|---|
| 1 | — (prerequisite) |
| 2 | d3d-api #42, #43 |
| 3 | d3d-api #49 |
| 4 | d3d-api #41, #44 |
| 5 | d3d-api #44 |
| 6 | d3d-api #45 |
| 7 | d3d-api #46 + new `/auth/me` |
| 8 | d3d-api #47, #48 |
| 9 | new proxy config |
| 10 | new session store |
| 11 | d3dweb #65 |
| 12 | new identity + session-check migration |
| 13 | new JoinView key rename |
| 14 | d3dweb #62, #63 |
| 15 | d3dweb #64 |
| 16 | — (registration, verification, follow-up) |
