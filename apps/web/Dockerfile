# File: apps/web/Dockerfile
#
# ⚠️ Build context is the REPO ROOT, not this directory:
#     docker build -f apps/web/Dockerfile .
# Purpose: Production image for apps/web (Next.js).
# Category: Tooling / container
# Scope: Phase W01 (M0)
# Owner: docs/14-adr/0011-compute-platform.md
#
# Description:
#   Same three properties as api.Dockerfile: multi-stage, non-root, pinned base
#   tag. Uses Next.js standalone output so the runtime layer carries the server
#   and its traced dependencies rather than the whole node_modules tree.
#
#   ⚠️ Pinned by tag, NOT yet by digest — same follow-up as api.Dockerfile.
#
# Modification History (newest-first):
#   - 2026-08-08: Initial creation (Phase W01)

# --- build -------------------------------------------------------------------
FROM node:22.21.0-bookworm-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @isms/web --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY apps/web apps/web
RUN npm run build -w apps/web

# --- runtime -----------------------------------------------------------------
FROM node:22.21.0-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3200
WORKDIR /app

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3200
CMD ["node", "apps/web/server.js"]
