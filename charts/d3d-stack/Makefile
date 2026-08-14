SHELL := /bin/bash
RELEASE ?= d3d
NAMESPACE ?= default
CHART_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
REPO_ROOT := $(realpath $(CHART_DIR)/../..)
D3D_API_PATH ?= $(REPO_ROOT)/../d3d-api
WEB_TAG ?= dev
API_TAG ?= dev

.PHONY: help
help:
	@echo ""
	@echo "cluster management:"
	@echo "  minikube-up      start minikube + enable ingress addon + patch to LoadBalancer"
	@echo "  tunnel           sudo minikube tunnel (keep in separate terminal)"
	@echo "  install          helm upgrade --install"
	@echo "  bootstrap-user   install + run createUser Job (admin/admin)"
	@echo "  uninstall        helm uninstall (leaves PVC)"
	@echo "  wipe             uninstall + delete PVC"
	@echo "  status           show pods / svc / ingress / pvc"
	@echo ""
	@echo "image build:"
	@echo "  images           build web + api into minikube's docker"
	@echo "  image-web        build d3dweb image only"
	@echo "  image-api        build d3d-api image only"
	@echo ""
	@echo "local dev (fast iteration — no image rebuild):"
	@echo "  dev-web          vite dev server → http://localhost:5173 (API via d3d.local)"
	@echo "  pf-rethinkdb     port-forward RethinkDB :28015 to localhost:28015"
	@echo "  dev-api-hint     print command to run d3d-api locally against port-forwarded RethinkDB"
	@echo ""
	@echo "hot reload (rebuild image + restart pod):"
	@echo "  reload-api       image-api + rollout restart deploy/api"
	@echo "  reload-web       image-web + rollout restart deploy/web"
	@echo ""
	@echo "observability:"
	@echo "  logs-api         tail api logs"
	@echo "  logs-web         tail web logs"
	@echo "  logs-rdb         tail rethinkdb logs"
	@echo "  rdb-ui           port-forward RethinkDB admin UI → localhost:8081"
	@echo ""
	@echo "misc:"
	@echo "  lint             helm lint"
	@echo "  template         helm template (dry-run to stdout)"
	@echo "  hosts-hint       print /etc/hosts and tunnel instructions"

.PHONY: minikube-up
minikube-up:
	minikube status >/dev/null 2>&1 || minikube start
	minikube addons enable ingress
	kubectl patch svc ingress-nginx-controller -n ingress-nginx \
		-p '{"spec":{"type":"LoadBalancer"}}' 2>/dev/null || true
	@$(MAKE) hosts-hint

.PHONY: hosts-hint
hosts-hint:
	@echo ""
	@echo "1. Update /etc/hosts (macOS Docker driver — run once):"
	@echo "   sudo sh -c 'echo \"127.0.0.1  d3d.local\" >> /etc/hosts'"
	@echo ""
	@echo "2. Keep minikube tunnel running in a separate terminal:"
	@echo "   sudo minikube tunnel"
	@echo ""

.PHONY: tunnel
tunnel:
	sudo minikube tunnel

.PHONY: images
images: image-web image-api

.PHONY: image-web
image-web:
	@echo "==> building d3dweb:$(WEB_TAG) into minikube docker"
	@eval $$(minikube docker-env); \
		docker build \
			--build-arg VITE_API_BASE_URL=/api \
			--build-arg VITE_COLLAB_ENABLED=true \
			-t d3dweb:$(WEB_TAG) \
			$(REPO_ROOT)

.PHONY: image-api
image-api:
	@echo "==> building d3d-api:$(API_TAG) into minikube docker (from $(D3D_API_PATH))"
	@test -d $(D3D_API_PATH) || (echo "d3d-api not found at $(D3D_API_PATH); set D3D_API_PATH=..." && exit 1)
	@eval $$(minikube docker-env); \
		docker build -t d3d-api:$(API_TAG) $(D3D_API_PATH)

.PHONY: lint
lint:
	helm lint $(CHART_DIR)

.PHONY: template
template:
	helm template $(RELEASE) $(CHART_DIR)

.PHONY: install
install:
	helm upgrade --install $(RELEASE) $(CHART_DIR) \
		--namespace $(NAMESPACE) --create-namespace \
		--set web.image.tag=$(WEB_TAG) \
		--set api.image.tag=$(API_TAG)

.PHONY: uninstall
uninstall:
	helm uninstall $(RELEASE) --namespace $(NAMESPACE) || true

.PHONY: wipe
wipe: uninstall
	kubectl -n $(NAMESPACE) delete pvc -l app.kubernetes.io/instance=$(RELEASE) --ignore-not-found

.PHONY: status
status:
	kubectl -n $(NAMESPACE) get pods,svc,ingress,pvc -l app.kubernetes.io/part-of=d3d-stack

.PHONY: logs-api
logs-api:
	kubectl -n $(NAMESPACE) logs -f deploy/$(RELEASE)-api

.PHONY: logs-web
logs-web:
	kubectl -n $(NAMESPACE) logs -f deploy/$(RELEASE)-web

.PHONY: logs-rdb
logs-rdb:
	kubectl -n $(NAMESPACE) logs -f statefulset/$(RELEASE)-rethinkdb

.PHONY: rdb-ui
rdb-ui:
	@echo "opening http://localhost:8080 (RethinkDB admin)"
	kubectl -n $(NAMESPACE) port-forward svc/$(RELEASE)-rethinkdb-ui 8080:8080

.PHONY: bootstrap-user
bootstrap-user:
	helm upgrade --install $(RELEASE) $(CHART_DIR) \
		--namespace $(NAMESPACE) --create-namespace \
		--set web.image.tag=$(WEB_TAG) \
		--set api.image.tag=$(API_TAG) \
		--set api.bootstrapUser.enabled=true

# ── local dev (fast iteration) ────────────────────────────────────────────────

# Start vite dev server. The SPA will call http://d3d.local/api/* directly
# (minikube tunnel must be running). Browse http://localhost:5173.
.PHONY: dev-web
dev-web:
	@echo "==> starting vite dev server (http://localhost:5173)"
	@echo "    API calls go to http://d3d.local/api — make sure tunnel is running"
	@cd $(REPO_ROOT) && VITE_API_BASE_URL=http://d3d.local/api npm run dev

# Port-forward RethinkDB to localhost:28015 so the API can run locally.
# Keep this running in a dedicated terminal.
.PHONY: pf-rethinkdb
pf-rethinkdb:
	@echo "==> forwarding RethinkDB :28015 → localhost:28015"
	kubectl -n $(NAMESPACE) port-forward svc/$(RELEASE)-rethinkdb 28015:28015

# Print the command to run d3d-api locally against the port-forwarded RethinkDB.
.PHONY: dev-api-hint
dev-api-hint:
	@echo ""
	@echo "Run d3d-api locally (after 'make pf-rethinkdb' in another terminal):"
	@echo ""
	@echo "  cd $(D3D_API_PATH)"
	@echo "  go run samus.go --config samus_dev.toml"
	@echo ""
	@echo "samus_dev.toml already points rethinkdb.address at localhost:28015."
	@echo "The local API listens on :3001 — set Settings > Server URL to http://localhost:3001"
	@echo "in the browser, or run 'make dev-web' and it will call d3d.local/api instead."
	@echo ""

# ── hot reload (rebuild image + restart pod) ──────────────────────────────────

.PHONY: reload-api
reload-api: image-api
	kubectl -n $(NAMESPACE) rollout restart deploy/$(RELEASE)-api
	kubectl -n $(NAMESPACE) rollout status deploy/$(RELEASE)-api

.PHONY: reload-web
reload-web: image-web
	kubectl -n $(NAMESPACE) rollout restart deploy/$(RELEASE)-web
	kubectl -n $(NAMESPACE) rollout status deploy/$(RELEASE)-web
