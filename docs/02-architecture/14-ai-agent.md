# 14 — AI Agent (conversational knowledge access)

A conversational agent that lets users ask questions across the platform's knowledge — risks, controls, policies, procedures, obligations, incidents, vendors, ISMS profiles — instead of hunting through modules.

## Wave placement: Wave 3 (deliberately)

The agent's value is entirely a function of the knowledge available to it. Building it before the modules have produced content gives a confident assistant with nothing to answer from. Sequencing it after Waves 1–2 means it launches against a populated risk register, control library, policy set, incident history, and obligation matrix.

**However — two things must be decided early**, because they constrain architecture:

1. **ADR: self-built vs. Copilot Studio integration** (see below).
2. ~~**Data residency of AI processing**~~ — ⚠️ premise withdrawn with China (ADR-0010). See below; the model-agnostic interface survives on non-regulatory grounds.

## The sovereignty constraint — ⚠️ premise withdrawn, conclusion under review

> **China left scope on 2026-08-08** (`CH-008`, ADR-0010), and it was the only in-scope
> jurisdiction with a localisation requirement. The sovereignty argument below **no longer has a
> live driver**. The model-agnostic interface is still worth keeping — vendor lock-in, cost and
> availability are independent reasons — but it must stop being justified as a *compliance*
> mechanism until someone rewrites the case. Tracked as **`AD-Constraint7-1`**; this is also why
> `CLAUDE.md` 約束 7 now carries a "reason under review" marker.

The build-vs-buy baseline study is explicit that treating **"AI as an external API call" is itself a sovereignty risk**, and that AI-processing location should be treated as a **control, not a feature**. That argument stands on its own merits; what changed is that no in-scope entity now compels it.

Consequences:

- ~~Where a jurisdiction requires localisation, the AI processing path must stay in-boundary~~ — no in-scope jurisdiction currently does.
- The design should remain **model-agnostic** so the inference endpoint can be changed without touching application logic. Justification is now commercial and operational, not regulatory.
- Which data the agent may retrieve is governed by **the same entity-scoped RLS as everything else** — the agent must never become a way to read another entity's data.

## Option comparison

| | **Self-built** (retrieval over our own data) | **Copilot Studio agent integrated in** |
|---|---|---|
| Control over data path | Full — can pin processing per region | Depends on Microsoft tenant/region configuration |
| Effort | Higher; we own retrieval, grounding, evaluation | Lower; leverages existing M365 investment |
| Fit with existing estate | Neutral | Strong if the group already runs M365/Copilot |
| ~~Sovereignty~~ → data-path control | Full control over where inference happens | Depends on Microsoft tenant configuration. ⚠️ No longer a *compliance* differentiator (ADR-0010) — weigh it as an operational one |
| Knowledge beyond the platform | Would need explicit connectors | Can reach SharePoint/Teams content natively |
| Lock-in | Low | Higher |

**Recommendation:** keep this an open **ADR** rather than deciding now, but design for a **model-agnostic retrieval interface** so either option can plug in. ⚠️ The previous "hybrid per region" landing point assumed entities with localisation requirements; there are none left, so the realistic outcome is now a single choice rather than a split.

## Guardrails (non-negotiable)

The platform's credibility tenet applies fully to the agent:

- **Entity-scoped retrieval.** The agent answers only from data the asking user is already entitled to see. Enforced at the data layer, not by prompt instruction.
- **Grounded, cited answers.** Every answer points to the source record (risk, control, policy clause, obligation). No unsourced assertions about compliance state.
- **Advisory, never authoritative for compliance decisions.** Consistent with the Wave 2 stance on AI-assisted regulatory parsing: **AI proposes, humans decide.** The agent must not close issues, change risk ratings, or approve anything.
- **Fully audited.** Agent queries and the records returned are written to the audit trail — both for security review and because "who asked what about which risk" is itself governance-relevant.
- **No sensitive-block leakage.** Restricted content (e.g. the incident module's violating-acts/disciplinary block) is excluded from retrieval unless the asker holds that permission.

## Knowledge sources (in priority order)

1. Platform records — risks, controls, policies, obligations, incidents, vendors, ISMS profiles, SoA.
2. Controlled documents — the procedures held in the policy/document module.
3. *(Later)* external content, if the deferred obligation-content subscription (`10` §2 D) is adopted.

## Useful early question types

"What are our high residual risks in Korea?" · "Which controls satisfy Singapore PDPA's access-control obligations?" · "What does our incident procedure require for an S1?" · "Which vendors have access to Confidential information?" · "Is Malaysia's ISMS profile current?"

Each of these is answerable from the core data model — which is the point: the relationship graph built in Wave 1 is what makes the agent useful in Wave 3.

## Open ADRs

- **ADR-0008** — AI agent: self-built retrieval vs. Copilot Studio integration vs. hybrid per region.
- **ADR-0009** — AI processing location and model-agnostic inference interface (sovereignty control).
