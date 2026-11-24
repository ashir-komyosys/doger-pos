# Built from the monorepo root because the storefront consumes the shared types package.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/storefront/package.json apps/storefront/package.json
COPY packages/types/package.json packages/types/package.json
RUN --mount=type=cache,id=pnpm-storefront,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile --filter 'storefront...' --network-concurrency=6 --fetch-retries=4 --fetch-timeout=600000

FROM deps AS builder
ARG BACKEND_URL=http://backend:4000
ENV BACKEND_URL=${BACKEND_URL}
COPY packages/types packages/types
COPY apps/storefront apps/storefront
RUN pnpm --filter @nodedr-restaurant/types build && pnpm --filter storefront build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 BACKEND_URL=http://backend:4000
COPY --from=builder /repo/apps/storefront/public ./apps/storefront/public
COPY --from=builder /repo/apps/storefront/.next/standalone ./
COPY --from=builder /repo/apps/storefront/.next/static ./apps/storefront/.next/static
EXPOSE 3000
CMD ["node", "apps/storefront/server.js"]
