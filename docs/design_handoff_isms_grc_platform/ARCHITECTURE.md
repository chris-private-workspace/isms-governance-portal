# Architecture notes

Implementation guidance derived from the design. The screen-by-screen specification is in
`README.md`; this file covers structure, permissions, workflows and the API surface the UI implies.

## Routes

```
/login                      /risk-programme            /incidents
/dashboard                  /controls                  /incidents/new
/risks                      /controls/:id              /incidents/:id
/risks/new                  /policies                  /suppliers
/risks/:id                  /policies/:id              /suppliers/new
/issues                     /audit-issues              /suppliers/:id
/issues/:id                 /audit-issues/:ref         /isms-profiles
/assessments                /agent                     /isms-profiles/:opco
/os-portfolio               /admin/:section            /profile · /preferences
```

Each list ↔ detail pair is two routes. Filter and scope state should live in the URL query so a
filtered view is shareable and survives back-navigation — the prototype holds it in component state,
which is the one thing worth changing when you port it.

## Suggested source layout

```
src/
  app/            routes, layout, providers
  components/     the inventory in components/ — shell, table, status, controls, viewer, chat
  features/
    dashboard/ risks/ risk-programme/ controls/ policies/ issues/ audit-issues/
    assessments/ agent/ incidents/ suppliers/ isms-profiles/ os-portfolio/ admin/
  lib/            rag.ts (the tok() mapping), permissions.ts, formatters (dates, IDs, scores)
  styles/         tokens.css, base.css, components.css
```

One feature folder per module, each with `List`, `Detail`, `Form` and its own data hooks. Shared UI
never lives inside a feature folder.

## Permissions

Six roles, eleven modules, from Admin › Permissions (`data/permMatrix.js`):

Roles — Platform admin, Regional ISO, OpCo admin, Control owner, OpCo OS, Auditor.
Verbs — Full, Approve, Edit, Create, Read, None.

Enforce in three places:

1. **Navigation** — a module at None is not rendered in the rail.
2. **Route** — direct navigation to a forbidden route redirects to the dashboard.
3. **Action** — buttons for verbs the role lacks are not rendered (Edit, Save as new version,
   Approve, Create). Read-only roles get an explanatory banner instead of a disabled form.

On top of role there is **entity scope**: OpCo-level roles only ever see their own OpCo's records.
This must be enforced server-side on every query, including the agent's retrieval.

## Workflows the UI assumes

**Security incident.** Submit → severity determines the notification set (S1 reaches Group CISO,
Regional ISO, OpCo president and Regional MD immediately) → acknowledgement clock starts → triage
sets category, affected assets and confirmed severity → containment, eradication, recovery → closure
with lessons learned. Re-classifying severity re-runs the notification rules. Every transition is
timestamped and appears in the incident timeline.

**Audit finding.** Raised → CAP submitted → CAP in progress → Verification → Closed. Major
nonconformities require verified effectiveness before certificate recommendation. Passing the CAP
date without evidence escalates to the Information Security Committee and flags the record red.

**ISMS profile versioning.** Edit is a draft over the current version. Save as new version
increments the version number, marks the previous one superseded, stamps the actor and their role,
and writes a version-history entry. Prior versions stay readable. Blank site rows are discarded.

**Supplier assessment.** Questionnaire → scoring by section → findings → approval decision →
expiry date that triggers re-assessment.

**Risk programme.** The Risk Management Report is versioned as a whole (see `rmVersions.js`); its
sheets — Services, Assets, Threats, Risk assessment, Treatment — mirror the existing Excel workbook,
and the procedure tab reproduces the controlled procedure document.

## API surface implied by the UI

```
GET  /dashboard?scope&period
GET  /{module}?scope&period&filter&q         list
GET  /{module}/{id}                           detail
POST /{module}                                create
PATCH /{module}/{id}                          update
POST /incidents                               → returns notification set + acknowledgement deadline
POST /isms-profiles/{opco}/versions           → returns new version, supersedes previous
POST /audit-issues/{ref}/evidence             upload
POST /agent/query                             streaming, returns answer + citations[]
GET  /admin/{section}
GET  /audit-log?actor&record&from&to
```

Every state-changing call writes an audit-log entry — the Admin › Audit log section assumes an
append-only, hash-chained trail.

## Non-functional expectations visible in the design

- **Localisation** — EN and 日本語 in the topbar. The type stack already includes IBM Plex Sans JP;
  all copy must go through the i18n layer, including status words and role names.
- **Theme** — light and dark both ship; persist per user.
- **Density** — row density is a user preference bound to `--row-py`.
- **Accessibility** — status is never colour alone (always a word or number beside the dot);
  tables use real `<table>` semantics; the row click target is duplicated as a focusable link in the
  first cell for keyboard users.
- **Print** — policy documents and reports print from the viewer, not from the screen layout.
