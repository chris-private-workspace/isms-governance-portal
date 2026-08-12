-- Phase W06 — the control library (M1 slice 3).
--
-- Same rule as W02/W03/W04/W05: everything below the Prisma-generated DDL is
-- hand-written and MUST stay in this one migration. A table that exists before
-- its RLS policy is an unscoped table, and 約束 8 has no grace period.
--
-- ⭐ THIS TABLE'S SCOPE IS A PROPERTY OF THE ROW, NOT OF THE TABLE (ADR-0014).
-- It is the first one, and the shape below is what every later table with both
-- shared and owned rows copies. Four things here are decisions, not mechanics:
--
--   1. THREE PER-COMMAND POLICIES, NOT ONE `FOR ALL`. A group-shared control is
--      readable by every entity and writable only by its owner. A single policy
--      cannot express that: UPDATE and DELETE choose their rows through the SAME
--      `USING` that reading widened. Measured on PostgreSQL 18 (W06 Day 1,
--      artifacts/d1-rls-probe.out) with one asymmetric FOR ALL policy — HK1
--      successfully DELETED, and successfully STOLE, SG1's group-shared row.
--
--   2. `WITH CHECK` REFUSES THE GROUP VALUE ITSELF. Without the
--      `applies_to_scope <> 'group'` half, `WITH CHECK (org_entity_id = ANY ...)`
--      never looks at the marker, so any OpCo could mint a control binding all
--      thirteen — measured, same probe. Group rows are therefore seeded by
--      migration or by an admin path that does not exist yet, exactly as
--      extension_fields:77-79 already states for its global half.
--
--   3. THERE IS NO `FOR DELETE` POLICY, AND ITS ABSENCE IS THE CONTROL.
--      Measured with DELETE deliberately granted (artifacts/d1-rls-probe2-*.out):
--      with no policy for a command, RLS denies EVERY row — deleting your own
--      returns 0 rows — while SELECT and UPDATE are unaffected. Absence is
--      deny-all; a narrow policy is allow-within-a-range. It also means this
--      table does not depend on the GRANT below staying as it is: a future
--      GRANT DELETE would still delete nothing. ⛔ Do not "complete the set" by
--      adding a fourth policy — that would LOOSEN this table.
--
--   4. NO COMPOSITE (id, org_entity_id) UNIQUE KEY, unlike asset_groups/assets.
--      That anchor exists so a child can carry entity identity into its FK, and
--      the M7 Risk↔Control link cannot: 02a:413 lets a group-shared control link
--      to any entity's risks, so the two ids are MEANT to differ. Adding the
--      anchor now would encode the invariant this table exists to break.
--
-- ⚠️ `applies_to_scope` has TWO values; 02a:217 lists three. `subtree` is absent
-- because nothing could honour it — entity-scope.resolver.ts:120-142 expands a
-- scope downward only, so a child's scope never contains the parent that owns a
-- subtree control. A settable value with no effect is AP-3. Recorded at 02a:217.

-- CreateEnum
CREATE TYPE "control_type" AS ENUM ('preventive', 'detective', 'corrective');

-- CreateEnum
CREATE TYPE "control_nature" AS ENUM ('manual', 'automated', 'hybrid');

-- CreateEnum
CREATE TYPE "control_frequency" AS ENUM ('continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annual', 'event_driven');

-- CreateEnum
CREATE TYPE "control_effectiveness" AS ENUM ('not_tested', 'effective', 'partially_effective', 'ineffective');

-- CreateEnum
CREATE TYPE "control_applies_to_scope" AS ENUM ('entity', 'group');

-- CreateTable
CREATE TABLE "controls" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "control_type" NOT NULL,
    "nature" "control_nature" NOT NULL,
    "frequency" "control_frequency" NOT NULL,
    "framework_refs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applies_to_scope" "control_applies_to_scope" NOT NULL DEFAULT 'entity',
    "effectiveness" "control_effectiveness" NOT NULL DEFAULT 'not_tested',
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "controls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "controls_ref_code_key" ON "controls"("ref_code");

-- CreateIndex
CREATE INDEX "controls_applies_to_scope_retired_at_idx" ON "controls"("applies_to_scope", "retired_at");

-- CreateIndex
CREATE INDEX "controls_org_entity_id_retired_at_idx" ON "controls"("org_entity_id", "retired_at");

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "controls" ADD CONSTRAINT "controls_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- No DELETE, same as every other table: records are retired, never removed
-- (guardrail 3). Note that here the privilege is the SECOND layer — decision 3
-- in the header means the policy layer refuses deletes on its own.
GRANT SELECT, INSERT, UPDATE ON "controls" TO isms_app;

-- ===========================================================================
-- Row-level security — three policies, per ADR-0014
-- ===========================================================================
ALTER TABLE "controls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "controls" FORCE  ROW LEVEL SECURITY;

-- READ: your own entities, plus every group-shared control regardless of owner.
-- This is the widened half, and it is widened for exactly one reason — 00:59
-- makes a group-shared control library one of Wave 1's answers, and a library
-- only the author can read is not one.
CREATE POLICY "controls_read" ON "controls"
  FOR SELECT
  USING ("applies_to_scope" = 'group' OR "org_entity_id" = ANY (app_entity_scope()));

-- WRITE: your own entities only, AND never the group value. Both halves are
-- load-bearing; see decision 2. The two clauses are identical on purpose — the
-- row you may create is exactly the row you may leave behind after an update,
-- so a caller cannot walk a row out of its own scope in two steps.
CREATE POLICY "controls_insert" ON "controls"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()) AND "applies_to_scope" <> 'group');

CREATE POLICY "controls_update" ON "controls"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()) AND "applies_to_scope" <> 'group')
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()) AND "applies_to_scope" <> 'group');

-- ⛔ No "controls_delete" policy. That is decision 3 in the header, not an
-- omission. RLS default-denies a command with no policy; adding a narrow one
-- would permit deletes that are currently impossible.

COMMENT ON TABLE "controls" IS
  'Control library. Scope is per-ROW (applies_to_scope), not per-table: group-shared controls are readable group-wide and writable only by their owning entity. Three per-command policies, no FOR DELETE policy — see ADR-0014.';

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
CREATE TRIGGER "controls_validate_extensions"
  BEFORE INSERT OR UPDATE ON "controls"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('control');
