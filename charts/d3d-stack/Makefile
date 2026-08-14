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
	@echo "targets:"
	@echo "  minikube-up      start minikube + enable ingress addon"
	@echo "  images           build web and api images into minikube's docker"
	@echo "  image-web        build d3dweb image only"
	@echo "  image-api        build d3d-api image only"
	@echo "  lint             helm lint"
	@echo "  template         helm template (renders to stdout)"
	@echo "  install          helm upgrade --install"
	@echo "  uninstall        helm uninstall (leaves PVC)"
	@echo "  wipe             uninstall + delete PVC"
	@echo "  status           kubectl get all + ingress"
	@echo "  logs-api         tail api logs"
	@echo "  logs-web         tail web logs"
	@echo "  logs-rdb         tail rethinkdb logs"
	@echo "  rdb-ui           port-forward RethinkDB web UI to localhost:8080"
	@echo "  bootstrap-user   run createUser Job with values from values.yaml"
	@echo "  hosts-hint       print /etc/hosts line for d3d.local"

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
