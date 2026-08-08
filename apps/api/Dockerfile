# File: apps/api/Dockerfile
#
# ⚠️ Build context is the REPO ROOT, not this directory:
#     docker build -f apps/api/Dockerfile .
# Named `Dockerfile` and placed beside its app on purpose — security-scan.yml's
# discovery and `trivy config`'s own detection both key on that filename, and
# the earlier `docker/api.Dockerfile` layout silently matched neither.
# Purpose: Production image for apps/api (NestJS).
# Category: Tooling / container
# Scope: Phase W01 (M0)
# Owner: docs/14-adr/0011-compute-platform.md
#
# Description:
#   Three properties are here because `security-scan.yml`'s container-scan job
#   checks for them, and because ADR-0011 made containerising the thing that
#   turns that job from permanently-skipped into executable (AD-SecScan-1):
#     - multi-stage, so build tooling never reaches the runtime layer
#     - runs as a non-root user
#     - base image pinned to an exact version tag
#
#   ⚠️ Pinned by tag, NOT yet by digest. Digest pinning is what actually
#   defeats tag mutation, and it is listed as a W01 follow-up rather than
#   claimed here — writing a digest we have not resolved would be worse than
#   writing none.
#
#   The base image IS scanned: security-scan.yml reads every `FROM` line out of
#   this file and runs trivy against it, so a known-vulnerable base fails CI
#   even while the tag is mutable.
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
RUN npm ci --workspace @isms/api --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY apps/api apps/api
RUN npm run prisma:generate -w apps/api && npm run build -w apps/api

# --- runtime -----------------------------------------------------------------
FROM node:22.21.0-bookworm-slim AS runtime
ENV NODE_ENV=production
# Containers must bind all interfaces; the local default is loopback (main.ts).
ENV API_HOST=0.0.0.0
ENV API_PORT=3210
WORKDIR /app

COPY --from=build /repo/package.json /repo/package-lock.json ./
COPY --from=build /repo/packages/types/package.json packages/types/
COPY --from=build /repo/apps/api/package.json apps/api/
RUN npm ci --omit=dev --workspace @isms/api --include-workspace-root \
  && npm cache clean --force

COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/packages/types/src packages/types/src

# `node` (uid 1000) ships with the base image; no user is created here.
USER node
EXPOSE 3210
CMD ["node", "apps/api/dist/bootstrap/main.js"]
