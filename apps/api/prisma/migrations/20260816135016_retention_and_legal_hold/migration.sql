-- W17 / M1 slice 12 — records retention and legal hold.
--
-- Hand-written (AD-DevDbChecksumDrift-1: `prisma migrate dev` has been blocked
-- since W10 and this is the SIXTH phase to walk around it. Day-0 D9 put a
-- number on it for the second time — isms_dev has 17 of 23 applied, head still
-- at 20260813153153. Recorded rather than passed over, because every
-- walk-around being cheap is exactly why it has survived six phases).
-- Directory name is a UTC timestamp, not local (AD-MigrationTimestampTz-1;
-- local here is UTC+8 and would have sorted eight hours ahead — measured again
-- today: 20260816135016 UTC vs 20260816215017 local).
--
-- ============================================================================
-- 1. WHY `retention_policies` HAS NO org_entity_id
-- ============================================================================
--
-- It EXTENDS the global list in rules-on-demand/multi-tenant-data.md:57-65
-- rather than matching a row already on it, so :81 requires an argument rather
-- than a default. The same argument is written into that file and into the PR
-- description (:82 — the PR is where the decision is SEEN):
--
--   All six confirmed rows (05:73-80) are GROUP-LEVEL obligations. "Security
--   incident records — 3 years after closure — ISO 27001 A.5.28" is a clause of
--   a standard plus a group records policy. It is not SG OpCo 1's opinion about
--   its own incidents, and there is no per-entity variant of what A.5.28 says.
--
--   Scoping it would store thirteen byte-identical rows, and would silently
--   answer a question nobody asked: "may HK1 shorten its own retention to one
--   year?" A schema that makes that expressible has answered a compliance
--   question by default, at the wrong layer. What IS per-entity is which
--   records exist and whether a hold applies to them — and that is legal_holds
--   below, which IS scoped.
--
-- ⛔ Consequence for tests, the same one W15 Day-0 D7 discovered and stated
--    because it is not obvious: with GRANT SELECT only, the application role
--    cannot INSERT, and PostgreSQL raises 42501 BEFORE evaluating any
--    constraint. Constraint assertions on this table MUST use the migration
--    owner connection (asOwner() / DATABASE_URL_MIGRATE, jurisdiction.int.spec
--    :63-67). Written through the app role they would pass while testing
--    nothing — AD-VacuousScopeTest-1's shape.
--
-- ============================================================================
-- 2. WHY `legal_holds.scope_ref` HAS NO GUARD
-- ============================================================================
--
-- 02a:318 makes scope polymorphic over record / class / entity. W14's
-- assert_polymorphic_parent_in_scope() is the obvious reuse and it is
-- STRUCTURALLY unusable here, measured at Day 0 rather than assumed:
--
--   1. 20260815090746_polymorphic_parent_guard/migration.sql:47 casts the id
--      column to uuid BEFORE walking the (type_value, table) pairs at :52-59.
--      scope_type = 'class' targets a record class — "Security incident
--      records" — which is not a uuid. That path raises 22P02, not the clean
--      23503 the guard's contract promises.
--   2. scope_type = 'record' means ANY business table; there are 31 today. The
--      guard needs one named table per type value and no such mapping exists.
--   3. Only scope_type = 'entity' maps cleanly, to org_entities.
--
-- ⇒ A trigger covering branch 3 alone would be WORSE than none: green,
--    asserting, and blind to the two branches that need checking. That is
--    AD-VacuousScopeTest-1 exactly. The gap is left open and named:
--    AD-LegalHoldScopeRefUnguarded-1, unblocked by the first consumer that has
--    to resolve a hold (M6b), which is also when scope_type's domain finally
--    has a real requirement to answer to.
--
-- ============================================================================
-- 3. WHY `record_class` IS TEXT AND NOT A FOREIGN KEY
-- ============================================================================
--
-- Three of the six classes at 05:73-80 name entities that are Wave 2 or not
-- built: security incidents (`Event`, 11), audit issues (17) and external party
-- assessments (12). A relation would have to invent them here, which is the
-- ruling W11 made for framework_id and W16 for actor_role.
--
-- ⚠️ AD-UniqueKeyOracle-1, applied BEFORE the table exists: record_class is a
--    caller-supplied single-column unique key, which is the exact shape W10
--    measured as an existence oracle. It is not reachable TODAY because the
--    grant is SELECT only — so the safety is a property of the GRANT, not of
--    the key. Stated here because the grant is the first thing a later slice
--    would change.

-- CreateEnum
CREATE TYPE "retention_trigger" AS ENUM ('creation', 'closure', 'supersession');

-- CreateEnum
CREATE TYPE "retention_disposition" AS ENUM ('retain', 'archive', 'purge');

-- CreateEnum
--
-- Spelled as 02a:318 spells them. See banner section 2 for why nothing
-- validates what scope_ref points at.
CREATE TYPE "legal_hold_scope_type" AS ENUM ('record', 'class', 'entity');

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" UUID NOT NULL,
    "record_class" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    -- ⛔ NULLABLE, and these two were NOT NULL until Day 2 read the source
    -- properly. 02a:314 gives each column's DOMAIN and then says what 05
    -- confirms is "the six confirmed CLASSES AND PERIODS" — which is exactly
    -- the three columns 05:73-80 actually has (class, retention, basis).
    -- Two of the six triggers could be inferred from the period text ("3 years
    -- AFTER CLOSURE") and four could not; inferring even the two is authoring a
    -- value, and 已確認參數 #9 digitises the company's forms rather than
    -- inventing fields. NOT NULL here would have forced the seed to make four
    -- of them up. The columns stay because M6b's disposal scheduler must read
    -- them; they are empty until someone with the authority fills them in.
    "trigger" "retention_trigger",
    "disposition" "retention_disposition",
    "basis" TEXT NOT NULL,
    "review_cadence" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_holds" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "scope_type" "legal_hold_scope_type" NOT NULL,
    "scope_ref" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "applied_by" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_by" UUID,
    "released_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- A release is two facts recorded together, never one. "Released but nobody
-- knows who" is not a state this table admits, and 05:69 is the reason: a hold
-- is released "by authorised roles only", so the releasing party is part of
-- what the record exists to prove. Prisma cannot express a CHECK, so this
-- constraint is invisible to `migrate diff` — it lives or dies by the
-- integration test that fires it (23514).
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_released_pair_check"
  CHECK (("released_at" IS NULL) = ("released_by" IS NULL));

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_record_class_key" ON "retention_policies"("record_class");

-- CreateIndex
CREATE UNIQUE INDEX "legal_holds_ref_code_key" ON "legal_holds"("ref_code");

-- CreateIndex
CREATE INDEX "legal_holds_org_entity_id_retired_at_idx" ON "legal_holds"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "legal_holds_scope_type_scope_ref_idx" ON "legal_holds"("scope_type", "scope_ref");

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
--
-- RESTRICT on both, and deliberately NOT SetNull as ISMSProfile.owner is: who
-- placed a legal hold and who lifted it is the evidence the hold exists to
-- produce. Nulling it when a person leaves the company would destroy exactly
-- the fact an auditor asks for.
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_holds" ADD CONSTRAINT "legal_holds_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- ROW LEVEL SECURITY — `legal_holds` ONLY
-- ===========================================================================
--
-- `retention_policies` gets none: it has no org_entity_id to filter on, the
-- same position as jurisdictions / regulations / obligations in W15. Its
-- isolation story is the GRANT, not a policy.
--
-- ENABLE **and** FORCE. W16's plan wrote ENABLE and stopped, and its Day 0
-- caught it (DR3); this plan wrote both because that lesson was carried
-- forward rather than re-learned. The point stands and is worth repeating on
-- every new table: without FORCE the table OWNER reads straight through every
-- policy, and the integration suite connects as isms_app_user — so the scope
-- tests would all pass against a guardrail-4 hole none of them can see.
-- ===========================================================================

ALTER TABLE "legal_holds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_holds" FORCE  ROW LEVEL SECURITY;

-- TWO per-command policies, not three (ADR-0014: absence is the strictest
-- setting, so an unwritten command is a refused one).
--
-- ⛔ NO `FOR UPDATE` policy and NO `GRANT UPDATE`, which is the same
-- construction W10 used for rm_report_versions and W14 for attestations. It is
-- load-bearing here rather than incidental: releasing a hold IS an update, and
-- 05:69 restricts release to authorised roles. Role is an M4 entity (02a:71
-- puts Role / Permission there with no field-level spec), so the honest state
-- today is that release is NOT EXPRESSIBLE — and withholding the grant says so
-- in the schema instead of shipping an unrestricted release path and calling
-- the restriction future work.
--
-- ⚠️ The two layers fail DIFFERENTLY and W10's N1a plus W16's N3a measured it
-- on two separate tables: with no GRANT the attempt raises 42501; with a GRANT
-- but no policy it raises nothing at all and reports rowCount 0. The tests
-- assert the layer they mean, never "the table is immutable".

CREATE POLICY "legal_holds_read" ON "legal_holds"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "legal_holds_insert" ON "legal_holds"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- Grants.
--
-- retention_policies: SELECT only, copying threats / vulnerabilities
-- (asset_and_risk_chain :333-334) and the three W15 tables. ⭐ Load-bearing
-- beyond permissions — it is WHY this model is not in AUDITED_MODELS. The
-- application role physically cannot write it, so "no write path to audit" is
-- a database guarantee rather than an observation about today's code. Seeding
-- runs as the owner, which is how reference data arrives.
GRANT SELECT ON "retention_policies" TO isms_app;

-- legal_holds: SELECT + INSERT. Placing a hold is a real write by an entity;
-- releasing one is not expressible yet (see above).
GRANT SELECT, INSERT ON "legal_holds" TO isms_app;

COMMENT ON TABLE "retention_policies" IS
  'How long each class of record is kept (02a:314, 05:73-80). GLOBAL — extends the exemption list at multi-tenant-data.md:57-65 with the argument in this migration''s banner and in the PR description (:81-82). GRANT SELECT only, which is what makes "no write path to audit" a database guarantee.';

COMMENT ON TABLE "legal_holds" IS
  'A hold suspending disposal regardless of retention period (02a:318, 05:69). Entity-scoped, ENABLE + FORCE RLS, SELECT and INSERT policies only. scope_ref is polymorphic and carries NO referential integrity: assert_polymorphic_parent_in_scope() casts to uuid before branching, and the `class` target is not a uuid (AD-LegalHoldScopeRefUnguarded-1).';
