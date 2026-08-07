# Handoff: APAC ISMS Governance Platform

## Overview

A regional GRC (governance, risk and compliance) web platform for Ricoh APAC, covering the
ISO/IEC 27001 information security management system across 14 operating companies (OpCos).

It brings together, in one product:

- risk register, risk programme (the Risk Management Report and its procedure), controls and testing
- policies with a document viewer
- issues and actions, audit findings, assessments
- security incident reporting with an escalation workflow
- external party (supplier) assessments
- per-OpCo ISMS profiles with versioning
- the OS (Office Service) portfolio and its security posture
- an ISMS AI Agent that answers questions from the governance corpus
- platform administration: entities, users, permissions, access management, reporting, notifications, records retention, taxonomy, integrations, thresholds, audit log

## Package structure

```
design_handoff_isms_grc_platform/
  README.md            ← you are here: fidelity, tokens, every screen, interactions, state, data model
  ARCHITECTURE.md      routes, source layout, permissions, workflows, API surface, non-functionals
  styles/
    tokens.css         design tokens — light + dark, ready to drop in
    base.css           resets, font loading, type scale, layout primitives
    components.css     class-based recreation of every UI primitive
  components/
    README.md          component inventory, build order, system-wide conventions
    shell.md           navigation rail, topbar, command palette, notification and agent drawers
    data-display.md    data table, KPI card, record panel, detail header, stepper, heat matrix
    status.md          RAG pills, dots, badges, progress — and the single tok() colour rule
    controls.md        buttons, fields, filter chips, segmented tabs, role switch, banners, toasts
    document-viewer.md policy viewer and its sticky side menu
    chat.md            ISMS AI Agent panel and its role gating
  fragments/
    README.md          how to read the template syntax + fragment → route map
    shell/             auth, app shell, agent drawer — verbatim markup
    screens/           one fragment per screen, verbatim markup
  data/
    README.md          what each collection is
    *.js               sample data extracted verbatim from the prototype
  design/
    ISMS Governance Platform (standalone).html   ← open this to view the design
    ISMS Governance Platform.dc.html + support.js  authoring source
```

**Suggested reading order:** this README → `ARCHITECTURE.md` → `components/README.md` → the
fragment for the screen you are building.

## About the design files

The files in `design/` are **design references created in HTML**. They are prototypes that show the
intended look, information architecture and behaviour. They are **not production code to copy
directly**, and they contain **no backend, no auth, no persistence** — all data is hard-coded in the
prototype's logic class.

The task is to **recreate these designs in the target codebase's existing environment** (React,
Vue, Angular, SwiftUI, .NET/Blazor, whatever the project uses) using its established patterns,
routing, component library and data layer. If no environment exists yet, choose the framework
appropriate for the project and implement the designs there.

Treat the HTML as the visual and behavioural specification; treat this README as the written spec.

### How to view the design

- `design/ISMS Governance Platform (standalone).html` — open directly in a browser, fully offline,
  fonts and runtime inlined. **Use this one to look at the design.**
- `design/ISMS Governance Platform.dc.html` + `design/support.js` — the authoring source. The
  markup lives in the `<x-dc>` template; all data, derived values and handlers live in the
  `class Component extends DCLogic { … }` script at the bottom of the file. Read this when you need
  exact data shapes, copy or logic.

To read the source efficiently: search the `.dc.html` for the screen banners, e.g.
`<!-- ============ AUDIT ISSUES ============ -->`, and in the logic class for the corresponding
data arrays (`auditIssues`, `osServices`, `ismsProfileData`, `incidents`, `suppliers`, `policies`).

### Login credentials in the prototype

The sign-in screen is a mock. Any click on **Sign in** proceeds to a mock MFA step, and **Verify**
enters the app. There is no real authentication.

## Fidelity

**High fidelity.** Final colours, typography, spacing, density, iconography, empty/warning states
and interaction behaviour are all decided. Recreate the UI to match. Where the target codebase
already has an equivalent component (table, tab bar, dialog), use it and match the visual
specification below rather than introducing a second component system.

Two exceptions that are deliberately illustrative rather than final:

- the **document viewer** page rendering is a facsimile — production should embed a real PDF viewer
  (PDF.js or equivalent) in the same frame and toolbar
- the **AI agent** answers are canned strings — production wires this to the real agent backend

---

## Design tokens

Defined as CSS custom properties on the root element (`[data-grc]`), with a dark theme override on
`[data-grc][data-theme="dark"]`. Both themes ship; the topbar has a theme toggle.

### Colour — light (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F5F6F8` | app background |
| `--surface` | `#FFFFFF` | cards, tables, panels |
| `--surface-2` | `#FAFBFC` | table headers, inset panels, hover |
| `--surface-3` | `#F1F3F6` | chips, avatars, segmented-control track |
| `--border` | `#E4E8ED` | hairlines, card borders, row dividers |
| `--border-strong` | `#CED5DD` | secondary button borders, inputs |
| `--text` | `#1B222C` | primary text |
| `--text-2` | `#586372` | secondary text, table cells |
| `--text-3` | `#8B95A3` | meta, labels, placeholders |
| `--primary` | `#2A5BD7` | primary buttons, active nav, focus |
| `--primary-ink` | `#1E43A0` | primary text on tint, record IDs |
| `--primary-tint` | `#EAF0FE` | selected rows, active side-nav item |
| `--nav-bg` | `#111823` | left navigation rail |
| `--nav-surface` | `#1B2532` | nav hover / active background |
| `--nav-text` | `#B3BECC` | nav labels |
| `--nav-text-2` | `#6E7C8C` | nav group headings |
| `--nav-border` | `#232F3D` | nav dividers |
| `--rag-g` / `-bg` / `-ink` | `#1E8A5C` / `#E6F4EC` / `#12603F` | green — good, complete, closed, low risk |
| `--rag-a` / `-bg` / `-ink` | `#B4740A` / `#FBF0DC` / `#7E4E02` | amber — attention, in progress, medium |
| `--rag-r` / `-bg` / `-ink` | `#C43D34` / `#FAE9E7` / `#8A2019` | red — breach, overdue, high, major |
| `--rag-n` | `#7C8794` | neutral / not applicable |
| `--shadow` | `0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)` | card elevation |

### Colour — dark theme

| Token | Value |
|---|---|
| `--bg` | `#0C1016` |
| `--surface` / `-2` / `-3` | `#151A22` / `#1A212B` / `#212934` |
| `--border` / `--border-strong` | `#27313D` / `#3A4653` |
| `--text` / `-2` / `-3` | `#E7ECF3` / `#9CA8B6` / `#6E7A89` |
| `--primary` / `-ink` / `-tint` | `#5B8CFF` / `#8FB0FF` / `rgba(91,140,255,.15)` |
| `--nav-bg` / `--nav-surface` / `--nav-border` | `#080B11` / `#141B26` / `#1B2530` |
| `--rag-g` / `-bg` / `-ink` | `#3FB07C` / `rgba(63,176,124,.15)` / `#7CD4A7` |
| `--rag-a` / `-bg` / `-ink` | `#D69436` / `rgba(214,148,54,.16)` / `#EBB463` |
| `--rag-r` / `-bg` / `-ink` | `#E4685E` / `rgba(228,104,94,.16)` / `#F0958C` |
| `--rag-n` | `#6E7A89` |
| `--shadow` | `0 1px 2px rgba(0,0,0,.35), 0 1px 3px rgba(0,0,0,.45)` |

### Typography

- UI font: **IBM Plex Sans**, with `IBM Plex Sans JP` fallback for Japanese, then `system-ui`.
- Monospace: **IBM Plex Mono** (`--mono`) — used for every identifier, date, percentage, count and
  file name. This is a strong convention in the design: IDs (`AF-2026-014`, `POL-318`, `RSK-1042`),
  ISO dates (`2026-08-15`), numeric cells and file names are always mono.
- Both loaded from Google Fonts, weights 400/500/600/700.
- `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility`.

Scale as used:

| Role | Size / weight / other |
|---|---|
| Page title (`h1`) | 21–23px / 700 / `letter-spacing:-.3px` |
| Section or detail title (`h2`) | 18px / 700 / `-.2px` |
| Eyebrow above page title | 11px / 600 / `.5px` tracking / uppercase / `--text-3` |
| Card title | 14px / 700 |
| Card subtitle | 12px / `--text-3` |
| Table header | 10–10.5px / 700 / `.45–.5px` tracking / uppercase / `--text-3` |
| Table cell | 12.5px; secondary cells 12px `--text-2` |
| Row meta (second line in a cell) | 10.5px / `--text-3` |
| Body copy | 13px / `line-height:1.65` / `--text-2` / `text-wrap:pretty` |
| KPI value | 26px / 700 / `-.6px` |
| Button label | 12–13px / 600 |
| Badge / chip | 10.5–11px / 600–700 |

### Spacing, radius, elevation

- Page padding: 24px; gap between stacked cards: 14–16px; KPI grid gap: 12px.
- Card padding: 16–20px; table row padding: `var(--row-py) 16–18px` where `--row-py` is **7px**
  (density is user-adjustable in the prototype — treat 7px as the default comfortable row).
- Radius: cards and panels **12px**, inner panels and inputs **9–11px**, buttons **8–9px**,
  chips and badges **5–7px**, pills/avatars **50%**.
- Elevation: only `--shadow`. No heavier shadows anywhere.
- Buttons: primary 34–38px tall, `--primary` fill, white text, no border. Secondary same height,
  `--surface` fill, 1px `--border-strong`, `--text-2` label, hover `--surface-3`.

### Iconography

Inline SVG, 24×24 viewBox rendered at 13–18px, `fill:none`, `stroke:currentColor`,
`stroke-width:1.7–2.1`, round caps and joins (Lucide-style). No icon font, no emoji.
Reuse the existing icon set in the target codebase if it is stroke-based at similar weight.

---

## Application shell

```
┌────────────────────────────────────────────────────────────────────┐
│ [rail 232px]  │  topbar 56px                                        │
│  dark         ├─────────────────────────────────────────────────────┤
│  navigation   │  main content, max-width 1400px, padding 24px       │
│  collapsible  │                                                     │
│  to 64px      │                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Left rail** (`--nav-bg`): product mark, then grouped links with 10px/700 uppercase group
headings in `--nav-text-2`:

- *Oversight* — Dashboard, Risks, Risk programme, Controls, Policies, Issues, Assessments, Audit issues
- *Operations* — ISMS AI Agent, Security incidents, Suppliers
- *Compliance* — APAC ISMS profiles, OS portfolio
- *System* — Admin

Active item: `--nav-surface` background, white text, left accent. Badges (e.g. Audit issues `5`,
Security incidents count) sit right-aligned in the row. A collapse toggle at the bottom reduces the
rail to icons only (labels hidden, `title` attributes retained for tooltips).

**Topbar**: scope selector (APAC region roll-up / individual OpCo), period segmented control
(Q1–Q4 / YTD), global search field with ⌘K affordance, notification bell with unread count,
language selector (EN / 日本語), theme toggle, avatar menu.

**Floating agent launcher**: bottom-right pill, "ISMS AI Agent", opens a chat drawer over any
screen.

---

## Screens

Each entry lists purpose, layout and the components that matter. Exact copy is in the HTML.

### 1. Sign in / MFA

Split layout: left panel is the brand side, right is the form (email, password, sign in, SSO
button). A second step asks for a 6-digit verification code with a resend link. Footer carries a
controlled-environment line. Production must replace this entirely with the real identity provider
(the design assumes SAML SSO — see Admin › Access management).

### 2. Dashboard

Regional posture at a glance.

- KPI row (4 cards): control coverage, open high/critical risks, overdue tests, open incidents —
  each with value, delta and RAG colouring on the value.
- Entity posture table: one row per OpCo with risks, high risks, coverage %, posture pill.
- Risk heat matrix: 5×5 likelihood × impact grid, cell count, colour by score band.
- Trend and breakdown cards.

### 3. Risks

List → detail → form.

- List: filter chips, table of `RSK-####`, title, category, entity, inherent/residual score chips,
  owner, treatment status, review date. Row click opens detail.
- Detail: header with ID, title, RAG score chips; tabs for assessment, treatment plan, linked
  controls, history; right-hand record panel.
- Form: new/edit risk — category, description, likelihood and impact selectors that compute the
  score live, owner, treatment approach, target date.

### 4. Risk programme

The Risk Management Report and its procedure, in two tabs:

- **Procedure** — the risk management procedure rendered as a numbered document.
- **Report** — the Excel workbook's sheets reproduced as tabs (Services, Assets, Threats,
  Risk assessment, Treatment). Each sheet is a wide scrollable table matching the workbook columns.

### 5. Controls

Annex A control library: control ID, title, Annex A clause, owner, implementation status, test
result, last/next test date. Detail shows description, implementation notes, test history and
linked risks.

### 6. Policies (list + detail with document viewer)

- List: `POL-###`, title, category, owner, version, status, effective and review dates,
  attestation %.
- **Detail** is a two-column layout with a **sticky left side menu (280px)** containing four blocks:
  1. **Document** — title, number, version, status, category, owner
  2. **Publication** — published date, file upload date, next review, attestation
  3. **Table of contents** — each entry jumps the viewer to that page; the current page is highlighted
  4. **Version history** — version, date, note, author
- Main column: title with *Open in new tab* / *Download*, a standardised summary block, then the
  **document viewer**: file name, format badge (PDF / DOCX), size, page count, upload date, print
  and download actions, page back/forward, zoom out/in with percentage.
- Rationale to preserve in production: policy files are **not** in a uniform format, so the page
  standardises only the record fields and states that the attached file is authoritative.
- Warning strips: Word originals show "preview is converted for display"; scanned files show
  "text not searchable".
- Zoom must scale layout, not just paint: the prototype uses CSS `zoom` so the scroll container
  sizes to the scaled page. If you use `transform: scale()`, set `transform-origin: top left` and
  give the wrapper a layout width of `page × zoom`, or the left edge becomes unreachable.

### 7. Issues & actions

Cross-module issue register: source, description, owner, severity, due date, status, linked record.

### 8. Audit issues (list + detail)

Findings from internal audit, the certification body, customer audits and regulators.

- KPIs: open findings, major nonconformities, overdue, closed this year.
- Filters: All, Open, Major only, Internal audit, Certification body, Customer audit.
- Table: reference (`AF-YYYY-NNN`), finding title with clause and linked record beneath, grade
  (Major / Minor / Observation), source, OpCo, owner, status, due date.
- **Detail page** (row click; back button returns to the list):
  - header with reference, grade badge, status dot, title, audit name · OpCo · clause
  - red escalation banner when the CAP date has passed
  - **finding lifecycle** stepper: Raised → CAP submitted → CAP in progress → Verification → Closed,
    with per-step Complete / Current / Pending
  - tabs: **Finding & corrective action** (finding text, clause/grade/raised; CAP text, owner, due,
    open action count) · **Actions & owners** (5 corrective steps with checkbox, owner, due, state) ·
    **Evidence & verification** (evidence files with uploader and date, or an empty state saying
    closure requires evidence; verification card naming the verifier and date) · **History** (dated log)
  - right record panel: source, audit, OpCo, owner, raised, CAP due, clause, linked record, export

### 9. Assessments

RCSA-style assessment campaigns: list of campaigns with scope, period, completion, owner; and a
form for completing an assessment.

### 10. ISMS AI Agent

Conversational search over the governance corpus.

- Header with an **agent role switch**: Platform admin / OpCo IT / OpCo OS.
- Centre: suggested prompts, message thread (user right, agent left with the "ISMS AI Agent" label),
  answers carry source citations back to policies, controls and procedures; composer at the bottom.
- Right column is **role-gated**:
  - Platform admin sees **Knowledge sources** (indexed corpora with document counts and last sync)
    and **Agent configuration** (model, grounding, temperature, guardrails).
  - OpCo IT and OpCo OS see **neither**; they get a scoped-access card explaining what their answers
    cover and that the source index and agent settings are managed regionally.
  - **Recent threads** is visible to all roles.
- Also reachable as a floating drawer from any screen.
- Production: back this with the real agent (self-hosted RAG or Copilot Studio). Keep the citation
  affordance — every answer shows which controlled documents it drew on.

### 11. Security incidents

- List with severity (S1–S4), category, OpCo, reporter, raised, SLA state, status.
- **Report form** — the incident template: title, description, detection method, category,
  severity with guidance per level, affected assets/services, data involved and classification,
  OpCo and site, reporter, occurred/detected timestamps, immediate containment actions, attachments.
- Submission triggers the escalation workflow: notification set by severity (S1 reaches Group CISO,
  Regional ISO, OpCo president and Regional MD immediately), acknowledgement clock, triage.
- **Detail** with tabs: report, triage & classification, timeline, actions, closure; severity
  changes re-run the notification rules.

### 12. Suppliers (external party assessments)

- Register: supplier, service, criticality, data classification handled, assessment status, score,
  expiry.
- Assessment form follows the existing questionnaire template: sections for company information,
  security governance, access control, data protection, sub-processors, continuity, evidence upload.
- Detail: score breakdown by section, findings, re-assessment schedule, linked risks and contracts.

### 13. APAC ISMS profiles

One profile per OpCo, versioned.

- **Role switch**: Platform administrator / OpCo administrator / OpCo OS.
  - Platform administrator: side list of all 14 OpCos with KPI row, can select and edit any profile,
    and can create a new profile.
  - OpCo administrator: sees only its own profile (banner states other OpCos are not visible), can edit.
  - OpCo OS: sees only its own profile, **read-only** — no edit, no create.
- **Tabs**: Profile · Approved products & services · Version history.
- **Profile fields** (this is the agreed field list — keep it exactly):
  - Standards: ISO 27001, ISO 27017 (toggles)
  - Company name
  - Country
  - Number of certificate
  - Sites — repeatable rows of site name, address, number of employees in scope (add / remove)
  - Scope statement
  - ISMS leader — name, department, email, address, phone
- Editing is inline within the same layout. **Save as new version** increments the version, marks
  the previous version superseded, records who saved it and under which role, and shows a
  confirmation banner. Blank site rows are discarded on save. Company name and country edits
  propagate to the OpCo selector list — keep one source of truth in production.
- **Approved products & services** tab: the OP (office printing) and OS (office service) offerings
  this OpCo is approved to sell, with code, name, business line and approval date.

### 14. OS portfolio

The regional Office Service catalogue and its security posture.

- KPIs: services in portfolio, in certified ISMS scope, needs attention, customer contracts.
- Category filter chips (Managed services, Cloud, Security, Workplace, Software, BPO,
  Infrastructure, Supply, Advisory).
- Table: `OS-###`, service name with owner and contract count, category, OpCo count, stage
  (Live / Mature / Growth / Pilot), residual risk (Low / Medium / High).
- Right panel for the selected service: code, stage, residual risk, name, description; portfolio
  owner, category, data classification handled, contracts, primary control, last security review;
  **certification position** with an amber warning when the service sits outside certified scope
  (an ISMS scope extension and service risk assessment are required before it can be sold as a
  certified offering); the OpCos delivering it; and the security requirements for delivery.

### 15. Admin

Left section rail grouped into four headings, content pane on the right.

- **Organisation** — Entities & jurisdictions (add entity, per-entity posture) · Users & roles
  (user list with role, scope, last active, status; role definitions with member counts)
- **Access** — **Permissions**: role × module matrix over six roles (Platform admin, Regional ISO,
  OpCo admin, Control owner, OpCo OS, Auditor) and eleven modules, values Full / Approve / Edit /
  Create / Read / None with a legend · **Access management**: pending access requests with requester,
  requested access, business reason, approver and status; access review campaigns with progress
  bars; authentication and session policy (SAML SSO, MFA, session timeout, IP restriction,
  just-in-time auditor access, break-glass accounts)
- **Operate** — **Reporting & exports**: report library (report, audience, frequency, next run,
  format, owner, status) and recent exports with classification · **Notifications & escalation**:
  event → recipients → channel → timing rules with on/off toggles · **Records & retention**:
  record class, retention period, basis, legal hold count, disposal approach
- **Configuration** — Risk taxonomy (categories and sub-categories) · Integrations (Jira,
  ServiceNow, Splunk, Okta, AWS Config, Microsoft 365, Slack; connected state and last sync) ·
  RAG thresholds (per-KPI green/amber/red bands) · Audit log (append-only, SHA-256 chained)

### 16. My profile, notifications, search

- Profile: user details, role and scope, notification preferences, sessions.
- Notification drawer from the topbar bell, grouped by day, unread markers.
- Command palette from the search field or ⌘K: cross-module search over risks, controls, policies,
  incidents and findings.

---

## Interactions & behaviour

- **Navigation** is client-side; every screen is a route. List → detail → back preserves the list's
  filter state in the prototype (state is held in the parent), so implement detail as a route with
  the list state in the store or URL.
- **Row click** opens detail; the whole row is the target and shows `background: var(--surface-2)`
  on hover with `cursor: pointer`.
- **Filter chips**: single-select. Active chip is `--primary` fill with white text; inactive is
  `--surface-2` with a `--border-strong` outline.
- **Tabs**: segmented control on a `--surface-3` track, 3px padding; active tab is `--surface` with
  a `--border-strong` border and `--primary-ink` label.
- **Role switches** (agent, ISMS profiles) are the same segmented control and change what is
  visible, not just styling. In production these come from the signed-in user's role — keep the
  switch only as an internal demo affordance, or drop it.
- **Edit mode** (ISMS profile): entering edit forces the Profile tab and disables the other two
  tabs (`cursor: not-allowed`, `opacity: .5`) so Save/Cancel can never appear over a non-editable
  pane. Preserve this rule.
- **Toasts**: confirmation banner after save, incident submission and version creation.
- **Transitions**: 120–180ms ease on hover, background and border colours only. No motion on layout.
- **Density**: `--row-py` is user-adjustable (compact 5px / default 7px / comfortable 10px).
- **Responsive**: designed for ≥1280px. Tables scroll horizontally inside their card
  (`overflow-x: auto` with an explicit `min-width` on the grid rows) rather than reflowing —
  match this, since dropping columns loses audit-relevant fields.
- **Empty and warning states** are part of the spec: no-evidence state on audit issues, out-of-scope
  warning on OS services, non-uniform-format notice on policies, read-only banner for OpCo OS.

## State

Prototype state, as a guide to what the real store needs:

| State | Purpose |
|---|---|
| `screen` | active route |
| `scope`, `period` | topbar scope (region roll-up or OpCo) and reporting period |
| `theme`, `lang`, `navCollapsed`, `rowDensity` | user preferences — persist per user |
| `selectedRisk`, `selControl`, `selPolicy`, `selIssue`, `selIncident`, `selSupplier`, `selIsms`, `selOs`, `selAudit` | selected record per module |
| `*View` (`incView`, `supView`, `auditView`, `assessView`) | list / detail / form within a module |
| `*Tab` (`incTab`, `rpTab`, `ismsTab`, `auditTab`) | active tab within a detail |
| `*Filter` (`ismsFilter`, `osFilter`, `auditFilter`, `entityFilter`) | active filter chip |
| `agentRole`, `ismsRole` | role gating |
| `ismsEdit`, `pdraft` | ISMS profile edit mode and working draft |
| `chatMsgs`, `chatText`, `drawerOpen` | agent conversation |
| `adminSection` | active admin section |
| `pdfPage`, `pdfZoom` | document viewer position |

Data fetching in production: one endpoint family per module, list + detail; the dashboard needs an
aggregate endpoint; the agent needs a streaming endpoint.

## Data model (from the prototype's hard-coded records)

Read the exact shapes in the logic class. The main collections:

- `opcos` — 14 operating companies: code (`RAP`, `RAPO`, `RSG`, `RHK`, `RMY`, `RTH`, `RID`, `RPH`,
  `RVN`, `RIN`, `RAU`, `RNZ`, `RTW`, `RKR`), name, country, certification state, posture
- `ismsProfileData[opcoCode]` — standards, company, country, certCount, sites[{name, address, emp}],
  scope, leader{name, department, email, address, phone}, versions[{v, date, by, role, note, state}]
- `policies` — id, title, category, owner, version, status, dates, attestation, file{name, format,
  size, pages, uploaded, warning}, toc[], versions[]
- `incidents` — id, title, severity, category, opco, reporter, timestamps, status, SLA, timeline[]
- `suppliers` — id, name, service, criticality, dataClass, score, sections[], expiry
- `auditIssues` — ref, title, src, audit, clause, grade, opco, owner, raised, due, status, link,
  finding, cap, ev
- `osServices` — code, name, cat, owner, stage, opcos[], data, rev, risk, ctl, cert, clients, note
- admin collections — `permMatrix`, `accessRequests`, `accessReviews`, `sessionPolicy`,
  `reportLibrary`, `recentExports`, `notifyRules`, `retention`, `taxonomy`, `integrations`

RAG helper: a single `tok(rating)` function maps `G` / `A` / `R` / `N` to the background, ink and
dot colours. Implement the equivalent once and use it everywhere — the design never hard-codes a
status colour at the call site.

## Suggested implementation shape

- Routes mirror the nav: `/dashboard`, `/risks`, `/risks/:id`, `/risk-programme`, `/controls`,
  `/policies`, `/policies/:id`, `/issues`, `/audit-issues`, `/audit-issues/:ref`, `/assessments`,
  `/agent`, `/incidents`, `/incidents/new`, `/incidents/:id`, `/suppliers`, `/suppliers/:id`,
  `/isms-profiles`, `/isms-profiles/:opco`, `/os-portfolio`, `/admin/:section`, `/profile`.
- Shared components worth extracting first: `AppShell` (rail + topbar), `DataTable` (sticky header,
  horizontal scroll, row-click), `StatusPill`, `RagDot`, `KpiCard`, `SegmentedTabs`, `FilterChips`,
  `DetailHeader`, `RecordPanel`, `LifecycleStepper`, `Toast`, `DocumentViewer`.
- Permissions: derive from the Admin › Permissions matrix. Gate at the route level and again at the
  action level (buttons should not render for roles without the verb).
- Every state-changing action in the prototype implies an audit-log entry — the Admin › Audit log
  section assumes an append-only trail.

## Assets

No bitmap images. Everything is inline SVG, CSS or text. Fonts are IBM Plex Sans, IBM Plex Sans JP
and IBM Plex Mono from Google Fonts (the standalone HTML has them inlined). The Ricoh brand mark is
represented by a placeholder mark in the rail — replace it with the real asset from the brand system.

## Files

See **Package structure** at the top. In short: `styles/` is drop-in CSS, `components/` is the
component specification, `fragments/` is the verbatim markup per screen, `data/` is sample data,
and `design/` holds the original prototype — open
`design/ISMS Governance Platform (standalone).html` to see it running.
