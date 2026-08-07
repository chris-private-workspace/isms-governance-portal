# ADR-0006: Per-region deployment on Azure, with China on Azure China (21Vianet)

**Date**: 2026-08-07
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: 無 —— `CH-005`

---

## Context

M0's definition of done requires the topology settled (`07:31`), and `03:130` states it plainly:
**where the database physically sits is decided before M1 creates the first table.** China is in
scope (已確認參數 4), so PIPL localisation is a day-one requirement, not a later configuration.

The decision stalled because it was posed as "what does PIPL require?", which has no engineering
answer. **CH-001 dissolved that.** By enumerating every field that would cross the border, tiering
it, and moving the boundary into `Jurisdiction` configuration (`03:144`), it produced the table at
`03:133` — and that table shows **all three possible legal answers land on the same topology**,
differing only in the allowlist *value*.

Cloud is settled independently: all three existing projects run on Azure (ADR-0001 §Context).
This matters here because **Azure China is operated by 21Vianet as a physically separate cloud** —
separate endpoints, separate tenants, its own Entra ID instance.

Legal / DPO input is **not currently obtainable**. The four answerable questions are prepared at
`03:152` awaiting a route to them.

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** Per-region deployment on Azure; China on Azure China | Residency enforced by the cloud, not simulated in code; identical codebase per region; matches all three legal answers | Operational cost multiplies per region; cross-region roll-up becomes inter-process | Medium, and unavoidable under any answer |
| **B** Single global deployment with a China carve-out | One stack to operate | **Not constructible on Azure** — China is a separate cloud, not a region toggle. `03:139` already rejects it on architecture grounds: it degrades into a monolith with conditional branches, contradicting "without forking the codebase" (`03:47`) | — |
| **C** Forked codebase per jurisdiction | Maximum local freedom | Directly violates `03:47`; every feature ships N times; guardrail 3's canonical core cannot hold | High and compounding |

---

## Decision

**選 A — per-region deployment on Azure, China region on Azure China (21Vianet). The cross-border
boundary stays configuration on `Jurisdiction`, and `cross_border_max_tier` defaults to the most
restrictive value until Legal answers.**

Two facts make this decidable today without the legal input:

1. **The topology does not depend on the legal answer.** `03:133` shows T1-may-cross,
   partial-T1, and no-T1 all resolve to per-region deployment with `posture_snapshot` replication;
   only the allowlist narrows. A configuration value does not warrant an ADR.
2. **Azure makes option B impossible rather than merely unwise.** The carve-out `03:139` rejects on
   design grounds cannot be built here at all — the China deployment is in a different cloud.
   The residency guarantee is enforced by the provider, which is strictly stronger than any
   application-layer check we could write and audit ourselves.

Defaulting restrictive follows guardrail 1 (when in doubt, choose the safer and more auditable
option) and costs nothing that cannot be reversed by a configuration change.

### 否決其他選項的理由

- **B** — not constructible on the chosen cloud; and where it *is* constructible it is already
  rejected at `03:139`.
- **C** — forking is the specific failure `03:47` forbids; it also breaks guardrail 3's canonical
  core, which is the whole premise of the data model.

---

## Consequences

### 我們接受了什麼

- **The flagship dashboard covers 13 of 14 OpCos under the conservative default.** China appears
  with no comparable metrics. `03:137` requires this be surfaced, not absorbed:
  > **⚠️ To be raised explicitly with the Regional ISO and the Group CISO.** This is a knowing
  > reduction of the primary driver (已確認參數 5 — the roll-up dashboard is the flagship), taken
  > because the alternative is either an unevidenced legal assumption or blocking M0 indefinitely.
  > It is reversible by configuration once Legal answers the four questions at `03:152`.
- **Operational cost multiplies by region.** One SCA/SAST/SBOM chain per deployment, one certificate
  set, one secrets store. ADR-0001's single-language choice was made partly to halve this.
- **Per-region environment variable variants.** The China configuration is not a subset of the
  others and must be treated as independent from day one (`CLAUDE.md` §Environment Setup).
- **Azure China runs a separate Entra ID instance.** M4's role mapping must handle two identity
  planes. ⚠️ **The operational detail is unverified** — to be confirmed with the Azure team before
  M4, not assumed here. The topology argument does not depend on it.

### 這個決定約束了什麼

- **Cross-region roll-up is an API call, never a cross-region database query.** This is the
  concrete reason `05:33`'s API-first rule is load-bearing rather than stylistic, and it is why
  ADR-0001 rejected Server-Actions-style backends.
- **`posture_snapshot` is the only cross-border interface.** Its `metric_key` set is fixed and
  individually classified (CH-001); a free-form key would cross unreviewed.
- The transfer rule is enforced **at the database layer** alongside entity-scoping RLS, not in
  application code — an unlogged cross-border transfer is the one failure here that cannot be
  remediated afterwards (CH-001 §Solution).
- M8's comparison matrix must read `posture_snapshot` for **all** entities so the as-at time is
  uniform (`AD-Residency-1`).

### 可證偽條件 ⭐

1. **If Legal answers that per-region deployment is itself insufficient** — e.g. the China entity
   must be operated by a separate legal entity with separate administration — the topology is wrong,
   not merely mis-configured, and this ADR is superseded. Answers permitting *more* transfer do not
   overturn it; they only widen the allowlist.
2. If Azure China's operating model changes such that it is no longer isolated from global Azure,
   the provider-enforced guarantee this decision rests on has evaporated.
3. If a single developer cannot sustain N regional deployments, the region count — not the
   topology — must shrink; merging non-China regions is the available relief.

### Rollback

- **A → B is not available.** Azure China's separation is physical; there is no merge path.
- **Reducing region count** (consolidating non-China regions into one) is the realistic contraction
  and costs roughly a redeploy plus DNS/config work.
- **回滾窗口**: after **M1** creates tables, changing which regions exist means data migration
  across clouds. Before M1 the change is free.

---

## Security & compliance impact

*(This project's mandatory fifth block — `06:70`.)*

| Guardrail | Effect |
|---|---|
| **g8 — privacy & residency** | This decision **is** g8's implementation. Residency moves from an architectural aspiration to a provider-enforced fact. |
| **g4 — entity-scoped access** | Strengthened. Cross-entity reads are physically impossible across the China boundary. ⚠️ But roll-up remains a *legitimate* cross-entity read — it must go through an explicit, authorised scope expansion that is itself audited, never a bypass (`CLAUDE.md` 約束 8). |
| **g5 — audit-trail integrity** | Each region keeps its own hash chain, so integrity verification is **per-region**. Entity Zero evidence must therefore be produced per deployment, not once globally. |
| **g2 — Entity Zero** | The platform registers itself in **each** deployment. The China instance is its own asset with its own risks and controls. |
| **g1 — must not be a risk source** | Positive: a conservative default and a provider-enforced boundary are the safer, more auditable choice where the legal position is unknown. |
| **g7 — secure SDLC** | Negative on cost (one scanning chain per region), neutral on posture. Explicitly accepted above. |

---

## 相關

- **實作**: `CH-005` · unblocks M0 (`07:31`) → M1 → M8
- **依賴**: **CH-001** — made this decidable without Legal by tiering fields and moving the border
  into `Jurisdiction` configuration
- **相關 ADR**: ADR-0001 (API-first rejection of Server Actions follows from cross-region roll-up) ·
  ADR-0007 (Azure China's separate Entra instance) · ADR-0009 (inference location is the same
  sovereignty question applied to AI)
- **關閉**: `decision-form.md` OQ-1
- **仍待外部**: the four questions at `03:152` — answers widen the allowlist, they do not reopen
  this ADR (see 可證偽條件 #1)
