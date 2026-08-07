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

> **Open design question:** the current spreadsheet has no approved-products/services column — this is a genuine addition. Minimum viable shape is the fields above (name + OP/OS classification + approval status + date). Confirm whether it also needs: applicable geography, linkage to the certification/framework that authorises it, and a validity/expiry period. Model those only if actually needed.

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
