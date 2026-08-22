# d3d-stack

Helm chart that runs the full d3d dev stack on **minikube**:

- **d3dweb** — Vue SPA served by nginx
- **d3d-api** — Go backend (`samus`) with WebSocket collab
- **postgresql** — official `postgres:16-alpine` StatefulSet with a persistent volume

Traffic is fronted by an **NGINX Ingress** on a single hostname:

```
http://d3d.local/               -> d3dweb  (SPA)
http://d3d.local/api/*          -> d3d-api (HTTP + WebSocket, /api prefix stripped)
```

## Prerequisites

- [minikube](https://minikube.sigs.k8s.io/) with the Docker driver
- `kubectl`
- `helm` v3
- `docker` (used indirectly via `minikube docker-env`)
- The sibling `d3d-api` repo checked out at `../d3d-api` (or set `D3D_API_PATH`)

## Quick start

```bash
# 1. bring up minikube + ingress addon
make minikube-up

# 2. add d3d.local to /etc/hosts (run once)
sudo sh -c "echo \"$(minikube ip)  d3d.local\" >> /etc/hosts"

# 3. build the two images into minikube's docker daemon
make images

# 4. install the chart (and create an admin user on first install)
make bootstrap-user   # or: make install (then create a user manually)

# 5. open the app
open http://d3d.local
```

Log in with `admin / admin` (defaults for `api.bootstrapUser`).

## Layout

```
charts/d3d-stack/
├── Chart.yaml
├── values.yaml
├── Makefile
├── README.md
└── templates/
    ├── _helpers.tpl
    ├── NOTES.txt
    ├── postgresql-statefulset.yaml
    ├── postgresql-service.yaml
    ├── api-deployment.yaml
    ├── api-service.yaml
    ├── api-configmap.yaml
    ├── api-secret.yaml
    ├── api-bootstrap-job.yaml
    ├── web-deployment.yaml
    ├── web-service.yaml
    ├── web-configmap.yaml
    └── ingress.yaml
```

## Frontend / API wiring

The SPA calls the API through the ingress at same-origin `/api`. This is set at build time via the `VITE_API_BASE_URL=/api` Docker build arg (see the top of `../../Dockerfile`). The runtime lookup in `src/helpers/D3Util.js`:

1. User-configured `serverUrl` in Settings (cookie) — wins if present
2. Build-time `VITE_API_BASE_URL` (relative → absolutized against `window.location.origin`)
3. Fallback: `http://localhost:3000` (matches the standalone `vite dev` workflow)

WebSocket collab derives its URL from the same base (`ws://d3d.local/api/dag/:id/ws`), which the ingress upgrades transparently.

## Common tasks

```bash
make status              # pods / svc / ingress / pvc for the release
make logs-api            # tail api logs
make logs-web
make logs-pg
make uninstall           # helm uninstall (keeps the PVC)
make wipe                # uninstall AND delete the PVC (destroys data)
```

Rebuild after a source change:

```bash
make image-web && kubectl rollout restart deploy/d3d-web
make image-api && kubectl rollout restart deploy/d3d-api
```

## Configuration

Override anything in `values.yaml` with `--set` or a values file:

```bash
helm upgrade --install d3d ./charts/d3d-stack \
  --set api.config.authProvider=ldap \
  --set api.config.signingKey=$(openssl rand -hex 32) \
  --set postgresql.storage=5Gi
```

Key knobs:

| Value                        | Default                          | Purpose                              |
| ---------------------------- | -------------------------------- | ------------------------------------ |
| `ingress.host`               | `d3d.local`                      | Ingress hostname                     |
| `api.config.authProvider`    | `localauth`                      | Set `ldap` and configure LDAP block  |
| `api.config.signingKey`      | `dev-signing-key-change-in-prod` | JWT signing key                      |
| `api.config.postgresAddress` | ``                               | Override `<release>-postgresql:5432` |
| `api.bootstrapUser.enabled`  | `false`                          | Create a user via post-install Job   |
| `web.apiBaseUrl`             | `/api`                           | Baked into the SPA at build time     |
| `web.collabEnabled`          | `true`                           | Sets `VITE_COLLAB_ENABLED`           |
| `postgresql.storage`         | `1Gi`                            | PVC size                             |
| `postgresql.storageClass`    | `standard`                       | StorageClass (minikube default)      |

## Not for production

This chart is optimized for a laptop dev loop:

- `signingKey` is a dev default — override it
- `authProvider: localauth` — swap to `ldap` and set the `ldap` block in `samus.toml.tmpl` for real deployments
- Single replica for API and PostgreSQL, no TLS on the ingress

## Troubleshooting

- **`ErrImagePull` on d3dweb / d3d-api pods** — you skipped `eval $(minikube docker-env)`; re-run `make images`.
- **404 on `/api/...`** — check `kubectl get ingress` and verify the nginx-ingress controller is running (`kubectl -n ingress-nginx get pods`).
- **WebSocket won't connect** — nginx-ingress upgrades WS transparently; if the connection hangs, check `nginx.ingress.kubernetes.io/proxy-read-timeout` and confirm the client URL starts with `ws://d3d.local/api/dag/`.
- **PostgreSQL pod stays Pending** — no default StorageClass. Run `kubectl get storageclass` and set `--set postgresql.storageClass=<name>`.
