# ADR-0010: Single-region deployment on Azure — three environments in one tenant

**Date**: 2026-08-08
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: 無 —— `CH-008`

**取代**: ADR-0006（per-region deployment on Azure, China on Azure China）

---

## Context

**The premise ADR-0006 rested on has been withdrawn.** On 2026-08-08 the project owner removed
China from the platform's scope entirely — not deferred, removed. The China OpCo will not be
onboarded, will not have an `OrgEntity` record populated, and will not enter data.

ADR-0006 was correct on its own terms and its central argument still holds: `03:133` showed that
all three possible legal answers land on the same topology. But its forcing function was
`已確認參數 4` — "China in scope → PIPL localisation is a day-one requirement". With China out,
**no remaining jurisdiction carries a hard localisation requirement**. `03:41` names exactly one:

> Some APAC jurisdictions require data localisation (**e.g. China PIPL**); others permit
> cross-border transfer under conditions.

M0 still needs a settled topology (`07:31`), and the Azure resource request cannot be filled in
without one. So the question is not whether to decide, but what the honest decision is now that
the driver is gone.

Two facts frame the timing:

- **ADR-0006 §Rollback set the window**: before M1 creates tables, changing which regions exist is
  free; after M1 it means cross-cloud data migration. **We are before M1**, so this is the cheapest
  moment this decision will ever be made.
- **RCN was always the least-confirmed OpCo.** `15:28` still reads
  *(code and legal name to confirm)* — the only one of the fourteen whose company code and legal
  entity name were never established.

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** Single region, three environments (dev / staging / prod) in one tenant | Lowest operational cost for a single developer; the resource request can be filled in today; roll-up returns to an in-database cross-entity query, which simplifies M8 substantially | Region-partitioning capability is gone. If an in-scope jurisdiction tightens later, that is a re-architecture, not a configuration change | Low |
| **B** Deploy one region, but keep the partitioning abstraction (region-parameterised IaC, roll-up over an API rather than a query) | Adding a region later looks cheap | **This is AP-5.** `CLAUDE.md` §禁止反模式 forbids abstractions built "for a future that might come". Worse, an abstraction with no consumer is never exercised: with one region the roll-up API never actually crosses a process boundary, so it would still need rebuilding when a second region appears. Cost paid, insurance not bought | Medium, and recurring |
| **C** Keep ADR-0006's per-region topology | Zero cost if China returns | There is no second region to deploy. Pays an N× operational multiplier for a capability with no current user | High |

---

## Decision

**選 A — a single deployment region on global Azure, with three environments (dev / staging /
prod) inside the organisation's existing tenant. `prod` gets its own subscription; `dev` and
`staging` share a second one.**

The decisive point is not that A is cheapest — it is that **B is the tempting wrong answer**.
Keeping the partitioning abstraction feels like prudence, but an unused abstraction is not a
half-built feature; it is an unverified claim. The roll-up path that never crosses a process
boundary is not "ready for a second region" — nobody has ever run it against one. So B pays the
complexity in full and receives none of the option value it appears to buy. That is precisely the
failure `CLAUDE.md` AP-5 names.

A states the cost plainly instead of hiding it behind an abstraction: **if an in-scope jurisdiction
imposes localisation later, that is a re-architecture.** `03:148`'s original promise — "if Vietnam
or Indonesia tighten later, the same mechanism applies without a new ADR" — expires with this
decision, and that expiry is recorded rather than quietly inherited.

### Operational parameters (settled with this ADR)

| Parameter | Value |
|---|---|
| Regions | **1** — **RCI3, Azure Singapore Datacenter** (global Azure). The *count* is this ADR's decision; the *region* was settled by `CH-010` on 2026-08-10 with the resource request |
| Environments | **3** — `dev` · `staging` · `prod` |
| Subscriptions | `prod` isolated; `dev` + `staging` share. Rationale: subscription is Azure's cleanest permission boundary, which is what guardrail 6 (least privilege / SoD) wants |
| `prod` RTO / RPO | **4 hours / 15 minutes** |
| `dev` / `staging` RTO / RPO | 1 working day / 24 hours; no HA |

<!-- 2026-08-10: parameter back-fill by CH-010, NOT a change of decision — the reasoning above is
     untouched (see 14-adr/README.md §取代舊 ADR 的流程). The Regions row previously read
     "region choice deferred to CH-009": a stale pointer, since CH-009 was reassigned to the
     track-classification fix. The §相關 note at the foot of this file recorded that reassignment
     on 2026-08-08 but this row was not updated with it. -->

The RPO is tighter than an internal governance tool would normally warrant. The reason is
guardrail 5: losing audit-trail entries is not data loss, it is a **break in an evidence chain**.

### 否決其他選項的理由

- **B** — the AP-5 argument above. Additionally, `06:22`'s "deployment-portable" principle is
  satisfied by containerisation and scanned IaC, which A retains; it does not require a
  multi-region control plane to be built speculatively.
- **C** — ADR-0006's own falsifiability condition #3 anticipated this shape: "if a single developer
  cannot sustain N regional deployments, the region count — not the topology — must shrink". With
  China removed, N is 1, and a per-region topology over one region is just a topology.

---

## Consequences

### 我們接受了什麼

- **Region partitioning is gone, and re-acquiring it is a re-architecture.** This is the whole
  price of the decision. `03:148`'s "no new ADR needed" promise is void; a future localisation
  requirement reopens this ADR and costs data migration if it arrives after M1.
- **The flagship dashboard covers 13 OpCos — permanently, and for a different reason than before.**
  ⚠️ ADR-0006 §Consequences records that the 13/14 figure was surfaced to the **Regional ISO and
  Group CISO** with the qualifier *"reversible by configuration once Legal answers"*. **The number
  is unchanged; its nature is not.** That message needs a one-sentence correction — this is the
  single item in this ADR that cannot be discharged inside the repository.
- **CH-001's cross-border mechanism has no consumer.** The analysis (the field-tiering table in
  `03` §Cross-border, the `cross_border_*` column definitions in `02a` §3) is retained as a data
  classification reference. The **enforcement** — database-layer transfer rules, `posture_snapshot`
  replication — is not built in Wave 1. Building it would be AP-5.
- **The four questions for Legal at `03:152` are moot.** They asked what may cross the China
  border. There is no China border. `AD-Decider-1` closes.

### 這個決定約束了什麼

- **Roll-up becomes an in-database cross-entity query.** ⚠️ This does **not** relax
  `CLAUDE.md` 約束 8: roll-up remains a *legitimate but explicit* scope expansion that must be
  authorised and audited. What changed is that it is no longer inter-process — not that it is
  no longer governed. A single deployment makes the bypass *easier to write*, which makes the
  entity-scoping tests more important, not less.
- **ADR-0001's third API consumer is dead.** `0001:38` lists three consumers requiring the API
  layer: the connector framework, the Wave 3 agent, and "cross-region roll-up, which is
  inter-process by construction under ADR-0006". **The third no longer exists.** ADR-0001 is *not*
  reopened — its decisive argument was estate convergence (one open layer out of five), and two
  consumers still require the API layer — but anyone reading `0001:38` in future must know that
  clause is spent.
- **ADR-0007's two identity planes collapse to one.** There is no separate Azure China Entra
  instance to reconcile. ADR-0007 is not reopened; its M4 note about administering two planes
  simply does not apply.
- **`Jurisdiction` is still built.** It carries jurisdiction tagging for the obligation library
  (`10` frameworks-first). That purpose is independent of cross-border transfer, and removing the
  entity as part of this change would leave M2 short a core entity.
- **Environment variables no longer have per-region variants.** `CLAUDE.md` §Environment Setup's
  warning about China's configuration being independent no longer applies.

### 可證偽條件 ⭐

1. **If any in-scope jurisdiction (Vietnam, Indonesia, Korea, …) imposes a hard localisation
   requirement on its OpCo**, this ADR is overturned and partitioning must be reconsidered.
   Note the asymmetry deliberately accepted: this is a **re-architecture**, not a configuration
   change — that is the risk this decision buys.
2. **If China re-enters scope**, this ADR is superseded and ADR-0006's argument can be revived
   intact — its reasoning was never falsified, only its premise withdrawn.
3. If single-region latency proves unacceptable for Oceania or South Asia users, the region count
   must rise — but that is a **performance** driver, not a compliance one, and its remedy is
   different in shape (CDN, read replica) from full partitioning. Reaching for this ADR to justify
   partitioning on latency grounds would be a category error.

### Rollback

- **A → partitioned**: free **before M1**, identical to ADR-0006's window. After M1 it requires
  data migration for whichever entities move.
- **回滾窗口**: **M1**. This is the same deadline ADR-0006 set, and it is why this decision is
  being taken now rather than during W01.

---

## Security & compliance impact

*(This project's mandatory fifth block — `06:70`.)*

| Guardrail | Effect |
|---|---|
| **g8 — privacy & residency** | ⚠️ **Weakened in capability, neutral in obligation.** The platform no longer *can* partition by region; it also no longer *must*, since no in-scope jurisdiction requires it. Stated explicitly rather than omitted, per `06:70`. The residual exposure is falsifiability condition #1. |
| **g4 — entity-scoped access** | ⚠️ **Weakened by removal of a physical backstop.** Under ADR-0006 the China boundary made certain cross-entity reads physically impossible. Now every entity's data sits in one database, so **RLS is the only barrier**. This raises, not lowers, the bar on ADR-0004 and on the four scope tests `CLAUDE.md` 約束 8 requires per endpoint. |
| **g5 — audit-trail integrity** | Positive. One hash chain instead of N; integrity verification is a single routine, and Entity Zero evidence is produced once rather than per deployment. |
| **g2 — Entity Zero** | Simplified. The platform registers itself once. |
| **g1 — must not be a risk source** | Mixed and stated honestly. Removing a provider-enforced isolation boundary (g4 above) is a genuine reduction in defence in depth; it is accepted because the data that boundary protected is no longer in the system at all. |
| **g7 — secure SDLC** | Positive. One SCA/SAST/SBOM chain, one certificate set, one secrets store — the per-region multiplier ADR-0006 accepted is removed. |

---

## 相關

- **取代**: **ADR-0006** —— its Status line is updated; its body is left untouched so the evolution
  of the judgement stays legible (`14-adr/README.md:110`)
- **實作**: `CH-008` · unblocks `CH-010` (Azure resource request) and `ADR-0011` (compute platform)
  <!-- 2026-08-08: pointer only — CH-009 was reassigned to the track-classification fix. The
       decision and its reasoning are untouched; see 14-adr/README.md §取代舊 ADR 的流程. -->
- **相關 ADR**: ADR-0001 (its third API consumer is spent — see 這個決定約束了什麼) ·
  ADR-0007 (two identity planes collapse to one) · ADR-0009 (the sovereignty rationale for
  `CLAUDE.md` 約束 7 loses its China basis — tracked as `AD-Constraint7-1`)
- **參數回填**: [`CH-010`](../03-implementation/changes/CH-010-azure-resource-request.md) settled the
  region — **RCI3, Azure Singapore** — on 2026-08-10, closing the only value this ADR left open
- **關閉**: `AD-Decider-1` · `decision-form.md` OQ-1 re-points here
- **不再適用**: the four questions for Legal at `03:152`
