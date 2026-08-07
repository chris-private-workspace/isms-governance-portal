# Fragments

One HTML fragment per screen (and per shell region), sliced **verbatim** out of the design source
`design/ISMS Governance Platform.dc.html`. Use them to read exact markup, copy, ordering and
styling for the screen you are implementing.

## Template syntax in these files

The prototype was authored in a small template language. Translate as follows:

| In the fragment | Means | In React/Vue |
|---|---|---|
| `{{ value }}` | a value supplied by the logic class | `{value}` |
| `attr="{{ handler }}"` | whole-value binding (function, number, ref) | `onClick={handler}` |
| `<sc-if value="{{ flag }}">…</sc-if>` | conditional block | `{flag && (…)}` |
| `<sc-for list="{{ items }}" as="item">…</sc-for>` | repeat; `$index` in scope | `items.map((item, $index) => …)` |
| `style-hover="…"` | hover style | `:hover` rule or your styling solution |
| `hint-*` attributes | streaming placeholders in the prototype tool | **ignore — drop them** |
| `data-screen-label` | screen name for review tooling | drop, or keep as a test id |

All styling is inline because the prototyping tool required it. When you implement, use
`styles/tokens.css` + `styles/components.css` (or your codebase's equivalents) instead of copying
inline styles wholesale — the values are identical.

## Files

### `shell/`
| File | Contents |
|---|---|
| `01-auth-full-screen-no-shell.html` | Sign-in and MFA screens (mock — replace with the real IdP) |
| `02-app-shell.html` | Left navigation rail, topbar, scope/period controls, search, notifications, language, theme, avatar |
| `30-ai-drawer.html` | Floating ISMS AI Agent launcher and slide-over chat drawer |

### `screens/`
| File | Route it becomes |
|---|---|
| `03-dashboard.html` | `/dashboard` |
| `04-risks-list.html` · `06-risk-detail.html` · `05-risk-form.html` | `/risks`, `/risks/:id`, `/risks/new` |
| `19-risk-programme.html` | `/risk-programme` (procedure + Risk Management Report sheets) |
| `07-controls-list.html` · `08-control-detail.html` | `/controls`, `/controls/:id` |
| `09-policies.html` · `10-policy-detail.html` | `/policies`, `/policies/:id` (document viewer + side menu) |
| `11-issues.html` · `12-issue-detail.html` | `/issues`, `/issues/:id` |
| `25-audit-issues.html` · `26-audit-issue-detail.html` | `/audit-issues`, `/audit-issues/:ref` |
| `13-assessments.html` | `/assessments` |
| `15-ai-assistant.html` | `/agent` (role-gated right column) |
| `16-incidents-list.html` · `17-incident-report-form.html` · `18-incident-detail.html` | `/incidents`, `/incidents/new`, `/incidents/:id` |
| `20-suppliers-list.html` · `21-supplier-detail.html` · `22-supplier-form.html` | `/suppliers`, `/suppliers/:id`, `/suppliers/new` |
| `23-apac-isms-profiles.html` | `/isms-profiles` (role gating, edit mode, versioning) |
| `24-os-portfolio.html` | `/os-portfolio` |
| `14-admin.html` | `/admin/:section` (11 sections in 4 groups) |
| `27-my-profile.html` · `28-preferences.html` · `29-switch-entity-role.html` | account screens |
