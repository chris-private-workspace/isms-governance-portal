# 04 — Security by Design ★

## The credibility tenet

This platform manages security and risk. **If it is itself insecure, fragile, or unauditable, it has no credibility** — no risk or compliance team will trust a risk register that runs on a leaky, unlogged system. So the platform is held to the same standard it enforces on everyone else. The controls in this document are non-negotiable guardrails, not aspirations.

## Self-governance — "Entity Zero"

The platform is registered as an asset inside its own system and is subject to its own governance:

- It appears in its own `Asset` register; its components and data flows are catalogued.
- It has its own entries in the `Risk` register and its own `Control` set.
- It is assessed against the frameworks it tracks (e.g. ISO 27001, SOC 2) **using its own capabilities** — control tests, evidence, attestations.
- Its findings become `Issue`s and `Action`s like any other entity's.

If the platform cannot demonstrate its own compliance through its own features, that is a product defect. This is the strongest possible proof of the tenet above.

## Security tenets

- **Least privilege** — every identity, service, and token gets the minimum it needs.
- **Zero implicit trust** — components authenticate and authorise each other; no "internal network = trusted".
- **Defence in depth** — database RLS *and* application checks; multiple independent layers.
- **Secure & fail-secure defaults** — deny by default; on error, fail closed, not open.
- **Auditable by construction** — if an action isn't logged, it didn't happen; logs are evidence-grade.

## Threat model (STRIDE — key items)

| Threat | Example | Primary mitigations |
|---|---|---|
| **Spoofing** | Impersonating a user or service | SSO/OIDC, MFA, short-lived tokens, mutual auth between services |
| **Tampering** | Altering a risk rating or audit record | RLS, input validation, append-only hash-chained audit trail, integrity checks |
| **Repudiation** | "I never approved that" | Non-repudiable, tamper-evident audit trail with actor, action, before/after, timestamp |
| **Information disclosure** | One subsidiary reading another's data | Entity-scoped RLS, encryption at rest/in transit, field-level encryption for sensitive data |
| **Denial of service** | Platform unavailable during an incident | HA, rate limiting, resource quotas, DR with defined RTO/RPO |
| **Elevation of privilege** | Analyst gaining admin/auditor rights | Fine-grained RBAC + SoD, no standing privileged access, just-in-time elevation |

Maintain this as a living threat model; extend it per component as the build progresses.

## Data protection

- Encryption **in transit** (TLS everywhere, including service-to-service) and **at rest**.
- **Key management** via a managed KMS/HSM; keys are rotated; no keys in code or images.
- **Field-level encryption** for the most sensitive attributes (e.g. certain evidence, personal data).
- **Data classification** drives handling; personal data additionally follows privacy-by-design (below).
- **Residency** — storage/processing can be pinned per jurisdiction where required (see `03`).

## Identity & access

- Authentication: SSO via OIDC, enforced **MFA**.
- Authorisation: **entity-scoped RBAC** plus attribute-based rules where scope is dynamic.
- **Segregation of duties** and **Three Lines of Defense** independence enforced through permissions (an auditor cannot edit the controls they assure).
- **No standing admin.** Privileged actions use just-in-time, time-boxed, fully-logged elevation.

## Integrity & non-repudiation (audit trail)

- The audit trail is **append-only** and **tamper-evident**: each entry chains to the previous via a hash, so any alteration or deletion is detectable.
- The platform must be able to **prove its own log integrity** on demand (verify the chain).
- Detail on the mechanism lives in `05`; the *requirement* lives here because it is a security guarantee, not a convenience feature.

## Availability & resilience

A risk platform is needed most during a crisis — so it must be up during one.

- High-availability deployment; no single points of failure in the critical path.
- Tested backups; disaster recovery with explicit **RTO/RPO** targets.
- The platform has its own business-continuity plan and practises the resilience it preaches.

## Secure SDLC & supply chain

- **No secrets in source.** Secrets live in a managed secrets store; CI fails on detected secrets.
- **Scanning in CI:** dependency/software-composition analysis (SCA), static analysis (SAST), dynamic analysis (DAST).
- **SBOM** produced per build; **artifacts signed**; provenance verified before deploy.
- **Infrastructure-as-code is scanned** for misconfiguration before apply.
- Dependencies are pinned and reviewed; supply-chain risk is tracked like any other risk.

## Privacy by design

- Data **minimisation** and **purpose limitation** from the schema up.
- A **DPIA** is maintained for the platform itself.
- The platform is **DSAR-capable** for the personal data it holds.

## Compliance self-application

Map the platform's own controls to the frameworks it tracks (at minimum ISO 27001 Annex A and SOC 2 Trust Services Criteria) and keep the mapping current. This mapping is the artifact that lets the platform pass its own "Entity Zero" assessment.

## Secure development Definition of Done

The 28-point checklist in `16-secure-development-dod.md` — derived from the organisation's **own scan results** on RAPO-ITPM and RAPO-SCM — is the story-level secure-coding standard. It covers transport and certificates, session and cookies, authentication and credentials, data protection, security headers, injection and output encoding, and dependencies and platform.

Two points deserve emphasis here because they are architectural, not incidental:

- **Seed and demo data must contain no checksum-valid card numbers and no real personal data.** The existing scans found 24 instances of valid card patterns; we will ship seed data and the design handoff already contains sample records.
- **Defaults are the risk.** None of the 45 findings was SQL injection or RCE; every one was configuration, transport, session handling or data exposure. Platform defaults (e.g. Azure App Service's `*.azurewebsites.net` certificate and exposed 8172 management port) must be explicitly overridden, not inherited.

## Security gate (every increment must pass)

- Access to any new data is entity-scoped and enforced at the database layer.
- Every new state-changing action writes to the audit trail.
- No new secret is committed; new dependencies pass SCA.
- Threat model updated for the new component; obvious STRIDE items mitigated.
- Sensitive data is classified and encrypted appropriately.
- No control the platform enforces is violated by the new code.
- **The applicable checkpoints from the 28-point secure-development DoD (`16`) pass**, verified against the findings register — not merely asserted.
