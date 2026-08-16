-- ===========================================================================
-- W16 / M1 slice 11 — the APAC ISMS profile (13-isms-profile-module.md).
--
-- Five entity-scoped tables, zero endpoints. What this slice delivers is a
-- constraint surface; the consumers arrive in M6c.
--
-- HAND-WRITTEN, and the timestamp is UTC. `prisma migrate dev` has been
-- unusable for anyone since W10 (AD-DevDbChecksumDrift-1) — this is the FIFTH
-- phase to route around it. W16 Day-0 finally measured the gap instead of
-- inferring it: isms_dev has applied 17 of the 22 migrations on disk, head
-- unchanged since 20260813153153. Four earlier phases accepted the integration
-- suite's "rebuilt, migrated and seeded" line as proof of Prong 3, and that
-- line cannot see checksum drift at all — the suite DROPs and CREATEs, so
-- _prisma_migrations is empty every time.
--
-- ---------------------------------------------------------------------------
-- THREE THINGS IN HERE ARE DELIBERATE ABSENCES. Read them before "completing"
-- any set.
--
-- 1. org_entity_id ON THE FOUR CHILD TABLES IS NOT IN THE SPEC.
--    13:39, 13:41 and 13:43 list only isms_profile_id. The column is here
--    because CLAUDE.md 約束 8 iron law 1 requires it on child tables too
--    ("冗餘是故意的"), 02a:92 marks it Required, and 02a:430 makes every
--    domain record N:1 to OrgEntity. Where a design document and a guardrail
--    disagree, CLAUDE.md says the design document is what changes — so
--    13-isms-profile-module.md is amended in this same commit rather than this
--    deviation living only here.
--
--    It is carried as a COMPOSITE foreign key, (isms_profile_id, org_entity_id)
--    -> isms_profiles(id, org_entity_id), not as a bare column beside a single
--    -column FK. Two independent FKs would let a child point at entity A's
--    profile while claiming entity B, and nothing would be wrong at either
--    constraint — the shape AD-W15InvariantInCommentOnly-1 records against
--    obligations. Seven tables in this schema already use the composite form.
--
-- 2. THERE IS NO `posture` COLUMN, and this one is not a preference.
--    13:27 lists posture among the per-OpCo certification attributes and the
--    user ruled to build that list in full. The other eight are here. This one
--    is refused because 02a:437 says posture RAG values are "derived, not
--    stored as source of truth" and 02a:128 marks the vocabulary "Derived for
--    dashboards". Storing it would contradict the data model spec in the one
--    place it speaks plainly. Reopening it needs a recorded deviation, not a
--    column.
--
-- 3. isms_profile_versions HAS NO `FOR UPDATE` POLICY AND NO `GRANT UPDATE`,
--    and neither absence is an oversight — see the RLS section at the bottom.
-- ===========================================================================

-- CreateEnum
CREATE TYPE "offering_business_line" AS ENUM ('op', 'os', 'other');

-- CreateEnum
CREATE TYPE "offering_type" AS ENUM ('product', 'service');

-- CreateEnum
-- 13:43 gives four values. The prototype renders three different ones
-- (Approved / Conditional / Pending); 已確認參數 #11 gives the deliverable
-- authority over the UI and the procedure authority over domain logic, so the
-- four win and M6c owes a display mapping.
CREATE TYPE "offering_approval_status" AS ENUM ('proposed', 'approved', 'suspended', 'withdrawn');

-- CreateEnum
CREATE TYPE "certification_state" AS ENUM ('certified', 'in_scope', 'not_in_scope');

-- CreateTable
CREATE TABLE "isms_profiles" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "profile_year" INTEGER NOT NULL,
    "certificate_count" INTEGER,
    "scope_statement" TEXT,
    "certifier_comment_scope" TEXT,
    "company_reply" TEXT,
    "valid_from" DATE,
    "valid_to" DATE,
    "iso_27001" BOOLEAN NOT NULL DEFAULT false,
    "iso_27017" BOOLEAN NOT NULL DEFAULT false,
    "certification_state" "certification_state",
    "certificate_number" TEXT,
    "certification_body" TEXT,
    "certificate_issued_at" DATE,
    "certificate_expires_at" DATE,
    "surveillance_at" DATE,
    "review_at" DATE,
    "iso_officer_name" TEXT,
    "current_version_id" UUID,
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "isms_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isms_sites" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "isms_profile_id" UUID NOT NULL,
    "site_name" TEXT NOT NULL,
    "is_head_office" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "employees_in_scope" INTEGER,
    "certifier_comment_employees" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "isms_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isms_contacts" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "isms_profile_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT,
    "department" TEXT,
    "role" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "isms_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_offerings" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "isms_profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "business_line" "offering_business_line" NOT NULL,
    "offering_type" "offering_type" NOT NULL,
    "approval_status" "offering_approval_status" NOT NULL,
    "approved_at" DATE,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "approved_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isms_profile_versions" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "isms_profile_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "versioned_at" DATE NOT NULL,
    "actor_user_id" UUID,
    "actor_role" TEXT,
    "note" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "isms_profile_versions_pkey" PRIMARY KEY ("id")
);

-- ===========================================================================
-- Indexes
--
-- ⚠️ ONE NAME IS SET EXPLICITLY, and the reason is a bug this repo already has.
-- PostgreSQL's NAMEDATALEN is 63 and it truncates longer identifiers SILENTLY.
-- W11 wrote a 67-character index name on statements_of_applicability; the
-- database stored 63 of it, and schema.prisma has disagreed with the database
-- ever since — `migrate diff` still reports the rename (W16 Day-0 DR12). The
-- derived name for the version-label key here would be 69 characters, so it is
-- mapped to a 50-character one in BOTH schema.prisma and this file. Every other
-- name in this migration was measured at 56 characters or fewer.
-- ===========================================================================

-- CreateIndex
CREATE UNIQUE INDEX "isms_profiles_ref_code_key" ON "isms_profiles"("ref_code");

-- CreateIndex
CREATE INDEX "isms_profiles_org_entity_id_retired_at_idx" ON "isms_profiles"("org_entity_id", "retired_at");

-- CreateIndex
-- The anchor the four children reference.
CREATE UNIQUE INDEX "isms_profiles_id_org_entity_id_key" ON "isms_profiles"("id", "org_entity_id");

-- CreateIndex
-- 13:49 makes the year the natural key: profiles are versioned BY YEAR, and
-- previous years are retained rather than overwritten.
--
-- ⭐ org_entity_id IS IN THIS KEY ON PURPOSE (AD-UniqueKeyOracle-1). Without it,
-- inserting profile_year 2026 would return 23505 when another entity already
-- holds that year and succeed when nobody does — two distinguishable results
-- from a tuple the caller chooses, which is an existence oracle. W10 measured
-- that on rm_report_versions and W11 measured it again on SoA. The criterion was
-- applied here BEFORE the table existed, which is the whole point of ROADMAP 4d.
CREATE UNIQUE INDEX "isms_profiles_org_entity_id_profile_year_key" ON "isms_profiles"("org_entity_id", "profile_year");

-- CreateIndex
CREATE UNIQUE INDEX "isms_sites_ref_code_key" ON "isms_sites"("ref_code");

-- CreateIndex
CREATE INDEX "isms_sites_org_entity_id_retired_at_idx" ON "isms_sites"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "isms_sites_isms_profile_id_idx" ON "isms_sites"("isms_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "isms_contacts_ref_code_key" ON "isms_contacts"("ref_code");

-- CreateIndex
CREATE INDEX "isms_contacts_org_entity_id_retired_at_idx" ON "isms_contacts"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "isms_contacts_isms_profile_id_idx" ON "isms_contacts"("isms_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "approved_offerings_ref_code_key" ON "approved_offerings"("ref_code");

-- CreateIndex
CREATE INDEX "approved_offerings_org_entity_id_retired_at_idx" ON "approved_offerings"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "approved_offerings_isms_profile_id_idx" ON "approved_offerings"("isms_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "isms_profile_versions_ref_code_key" ON "isms_profile_versions"("ref_code");

-- CreateIndex
CREATE INDEX "isms_profile_versions_org_entity_id_retired_at_idx" ON "isms_profile_versions"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "isms_profile_versions_isms_profile_id_idx" ON "isms_profile_versions"("isms_profile_id");

-- CreateIndex
-- What isms_profiles.current_version_id points at. It carries isms_profile_id so
-- "the current version must belong to THIS profile" is a database fact.
CREATE UNIQUE INDEX "isms_profile_versions_id_isms_profile_id_key" ON "isms_profile_versions"("id", "isms_profile_id");

-- CreateIndex
-- ⚠️ 50 characters by explicit map, not the 69 Prisma would derive. See the
-- index section header above.
CREATE UNIQUE INDEX "isms_profile_versions_org_entity_profile_label_key" ON "isms_profile_versions"("org_entity_id", "isms_profile_id", "version_label");

-- ===========================================================================
-- Foreign keys
-- ===========================================================================

-- AddForeignKey
ALTER TABLE "isms_profiles" ADD CONSTRAINT "isms_profiles_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_profiles" ADD CONSTRAINT "isms_profiles_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- ⚠️ MATCH SIMPLE is what makes the nullable case work: when current_version_id
-- is NULL the constraint is satisfied even though `id` is NOT NULL. W10 Day-0
-- measured that rather than assuming it — under MATCH FULL this design is not
-- buildable. The pair (current_version_id, id) includes this row's own id, so a
-- profile cannot point at another profile's version.
ALTER TABLE "isms_profiles" ADD CONSTRAINT "isms_profiles_current_version_id_id_fkey" FOREIGN KEY ("current_version_id", "id") REFERENCES "isms_profile_versions"("id", "isms_profile_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_sites" ADD CONSTRAINT "isms_sites_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_sites" ADD CONSTRAINT "isms_sites_isms_profile_id_org_entity_id_fkey" FOREIGN KEY ("isms_profile_id", "org_entity_id") REFERENCES "isms_profiles"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_contacts" ADD CONSTRAINT "isms_contacts_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_contacts" ADD CONSTRAINT "isms_contacts_isms_profile_id_org_entity_id_fkey" FOREIGN KEY ("isms_profile_id", "org_entity_id") REFERENCES "isms_profiles"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- RESTRICT rather than SET NULL, and mechanically so: SET NULL would blank
-- user_id on a row whose `name` may also be NULL, which the CHECK below forbids.
ALTER TABLE "isms_contacts" ADD CONSTRAINT "isms_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_offerings" ADD CONSTRAINT "approved_offerings_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_offerings" ADD CONSTRAINT "approved_offerings_isms_profile_id_org_entity_id_fkey" FOREIGN KEY ("isms_profile_id", "org_entity_id") REFERENCES "isms_profiles"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_profile_versions" ADD CONSTRAINT "isms_profile_versions_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "isms_profile_versions" ADD CONSTRAINT "isms_profile_versions_isms_profile_id_org_entity_id_fkey" FOREIGN KEY ("isms_profile_id", "org_entity_id") REFERENCES "isms_profiles"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- RESTRICT: a frozen version row names who issued it, and a row that is
-- evidence must not quietly lose the actor when the account is removed.
ALTER TABLE "isms_profile_versions" ADD CONSTRAINT "isms_profile_versions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Cross-column constraint
--
-- 13:41 says "`user_id` OR `name`" and means it: the certificate recipient may
-- be someone with no platform account, and a contact row that names nobody at
-- all is not a contact. The precedent for a cross-column CHECK in this schema
-- is assessment_instances_sod (W09).
-- ===========================================================================

ALTER TABLE "isms_contacts"
  ADD CONSTRAINT "isms_contacts_identifies_someone"
  CHECK ("user_id" IS NOT NULL OR "name" IS NOT NULL);

-- ===========================================================================
-- Privileges
--
-- Explicit, not defaults (guardrail 7). Measured against the existing three
-- tiers in W16 Day-0 rather than assumed — the W15 lesson was that a thing which
-- has been identical nine times running does not raise its hand the first time
-- it differs.
--
--   SELECT, INSERT, UPDATE  the twelve mutable entity-scoped tables
--   SELECT, INSERT          rm_report_versions, attestations, audit_log
--   SELECT                  the global reference tables
--
-- The four editable profile tables take the first. isms_profile_versions takes
-- the second, matching rm_report_versions word for word.
--
-- No DELETE anywhere, as on every other table: records are retired, never
-- removed (guardrail 3). There is no GRANT DELETE in this entire schema.
-- ===========================================================================

GRANT SELECT, INSERT, UPDATE ON "isms_profiles"       TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "isms_sites"          TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "isms_contacts"       TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "approved_offerings"  TO isms_app;
GRANT SELECT, INSERT         ON "isms_profile_versions" TO isms_app;

-- ===========================================================================
-- Row-level security
--
-- FORCE as well as ENABLE on every table. Without FORCE the table OWNER
-- bypasses the policies, and the owner is the role migrations run as.
--
-- ⚠️ THE PLAN FOR THIS SLICE SAID "ENABLE" AND STOPPED THERE. Day-0 caught it
-- (DR3) and the reason it is worth recording is that nothing else would have:
-- the integration suite connects as isms_app_user, which is not the owner, so
-- every scope test would have passed against a table the owner could read
-- straight through. A guardrail-4 hole with no test that can see it.
-- ===========================================================================

ALTER TABLE "isms_profiles"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "isms_profiles"         FORCE  ROW LEVEL SECURITY;
ALTER TABLE "isms_sites"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "isms_sites"            FORCE  ROW LEVEL SECURITY;
ALTER TABLE "isms_contacts"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "isms_contacts"         FORCE  ROW LEVEL SECURITY;
ALTER TABLE "approved_offerings"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approved_offerings"    FORCE  ROW LEVEL SECURITY;
ALTER TABLE "isms_profile_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "isms_profile_versions" FORCE  ROW LEVEL SECURITY;

-- Three per-command policies on each mutable table, per ADR-0014.

CREATE POLICY "isms_profiles_read" ON "isms_profiles"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_profiles_insert" ON "isms_profiles"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_profiles_update" ON "isms_profiles"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_sites_read" ON "isms_sites"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_sites_insert" ON "isms_sites"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_sites_update" ON "isms_sites"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_contacts_read" ON "isms_contacts"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_contacts_insert" ON "isms_contacts"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_contacts_update" ON "isms_contacts"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "approved_offerings_read" ON "approved_offerings"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "approved_offerings_insert" ON "approved_offerings"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "approved_offerings_update" ON "approved_offerings"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ⭐⭐ TWO policies on the version table, not three, AND THE ABSENCE IS THE
-- FEATURE. ADR-0014 settled that an absent policy is stricter than a narrow one:
-- an absent policy has no expression to get wrong.
--
-- Unlike rm_report_versions, which wrote this claim as a prediction and said so,
-- here it is MEASURED. W10's Day-3 N1a granted UPDATE and left the policy
-- absent: the statement raised nothing and changed zero rows. So the two layers
-- refuse DIFFERENTLY, and that difference is what makes each one testable —
--
--   no GRANT UPDATE                -> 42501, an error
--   GRANT UPDATE, no policy        -> no error, zero rows affected
--
-- ⛔ Do not "complete the set" by adding an update policy here. Correcting an
-- ISMS profile means issuing a new version (13:31), never editing one, and
-- 13:31's own `state` field is refused for the same reason: it would have to
-- change when a newer version arrives.
--
-- ⚠️ CONSEQUENCE. version, updated_by, updated_at and retired_at on this table
-- are frozen at their insert value, because no path can write them. retired_at
-- in particular means 05:77's three-year retention for ISMS profile versions has
-- no mechanism here (AD-ImmutableRowRetention-1); enabling one is a policy
-- change, not a column change.

CREATE POLICY "isms_profile_versions_read" ON "isms_profile_versions"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "isms_profile_versions_insert" ON "isms_profile_versions"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ===========================================================================
-- Table comments — the deviations, where a reader of the database can find them
-- ===========================================================================

COMMENT ON TABLE "isms_profiles" IS
  'One APAC ISMS profile per (operating company, year) -- 13:37, keyed that way because 13:49 retains previous years rather than overwriting them. NO status column: 02a §4 defines no lifecycle for this entity and three documents propose three different vocabularies. NO region_code: its own example value (RAPO) is an OpCo code, which OrgEntity.code already carries. NO posture: 02a:437 says posture RAG is derived, not stored.';

COMMENT ON TABLE "isms_sites" IS
  'Sites inside an entity certification scope (13:39). org_entity_id is NOT in that spec line; it is required by CLAUDE.md 約束 8 iron law 1 and carried as a composite FK so a site cannot be filed under another entity profile. No natural unique key: (isms_profile_id, site_name) would be an existence oracle.';

COMMENT ON TABLE "isms_contacts" IS
  'People attached to an ISMS profile (13:41), multiple allowed. user_id OR name, enforced by CHECK: 13:41 expects contacts with no platform account. role is free text -- nothing external fixes that vocabulary.';

COMMENT ON TABLE "approved_offerings" IS
  'Which OP/OS products and services an entity may sell (13:43) -- the one new capability in this module, answering what 13:65 calls a governance question the region cannot answer in one place. approved_by is free text because 02a:70 forbids modelling governance bodies (ISC/ITSC) as users.';

COMMENT ON TABLE "isms_profile_versions" IS
  'Version history of an ISMS profile (13:31): v, date, by, role, note. Immutable: no FOR UPDATE policy exists, so RLS refuses every update regardless of GRANT -- measured on rm_report_versions by W10 N1a, not predicted. 13:31 state is NOT stored; superseded is derived, a version being current iff its profile current_version_id names it. Retained 3 years per 05:77; no mechanism enforces that yet.';
