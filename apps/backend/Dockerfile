# Built from the MONOREPO ROOT context (see docker-compose.yml `context: .`)
# because this app depends on the workspace package @nodedr-restaurant/types.
# Do not try to `docker build` this file with apps/backend as context.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- deps: install with full workspace visible so pnpm can link @nodedr-restaurant/types ---
# python3/make/g++/linux-headers/eudev-dev/libusb-dev/pkgconfig are for the
# `usb` package's native addon (direct-USB ESC/POS printing, see
# apps/backend/src/modules/orders/escpos-usb.ts). It ships a prebuilt
# linux-x64 musl binary, but empirically its install script doesn't reliably
# skip straight to that prebuild on Alpine — with no compiler present it
# falls through to `node-gyp rebuild` and fails outright (verified building
# this exact package in nodedr-pos, ported here unchanged). None of this is
# needed at runtime — see the small eudev-libs/libstdc++ runtime deps below
# instead of this whole toolchain.
FROM base AS deps
RUN --mount=type=cache,target=/var/cache/apk \
  apk add openssl python3 make g++ linux-headers eudev-dev libusb-dev pkgconfig
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
# Keep the other workspace manifests present for frozen-lockfile validation,
# but install only this application and its workspace dependencies. Installing
# every workspace here makes the backend image download the web app's entire
# toolchain as well, lengthening the release build and expanding its supply
# chain without putting any of those packages in the runtime image.
COPY apps/web/package.json apps/web/package.json
COPY packages/types/package.json packages/types/package.json
RUN --mount=type=cache,id=pnpm-backend,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile \
  --filter '@nodedr-restaurant/backend...' \
  --network-concurrency=6 \
  --fetch-retries=4 \
  --fetch-timeout=600000

# --- builder: compile types package, generate Prisma client, build Nest ---
FROM deps AS builder
COPY packages/types packages/types
COPY apps/backend apps/backend
RUN pnpm --filter @nodedr-restaurant/types build
RUN pnpm --filter @nodedr-restaurant/backend exec prisma generate
RUN pnpm --filter @nodedr-restaurant/backend build

# Create a portable runtime tree containing only production dependencies.
# The build workspace includes Nest CLI, TypeScript, Jest and lint tools; none
# belong in the deployed API image. Prisma remains a production dependency
# because the entrypoint runs `prisma migrate deploy` at startup.
FROM builder AS deploy
RUN --mount=type=cache,id=pnpm-backend,target=/root/.local/share/pnpm/store \
  pnpm --filter @nodedr-restaurant/backend --prod deploy --legacy /deploy/backend \
  --network-concurrency=6 \
  --fetch-retries=4 \
  --fetch-timeout=600000
# `pnpm deploy` installs a fresh production tree, so the Prisma client generated
# in the build workspace is not carried into it. Generate the client against
# the copied schema inside the exact tree that the runtime image will use.
RUN cd /deploy/backend && ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# --- runtime: slim image, only what's needed to run ---
# Keeps the SAME directory depth as the workspace (/repo/apps/backend, not a
# flattened /app) — pnpm's per-package node_modules/.bin/* entries (prisma,
# nest, etc.) are symlinks with relative paths back into the root
# node_modules/.pnpm store, and flattening the tree breaks them silently
# (npx then can't find the local `prisma` binary and falls back to fetching
# an arbitrary "latest" version from the registry at container start).
FROM node:22-alpine AS runtime
# eudev-libs (libudev.so, used by `usb`'s libusb backend for device
# enumeration) and libstdc++ (the addon is a C++ build) are the only
# runtime-side additions for direct-USB printing — libusb itself is
# statically linked into the addon, so no separate libusb runtime package
# is needed (same verification nodedr-pos already did for this exact
# package). postgresql16-client (pg_dump/pg_restore) backs the Backup
# module (apps/backend/src/backup/) — version-pinned to match the
# postgres:16-alpine server in docker-compose.yml, since pg_dump's custom
# format is not guaranteed compatible across major versions.
RUN --mount=type=cache,target=/var/cache/apk \
  apk add openssl eudev-libs libstdc++ postgresql16-client
WORKDIR /repo
ENV NODE_ENV=production
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

WORKDIR /repo/apps/backend
COPY --from=deploy /deploy/backend ./
EXPOSE 4000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/src/main.js"]
