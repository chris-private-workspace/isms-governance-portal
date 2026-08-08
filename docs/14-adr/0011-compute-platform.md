# ADR-0011: Compute platform is Azure Container Apps

**Date**: 2026-08-08
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: 無 —— **不走軌**（`PROCESS.md` §1.1：產出就是一份 ADR）

---

## Context

ADR-0010 settled the topology (one region, three environments, one tenant) but not what runs the
code. `06:22` recommends "**Containers + scanned IaC** (e.g. Kubernetes + Terraform)" — a
recommendation with no ADR behind it, and the original nine ADRs never covered compute at all.

**The forcing function is external**: the Azure resource request (`CH-010`) cannot be filled in
without this. App Service and Container Apps produce different request forms. This satisfies the
condition in `14-adr/README.md` §什麼時候可以無實作先寫 — something is *already* waiting on the
answer, not merely might.

ADR-0001 fixed the shape being deployed: **two long-running HTTP services**, `apps/api` (NestJS)
and `apps/web` (Next.js), from one monorepo.

### Estate evidence (gathered 2026-08-08)

| Source | What it shows | Weight |
|---|---|---|
| `16:78` | **Azure App Service** is in the company's scanned production estate — SCM port 8172, `waws-prod-hk1-*` publish hostnames, `*.azurewebsites.net` certificates | ⚠️ Different stack — `16:79` records .NET fingerprinting headers, so a different team's systems |
| `unified-operation-platform/docs/13-deployment/01-topology.md:1` <!-- path-check: ignore — sibling repo, not in this repo's version control --> | **Azure Container Apps, deployed and running in UAT today.** `uop-api` (**NestJS**, internal ingress, targetPort 3000) + `uop-web` (external ingress, 8080); hand-written ARM at `deploy/azure/aca.json`; ACR `acruopuat.azurecr.io`; Log Analytics bound; **AKS explicitly 暫無** | ⭐ **Same stack, same shape** — this is the project ADR-0001 converged on |
| `ai-enterprise-knowledge` — `security_scan_findings_qid_review_20260808.md:205` <!-- path-check: ignore — sibling repo --> | Targets ACA + Front Door for TLS termination | ⚠️ **Production was never deployed.** Intent, not evidence |

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** Azure Container Apps | Same stack already deployed by `unified-operation-platform`; its ARM template, deploy runbook, as-built doc **and postmortem** transfer directly; scale-to-zero suits dev/staging for a single-developer project; matches `06:22`'s containerised direction | Newer service, smaller public knowledge base; ⚠️ **corporate proxy blocks its log endpoints** (see Consequences); revisions add a state axis to reason about | Low — the hard parts are already solved next door |
| **B** Azure App Service | Present in the company's production estate, so group IT already operates it; deployment slots give a staging-swap primitive | Its strongest argument is "known devils" — but they are known from **scans of another team's systems**, not from our own operations. We have no first-hand App Service runbook | Low, but with no transferable assets |
| **C** AKS | Maximum control; matches `06:22`'s literal "e.g. Kubernetes" | A cluster is a **second system to secure, patch and prove compliant** — for two HTTP services run by one person that is directly against guardrail 1. The sibling explicitly recorded AKS as 暫無 (`05-rci-par-process.md:54`) <!-- path-check: ignore — sibling repo --> | High and recurring |

---

## Decision

**選 A — Azure Container Apps**, one ACA environment per deployment environment, `apps/api` on
**internal** ingress and `apps/web` on external, images from a single shared Azure Container Registry.

Three reasons, in order of weight:

1. **Estate convergence — with a correction to what "estate" means here.** ADR-0001 chose NestJS
   because four of five layers were already uniform across the group's projects. The same argument
   applies, but it must point at the project that **shares our shape**, not merely at the largest
   footprint. App Service runs someone else's .NET systems; Container Apps runs a NestJS API plus a
   web front end from a monorepo — that is this project, one deployment ahead.
2. **What transfers is operational, not architectural.** An ARM template, a deploy runbook, an
   as-built document, and — most valuable — **a postmortem** (`BUG-008`). <!-- path-check: ignore — sibling repo -->
   Scar tissue from a real deployment is worth more than any feature comparison.
3. **The cost shape fits.** Three environments, one developer. dev and staging can scale to zero.

### ⚠️ A reason that was considered and found false

During drafting, "App Service inherits bad platform defaults, Container Apps does not" was proposed
and **withdrawn**. ACA's `*.azurecontainerapps.io` is equally a platform default certificate, and
the sibling's as-built doc records it has **no enterprise domain entry at all**
(`07-uat-as-built.md:11`). <!-- path-check: ignore — sibling repo -->
`04:93` binds both platforms identically. It is recorded here because a discarded reason that
sounds good will otherwise be re-proposed.

### 否決其他選項的理由

- **B (App Service)** — the "known devils" advantage evaporates on inspection: the devils are known
  from Qualys/Rapid7 output on other teams' systems, not from anything we operate. Between a
  documented findings register we did not produce and a documented runbook a sibling project did,
  the runbook is the better asset.
- **C (AKS)** — guardrail 1 says the platform must not itself be a source of risk. A Kubernetes
  cluster maintained by one person, alongside the ISMS platform it hosts, is a second attack surface
  and a second compliance obligation for no capability this project needs.

---

## Consequences

### 我們接受了什麼

- ⚠️ **The corporate proxy blocks ACA's log endpoints.** `BUG-008/postmortem.md:64` <!-- path-check: ignore — sibling repo -->
  records three separate attempts — `az containerapp logs show`, Log Analytics query — all
  MITM-blocked on `azurecontainerapps.dev`. Diagnosis fell back to layered HTTP probing.
  **This is accepted with eyes open**, and it directly raises the price of weak application
  logging: we cannot rely on reading container stdout interactively, so structured logs must be
  shipped deliberately rather than scraped after the fact.
- **Template and running container are two separate books.** Daily deploys go through
  `az containerapp update --image`, which does not touch the ARM template, and environment
  variables can be set directly on the container. **Container state cannot be inferred from the
  template file** — "is X configured?" is answered by `az containerapp show`, never by reading IaC.
  This is the same evidence discipline `verification-discipline.md` §證據層變體 already demands.
- **Revisions are a state axis.** Deploy creates a revision; rollback re-points to a prior image tag.
  Any "which version is live" claim must be verified against `az containerapp revision list`.
- Newer service than App Service, with a correspondingly smaller body of public troubleshooting.

### 這個決定約束了什麼

- **ADR-0001's "containerised Node service" becomes binding.** `apps/api` and `apps/web` each need
  a Dockerfile in M0.
- ⭐ **This closes one third of `AD-SecScan-1`.** `security-scan.yml`'s container-image scan is
  currently skipped because there is no Dockerfile. Once M0 produces them, that job becomes
  executable — one of the three permanently-skipping scans becomes real (guardrail 7, `04:71`).
- **An Azure Container Registry is required** — one, shared across all three environments,
  distinguished by image tag. It is the first shared resource in an otherwise per-environment design.
- **Custom domain + certificate is mandatory** (`04:93`). ⚠️ The sibling did **not** do this, so
  this part cannot be copied — it must be built.
- **`apps/api` gets internal ingress; only `apps/web` is externally reachable.** This matches the
  sibling's shape and is also the least-privilege default (guardrail 6).
- **IaC tool is not decided here.** ARM/Bicep (what the sibling wrote by hand) versus Terraform is
  deferred to `CH-010`; `04:73` requires only that whatever is chosen is scanned before apply.

### 可證偽條件 ⭐

1. **If proxy blocking makes ACA operationally undiagnosable** — an incident occurs that cannot be
   diagnosed without container logs, and layered probing is insufficient — the observability cost
   exceeds the convergence benefit and this ADR reopens. The bar is deliberately set at *worse than
   what `unified-operation-platform` already tolerates*, since that project has survived it.
2. **If ACA cannot satisfy the 28-point DoD (`16`)** — specifically explicit TLS/certificate control
   and management-surface exposure — it fails guardrail 1, and App Service, whose findings register
   is at least documented, becomes the safer choice.
3. If group IT mandates a standard compute platform, organisational convergence points elsewhere —
   the same shape as ADR-0001 §可證偽條件 #3.

### Rollback

- **ACA → App Service**: both run OCI images, so the artifact is portable. The cost is IaC, ingress
  and certificate re-work — roughly **2–3 days**. Business code is unaffected.
- **ACA → AKS**: possible but pointless; option C was rejected on operating cost, which rollback
  does not change.
- **回滾窗口**: cheapest **before M0's IaC lands**. After that each environment must be re-provisioned.

---

## Security & compliance impact

*(This project's mandatory fifth block — `06:70`.)*

| Guardrail | Effect |
|---|---|
| **g1 — must not be a risk source** | Mixed, stated honestly. Positive against AKS: no cluster to patch or prove. ⚠️ Negative on observability: **a platform whose logs we cannot read is harder to prove safe**. Net accepted because the sibling operates it today and the mitigation (ship structured logs deliberately) is within our control. |
| **g5 — audit-trail integrity** | ⚠️ **Indirect negative.** Trail *integrity* is a database concern and unaffected. Incident *investigation* is harder when container logs are proxy-blocked. Mitigation is architectural, not operational: emit application-level structured logs to Log Analytics rather than depending on stdout retrieval. |
| **g6 — least privilege / SoD** | Positive. Internal ingress for `apps/api` means the only externally reachable surface is the web app. |
| **g7 — secure SDLC** | ⭐ Positive and concrete. Containerising makes `security-scan.yml`'s container scan executable — one of the three jobs currently skipping (`AD-SecScan-1`) becomes real. |
| **g4 — entity-scoped access** | Neutral. Enforcement is at the database (ADR-0004); no compute platform changes that. |
| **g8 — privacy & residency** | Neutral. Single region (ADR-0010). |
| **g2 — Entity Zero** | The platform's own compute is an asset in its own register. ACA **revisions are a change-management surface** and must appear in the self-assessment, not just the application's own audit trail. |

---

## 相關

- **實作**: 不走軌（`PROCESS.md` §1.1）—— unblocks **`CH-010`** (Azure resource request) and M0
- **Forcing function**: `CH-010`'s resource request is already waiting on this
  (`14-adr/README.md` §什麼時候可以無實作先寫)
- **相關 ADR**: **ADR-0001** (its "containerised Node service" becomes binding) ·
  **ADR-0010** (single region × 3 environments) · ADR-0004 (unaffected — RLS is a database concern)
- **關閉**: `BACKLOG.md` §Pending Decisions 的「計算平台」列
- **推進**: `AD-SecScan-1` —— the container-image scan becomes executable once M0 ships Dockerfiles
- **上游證據**: `unified-operation-platform/docs/13-deployment/` <!-- path-check: ignore — sibling repo, local disk only, deliberately not in this repo -->
