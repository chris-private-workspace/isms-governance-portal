# 09 — UI Design Brief (for Claude Design)

> **Status: superseded for UI specification.** This brief was written to commission the design. A high-fidelity handoff now exists (`design_handoff_isms_grc_platform`) and is **authoritative for tokens, typography, spacing, the app shell and all screens**. See `15-design-alignment.md`. Keep this file as the record of intent and for the domain framing it carries.

Hand this to Claude Design as context. **Work in stages — do not ask for all screens at once.** Get the design system + the flagship dashboard right first, then one list/detail pair, then expand reusing the patterns. Consistency comes from establishing the system early.

## 1. The product in one paragraph

An **internal GRC (Governance, Risk & Compliance) platform** for a regional IT office that serves multiple **APAC subsidiaries** of one group (technology & services sector). The driver is **internal governance & visibility**: management and the regional office need to see risk & compliance posture across all subsidiaries, with **roll-up and drill-down**. It is **multi-entity, multi-jurisdiction** and **secure-by-design** (the platform manages security/risk, so it must itself look and be trustworthy).

## 2. Users & their jobs (this decides emphasis)

| User | What they do here | Design implication |
|---|---|---|
| Management / regional governance | Consume posture across subsidiaries | The dashboard is theirs; scannable, roll-up, drill-down |
| Risk & compliance (2nd line) | Maintain risks, controls, policies; oversight | Efficient list/detail, bulk actions, review workflows |
| InfoSec / IT | Cyber risk, control evidence | Asset/control links, evidence attachment |
| First-line business / ops | Light input: RCSA, attestations | **Must be simple** — avoid "compliance fatigue"; short, guided forms |

## 3. Information architecture & navigation

- **App shell:** top bar = logo · **entity/scope switcher** · period selector · search · notifications · language switcher · user menu. Left nav = Dashboard · Risks · Controls · Policies · Issues · Assessments · Admin.
- **The entity/scope switcher is central.** Users flip between **regional roll-up** and a **single-entity view**; everything on screen respects the selected scope. A subsidiary user is locked to their own entity; the regional office sees all.

## 4. Screen inventory (Wave 1, prioritized)

| # | Screen | Purpose | Priority |
|---|---|---|---|
| A | **Roll-up dashboard** | Posture across subsidiaries; the flagship (see §7) | ★ Anchor |
| B | **Risk register** (list) + **Risk detail** | Maintain/view risks; establishes list + detail patterns | ★ Anchor |
| C | Control library (list) + Control detail | Controls, effectiveness, links to risks/tests | High |
| D | Policy management (list + detail) + attestation | Standardised roll-out + sign-off | High |
| E | Entity detail / drill-down | One subsidiary's posture (reached from the dashboard) | High |
| F | Issues & actions (list + detail) | Findings and corrective actions (CAPA) | Medium |
| G | Assessment / RCSA | First-line lightweight self-assessment | Medium (keep very simple) |
| H | Admin | Org hierarchy & entities · RBAC roles · taxonomy/extension config · RAG thresholds | Medium |
| — | Sign-in (SSO + MFA) | Minimal, on-brand | Low effort |

## 5. Reusable UI patterns (design once, apply everywhere)

- **List / register**: filter bar (entity, status, rating), table with an **entity column** and **RAG chips**, row → detail, bulk actions.
- **Detail**: header with **status badge** + key attributes, sectioned body, a **relationships panel** (linked risks/controls/obligations), and an **activity / audit-trail panel** (this is a trust product — showing history matters).
- **RAG chips & status badges**: consistent green / amber / red; status badges reflect the entity's lifecycle state (see §6).
- **5×5 risk matrix / heat map** component (likelihood × impact).
- **Entity-scope switcher** + roll-up/drill-down affordance.
- **Lightweight first-line forms** (RCSA, attestation): guided, few fields, obvious next step.
- **Empty states** that invite the first action.

## 6. Domain references (so screens show real fields & states)

Full detail is in `02a-data-model-spec.md`. Key ones for the main screens:

- **Risk detail**: title, category, description, likelihood/impact **inherent** → **residual**, rating band (Low/Medium/High/Critical), appetite, treatment (accept/mitigate/transfer/avoid), linked controls, owner, review due. **Lifecycle:** Identified → Assessed → Treated → Monitored → Closed (drives the status badge and available actions).
- **Control detail**: type (preventive/detective/corrective), nature (manual/automated/hybrid), frequency, framework refs (e.g. ISO 27001 A.x), linked risks, latest test result, effectiveness.
- **Policy detail**: version, effective/review dates, attestation status per entity, roll-out state (Draft → In review → Approved → Published → Retired).
- Everything carries an **owning entity** (shown in lists and detail headers) and an **audit trail**.

## 7. The flagship: roll-up dashboard

A reference mockup already exists for this; mirror its structure:
- **Header**: title · scope selector (Region / entity) · period · overall **posture pill** (RAG).
- **KPI row**: total risks · high/critical · control coverage % · overdue tests · open critical issues · RCSA completion %.
- **Entity comparison matrix (centerpiece)**: rows = subsidiaries, columns = key metrics, cells RAG-coloured, rows click through to drill-down. This is the panel that delivers the driver — scan for red.
- Metric definitions and RAG thresholds are in `08-rollup-dashboard-spec.md`.

## 8. Visual direction

- **Tone**: professional, calm, trustworthy enterprise console. This is a security/risk tool — it should *feel* dependable, not flashy.
- **Colour**: neutral base; **semantic RAG used sparingly and consistently** (don't paint the whole UI in traffic-light colours — reserve them for status).
- **Hierarchy**: strong, scannable; data-dense but clean; generous structure over decoration.
- **Accessibility**: WCAG 2.1 AA (contrast, focus states, keyboard).
- **Localisation**: **i18n-ready** for zh-Hant, ja, ko, en (+ SEA languages). Design layouts to tolerate **text expansion**; include a language switcher; avoid text baked into fixed-width chips.
- **Modes**: light primary; dark mode optional-but-preferred.
- **Responsive**: desktop-primary (analysts/management work on desktop); tablet-friendly; mobile for approvals/attestations.
- **Brand**: *[Insert brand assets — logo, colour palette, typography — if a corporate brand (e.g. Ricoh) applies. Provide these to Claude Design; otherwise it will choose a neutral professional system.]*

## 9. Constraints & trust cues

- Scope is always visible (which entity/region am I looking at).
- Audit trail / history is surfaced on records — the platform demonstrates its own integrity.
- Roles change what's visible/editable (Three Lines + management); design for role-appropriate views and read-only states.

## 10. Suggested working sequence with Claude Design

1. **Stage 1** — establish the design system (type, colour incl. RAG, components) **+ the roll-up dashboard**.
2. **Stage 2** — Risk register + Risk detail (locks the list/detail patterns).
3. **Stage 3** — Controls, Policies, Issues, Assessment — reuse the Stage-2 patterns.
4. **Stage 4** — Admin screens; sign-in.
5. Iterate each stage before moving on.

## Confirm before starting

- **Brand assets** — logo, colours, typography (e.g. Ricoh brand)? If yes, provide them; if no, let Claude Design pick a neutral professional system.
- **Primary design language** for the mockups — English or Traditional Chinese? (Product is multilingual either way.)
- **Light only, or light + dark**?
