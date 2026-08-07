# 07 — Wave 1 Build Plan

Wave 1 delivers the **backbone plus proof modules** that exercise it end-to-end. The primary driver is **internal governance & visibility**, so the **cross-entity roll-up dashboard is the flagship deliverable** and the scope stays lean (no compliance/incident modules pulled forward). Build in the order below; each step depends on the ones before it.

## Scope

**In:** core data model; multi-entity & jurisdiction model with entity-scoping; identity/RBAC (full Three Lines + management) with SoD; lean workflow engine; append-only audit trail; API foundation; security baseline; and proof modules — **Policy Management**, **Asset Inventory**, **Risk register (RCI methodology) + lightweight RCSA**, **Control library**, and **APAC ISMS Profile** — plus the **cross-entity roll-up dashboard** (the flagship).

**Further additions from the design handoff (`15`):** Risk programme (versioned RM report + procedure), Audit issues (fuller lifecycle than the earlier lightweight decision), OS portfolio, and access management. See `15-design-alignment.md` for placement and the blocking jurisdiction question.

**Scope changes after reviewing the company's actual templates:**
- **Asset Inventory promoted into Wave 1.** The RCI risk methodology is asset-based (asset group → asset → threat → vulnerability), so risk assessment cannot be built without it.
- **Threat and Vulnerability libraries added** to the data foundation (`02a`).
- **Statement of Applicability (SoA)** added — mandatory ISO 27001 output of risk treatment.
- **APAC ISMS Profile added to Wave 1** (`13`) — it extends `OrgEntity` and scopes the other modules.
- **Risk scoring model corrected** to Likelihood × MAX(five impact types), 1–25, with the ≥16 treatment threshold (`02a`).

**Foundation hard requirements (confirmed):**
- **China / PIPL data residency** → per-region deployment capability from day one (see ADR-0006). Not optional.
- **Localisation / i18n** → Traditional Chinese, Japanese, Korean, English + SEA languages; timezone-aware.
- **RBAC** covers first-line business/ops, second-line risk & compliance, infosec/IT, and management consumers; keep the **first-line UX lightweight** (RCSA) to avoid compliance fatigue.

**Out (later waves):** compliance/obligation module UI, control testing/CCM, audit management, TPRM, IT/cyber, privacy, incident, BCM, ESG, AI governance. (`Vendor` and `DataFlow` are *defined* in the model now, not *surfaced* as modules.)

> The multi-jurisdiction fragmentation pain point is addressed at the foundation (jurisdiction-tagged taxonomy + regulation-to-control matrix) in Wave 1, and fully operationalised by the Wave 2 compliance module — correct sequencing given the internal-visibility driver.

## Build sequence

| # | Milestone | Definition of done |
|---|---|---|
| M0 | **Repo, pipeline & deployment shape** | ADR-0001 settled; CI with SCA/SAST/DAST/secret-scanning **plus the automated secure-development DoD checks (`16`)**; IaC skeleton scanned; **per-region deployment topology decided (ADR-0006) so China/PIPL residency is honoured**; TLS/cert, security headers and management-port exposure configured explicitly (never platform defaults); i18n scaffolding in place |
| M1 | **Data foundation** | Core entities & relationships from `02` migrated; stable IDs, versioning, soft-delete; governed-extension mechanism working |
| M2 | **Entity & jurisdiction model** | Org hierarchy; every record entity-scoped; **RLS enforcing scope at the database** (ADR-0004); jurisdiction tagging; residency honoured per D6 |
| M3 | **Audit trail** | Append-only hash-chained log (ADR-0003); no domain write can bypass it; verify-integrity routine passes |
| M4 | **Identity & RBAC** | OIDC + MFA; entity-scoped roles across the full Three Lines + management; SoD constraints enforced |
| M5 | **Workflow engine** | Configurable state machine; SLA/escalation; drives the policy approval flow |
| M6 | **Proof module: Policy** | Policy lifecycle + attestation; standardised roll-out to entities; addresses the standardisation pain point |
| M6b | **Asset inventory + threat/vulnerability libraries** | Asset groups and assets per the six categories; reusable threat and vulnerability libraries — prerequisite for risk assessment |
| M6c | **APAC ISMS profile** | Per-entity profile with sites, contacts, scope statement, and approved OP/OS offerings (`13`) |
| M7 | **Proof modules: Risk + Control** | Risk register using the **RCI scoring model** (before/after control, five impact types, ≥16 threshold, IT Risk Register overflow); **lightweight RCSA** for first line; control library mapped to ISO 27001 Annex A / ISO 27017; SoA generated; `Risk ↔ Control` links live |
| M8 | **Roll-up dashboard (flagship)** | Regional aggregation with drill-down; local-vs-regional views respect scope; presents a real posture across subsidiaries. Build to the spec in [`08-rollup-dashboard-spec.md`](08-rollup-dashboard-spec.md). **Prioritised — this is the driver's payoff; validate the dashboard shape early even if data is thin.** |
| M9 | **Entity Zero** | Platform registered in its own system; self-assessed against ISO 27001 / SOC 2 mapping (`04`); no self-violations |

> Because the dashboard is the flagship, sketch its target shape (metrics, roll-up, drill-down) early alongside M1–M2 data work, so the data model captures what the posture view needs. M8 then wires real data into an already-agreed layout.

## Security gate (applies to every milestone)

From `04` — no milestone is done until: new data is entity-scoped at the database layer; every state change is audited; no secret is committed and dependencies pass SCA; the threat model is updated; sensitive data is classified/encrypted; residency constraints are honoured; no control the platform enforces is violated by the new code; and **the applicable checkpoints from the 28-point secure-development DoD (`16`) pass**, verified against the findings register.

**Automate what can be automated in M0**, so these are caught continuously rather than at a pre-go-live scan: TLS and security-header assertions, cookie-attribute tests (`Secure` / `HttpOnly` / `SameSite`), session-regeneration test, secret scanning, SCA, SAST, DAST, and a **seed-data check that rejects checksum-valid card patterns and real-looking PII**.

## Testing expectations

- Unit and integration tests for domain logic and relationships.
- **Access-control tests** proving one entity cannot read/write another's data (app and — critically — database/RLS layer).
- **Audit-trail tests** proving completeness (no bypass) and integrity (chain verification).
- **Residency tests** proving in-scope-jurisdiction data is stored/processed where required.
- Migration tests so the data model can evolve safely.

## Suggested Claude Code approach

- Treat M0–M9 as milestones/epics; open each as a focused work session.
- Start every session by re-reading `CLAUDE.md` and the relevant `docs/` file(s).
- Write the ADR before the code for anything on the open-decisions list (`06`); ADR-0006 (residency topology) is now a priority because China is in scope.
- Keep docs and code in sync in the same change; if the design is wrong, fix the doc, don't diverge silently.
- Do not proceed past a milestone whose security gate fails.
