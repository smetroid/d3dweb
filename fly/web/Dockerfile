# Build the SPA with Vite, then serve it with nginx.
# The d3dweb frontend is a static client; collaboration/API URLs are baked in
# at build time via VITE_* build args.
#
# node:24 ships npm 11, which is required to resolve this repo's lockfile.
# npm 10 (node:22) fails `npm ci` with an esbuild/optional-dependency error.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/embed/package.json packages/embed/package.json
# --ignore-scripts skips the canvas node-gyp compilation (only needed for
# tests), so the image doesn't need build tooling. esbuild resolves its
# platform binary via the @esbuild/* optional packages.
RUN npm ci --no-audit --no-fund --ignore-scripts

COPY . .

ARG VITE_API_BASE_URL=""
ARG VITE_COLLAB_ENABLED="false"
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_COLLAB_ENABLED=$VITE_COLLAB_ENABLED

RUN npm run build

FROM nginx:alpine

COPY fly/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=2s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
