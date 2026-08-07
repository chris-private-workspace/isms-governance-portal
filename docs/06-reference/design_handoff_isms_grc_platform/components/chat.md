# ChatPanel (ISMS AI Agent)

`fragments/screens/15-ai-assistant.html` (full screen) and `fragments/shell/30-ai-drawer.html` (drawer).

## Layout

Full screen is two columns: conversation (fluid) and a 320px right column. The drawer is the
conversation column only.

## Conversation column

- Header: eyebrow, title, and the **agent role switch** (Platform admin / OpCo IT / OpCo OS).
- Empty state: a heading and a set of suggested prompts as clickable cards, each a real question a
  user would ask ("Which controls cover supplier access to customer data?").
- Messages:
  - user — right-aligned bubble, `--primary-tint` background, `--text` ink, radius 12px, max-width 78%
  - agent — left-aligned, no bubble; a 22px mark plus the label "ISMS AI Agent" above the answer,
    body 13px/1.65 `--text-2`
  - answers carry **source citations**: a row of chips beneath the answer, each naming a controlled
    document (policy number, control ID, procedure) and linking to that record
- Composer: 44px input with a send button, hint text below about what the agent can and cannot do.

## Right column — role-gated

| Block | Platform admin | OpCo IT | OpCo OS |
|---|---|---|---|
| Knowledge sources | visible | hidden | hidden |
| Agent configuration | visible | hidden | hidden |
| Scoped-access card | — | visible | visible |
| Recent threads | visible | visible | visible |

- **Knowledge sources** — indexed corpora with document counts and last sync time, each with a
  status dot. Includes the Annex A reference corpus, policy library, procedures, risk register and
  audit findings.
- **Agent configuration** — model, grounding mode, temperature, response length, guardrails,
  fallback behaviour. Read-only summary rows with an edit action.
- **Scoped-access card** — for the OpCo roles: what that role's answers cover, and a line stating
  that the source index and agent settings are managed regionally.
- **Recent threads** — title, relative time, message count.

## Production

Wire to the real agent backend (self-hosted RAG over the document store, or Copilot Studio).
Requirements the design assumes:

- streaming responses
- citations resolved to platform records, not free text
- retrieval filtered by the caller's entity scope and permissions — an OpCo IT user must not receive
  content from another OpCo's documents
- every question and answer written to the audit log
