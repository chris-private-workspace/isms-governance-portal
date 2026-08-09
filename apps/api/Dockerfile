# File: apps/api/Dockerfile
# Purpose: Production image for apps/api (NestJS), on a distroless runtime.
# Category: Tooling / container
# Scope: Phase W01 (M0)
# Owner: docs/14-adr/0011-compute-platform.md
#
# ⚠️ Build context is the REPO ROOT, not this directory:
#     docker build -f apps/api/Dockerfile .
# Named `Dockerfile` and placed beside its app on purpose — security-scan.yml's
# discovery and `trivy config`'s own detection both key on that filename, and
# the earlier `docker/api.Dockerfile` layout silently matched neither.
#
# Description:
#   Three stages: build (full toolchain), prod-deps (runtime node_modules only),
#   runtime (distroless).
#
#   ⭐ WHY DISTROLESS. The first honest container scan of this project put 45
#   HIGH/CRITICAL findings on node:22.21.0-bookworm-slim — 11 in the Debian
#   layer and **34 inside the npm tree that ships with the Node image itself**
#   (node-tar gzip-bomb DoS, brace-expansion). None of those 34 are our
#   dependencies, and production has no use for npm at all. Distroless carries
#   no npm, no shell and no package manager, which removes that entire class
#   rather than chasing its members. guardrail 1: the platform must not itself
#   be a source of risk.
#
#   Consequences accepted, stated rather than discovered later:
#     - **No shell in the runtime image.** `docker exec ... sh` will not work,
#       and neither will any RUN step after the final FROM. Everything must be
#       prepared in an earlier stage. Combined with ADR-0011's note that the
#       corporate proxy blocks Container Apps log endpoints, diagnosis leans
#       entirely on shipped structured logs — which is the direction that ADR
#       already committed to.
#     - **Both npm ci steps pass `--ignore-scripts`**, because apps/api's
#       postinstall runs `prisma generate`, and at that point in the build only
#       package.json files have been copied — prisma/schema.prisma arrives
#       later. prod-deps needs it for the same reason plus one more: `prisma`
#       is a devDependency it does not install at all. The build stage runs
#       prisma generate explicitly once the schema is present (see below);
#       prod-deps copies the generated client from the build stage instead.
#
#   ⚠️ Pinned by tag, NOT by digest. Digest pinning is what actually defeats tag
#   mutation; it is a recorded follow-up rather than a claim made here. The base
#   IS scanned regardless: security-scan.yml reads every `FROM` line out of this
#   file and runs trivy against it.
#
# Modification History (newest-first):
#   - 2026-08-09: Add --ignore-scripts to the build stage (CH-013) — schema absent
#   - 2026-08-08: Move runtime to distroless (Phase W01) — 45 base-image CVEs
#   - 2026-08-08: Initial creation (Phase W01)

# --- build -------------------------------------------------------------------
FROM node:22.21.0-bookworm-slim AS build
WORKDIR /repo

# `-slim` ships without OpenSSL, and Prisma uses it to pick which engine build
# to fetch. Without it: "Prisma failed to detect the libssl/openssl version to
# use ... Defaulting to openssl-1.1.x", then the wrong engine. Caught by running
# the build, not by reading the Dockerfile.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# `--ignore-scripts`: apps/api's postinstall is `prisma generate`, and only
# package.json files exist at this layer — prisma/schema.prisma arrives with the
# COPY below. Without it the build dies here with "schema.prisma: file not
# found". Generation happens explicitly further down, where the schema is real.
RUN npm ci --ignore-scripts --workspace @isms/api --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY apps/api apps/api
# `nest build` copies src/generated into dist via nest-cli.json assets; without
# that the built app requires ../generated/prisma and dies at startup while the
# build itself stays green.
RUN npm run prisma:generate -w apps/api && npm run build -w apps/api

# --- production dependencies -------------------------------------------------
FROM node:22.21.0-bookworm-slim AS prod-deps
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/types/package.json packages/types/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --ignore-scripts --workspace @isms/api --include-workspace-root

# --- runtime -----------------------------------------------------------------
# `:nonroot` runs as uid 65532 and has no shell, no npm, no package manager.
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime
ENV NODE_ENV=production
# Containers must bind all interfaces; the local default is loopback (main.ts).
ENV API_HOST=0.0.0.0
ENV API_PORT=3210
WORKDIR /app

COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/packages/types/package.json ./packages/types/package.json
COPY --from=build /repo/packages/types/src ./packages/types/src

# Explicit, even though the `:nonroot` tag already defaults to uid 65532.
# Both trivy config and semgrep flagged its absence, and they are right for a
# reason beyond the rule: a reader — and a scanner — cannot see a tag's default
# user. `04:93` is exactly this, inherit versus state.
USER nonroot

EXPOSE 3210
# The distroless nodejs image's ENTRYPOINT is already /nodejs/bin/node, so CMD
# carries the script path only — prefixing "node" here would look for a file
# named node.
CMD ["apps/api/dist/bootstrap/main.js"]
