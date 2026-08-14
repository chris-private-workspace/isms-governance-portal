-- Statement of Applicability (W11, M1 slice 8) — 02a:215, the mandatory ISO 27001
-- artifact. One row per framework clause per entity.
--
-- ⚠️ HAND-WRITTEN, and the timestamp is UTC. `prisma migrate dev --create-only`
-- could not run: it refuses while 20260813071857_rm_report_snapshot reports as
-- "modified after it was applied" on the developer database, which is true — W10
-- corrected that migration's comment in place after a test refuted its claim
-- about GRANT versus policy. Resetting the dev database to satisfy the checksum
-- would have been a destructive fix to a comment. The integration suite is
-- unaffected either way: it DROPs and CREATEs its database every run, so
-- `migrate deploy` meets an empty _prisma_migrations and no checksum to compare.
-- UTC rather than local time, deliberately: AD-MigrationTimestampTz-1 records a
-- hand-written migration sorting BEFORE an already-applied one because it used
-- local time while Prisma uses UTC.

-- CreateEnum
CREATE TYPE "soa_implementation_status" AS ENUM ('implemented', 'partially_implemented', 'not_implemented', 'planned');

-- CreateTable
CREATE TABLE "statements_of_applicability" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "framework" TEXT NOT NULL,
    "clause_ref" TEXT NOT NULL,
    "applicable" BOOLEAN NOT NULL,
    "justification" TEXT,
    "implementation_status" "soa_implementation_status" NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "statements_of_applicability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "statements_of_applicability_ref_code_key" ON "statements_of_applicability"("ref_code");

-- CreateIndex
CREATE INDEX "statements_of_applicability_org_entity_id_retired_at_idx" ON "statements_of_applicability"("org_entity_id", "retired_at");

-- ⭐ THE ENTITY IS IN THIS KEY FROM THE FIRST VERSION, and it leads.
--
-- Both other halves come from the request body, which is the AD-UniqueKeyOracle-1
-- criterion exactly: a unique tuple the caller chooses is an existence oracle,
-- because unique-index enforcement does not respect row-level security and it
-- runs ahead of any foreign key. W10 measured that on rm_report_versions — a
-- colliding label answered 23505 and a non-colliding one 23503, which enumerates
-- another entity's rows one guess at a time — and had to ship a second migration
-- to close it.
--
-- ⚠️ Shipping the fix is not the same as knowing it transfers. W11 Day 3
-- neutralises this column out of the key and measures whether the two failure
-- modes actually diverge here, rather than assuming W10's result carries over to
-- a table with no parent.
--
-- Entity FIRST rather than trailing: scope is the first predicate of every query
-- (multi-tenant-data.md:50). W10's key opens with report_id only because a parent
-- id precedes it there; this table has no parent.
--
-- CreateIndex
CREATE UNIQUE INDEX "statements_of_applicability_org_entity_id_framework_clause_ref_key" ON "statements_of_applicability"("org_entity_id", "framework", "clause_ref");

-- AddForeignKey
ALTER TABLE "statements_of_applicability" ADD CONSTRAINT "statements_of_applicability_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements_of_applicability" ADD CONSTRAINT "statements_of_applicability_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ⚠️ NO COMPOSITE FOREIGN KEY, and no (id, org_entity_id) unique index to anchor
-- one, because there is nothing to compose with. Every composite key in this
-- schema exists to force a CHILD's org_entity_id to equal its PARENT's —
-- assets/asset_groups, actions/issues, rm_report_versions/rm_reports. The SoA is
-- nobody's child: it references org_entities and users and no business parent.
-- Adding the anchor now would be an abstraction with no second implementation
-- (AP-5). W09 already showed the cost of adding one later is a small migration,
-- not a redesign — `evidence` gained its anchor a phase after it was built.

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- Explicit, not defaults (guardrail 7). No DELETE: retirement is `retired_at`,
-- and every table in this schema is retired rather than deleted (02a:99).
GRANT SELECT, INSERT, UPDATE ON "statements_of_applicability" TO isms_app;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
-- FORCE as well as ENABLE: without FORCE the table OWNER bypasses the policies,
-- and the owner is the role migrations run as.
ALTER TABLE "statements_of_applicability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "statements_of_applicability" FORCE  ROW LEVEL SECURITY;

-- Three per-command policies rather than one FOR ALL (ADR-0014). A single
-- permissive policy would make "may read" and "may write" the same decision, and
-- W06 measured that they are not: the read half widens for group-shared rows
-- while the write half must not.
--
-- ⛔ NO `FOR DELETE` POLICY, matching the absent GRANT above. An absent policy is
-- stricter than a narrow one (ADR-0014) — there is no expression to get wrong.

CREATE POLICY "statements_of_applicability_read" ON "statements_of_applicability"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "statements_of_applicability_insert" ON "statements_of_applicability"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ⛔ THE WITH CHECK HALF IS NOT WHAT REFUSES A CROSS-ENTITY MOVE HERE, and the
-- first version of this comment said it was. Measured, W11 Day 3, by permitting
-- one policy at a time against a real UPDATE moving an SG1 row to HK1:
--
--   _update WITH CHECK -> true                     still refused
--   _update USING -> true, WITH CHECK dropped      still refused
--   + _insert WITH CHECK -> true                   still refused
--   + _read USING -> true                          UPDATE 1  (the row left)
--
-- So the SELECT policy is what does it: PostgreSQL checks the NEW row of an
-- UPDATE against it, and the error says as much ("new row violates row-level
-- security policy"). With both expressions identical, this WITH CHECK is
-- redundant TODAY and no test can distinguish it — AD-BorrowedRefusal-1 in its
-- sixth form, found by neutralising a guard, seeing nothing change, and hunting
-- instead of assuming the guard worked.
--
-- ⚠️ It is kept, and not merely out of caution: it stops being redundant the
-- moment the read half widens past the write half. `controls` is already in that
-- state (group-shared rows are readable by entities that must not own them), so
-- W06's identically-worded comment may be right for that table and wrong only
-- here. That is a separate measurement, not an inference from this one.
CREATE POLICY "statements_of_applicability_update" ON "statements_of_applicability"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));
