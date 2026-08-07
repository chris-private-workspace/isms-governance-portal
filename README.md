# APAC ISMS Governance Platform — Foundation & Backbone

An internally built, multi-entity, multi-jurisdiction **ISMS governance platform** (ISO/IEC 27001 + 27017) for a regional IT office serving 14 APAC operating companies across 12 jurisdictions.

> **Central tenet — the platform must not itself be a source of risk.**
> This is a system that manages security and risk. If the platform is itself insecure, fragile, or unauditable, it has no credibility. Every architectural and implementation decision in this repository is therefore held to the same standards the platform is designed to enforce. See [`docs/02-architecture/04-security-by-design.md`](docs/02-architecture/04-security-by-design.md). This is non-negotiable.

## Current phase

Planning & architecture for the **Wave 1 backbone** — the shared foundation on which all future modules are built. The single most important artifact is the **core data model** ([`docs/02-architecture/02-core-data-model.md`](docs/02-architecture/02-core-data-model.md)); it is the heart of the system and the most common reason self-built GRC systems fail when it is done poorly.

**No application code exists yet.** The nine foundational ADRs are all still open — see [`docs/14-adr/README.md`](docs/14-adr/README.md). ADR-0006 (per-region deployment for PIPL residency) is blocking for M0.

## Confirmed context

| Parameter | Decision |
|---|---|
| Build orientation | **Internal build** (not vendor selection) |
| Audience | **Multi-entity, multi-jurisdiction single group** — regional IT office serving APAC subsidiaries (not external multi-tenant SaaS) |
| Industry | **Technology & services** |
| Jurisdictions | NE Asia (JP/KR/CN/HK/TW) + SE Asia (SG/MY/TH/ID/PH/VN) + Oceania (AU/NZ); India excluded. **China in scope → PIPL residency is a hard requirement.** |
| Primary driver | **Internal governance & visibility** — the cross-entity roll-up dashboard is the flagship deliverable |
| Target users | Full Three Lines + management (audit deferred to Wave 2) |
| Sequencing | **Foundation-first** — backbone before modules |

All kickoff prerequisites are confirmed; see [`docs/02-architecture/00-project-charter.md`](docs/02-architecture/00-project-charter.md). The full non-negotiable list lives in [`CLAUDE.md`](CLAUDE.md).

## Repository structure

This repository combines **domain documentation** (the ISMS platform design) with a **development-process skeleton** adapted from [`claude-code-dev-template`](https://github.com/laitim2001/claude-code-dev-template) v2.6.1.

```
isms-governance-portal/
├── CLAUDE.md                     Always-loaded context: guardrails + confirmed parameters — read first
├── MEMORY.md  ·  memory/         Cross-session lessons (11 seeded + project-specific)
├── .claude/
│   ├── rules/                    5 always-loaded rules (workflow, verification, headers, anti-patterns, tools)
│   ├── commands/                 12 slash commands (/phase-start, /fix, /change, /status-audit, …)
│   ├── agents/  ·  skills/       Subagents + natural-language routing
│   └── settings.json
├── docs/
│   ├── README.md             ★   14-layer index + placement rules — start here when unsure
│   ├── INFORMATION-FLOW.md   ★   What to read / produce / update, by scenario
│   ├── architecture.md           Thin pointer → the real spec is 02-architecture/01 and /02
│   ├── 01-planning/          ★   PROCESS · BACKLOG · ROADMAP · STATUS_AUDIT · registers · templates · W{NN}-*/
│   ├── 02-architecture/      ★   THE 19 DOMAIN SPECS LIVE HERE:
│   │     00-project-charter · 01-architecture-overview · 02-core-data-model ★ · 02a-data-model-spec ★
│   │     03-multi-entity-and-jurisdiction · 04-security-by-design ★ · 05-platform-foundation-services
│   │     06-tech-stack-and-decisions · 07-wave1-build-plan · 08-rollup-dashboard-spec
│   │     09-ui-design-brief · 10-wave2-compliance-and-obligations · 11-security-incident-module
│   │     12-supplier-management-module · 13-isms-profile-module · 14-ai-agent
│   │     15-design-alignment ★ · 16-secure-development-dod ★ · 17-audit-issues-module
│   │     ⚠️ The data model is split across 02a and the module docs.
│   │        02a §0 is the complete entity index — read it before creating any table.
│   ├── 03-implementation/        changes/CH-NNN-* · bugs/BUG-NNN-*
│   ├── 06-reference/         ★   design_handoff_isms_grc_platform/ (authoritative UI) + mockup playbook
│   ├── 14-adr/               ★   Architecture Decision Records — 9 open, none written yet
│   ├── 04 05 07 08 09 10 11 12 13   Review · usage · skills · user-guide · analysis · dev-log · env · AI · deploy
│   └── rules-on-demand/          Triggered rules (entity-scoping, mockup fidelity, i18n, testing, …)
├── scripts/
│   ├── lint/                     5 checkers — run: python scripts/lint/run_all.py
│   └── hooks/                    pre-commit / pre-push (⚠️ not enabled yet — see below)
└── .github/                      PR template · ci.yml · security-scan.yml · dependabot.yml
```

> **Not in this repository, by design:** `reference/` and `docs/reference/` hold the company's own
> procedures, scan-derived secure-development guidance, and licensed ISO standards. They are
> gitignored and exist only on local disk. Everything the build needs is carried by `docs/02-architecture/`.

## How to use this with Claude Code

1. Open this folder as a Claude Code project.
2. Claude Code reads `CLAUDE.md` automatically — it encodes the 9 non-negotiable guardrails and the 15 confirmed parameters that must not be re-litigated.
3. Before starting any task, classify it (Phase / Change / Bug / trivial) per [`docs/01-planning/PROCESS.md`](docs/01-planning/PROCESS.md). **No pre-doc, no code.**
4. Unsure what to read or produce? [`docs/INFORMATION-FLOW.md`](docs/INFORMATION-FLOW.md) lists it by scenario.
5. For domain grounding, read `docs/02-architecture/` in numerical order. `02`, `02a`, `04` and `15` are the load-bearing ones.
6. Start implementation from [`docs/02-architecture/07-wave1-build-plan.md`](docs/02-architecture/07-wave1-build-plan.md) — but **an ADR must land first**: the stack is deliberately unchosen.
7. Record every significant technical decision as an ADR in [`docs/14-adr/`](docs/14-adr/README.md).

### Local setup

```bash
python scripts/lint/run_all.py        # doc links, path references, rule hygiene, status markers
```

Git hooks are **not** enabled yet. Enable them only once real lint/test commands exist for the chosen stack (otherwise the first commit is blocked and `--no-verify` becomes a habit):

```bash
git config core.hooksPath scripts/hooks
```

## Language convention

- **Code, comments, and technical documents:** English.
- **End-user-facing text, UI copy, and end-user documentation:** Traditional Chinese (繁體中文).
- **Process documentation** (inherited from the template) is in Traditional Chinese.

## Disclaimer

This repository is planning and technical guidance. It is **not legal or compliance advice**. Specific regulatory obligations per jurisdiction must be confirmed with qualified Legal / Compliance / Security subject-matter experts.
