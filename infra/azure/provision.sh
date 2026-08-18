#!/usr/bin/env bash
#
# File: infra/azure/provision.sh
# Purpose: Create (or confirm) the Azure resources that serve the W21 web demonstration.
# Category: Infrastructure / Deployment
# Scope: Phase W21
# Owner: infra/azure/README.md
#
# Description:
#   Idempotent by construction: every resource is `show`n before it is `create`d,
#   and an existing resource is reported, not touched. A second run is a no-op
#   that prints what already exists — that property is acceptance criterion AC-4,
#   so it is the thing the summary at the end actually measures.
#
#   THE RESOURCE GROUP IS A PRECONDITION, NOT A STEP, and the reason is measured
#   rather than assumed: the identity this project deploys with holds Contributor
#   at RESOURCE GROUP scope, not subscription scope. `az group create` returns
#   AuthorizationFailed on every subscription it can see (W21 Day 0, drift
#   D-perm-scope). A script that tried would fail on line one for a reason that
#   reads like a bug in the script. So it checks, and says so.
#
#   No secret is stored here. The registry token password is printed once, on the
#   run that creates it, and handed to the container app from the operator's
#   shell — it never lands in a file inside this repository (guardrail 7).
#
# Key Components:
#   - need_rg / ensure_acr / ensure_token / ensure_env / ensure_app: one guard each
#   - CREATED / EXISTING counters: what the closing summary reports
#
# Created: 2026-08-18 (Phase W21)
# Last Modified: 2026-08-18
#
# Modification History (newest-first):
#   - 2026-08-18: Initial creation (Phase W21) — supersedes CH-010:51 via CH-041
#
# Related:
#   - infra/azure/README.md — what these resources are, who owns them, how to rebuild
#   - docs/03-implementation/changes/CH-041-project-writes-its-own-iac.md
#   - docs/14-adr/0010-single-region-deployment-topology.md — region
#

set -euo pipefail

# --- Parameters --------------------------------------------------------------
# Overridable so a second environment can be stood up without editing the script.
# The subscription is named, not GUID'd: the name is what a reader can verify
# against `az account list`, and it keeps an opaque identifier out of the repo.
SUBSCRIPTION="${ISMS_SUBSCRIPTION:-Azure Enterprise - RCI3_AI_Landing}"
RESOURCE_GROUP="${ISMS_RESOURCE_GROUP:-RG-RCI3AI-RAPO-N8N}"
LOCATION="${ISMS_LOCATION:-southeastasia}"
ACR_NAME="${ISMS_ACR_NAME:-acrismsgovdemo}"
ACR_TOKEN="${ISMS_ACR_TOKEN:-isms-web-pull}"
ACA_ENV="${ISMS_ACA_ENV:-cae-isms-gov-demo}"
APP_NAME="${ISMS_APP_NAME:-ca-isms-web-demo}"
IMAGE_TAG="${ISMS_IMAGE_TAG:-}"           # a commit SHA; empty means "app resource only"
TARGET_PORT="${ISMS_TARGET_PORT:-3200}"

CREATED=0
EXISTING=0

# az CLI streams build logs through the local console encoding. On a Windows
# cp1252 terminal a single '▲' in Next.js output crashes the CLI and reports it
# as a remote failure (W21 Day 1). Pin the encoding rather than re-diagnose it.
export PYTHONIOENCODING=utf-8

say()  { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
made() { printf '   \033[32mcreated\033[0m  %s\n' "$1"; CREATED=$((CREATED + 1)); }
have() { printf '   \033[36mexists \033[0m  %s\n' "$1"; EXISTING=$((EXISTING + 1)); }
die()  { printf '\n\033[31mSTOP\033[0m %s\n\n' "$1" >&2; exit 1; }

# --- Preconditions -----------------------------------------------------------

say "Preconditions"

command -v az >/dev/null 2>&1 || die "az CLI not found on PATH."

az account show >/dev/null 2>&1 || die "Not logged in. Run: az login"

az account set --subscription "$SUBSCRIPTION" \
  || die "Cannot select subscription '$SUBSCRIPTION'. Check 'az account list -o table'."
printf '   subscription  %s\n' "$SUBSCRIPTION"

# The resource group is NOT created here. See the header: the deploy identity is
# Contributor at RG scope, so `az group create` fails with AuthorizationFailed on
# every subscription. Fail early with the actual reason instead of that error.
if ! az group show -n "$RESOURCE_GROUP" >/dev/null 2>&1; then
  die "Resource group '$RESOURCE_GROUP' does not exist or is not visible to this
     identity. This script does NOT create it: the deploy identity holds
     Contributor at RESOURCE GROUP scope, not subscription scope, so creating a
     resource group needs someone else (W21 Day 0, drift D-perm-scope).
     Ask the infra team for a group in '$LOCATION', then re-run with
     ISMS_RESOURCE_GROUP set to its name."
fi
printf '   resource grp  %s (pre-existing, owned elsewhere)\n' "$RESOURCE_GROUP"

# --- Container registry ------------------------------------------------------

say "Container registry"

if az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
  have "acr/$ACR_NAME"
else
  az acr create \
    -n "$ACR_NAME" -g "$RESOURCE_GROUP" -l "$LOCATION" \
    --sku Basic \
    --admin-enabled false \
    -o none
  made "acr/$ACR_NAME"
fi

# Basic, not Premium: one image, one region, no geo-replication (plan §8 R6).
# admin-enabled false is the load-bearing one — the pre-existing registry in this
# tenant ships with it TRUE, and M0 DoD #5 forbids inheriting platform defaults.
# Assert it on every run, because the cost of it silently drifting back on is a
# shared account with push rights that nobody chose.
admin_state="$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query adminUserEnabled -o tsv)"
[ "$admin_state" = "false" ] \
  || die "acr/$ACR_NAME has adminUserEnabled=$admin_state. M0 DoD #5 requires it off.
     Fix: az acr update -n $ACR_NAME --admin-enabled false"
printf '   adminUserEnabled  false (asserted, not assumed)\n'

# --- Pull token --------------------------------------------------------------

say "Pull token"

# Why a token and not a managed identity: assigning AcrPull needs
# Microsoft.Authorization/*/Write, and that is the FIRST entry in Contributor's
# notActions. The identity route is not "harder", it is closed (W21 Day 1).
# A token authenticates on the data plane and skips RBAC entirely, is scoped to
# pull, and can be revoked on its own.
if az acr token show -n "$ACR_TOKEN" -r "$ACR_NAME" >/dev/null 2>&1; then
  have "acr-token/$ACR_TOKEN"
  printf '   (password not retrievable after creation — to rotate:\n'
  printf '    az acr token credential generate -n %s -r %s --password1)\n' "$ACR_TOKEN" "$ACR_NAME"
else
  printf '   creating token — the password below is shown ONCE and is not stored:\n'
  az acr token create \
    -n "$ACR_TOKEN" -r "$ACR_NAME" \
    --scope-map _repositories_pull \
    --query 'credentials.passwords[0].value' -o tsv
  made "acr-token/$ACR_TOKEN"
  printf '   hand it to the container app from your shell, never from a file:\n'
  printf '    az containerapp registry set -n %s -g %s \\\n' "$APP_NAME" "$RESOURCE_GROUP"
  printf '      --server %s.azurecr.io --username %s --password <paste>\n' "$ACR_NAME" "$ACR_TOKEN"
fi

# --- Container apps environment ----------------------------------------------

say "Container apps environment"

if az containerapp env show -n "$ACA_ENV" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
  have "aca-env/$ACA_ENV"
else
  # No --internal-only: the demonstration has to be openable by a stakeholder who
  # is not on the corporate network (W21 D2). The pre-existing environment in this
  # tenant is internal, which is why this one is separate rather than shared.
  az containerapp env create \
    -n "$ACA_ENV" -g "$RESOURCE_GROUP" -l "$LOCATION" \
    -o none
  made "aca-env/$ACA_ENV"
fi

# --- Container app -----------------------------------------------------------

say "Container app"

if az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" >/dev/null 2>&1; then
  have "containerapp/$APP_NAME"
  if [ -n "$IMAGE_TAG" ]; then
    az containerapp update \
      -n "$APP_NAME" -g "$RESOURCE_GROUP" \
      --image "$ACR_NAME.azurecr.io/isms-web:$IMAGE_TAG" \
      -o none
    printf '   updated image -> isms-web:%s\n' "$IMAGE_TAG"
  fi
elif [ -z "$IMAGE_TAG" ]; then
  die "containerapp/$APP_NAME does not exist and ISMS_IMAGE_TAG is unset.
     Creating it needs an image. Build one first:
       az acr build -r $ACR_NAME -t isms-web:\$(git rev-parse --short HEAD) \\
         -f apps/web/Dockerfile .
     then re-run with ISMS_IMAGE_TAG=\$(git rev-parse --short HEAD)"
else
  # DEMO_AUTH is set on purpose and is the whole point: demo-session.ts refuses to
  # hand out a persona in production unless invited. Verified by removing it in
  # W21 Day 4 — POST /api/demo-session went 200 -> 500 while / stayed 200.
  az containerapp create \
    -n "$APP_NAME" -g "$RESOURCE_GROUP" \
    --environment "$ACA_ENV" \
    --image "$ACR_NAME.azurecr.io/isms-web:$IMAGE_TAG" \
    --target-port "$TARGET_PORT" \
    --ingress external \
    --transport auto \
    --min-replicas 1 --max-replicas 2 \
    --cpu 0.5 --memory 1.0Gi \
    --env-vars DEMO_AUTH=enabled \
    -o none
  made "containerapp/$APP_NAME"
  printf '   NOTE: registry credentials are not set by this branch — run the\n'
  printf '   "az containerapp registry set" line printed by the token step.\n'
fi

# HTTPS only. Asserted every run for the same reason as adminUserEnabled: this is
# a security posture, and a posture that is only set once is a posture nobody is
# watching.
insecure="$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.allowInsecure -o tsv)"
[ "$insecure" = "false" ] \
  || die "containerapp/$APP_NAME has allowInsecure=$insecure. AC-5 requires false."
printf '   allowInsecure     false (asserted, not assumed)\n'

# --- Summary -----------------------------------------------------------------

FQDN="$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)"

say "Summary"
printf '   created  %d\n' "$CREATED"
printf '   existing %d\n' "$EXISTING"
printf '   url      https://%s\n' "$FQDN"

if [ "$CREATED" -eq 0 ]; then
  printf '\n   Nothing was created. That is the idempotency property (AC-4), not a\n'
  printf '   failure — every resource this script owns was already in place.\n'
fi

# `az containerapp create` succeeding is not the same as the site working: Container
# Apps serves through revisions, so a healthy exit code and a broken deployment look
# identical from here (plan §8 R4). Say so rather than let the green tick imply it.
printf '\n   NOT VERIFIED BY THIS SCRIPT: that the URL serves. Run\n'
printf '     node scripts/smoke-probe.mjs web https://%s\n' "$FQDN"
