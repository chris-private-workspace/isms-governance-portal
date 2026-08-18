# Azure resources for the web demonstration

**Purpose**: What runs in Azure, who owns it, how to rebuild it, and what this directory deliberately does not do.
**Category / Scope**: Infrastructure / Phase W21
**Created**: 2026-08-18
**Last Modified**: 2026-08-18
**Status**: Active

> **Modification History**
> - 2026-08-18: Initial creation (Phase W21)

---

## What this is

One environment, serving one thing: `apps/web`, the 29-route demonstration, so that a
stakeholder can open it in a browser without a developer present.

**It is not staging and it is not production.** `ADR-0010` calls for three environments;
this is the first, and the other two do not exist. Nothing here has a database, an API,
a real identity provider, or a single row of real data.

| Resource | Name | Notable setting |
|---|---|---|
| Resource group | `RG-RCI3AI-RAPO-N8N` | ⚠️ **not ours** — see [Ownership](#ownership) |
| Container registry | `acrismsgovdemo` | Basic · **`adminUserEnabled: false`** |
| Registry token | `isms-web-pull` | scope map `_repositories_pull` (pull only) |
| Container apps environment | `cae-isms-gov-demo` | **external** (no VNet) |
| Container app | `ca-isms-web-demo` | `allowInsecure: false` · `DEMO_AUTH=enabled` · 0.5 CPU / 1 GiB · 1–2 replicas |

**URL**: `https://ca-isms-web-demo.wonderfulsmoke-9097eb48.southeastasia.azurecontainerapps.io`

Region is `southeastasia` because `ADR-0010` says RCI3 Singapore. That one was a choice.
Most of the others below were not.

---

## Ownership

**The resource group belongs to another project.** The deploy identity holds Contributor
at *resource group* scope, not subscription scope — measured, not assumed: `az group create`
returns `AuthorizationFailed` on every visible subscription (W21 Day 0, drift `D-perm-scope`).
Of the groups it can write to, exactly one is in `southeastasia`: `RG-RCI3AI-RAPO-N8N`,
which is the N8N project's.

So the ISMS demo resources sit inside somebody else's group. That is a known cost, recorded
here so the next person does not read it as a naming mistake. Getting a group of our own is
an infra-team request, not something this repository can do.

`provision.sh` therefore **checks** for the group and refuses with that explanation, rather
than trying to create it and failing with an error that reads like a bug in the script.

---

## Rebuilding it

```bash
# 1. Resources (idempotent — a second run creates nothing and says so)
bash infra/azure/provision.sh

# 2. Build the image IN THE CLOUD, tagged with the commit
az acr build -r acrismsgovdemo -t isms-web:$(git rev-parse --short HEAD) \
  -f apps/web/Dockerfile .

# 3. Point the app at it
ISMS_IMAGE_TAG=$(git rev-parse --short HEAD) bash infra/azure/provision.sh

# 4. Prove it serves — step 3 succeeding does not
node scripts/smoke-probe.mjs web https://<fqdn>
```

Overridable inputs: `ISMS_SUBSCRIPTION` `ISMS_RESOURCE_GROUP` `ISMS_LOCATION` `ISMS_ACR_NAME`
`ISMS_ACR_TOKEN` `ISMS_ACA_ENV` `ISMS_APP_NAME` `ISMS_IMAGE_TAG` `ISMS_TARGET_PORT`.

### Why `az acr build` and not `docker build && docker push`

**This machine cannot reach `*.azurecr.io`.** Not our registry specifically — the
pre-existing `acrrci3ailanding1` is equally unreachable, which is the control that turns
"I built the registry wrong" into "the network does not allow this" (W21 Day 0, `D-acr-unreachable`).
The cause surfaced on Day 1: a TLS-inspecting corporate proxy whose CA is not in Node's or
curl's trust store. `az acr build` runs the build in Azure over the management plane and is
unaffected.

Consequence for anyone diagnosing from a corporate laptop: `curl` returning `000` against
the deployed URL is **this machine**, not the deployment. `curl -k` answers in 0.29s.

### The `.dockerignore` trap

`.dockerignore` is read by two different packers that do not agree. `az acr build` does not
apply `**/` patterns, so `**/node_modules/` excludes nothing for it while excluding
everything for `docker build`. The file now carries both forms — the plain paths look
redundant under Docker and are the only ones that work under `az` (W21 Day 0, `D-az-packer-glob`).

---

## The three security settings that were chosen rather than inherited

M0 DoD #5 says TLS, certificates and management ports must be *explicitly set*, never left
at platform defaults. This environment is the first place in the project where that
requirement had anything to point at. What it produced:

1. **`adminUserEnabled: false` on the registry.** The tenant's existing registry has it
   `true`. An admin user is exactly the shape the rule forbids: a shared credential the
   platform opens for you. `provision.sh` re-asserts this on every run, because a setting
   made once is a setting nobody is watching.
2. **A scoped pull token instead of a managed identity.** Not a preference — assigning
   `AcrPull` needs `Microsoft.Authorization/*/Write`, and that is the first entry in
   Contributor's `notActions`. The identity route is closed, not merely harder. The token
   is narrower than an admin user anyway: pull only, independently revocable.
3. **`allowInsecure: false`.** Plain HTTP is refused, HSTS is set by the app
   (`next.config.ts:27`), and all six security headers were confirmed **on the deployed URL**
   rather than assumed to travel with the container (W21 Day 3).

**What is still missing**: there is no Content-Security-Policy. That is a pre-existing gap in
`SECURITY_HEADERS`, not something the deployment dropped — it is in `BACKLOG.md`.

---

## What this directory does NOT do

- **No CI deployment.** `deploy-web.yml` does not exist. GitHub Actions has no Azure identity:
  `az ad app create` fails with `Insufficient privileges`, so the OIDC route needs an app
  registration only the infra team can create. Writing the workflow anyway would be a pipeline
  that can never run — AP-3, and "what breaks if you turn it off" has no answer. Deploys are
  manual until a credential exists.
- **No API, no database.** `apps/api` cannot start under `NODE_ENV=production` at all:
  `policy.module.ts:35` calls `assertDevPrincipalAllowed()` during module construction. That
  unblocks at M4 (Entra ID), not here.
- **No Key Vault, no managed identity, no autoscale rules, no staging or production.**
  There is no runtime secret to protect while there is no API and no database.

---

## Related

- `docs/03-implementation/changes/CH-041-project-writes-its-own-iac.md` — why this directory
  exists at all, given that `CH-010:51` recorded "this project does not write IaC"
- `docs/14-adr/0010-single-region-deployment-topology.md` — region and environment count
- `docs/01-planning/W21-azure-web-demo-deploy/` — plan, checklist, progress, retrospective
