---
status: done   # proposed | approved | active | done | cancelled —— 機器可讀的唯一權威
affects_components: []
---

# CH-005 — Settle the three foundation ADRs that unblock M0

**Date**: 2026-08-07
**Phase**: 無 —— 獨立 CH
**Scope**: `core-model` · `entity-scope` · `identity` · `api` · `ui` — ADR 撰寫（**NO code / NO migration / NO 新依賴**）
**Status**: 已完成（使用者 2026-08-07 拍板後端框架、雲、範圍三項；同日交付並驗證）
**PR**: #TBD

---

## Problem

Nine ADRs were identified at project start as Wave 1 blockers. **None has been written**
(`docs/14-adr/` contains only `README.md` and `0000-TEMPLATE.md`).

The blocking chain is complete and verifiable:

- `07-wave1-build-plan.md:31` — M0's definition of done requires **ADR-0001 settled** and
  **per-region topology decided (ADR-0006)**.
- `CLAUDE.md` §Scopes — all eight scope directories read `⚠️ 待 ADR-0001`.
- `CLAUDE.md` §Development Commands — lint / type-check / test / build are all placeholders.
- M1 cannot create a table before the topology settles (`03:130`).

Secondary problem, recorded in `decision-form.md:28`: **all eight open questions have
`誰能決定 = ⚠️ 未指定`**, and the file's own rule states that until a decider is named,
no row moves to 已拍板.

## Root Cause

Not "nobody got around to it". Three distinct causes, each with a different fix:

**1. Two ADRs were believed to need an external input they do not need.**
ADR-0006 was framed as "what does PIPL require?", which has no engineering answer. CH-001 already
dissolved this by tiering the fields and moving the border into `Jurisdiction` configuration
(`03:144`). The consequence went unnoticed: `03:133` shows **all three possible legal answers land
on the same topology** — per-region deployment, differing only in the allowlist *value*. A
configuration value does not require an ADR. The topology was decidable all along.

**2. The technology choice was treated as an isolated decision for this project.**
`06-tech-stack-and-decisions.md:19` posed ADR-0001 as an abstract trade-off ("built-in
auth/permissions/history vs. end-to-end TypeScript") without reference to any existing asset. The
organisation already runs three projects whose stacks were never entered into the comparison. Once
inspected, four of the five layers turn out to be **already standardised**, and the decision
collapses to one open cell.

**3. `decision-form.md` demands a decider but nothing enforces it.**
Same failure shape as PROCESS R9 before `check_status_markers.py` existed: a rule with nothing to
make it fail. Out of scope for this CH; recorded as a carryover.

---

## Solution

### 範圍決策

The user settled three things on 2026-08-07, and each narrowed the work rather than expanded it:

| 拍板 | 決定 | 效果 |
|---|---|---|
| 後端框架 | **NestJS + Prisma** | ADR-0001 closes; matches `unified-operation-platform` |
| 雲 | **Azure** | Gives ADR-0006 a concrete topology instead of an abstract one |
| CH 範圍 | **三份**（0001 · 0006 · 0007） | 0007 gained real evidence, so writing it is no longer speculation |

**Deliberately excluded — and why each exclusion is principled, not convenience:**

| ADR | 為什麼不在這次 |
|---|---|
| **0002** Workflow engine | `decision-form.md:25` marks it ⚠️ **需先 spike**. Deciding without one produces an unfalsifiable §可證偽條件 |
| **0003** Audit hash-chain | Its real criterion is **write throughput**, which cannot be measured with zero code. Extract after the W01 spike |
| **0004** RLS enforcement | Depends on measured pooler behaviour under Prisma 7's driver adapter. Same reason |
| **0005** Governed extension storage | Needs a real table to validate JSONB + field-catalog cost. Same reason |
| **0008** AI agent architecture | Wave 3. Deciding now is guessing |

This split follows `memory/feedback_doc_growth_follows_runtime.md:45` — "我們比較了 A/B/C，選了 A" is
a legitimate ADR **只在真的試過之後**. The three in scope are decidable from evidence that already
exists (existing repos, Azure's China topology, CH-001's field tiering); the four excluded are not.

### 逐項變更

**1. `docs/14-adr/ADR-0001-backend-framework.md`** — **NestJS 10 + Prisma 7 (`@prisma/adapter-pg`)**,
`apps/api` + `apps/web` + `packages/types` monorepo.

Decided on organisational evidence rather than framework merit. Four of five layers are already
uniform across `ai-enterprise-knowledge-solution-project`, `unified-operation-platform` and
`ai-document-extraction-project`: **Next.js + Tailwind + shadcn frontend · PostgreSQL · Microsoft
Entra ID · Azure**. Only the backend framework differed (FastAPI / NestJS / Next.js route handlers).
Adopting NestJS converges on an existing internal deployment instead of introducing a fourth stack.

Rejected `Next.js`-as-backend explicitly, because Server Actions **remove** the API layer that
`05:33` requires ("the UI is just another client") — and this project has three consumers that need
it: the connector framework (`05:34`), the Wave 3 agent's entity-scoped retrieval (`14:22`), and
**cross-region roll-up, which is inter-process by construction** under ADR-0006.

**2. `docs/14-adr/ADR-0006-deployment-and-residency-topology.md`** — **per-region deployment on
Azure**, with the China region on **Azure China (21Vianet)**, and
`Jurisdiction.cross_border_max_tier` defaulting to the most restrictive value.

Azure China is a physically separate cloud with its own endpoints and its own Entra ID instance.
The topology `03:139` rejected — "single deployment with a China carve-out" — is not merely
discouraged here, it is **not constructible**. The residency boundary is enforced by the cloud
rather than simulated in application code.

**3. `docs/14-adr/ADR-0007-identity-provider.md`** — **Microsoft Entra ID**, superseding the
design handoff's Okta.

All three existing projects authenticate against Entra ID (`python-jose` + `msal-react` /
`jwks-rsa` / `next-auth v5`). ⚠️ This **contradicts the design deliverable**: CH-002 found
`sessionPolicy.js` names Okta explicitly
(`docs/09-analysis/mockup-data-vs-spec-audit-20260807.md:199`, "direct input to ADR-0007"). Under
CLAUDE.md 約束 6 a deviation from the deliverable must be **recorded, not silently applied** —
so ADR-0007 carries the deviation and `15-design-alignment.md` gains the corresponding row.

### ⭐ 關鍵設計細節

- **Prisma client extension is the single interception point for BOTH guardrail 4 and guardrail 5.**
  Wrapping every query in `$transaction` + `set_config('app.entity_scope', …, true)` (the
  transaction-scoped equivalent of `SET LOCAL`) makes RLS enforceable at the database layer *and*
  gives the audit hash-chain one place every write must pass through. Two guardrails, one mechanism
  — the same shape as CH-001's `cross_border_pseudonymise_actors`.
  **This is a design intent recorded here, not a verified claim** — ADR-0004 validates it after the
  W01 spike. If it fails, ADR-0001's §可證偽條件 fires.

- **`cross_border_max_tier` defaults restrictive, and the cost must be surfaced, not absorbed.**
  Under the conservative default the flagship comparison matrix covers **13 of 14 OpCos**. `03:137`
  requires this be raised with the stakeholder explicitly. Relaxing it after Legal answers is a
  configuration change, not a re-architecture — which is the whole point of CH-001.

- **Azure China's separate Entra ID instance is an unverified operational detail.** The topology
  argument does not depend on it, but M4's role mapping does. Flagged in ADR-0006 §Consequences for
  confirmation with the Azure team rather than asserted.

### 明確不做的

| 不做 | 去向 |
|---|---|
| ADR-0002 / 0003 / 0004 / 0005 | W01 spike → retrospective → extract |
| ADR-0008 | Wave 3 |
| ADR-0009 (AI processing location) | Principle already binding via CLAUDE.md 約束 7; the ADR itself waits for Wave 3 |
| Naming a decider for the remaining OQs | → BACKLOG（`decision-form.md:28` 的 meta 問題） |
| 寫任何 code / 建 monorepo 骨架 | W01 M0 |

---

## Verification

### Gate

`run_all` 5/5 · **no code, no build, no tests** — documentation-only change.

### Acceptance Criteria

| # | 條件 |
|---|---|
| **A1** | Three ADRs exist under `docs/14-adr/` with the template's four blocks **plus** this project's mandatory fifth block, §Security & compliance impact (`06:70`) |
| **A2** | Every ADR's §Options lists **≥ 2** options (`0000-TEMPLATE.md:38`) |
| **A3** | Every ADR has a non-empty **§可證偽條件** stating an observation that would overturn it (`0000-TEMPLATE.md:67`) |
| **A4** | `docs/14-adr/README.md` §索引 has one row per new ADR, and the three rows in §尚待撰寫 are removed |
| **A5** | `decision-form.md` — OQ-1 / OQ-2 / OQ-5 moved from 開放中 to 已拍板 with their ADR reference (R4) |
| **A6** | `CLAUDE.md` §Project Status Tech Stack, §Scopes 目錄欄 (8 rows), §Development Commands, §Services/Ports reflect the decision |
| **A7** | ADR-0007 records the Okta→Entra ID deviation, and `15-design-alignment.md` gains the matching row |
| **A8** | `python scripts/lint/run_all.py` → 5/5 |

### 新增測試

None — documentation change. The decisions become testable at M0/M2: ADR-0004's RLS design gains
the four entity-scope tests in `rules-on-demand/multi-tenant-data.md` §測試, plus CH-001's fifth
(a snapshot row whose `metric_key` is outside the jurisdiction allowlist must not replicate).

### Drive-through

⚪ **N/A — no user-facing surface exists yet.** Reported as **gate-only verified**.

### ⚠️ Drive-through 抓到而 gate 沒抓到的

N/A this change. Two defects were nonetheless found while gathering evidence, both invisible to all
five detectors — recorded under §相關 產生的待辦.

---

## Impact

- **Breaking change**: no
- **Migration required**: no — no schema exists
- **Config change**: none yet. ADR-0006 implies **per-region environment variable variants**;
  the China region's configuration is not a subset of the others (`CLAUDE.md` §Environment Setup)
- **重啟需求**: —
- **Rollback**: revert the PR. ADRs are superseded rather than edited (`14-adr/README.md:102`), so
  reversing a decision later means writing a new ADR, not deleting these

---

## 相關

- **關掉的 AD**: none directly — closes **OQ-1 / OQ-2 / OQ-5** in `decision-form.md`
- **Unblocks**: M0 (`07:31`) → M1
- **依賴**: CH-001 (field tiering made ADR-0006 decidable without Legal)
- **產生的待辦**（→ `docs/01-planning/BACKLOG.md`）:
  1. **`mockup-fidelity.md:38` 紅線 7 是錯的** — it mandates `oklch(var(--token))`, but this
     project's tokens are HEX (`styles/tokens.css:24` `--primary: #2A5BD7`). `oklch(#2A5BD7)` is
     invalid CSS and fails silently. Same defect in the playbook's Layer 3. **Fix before the first
     frontend page.**
  2. **`docs/02-architecture/README.md` §核心設計文件 is an unfilled template** — it lists
     `00-vision.md` / `01-architecture.md` / `02-tech-stack-decisions.md` as 待寫 while the actual
     files are `00-project-charter.md` / `01-architecture-overview.md` /
     `06-tech-stack-and-decisions.md`. No detector catches this: the phantom names are plain table
     text, not links, so `check_doc_links` and `check_path_references` both pass.
  3. **Name a decider for the remaining open questions** (`decision-form.md:28`).
- **Design note**: none — this is a decision record, not a spike extract
