# ADR-0015: Entra ID remains the identity provider, and break-glass becomes a platform-local path that survives an Entra outage

**Date**: 2026-08-19
**Status**: **已採納**
**Deciders**: laitim2001（專案擁有者 / 單一開發者）
**Phase**: W23

**取代**: ADR-0007（Microsoft Entra ID as the identity provider, superseding the handoff's Okta）

---

## Context

Two things happened after ADR-0007 was adopted on 2026-08-07.

**One — a stakeholder ruling that ADR-0007 appears to contradict.** On 2026-08-17 the W19
drive-through raised the disabled "變更密碼" button on `/my-profile` as a contradiction. The project
owner ruled that **a local account path is to be kept, as a local-development and fallback path**.
That was logged as `AD-LocalPasswordFallback-1` (🔴 P0) and has blocked M4 planning for two phases,
because `0007:90` still instructs whoever plans M4 on how roles are provisioned, and they would read
a document whose premise is disputed.

**Two — ADR-0007 turns out to disagree with itself about break-glass.** It does not forbid
break-glass; it *requires* it, and then assigns it to two different places:

| Where | What it says |
|---|---|
| `0007:67` | `2 break-glass, P1 to Group CISO` → `no [deviation] — **Entra emergency access accounts**` |
| `0007:103` | access requests, review campaigns and break-glass (`05:49`) *"remain **platform features**, not Entra features — they are Entity Zero controls that must be evidenced from within the product"* |

**Both cannot hold.** An Entra emergency access account is administered in Entra, evidenced in
Entra's sign-in logs, and — decisively — **still requires Entra to be reachable**. `0007:136` states
in the same document that "Entra logs are not evidence-grade **for this platform's** chain".

So the open question was never "should there be a break-glass path" — `05:57` has always required
one, and the design deliverable's `sessionPolicy.js` specifies two of them (`15:249`). The open
question is: **may that break-glass path be local to the platform, so that it works when Entra ID
does not?**

Three further inputs frame it:

- **`05:7` is a conditional sentence, and ADR-0007 dropped the condition.** The original reads: *"The
  platform does not store passwords itself **where an IdP can be used**."* `0007:102` restated it as
  an unconditional prohibition — *"no local credential store"*. During an Entra outage an IdP
  **cannot** be used, so the clause that would forbid a local verifier is precisely the clause that
  is not in force.
- **`04:62` and `04:64`** require the platform to be up during a crisis, with *"no single points of
  failure in the critical path"*. Under ADR-0007 as written, Entra ID **is** that single point of
  failure for every login, break-glass included.
- **The deliverable already treats the two as different things.** `sessionPolicy.js` specifies
  *"local passwords disabled"* **and** *"two break-glass accounts, P1 to Group CISO"* in the same
  policy (`15:248-249`). Break-glass is not a local password login in the source document's own
  vocabulary, and it must not become one here.

---

## Options

| Option | 優點 | 缺點 | 成本 |
|--------|------|------|------|
| **A** Entra emergency access accounts only (what `0007:67` chose) | No credential verifier of our own; nothing new to secure | **Does not survive the outage it exists for.** Emergency accounts bypass conditional access, not Entra availability. Their use is evidenced in Entra, not in the platform's chain — which `0007:103` and `0007:136` both say is insufficient | Low, but buys nothing |
| **B** Platform-local break-glass: a small number of named emergency principals the platform can authenticate without any Entra call, under four binding controls | Removes the login SPOF `04:64` forbids; break-glass evidence lands in the platform's own append-only chain, satisfying `0007:103` and guardrail 2; honours the 2026-08-17 ruling's *fallback* half | **The platform becomes a credential verifier.** That is new attack surface under guardrail 1, and it drags the 28-point secure-development DoD (`16`) onto an authentication path | Medium, and permanent |
| **C** Local password login offered alongside SSO for ordinary users | Simplest reading of "keep the local account flow"; no special-case UX | Makes the platform a credential custodian **for everyone**. `05:7`'s condition *does* hold in normal operation, so this is the case it forbids. It is also the thing this platform's own controls would flag on any assessed system | High, and permanent |
| **D** Local passwords for local development only | Zero production surface | **Denies the "備用路徑" half of the 2026-08-17 ruling** — if Entra is unreachable, production has no way in at all. It is also redundant: local development already has a non-password answer (below) | Low, and dishonest about what was ruled |

---

## Decision

**選 B — Microsoft Entra ID via OIDC remains the identity provider for every ordinary session, and
the platform additionally implements a local break-glass authentication path that does not call
Entra ID at all.**

The identity-provider half of ADR-0007 is not reopened, and is restated in full below rather than
left in a superseded file.

The break-glass half is decided on the availability argument, not on convenience. `04:64` forbids a
single point of failure in the critical path; ADR-0007 left one and then assigned the emergency
procedure to that same failure point. Option A is not a smaller version of B — **it is a control
that is inoperative in exactly the scenario it names**. `05:7` does not stand in the way, because
its condition ("where an IdP can be used") is false during the outage this path exists for, and
`0007:102` reached the opposite conclusion only by dropping that clause.

### ⚠️ The same line was used the other way in ADR-0007 — the distinction, stated

`0007:78-80` rejected self-hosted Keycloak by citing `04:62`: adding a self-run identity plane to
the critical path works against being up during a crisis. **That argument is still correct and is
not being reversed.** The difference is traffic, not category:

| | Keycloak (rejected, still rejected) | Local break-glass (decided here) |
|---|---|---|
| Share of logins in normal operation | **100%** | **0%** |
| If it is down and nobody notices | Nobody can log in | Nothing happens until the day it is needed — **which is why FC-3 below makes drills mandatory** |
| Surface | Full IdP: federation, tokens, user store, admin console | One verifier, a handful of principals, no self-service anything |

A fallback that carries no traffic does not add a failure point to the critical path; it removes
one. But it does add an **unexercised** path, and an unexercised emergency control is a documented
failure mode of this project (`AD-DeferralUnwatched-1`) — hence FC-3.

### The four controls (binding — a break-glass path without all four is Option C wearing a costume)

1. **MFA with no dependency on the failed system.** Break-glass requires a second factor that is
   verified locally — an offline TOTP seed or a FIDO2 authenticator. ⛔ **No factor may route
   through a system an Entra outage takes down**, which rules out email OTP and Microsoft 365 push,
   since group email is Entra-backed. *The circularity test is the point of this control*: if the
   factor needs the thing that is broken, the path is decorative.
2. **Custody, not ownership.** Break-glass credentials are **issued to named custodians and held
   outside the platform** (sealed, offline). ⛔ **No self-service** — no registration, no change
   password, no reset flow, ever. The platform *verifies*; it never lets a holder rotate their own
   credential. ⚠️ It follows that these principals **must not exist in any seed, fixture or demo
   data** (guardrail 7 forbids seeded credentials), so the demo build has no break-glass account at
   all — not a disabled one.
3. **Evidence before access, fail-closed.** A break-glass authentication writes to the platform's
   own append-only hash-chained log (`05:21-23`, ADR-0003) **in the same transaction that issues the
   session**, and raises the P1 to the Group CISO the deliverable requires (`15:249`).
   ⛔ **If the audit write cannot complete, authentication fails.** An emergency login that leaves no
   evidence is worse than no emergency login, because the platform then cannot evidence its own
   access governance (guardrail 2). ⚠️ **Attempts are logged and alarmed, not only successes.**
4. **Time-boxed and single-shot.** The session is short (**≤ 60 minutes absolute, no refresh, no
   "remember me"**) and re-entry requires the physical factor again. After any use the credential is
   **burned** — the custodians must re-issue it before it works a second time. Entity scope and role
   for each break-glass principal are **pre-assigned and recorded in advance**; break-glass is not
   an implicit superuser (guardrail 6, and 約束 8 rule 3 — scope comes from the session, never from
   the request).

### 否決其他選項的理由

- **A (Entra emergency accounts)** — it fails the one test that matters for a break-glass control:
  it does not work when the IdP is unreachable. It also leaves the evidence in Entra, which
  `0007:136` already declares not evidence-grade for this platform's chain. Keeping A would mean
  keeping a control that reads as satisfied and is not.
- **C (local login alongside SSO)** — `05:7`'s condition holds in normal operation, so this is
  exactly what that sentence forbids. Under guardrail 2 the platform is bound by the controls it
  enforces on others, and a general local-password path is among the first things an ISMS assessment
  flags. Control 4 above is what keeps B from silently becoming C, and FC-5 is what detects it if
  it does.
- **D (local development only)** — the "備用路徑" half of the 2026-08-17 ruling would be dropped
  without saying so. It is also unnecessary: local development already authenticates without
  passwords via `apps/api/src/modules/policy/dev-principal.ts`, which announces itself at boot,
  marks every response, and **throws under `NODE_ENV=production`**. That mechanism satisfies the
  local-development half of the ruling today; nothing about it requires a password.

---

## Restated from ADR-0007 (unchanged decisions, repeated here so no one has to read a superseded file)

⛔ Per plan R3 these are **not** incorporated by reference.

- **Vendor: Microsoft Entra ID**, superseding the design handoff's Okta. `06:11`'s selection
  principle ("boring, well-supported technology") counts existing organisational assets, and all
  three sibling projects already authenticate against Entra ID (ADR-0001 §Context). Introducing a
  second IdP for one application inverts that principle.
- **Protocol: OIDC**, superseding the deliverable's SAML 2.0. `04:49` and `06:21` both specify OIDC,
  and design documents outrank deliverables (`CLAUDE.md` §權威排序).
- **Every policy requirement in the deliverable is retained** — hardware key for Platform admin,
  30 min idle / 12 h absolute session, IP restriction, JIT auditor expiry, and two break-glass
  accounts raising a P1 to the Group CISO. ⭐ **This ADR changes only where the last of those is
  implemented**, from Entra emergency accounts to the platform itself. The requirement itself is
  unchanged, which is what keeps this a substitution rather than a scope reduction.
  `15-design-alignment.md` §8.6 carries the matching deviation row.
- **Keycloak (self-hosted IdP) stays rejected** — see the traffic-share table above.
- **Segregation of duties is not delivered by the IdP.** Entra expresses group membership and
  conditional access; it does not know that an auditor must not edit the controls they assure
  (`05:9`). SoD remains an application-layer constraint enforced server-side (已確認參數 13).
- **Entity scope reaches the application only from the token or session, never from a request
  parameter** (`CLAUDE.md` 約束 8). That claim feeds the RLS session variable ADR-0004 relies on.

---

## Consequences

### 我們接受了什麼

- **The platform becomes a credential verifier, and that is new attack surface.** This is the whole
  price of the decision and it is not softened: a stored verifier, a lockout policy, and a hashing
  choice all now exist on an authentication path where yesterday there was nothing. The 28-point
  secure-development DoD (`16`) applies to it in full.
- **An emergency path that is never exercised is worth nothing**, and this project has already
  measured that failure shape twice (`AD-DeferralUnwatched-1`; the W19 dead controls that passed
  every gate). FC-3 makes the drill the falsifier rather than a good intention.
- **Two authentication paths means two sets of tests, and the second one's tests are negative
  tests** — proving break-glass is *refused* (wrong factor, burned credential, expired session,
  audit-write failure) matters more than proving it works.
- **`0007:92`'s "two identity planes" note is gone, not inherited.** There is one Entra tenant. The
  single-region topology (**ADR-0010**, which superseded ADR-0006) removed the second plane, and no
  in-scope jurisdiction requires one — the platform serves **13 OpCos across 11 jurisdictions**
  (已確認參數 4 / 12).

### 這個決定約束了什麼

- **M4 builds both paths.** OIDC + entity-scope claim mapping, *and* the break-glass verifier with
  its four controls. `07:35`'s M4 line ("OIDC + MFA; entity-scoped roles…") is now understood to
  include the second path.
- **The login page must not grow a general password field.** The break-glass entry point is a
  **separate route**, not a field on the main form, and it is rate-limited and alarmed **on
  attempt**. The recorded deviation at `login/page.tsx:14-25` (five password inputs removed, no
  FORGOT/RESET states) **stands unchanged** — those screens served self-service credential
  management, which control 2 forbids outright.
- ⚠️ **`/my-profile`'s "變更密碼" button is still wrong, and now for a settled reason.** Its file
  header (`my-profile/page.tsx:37`) justifies its disabled presence as "waiting for an ADR
  amendment". That wait ends here, and the answer is **no**: break-glass is not self-service
  password change, so the button has no future behaviour to be enabled into. It is harmless today
  (disabled, and `my-profile.test.tsx:54-56` pins zero password inputs) ⇒ **tracked as a new AD, not
  changed in this phase** (plan §4 declares `apps/**` UNTOUCHED).
- **There is no password reset flow in this platform, in any wave.** Custodial re-issue replaces it.
- **Break-glass use is an Entity Zero event.** It appears in the platform's own audit trail, is
  reportable from within the product, and is subject to the same access-review evidence as any
  other privileged access (`05:54`).

### 可證偽條件 ⭐

⛔ Each names something that **exists today**, so it can actually fire. ADR-0007's condition #2 was
conditioned on an Azure China instance that this project does not have and will not build, so it
could never fire; it is **deleted rather than carried forward**, and this sentence is its epitaph.

1. **If Entra ID cannot express six roles × entity-subtree scope** — e.g. group-claim count limits
   bite at **13 OpCos × 6 roles**, or subtree scope has no natural group representation — then scope
   must move to an application-side role-to-scope table. *Fires when*: M4 provisions the first
   subtree-scoped group and the claim count is measured. (Carried forward from `0007:108`, with the
   OpCo count corrected from 14 to **13**.)
2. **If group IT standardises on a different IdP**, the organisational-convergence basis of the
   vendor choice disappears. *Fires when*: any of the three sibling projects migrates off Entra ID —
   observable in their auth stack today (ADR-0001 §Context). (Carried forward unchanged from
   `0007:114` — it was the one condition in ADR-0007 that could still fire, and it survives the
   supersession intact.)
3. ⭐ **If a break-glass drill cannot complete without touching Entra ID or any Entra-dependent
   system**, the path is decorative and this ADR is falsified. *Fires when*: the first drill runs —
   and a drill that has never run is itself the finding. **A drill is mandatory before M4 can be
   called done**, precisely so this condition has an occasion to fire.
4. **If the platform's own append-only log is unavailable during the outage** (e.g. the same
   incident takes the database down), then control 3 makes break-glass fail closed and the platform
   has no emergency access at all. *Fires when*: any incident affects both Entra and the platform
   database. ⚠️ **This is a real gap, accepted knowingly** — the alternative (issue the session, log
   later) trades guardrail 5 for availability, and that trade is not this ADR's to make.
5. ⭐ **If break-glass is used at all outside a declared IdP-unavailability incident**, it has become
   Option C by drift. *Fires when*: the platform's own audit trail shows a break-glass
   authentication with no corresponding incident record — **observable from inside the product,
   which is the point of control 3**. Two such uses in any 12-month window reopens this ADR.

### Rollback

- **Removing the break-glass path**: cheap before M4 (it is not built yet), and cheap after —
  deleting a verifier that shares no code with the OIDC path is a deletion, not a migration. What is
  *not* recoverable is the audit history of any use, which must be retained per `05` §Records
  retention regardless.
- **Entra → another OIDC provider**: unchanged from ADR-0007 — moderate, concentrated in
  conditional-access policy re-expression and group-to-scope mapping, **provided the app consumes
  only standard OIDC claims. Design constraint: do not consume Entra-proprietary claim shapes.**
- **回滾窗口**: **M4**. Before M4 both halves are configuration and design. After M4 provisions real
  users, scope assignments and custodial credentials, changing the IdP means re-issuing every
  assignment, and changing the break-glass design means a custody ceremony.

---

## Security & compliance impact

*(This project's mandatory fifth block — `06:70`.)*

| Guardrail | Effect |
|---|---|
| **g1 — must not be a risk source** | ⚠️ **Mixed, and stated honestly.** A local credential verifier is surface this platform did not have. It is accepted because the alternative leaves a control that is inoperative in its own scenario (Option A), and because the four controls hold the surface to a handful of custodial principals with no self-service. **This is the single largest cost of this ADR.** |
| **g2 — Entity Zero** | **Positive, and this is the deciding guardrail.** `0007:103` required break-glass to be evidenced *from within the product*; assigning it to Entra made that impossible. Break-glass use now lands in the platform's own chain and is reportable by the platform about itself. |
| **g5 — audit trail** | Positive with a hard edge. Control 3 makes the audit write a **precondition of access**, not a side effect. ⚠️ FC-4 records what that costs when the log is the thing that is down. |
| **g6 — least privilege & SoD** | Preserved. Break-glass principals carry **pre-assigned** role and entity scope, not implicit superuser. SoD and Three-Lines separation remain application-enforced — the IdP does not deliver them, and neither does this path. |
| **g4 — entity-scoped access** | Neutral-to-watchful. A break-glass session feeds the same RLS session variable as any other, so a mis-scoped emergency principal is a data-isolation failure by the same mechanism (`0007:134`). Its scope is therefore reviewed at issue time, not at use time. |
| **g7 — secure SDLC** | ⚠️ **Load increases.** The verifier is subject to the 28-point DoD (`16`) in full: no secrets in source, hashing choice recorded, lockout and rate limiting, and **⛔ no seeded credential in any environment** — the demo build has no break-glass principal at all. |
| **g8 — privacy & residency** | Unchanged from ADR-0010. No localisation requirement remains in scope, so identity data sits in the single region with everything else. |

---

## 相關

- **取代**: **ADR-0007** —— its Status line is updated; its body is left untouched so the evolution of
  the judgement stays legible (`14-adr/README.md:143`). ⚠️ Its internal disagreement about
  break-glass (`:67` vs `:103`) is **left in place** for the same reason — this file resolves it,
  and rewriting the old one would erase the evidence that it needed resolving.
- **相關 ADR**: ADR-0010（single region; the second identity plane `0007:92` anticipated does not
  exist）· ADR-0003（the hash-chained log control 3 writes to）· ADR-0004（the RLS session variable
  the scope claim feeds）· ADR-0001（`jwks-rsa` precedent in `unified-operation-platform`）
- **關閉**: `AD-LocalPasswordFallback-1`（🔴 P0）· `AD-30`（Azure China present-tense narration —
  the ADR-0007 half）· `AD-43`（dead falsifiability conditions — the ADR-0007 half）
- **偏離記錄**: `15-design-alignment.md` §8.6 — Okta → Entra ID, SAML → OIDC, and now
  Entra emergency accounts → platform-local break-glass
- **上游**: 2026-08-17 stakeholder ruling recorded in `AD-LocalPasswordFallback-1`（W19 Day-3
  drive-through）· CH-002 audit（`docs/09-analysis/mockup-data-vs-spec-audit-20260807.md:199`）
- **實作**: consumed at **M4**（`07:35`）—— ⛔ including the mandatory drill in FC-3
- **仍然關閉**: `decision-form.md` OQ-5（identity provider）—— the answer is unchanged, the pointer
  moves here
