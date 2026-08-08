# 16 — Secure Development: Definition of Done

Derived from the organisation's own security scans of **RAPO-ITPM** and **RAPO-SCM** (Qualys WAS, 30 Jul 2026; Rapid7 InsightVM, 29 Jul 2026). These are not generic best practices — they are **the failure patterns this organisation actually hits**. Apply them **during development** so they are never discovered at the pre-go-live scan.

**Source artifacts** (keep alongside this doc): `Secure-Development-Guidance-SCM-ITPM.md` (full guidance, bilingual) and `Secure-Dev-DoD-Checklist.xlsx` (28-point checklist, findings register, severity summary).

## Why this matters especially for this platform

This is a platform that **manages** security risk and vulnerabilities. Shipping it with the very findings it is built to track would destroy its credibility — the Entity Zero tenet (`04`) in its most concrete form. Every checkpoint below is something the platform must be able to evidence about itself.

## The central lesson from the scans

> Of 45 web findings, **not one** was a classic SQL injection or RCE. Every finding fell into four families: **configuration, transport security, session handling, and data exposure** — the categories that are cheap to fix during development and expensive to fix at go-live.

So the risk is not exotic attacks. It is defaults left unchanged.

## Definition of Done — 28 checkpoints

Applies to every story before it is done. Full detail, per-finding mapping and the Chinese version are in the source guidance.

### Transport & certificates
1. HTTPS only; all non-HTTPS requests redirected 301/302.
2. `Strict-Transport-Security` issued on all responses.
3. TLS 1.2+ only; SSLv2/v3 and TLS 1.0/1.1 disabled.
4. Cipher suites limited to ECDHE + AEAD (GCM / CHACHA20-POLY1305); MD5, SHA1, RC4, 3DES, DES, static-RSA and NULL/EXPORT disabled.
5. Certificate CN **and** SAN match the real public hostname; custom domain with an organisation-owned certificate bound — **no default platform hostname exposed**.
6. Management/deployment ports (8172 Web Deploy, SCM, FTP) closed externally or IP-restricted.

### Session & cookies
7. Every cookie sets `Secure`, `HttpOnly` and an explicit `SameSite`.
8. Session ID regenerated and the pre-login session invalidated immediately after successful authentication.
9. Session IDs from a CSPRNG, **≥128 bits**, unique per session.
10. No credentials, tokens or personal data in `localStorage` / `sessionStorage`.

### Authentication & credentials
11. Passwords appear only in the authentication request — never reflected, echoed or reused elsewhere.
12. Passwords stored with a salted strong hash (PBKDF2 or equivalent); use a strong pseudo-random token wherever a credential would otherwise travel outside authentication.
13. Any form with a password field served exclusively over HTTPS.
14. Brute-force protection (lockout after 3–5 failed attempts, with a defined unlock path).
15. Sensitive fields set `autocomplete="off"`; the application enforces strong password rules.

### Data protection
16. Responses mask card numbers, identity numbers and other PII by default — **masking server-side, not in the browser**.
17. Test and demo data contain **no checksum-valid credit card numbers and no real personal data**.
18. `Server`, `X-Powered-By`, `X-AspNetVersion`, `X-AspNetMvcVersion` and equivalent fingerprinting headers removed.
19. No backup files, config files, directory listings or guessable resources reachable by forced browsing.

### Security headers
20. `Content-Security-Policy` implemented, including `frame-ancestors 'self'`.
21. `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` all present.
22. Sensitive pages and API responses use `Cache-Control: no-store, private`; nothing sensitive is `public` or carries `max-age` > 86400.

### Injection & output encoding
23. All reflected output encoded per its output context (HTML text node, attribute, URL, JavaScript, JSON).
24. Redirect and callback parameters (`callbackUrl`, `returnUrl`) validated against an **allow-list**.
25. Client code avoids dangerous sinks (`innerHTML`, `eval`, `document.write`) and untrusted source-to-sink paths.

### Dependencies & platform
26. External domains and third-party scripts inventoried and minimised; **SRI** applied to third-party scripts; CSP `script-src` / `connect-src` allow-listed.
27. Platform components, runtimes and libraries on supported, patched versions; externally exposed ports reviewed as part of IaC review.
28. **Gate:** a security scan runs against the feature branch and introduces **no new Confirmed Vulnerability at Level 3 or above**.

## Checkpoints that bite this platform hardest

| # | Why it is high-risk here |
|---|---|
| 16, 17 | We will ship **seed and demo data**, and the design handoff already contains sample records. The scans found **24 instances** of checksum-valid card patterns in the existing apps. Seed data must be generated to fail checksum validation and contain no real personal data. |
| 10 | The artifact/UI guidance already forbids browser storage; this makes it a security requirement, not a preference. |
| 8, 9 | Session regeneration after login and CSPRNG session IDs sit directly on the M4 identity milestone. |
| 24 | The reported finding was on an auth callback (`/api/auth/callback/credentials`) — exactly the shape of endpoint our SSO/OIDC flow will have. Allow-list from day one. |
| 16 | The platform holds real PII: incident records (including the restricted violating-acts/disciplinary block), ISMS leader contact details, user records. Server-side masking is mandatory. |
| 5, 6 | The existing findings come from **Azure App Service defaults** — platform certificate `*.azurewebsites.net` and the exposed **8172** management port. If we deploy on the same platform we inherit these unless explicitly configured. |

## Environment signals worth carrying into the ADRs

The scan evidence tells us about the existing estate, which should inform — not dictate — our decisions:

- **Azure App Service** is in use (Web Deploy/SCM port 8172, `waws-prod-hk1-*` publish hostnames, `*.azurewebsites.net` certificates). Relevant to **ADR-0011** (compute platform): `hk1` shows an existing Hong Kong footprint, and if we deploy on the same platform we inherit findings 5 and 6 unless they are explicitly configured away. That inheritance is an argument *for* App Service, not against it — the defaults here are **known and documented**, which a new platform's would not be.
- The `.NET` fingerprinting headers (`X-AspNetVersion`, `X-AspNetMvcVersion`) indicate an existing **ASP.NET** estate; the auth callback path shape suggests a JS framework elsewhere. Relevant to **ADR-0001** (backend framework) — alignment with what the team already operates is a legitimate selection criterion.

## How this plugs into the build

- **Per story:** the 28 checkpoints are the story-level Definition of Done. Owner and status tracked per the checklist workbook.
- **Per milestone:** the security gate in `07` is extended — a milestone is not done unless the applicable checkpoints pass.
- **In CI (M0):** encode what can be automated — TLS/header assertions, cookie attribute tests, secret scanning, SCA, SAST, DAST, and a seed-data check that rejects checksum-valid card patterns and real-looking PII.
- **In the platform itself:** these checkpoints become controls in the platform's own **Entity Zero** control set, tested like any other control.

## Fix-verification discipline

The findings register in the workbook lists every finding with its scanner ID, severity, instance count and the remediation stated in the report. Use it to **confirm a fix actually closes the matching finding ID** before marking a checkpoint done — closing a checkpoint without verifying against the register is how findings reappear at the go-live scan.
