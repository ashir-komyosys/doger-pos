# Built from the MONOREPO ROOT context (see docker-compose.yml `context: .`)
# because this app depends on the workspace package @nodedr-restaurant/types.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# --- deps ---
# Install only the web app and its workspace dependencies. Installing every
# workspace member here also downloads and builds the backend's native USB
# printer dependency, which the web image never uses.
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/types/package.json packages/types/package.json
RUN --mount=type=cache,id=pnpm-web,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile \
  --filter 'web...' \
  --network-concurrency=6 \
  --fetch-retries=4 \
  --fetch-timeout=600000

# --- builder ---
# BACKEND_URL is a build ARG, not a runtime env — Next.js bakes rewrite
# destinations into the routes manifest at build time (see next.config.ts
# and ARCHITECTURE.md's "reused from nodedr-pos" section for why a runtime
# env silently falls back to the default instead).
FROM deps AS builder
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=${BACKEND_URL}
ARG NEXT_PUBLIC_PUBLIC_ORDER_TOKEN=
ENV NEXT_PUBLIC_PUBLIC_ORDER_TOKEN=${NEXT_PUBLIC_PUBLIC_ORDER_TOKEN}
ARG NEXT_PUBLIC_PUBLIC_STOREFRONT_ORIGIN=
ENV NEXT_PUBLIC_PUBLIC_STOREFRONT_ORIGIN=${NEXT_PUBLIC_PUBLIC_STOREFRONT_ORIGIN}
COPY packages/types packages/types
COPY apps/web apps/web
RUN --mount=type=cache,id=next-cache,target=/repo/apps/web/.next/cache \
  pnpm --filter @nodedr-restaurant/types build && \
  pnpm --filter web build

# --- runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# The standalone server (apps/web/server.js) resolves `public/` and
# `.next/static` relative to ITS OWN traced monorepo path, i.e.
# apps/web/public and apps/web/.next/static under this WORKDIR — not a
# top-level ./public. Copying public/ to ./public (a sibling of apps/, not
# a child) silently 404s every static asset (logo, icons, favicon fallback)
# in production while `next dev` keeps working fine, since dev serves
# public/ directly from the source tree regardless of this path.
COPY --from=builder /repo/apps/web/public ./apps/web/public
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
