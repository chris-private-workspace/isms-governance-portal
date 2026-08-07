# Sample data

Each file is one collection, extracted **verbatim** from the prototype's logic class and exported as
an ES module. It is realistic sample data for building against, not production content — replace it
with your API responses. Field names here are the ones used throughout the fragments, so keeping
them makes the fragments read directly against your data.

| File | Collection |
|---|---|
| `opcos.js` | the 14 APAC operating companies — code, name, country, certification state, posture, counts |
| `risks.js`, `riskRegister.js` | risk register rows and the Risk Management Report register sheet |
| `rmVersions.js` | risk management report version history |
| `controls.js` | Annex A control library |
| `policies.js` | policy records, including `file` metadata, `toc[]` and `versions[]` |
| `issues.js` | cross-module issues and actions |
| `auditIssues.js` | audit findings — ref, grade, source, clause, CAP, evidence |
| `incidents.js` | security incidents and their timelines |
| `suppliers.js` | external party assessments |
| `catalogue.js` | approved OP / OS products and services per OpCo |
| `osServices.js` | the OS portfolio |
| `knowledgeSources.js`, `answers.js` | agent knowledge index and canned answers |
| `permMatrix.js` | role × module permission matrix |
| `accessRequests.js`, `accessReviews.js`, `sessionPolicy.js` | access management |
| `reportLibrary.js`, `notifyRules.js`, `retention.js` | reporting, notification rules, records retention |
| `notifications.js` | topbar notification feed |
| `data.js` | dashboard aggregates |

## Not extracted here

The per-OpCo ISMS profiles (`ismsProfileData`) are keyed by OpCo code and defined alongside their
generators in the logic class — read them in
`design/ISMS Governance Platform.dc.html` (search for `ismsProfileData`). Shape:

```js
{
  standards: { iso27001: true, iso27017: false },
  company: 'Ricoh Hong Kong Ltd',
  country: 'Hong Kong',
  certCount: 1,
  sites: [{ name, address, emp }],       // repeatable, employees in scope
  scope: '…scope statement…',
  leader: { name, department, email, address, phone },
  versions: [{ v, date, by, role, note, state }]   // state: 'Current' | 'Superseded'
}
```
