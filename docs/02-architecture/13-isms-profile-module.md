# 13 — APAC ISMS Profile Module

Each APAC subsidiary maintains its own **ISMS profile**: what its ISO 27001 certification covers, which sites are in scope, who runs the ISMS, and — a new requirement — **which products and services that entity is approved to sell**.

## Why this belongs in Wave 1

It is an extension of `OrgEntity`, and it is **load-bearing for other modules**: the certification scope of an entity determines what its risk assessment, control testing, and audit should cover. Building it early means later modules can scope themselves correctly instead of being retrofitted. It is also small and self-contained.

## Structure (from the Ricoh APAC ISMS profile template)

The template is company-level with **multiple sites per company** (the example is one head office plus two regional data centres).

**Company level** — region (e.g. RAPO), company name, country, number of certificates, ISMS scope statement, certification-body (SGS) comment on the scope statement, the company's reply.

**Site level** — site name, is-head-office flag, office address, number of employees covered by the certification scope, certification-body comment on the employee count.

**People** — name(s) of the person(s) leading the ISMS (can be multiple), department, and the certificate recipient's details.

## Agreed field list (from the design handoff — keep exactly)

- **Standards**: ISO 27001, ISO 27017 (toggles)
- Company name · Country · Number of certificates
- **Sites** — repeatable rows: site name, address, employees in scope (add / remove; blank rows discarded on save)
- Scope statement
- **ISMS leader** — name, department, email, address, phone

Per-OpCo certification attributes also carried: certification state (**Certified / In scope / Not in scope**), certificate number, **certification body**, issue date, expiry date, **surveillance date**, ISO (officer) name, review date, posture.

> The design drops the certification-body comment and company-reply fields that exist in the source spreadsheet. **Confirm whether those are still required** — they matter for tracking certifier queries between audits.

**Versioning behaviour:** *Save as new version* increments the version, marks the previous one **superseded**, stamps the actor **and the role they acted under**, and writes a version-history entry (`v, date, by, role, note, state`). Prior versions remain readable.

**Role behaviour:** Platform administrator sees all OpCos and can create/edit any profile; OpCo administrator sees only its own (with a banner stating others are not visible) and can edit; **OpCo OS sees only its own and is read-only**.

## Data model

**ISMSProfile** — `org_entity_id` (FK, the company), `region_code`, `profile_year` (the template is per-year, e.g. "2026"), `certificate_count`, `scope_statement`, `certifier_comment_scope`, `company_reply`, `status`, `valid_from`, `valid_to`.

**ISMSSite** — `isms_profile_id` (FK), `site_name`, `is_head_office` (bool), `address`, `employees_in_scope`, `certifier_comment_employees`.

**ISMSContact** — `isms_profile_id` (FK), `user_id` or `name`, `department`, `role` (ISMS lead / certificate recipient). Multiple allowed.

**ApprovedOffering** *(new capability — not in the current template)* — `isms_profile_id` (FK), `name`, `business_line` (**OP** = Office Printing · **OS** = Office Services · other), `offering_type` (product / service), `approval_status` (proposed / approved / suspended / withdrawn), `approved_at`, `approved_by`, `notes`.

**ISMSProfileVersion** *(added W16 — the entity `Versioning behaviour` above always implied)* — `org_entity_id`, `isms_profile_id` (FK), `version_label` (the `v`), `versioned_at` (the `date`), `actor_user_id`, `actor_role`, `note`. The parent carries `current_version_id`.

> **Open design question:** the current spreadsheet has no approved-products/services column — this is a genuine addition. Minimum viable shape is the fields above (name + OP/OS classification + approval status + date). Confirm whether it also needs: applicable geography, linkage to the certification/framework that authorises it, and a validity/expiry period. Model those only if actually needed.

---

## Implementation record — W16 (M1 slice 11), 2026-08-16

Built as five entity-scoped tables with no endpoints; consumers arrive in M6c.
**Nothing above this line was deleted.** Where the build departs from it, the
departure is recorded here so that "the spec said X and we did Y" stays legible.

| # | Spec text | Built as | Why |
|---|---|---|---|
| 1 | §Data model gives `ISMSSite` / `ISMSContact` / `ApprovedOffering` **only `isms_profile_id`** | all four child tables also carry **`org_entity_id NOT NULL`**, as a **composite FK** `(isms_profile_id, org_entity_id) → isms_profiles(id, org_entity_id)` | CLAUDE.md 約束 8 iron law 1 requires it on child tables too, `02a:92` marks it Required, `02a:430` makes every domain record N:1 to OrgEntity. CLAUDE.md's authority order says a design document that conflicts with a guardrail is the thing that changes — **this table is that change**. The composite form (7 existing precedents) stops a child claiming entity B while pointing at entity A's profile |
| 2 | `status` in `ISMSProfile` | **not built** | `02a:93` defines the base field as "per the entity's state machine (§4)" and `02a` §4 lists no lifecycle for this entity. W14 refused the same column on `Attestation`. Three documents propose three vocabularies (`superseded` here at §Versioning / `Current\|Superseded` in the design README / `Published\|Superseded` in the prototype), so there is no list to record — only one to invent |
| 3 | `region_code` in `ISMSProfile` | **not built** | Its example value in §Structure, `RAPO`, is an **OpCo code** (the design data has it as Ricoh Asia Pacific Operations Ltd, Hong Kong), which `OrgEntity.code` already carries. "Region" is structural: `OrgEntityType` has a `region` member and `OrgEntity.path` materialises the hierarchy |
| 4 | `posture`, in the nine per-OpCo certification attributes | **not built**; the other **eight** are | `02a:437` — "posture RAG values are **derived, not stored as source of truth**"; `02a:128` marks the vocabulary "Derived for dashboards". The user ruled to build the nine in full and this one was refused afterwards, on that basis, rather than dropped quietly |
| 5 | §Versioning behaviour's version-history entry includes `state` | **not built**; `current_version_id` on the parent instead | `state` would have to change when a newer version arrives — the one thing an immutable version row forbids. With the parent pointer it would be a second representation of one fact with no reconciliation rule. Superseded is **derived**: a version is current iff its profile's `current_version_id` names it. Copied from `RMReportVersion` (W10) |
| 6 | §Versioning behaviour stamps "the role they acted under" | `actor_role` is **free text**, not an FK | `02a:71` puts `Role` / `Permission` in **M4** with no field-level spec; a relation today would invent an entity |
| 7 | `ISMSContact.role` "(ISMS lead / certificate recipient)" | **free text**, not an enum | The parenthesis is illustration and nothing external fixes the vocabulary — the criterion `Attestation` sets out in `schema.prisma`. Narrowing later is one migration |
| 8 | §Agreed field list: certification-body comment + company reply | **built** (three nullable text columns) | User ruling 2026-08-16, closing `AD-DesignAlign-7`. The design dropped them from the **screen**; 已確認參數 #11 gives the deliverable authority over UI and the procedure authority over the domain |
| 9 | §Agreed field list: company name · country | **not built** | `OrgEntity.name` and `OrgEntity.jurisdiction_id` carry them. The design handoff's own README asks for "one source of truth in production" |
| 10 | §Open design question's three extensions (geography · framework linkage · validity period) | **not built** | That paragraph's own instruction: "Model those only if actually needed" |

**Still open after W16** — each tracked in `docs/01-planning/BACKLOG.md`:

- `iso_officer_name` (§Agreed field list) and `ISMSContact(role = 'ISMS lead')` are **two records of one person**. Both are built; which is authoritative is M6c's call.
- §Role behaviour says the OpCo administrator **can edit**; the design handoff's permission matrix gives that role **Read** on this module, and adds an Edit for Regional ISO which §Role behaviour does not mention. Not blocking — the GRANT is a database capability and role enforcement is M6c's, and `Role` itself is blocked until M4.
- §Dashboard view has no counterpart in `08-rollup-dashboard-spec.md` (zero mentions of this module). It is M8 work against a spec that does not exist yet.

## Year-on-year versioning

The source spreadsheet is a per-year tab ("2026"). Keep that: profiles are **versioned by year**, previous years retained as history rather than overwritten. This supports the certification audit trail and the platform's retention obligations.

## Roles

- **Subsidiary ISMS lead** — maintains their own entity's profile.
- **Regional office** — reviews across entities, sees the consolidated view, chases gaps.
- Entity-scoping applies as everywhere else: a subsidiary sees its own profile; the region sees all.

## How other modules use it

| Consumer | Use |
|---|---|
| Risk assessment | Scope of assessment follows the ISMS scope (per the RCI procedure, scope considers the ISMS scope and asset inventory) |
| Control testing / audit | What must be covered for this entity's certification |
| Statement of Applicability | SoA is produced per entity, within its certification scope |
| Roll-up dashboard | Certification coverage across the region; entities with expiring or incomplete profiles |
| Approved offerings | Which OP/OS products and services each entity may sell — a governance question the region currently cannot answer in one place |

## Dashboard view

Add a regional view showing, per entity: certification status, number of certificates, sites in scope, employees in scope, profile currency (is this year's profile complete?), and count of approved offerings by business line. This is a direct answer to the internal-visibility driver.
