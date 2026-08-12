-- CreateEnum
CREATE TYPE "control_test_status" AS ENUM ('scheduled', 'in_progress', 'passed', 'partial', 'failed');

-- CreateEnum
CREATE TYPE "evidence_linked_type" AS ENUM ('control_test');

-- CreateTable
CREATE TABLE "control_tests" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "control_id" UUID NOT NULL,
    "status" "control_test_status" NOT NULL DEFAULT 'scheduled',
    "scheduled_for" TIMESTAMPTZ(6),
    "performed_at" TIMESTAMPTZ(6),
    "tester_user_id" UUID,
    "reviewer_user_id" UUID,
    "conclusion" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "control_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "uri_or_blob_ref" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "collected_at" TIMESTAMPTZ(6) NOT NULL,
    "linked_type" "evidence_linked_type" NOT NULL,
    "linked_id" UUID NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "control_tests_ref_code_key" ON "control_tests"("ref_code");

-- CreateIndex
CREATE INDEX "control_tests_org_entity_id_retired_at_idx" ON "control_tests"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "control_tests_control_id_retired_at_idx" ON "control_tests"("control_id", "retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_ref_code_key" ON "evidence"("ref_code");

-- CreateIndex
CREATE INDEX "evidence_org_entity_id_retired_at_idx" ON "evidence"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "evidence_linked_type_linked_id_idx" ON "evidence"("linked_type", "linked_id");

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "controls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_tester_user_id_fkey" FOREIGN KEY ("tester_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_tests" ADD CONSTRAINT "control_tests_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ⛔ Note what is NOT above: no foreign key on "evidence"."linked_id". That is
-- the polymorphic specification (02a:227), not an oversight, and the trigger
-- below is what supplies the integrity it would have provided.

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- No DELETE, same as every other table: records are retired, never removed
-- (guardrail 3), and the policy layer refuses deletes on its own besides.
GRANT SELECT, INSERT, UPDATE ON "control_tests" TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "evidence"      TO isms_app;

-- ===========================================================================
-- Row-level security — three per-command policies each, per ADR-0014
-- ===========================================================================
ALTER TABLE "control_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "control_tests" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "evidence"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "evidence"      FORCE  ROW LEVEL SECURITY;

-- ⚠️ NEITHER read policy is widened the way "controls_read" is. A group-shared
-- CONTROL is a library entry every entity may consult; a TEST of it is an event
-- that happened at one entity, and its evidence is that entity's record. Reading
-- another OpCo's test results is a roll-up question, and roll-up is an explicit
-- authorised scope expansion (約束 8), never a property of the row.
CREATE POLICY "control_tests_read" ON "control_tests"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "control_tests_insert" ON "control_tests"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "control_tests_update" ON "control_tests"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "evidence_read" ON "evidence"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "evidence_insert" ON "evidence"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "evidence_update" ON "evidence"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ⛔ No FOR DELETE policy on either table. RLS default-denies a command with no
-- policy, so absence is stricter than any narrow policy could be (ADR-0014).

-- ===========================================================================
-- The reference guard — what a foreign key cannot do here
-- ===========================================================================
-- Every child table before these two closed cross-entity references with a
-- COMPOSITE foreign key: assets.(asset_group_id, org_entity_id) can only name a
-- group whose org_entity_id already matches. Neither table here can use that.
--
--   * control_tests names a control, and "controls" deliberately has no
--     @@unique([id, org_entity_id]) to point at — the M7 Risk↔Control link
--     exists to join rows whose entities differ, so the anchor would encode an
--     invariant the schema intends to break.
--   * evidence.linked_id is polymorphic (02a:227) and has no foreign key at all.
--
-- W07 Day 1 measured what that leaves open, against real PostgreSQL:
--
--   M1  A principal scoped to HK1 inserted a row naming an SG1 entity-local
--       control it cannot SELECT (visible rows: 0). The INSERT SUCCEEDED —
--       referential-integrity checks are NOT subject to row-level security.
--   M2c The same insert naming an id that exists nowhere was refused 23503.
--   M3b With no foreign key at all, a row naming pure garbage was accepted.
--
-- M1 and M2c together are an existence oracle: success means "exists, not
-- yours", 23503 means "absent". That is the distinction 約束 8 forbids, arising
-- below the layer any controller could correct.
--
-- SECURITY INVOKER is load-bearing, and identical in intent to
-- validate_extensions: the lookup runs under the CALLER's policies, so a parent
-- the caller cannot read is a parent that does not exist as far as this check is
-- concerned. DEFINER would run it as the schema owner and see everything, which
-- would turn the guard into a rubber stamp.
--
-- ⭐ Ordering is what closes the oracle rather than renaming it. A BEFORE trigger
-- runs AHEAD of the constraint, so an absent id never reaches the foreign key:
-- both "absent" and "not readable" leave through the same RAISE and the caller
-- cannot tell them apart (measured, W07 Day 1 M5). Had the constraint run first
-- this guard would have produced two different codes — the same oracle wearing a
-- new error, and looking fixed.
CREATE OR REPLACE FUNCTION assert_parent_in_scope() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  parent_table  text := TG_ARGV[0];
  parent_column text := TG_ARGV[1];
  parent_id     uuid;
  reachable     boolean;
BEGIN
  -- to_jsonb rather than dynamic record access: it reads the column by name
  -- without building a statement out of NEW, which is clearer and one less place
  -- for an identifier to be interpolated.
  parent_id := (to_jsonb(NEW) ->> parent_column)::uuid;

  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1)', parent_table)
    INTO reachable
    USING parent_id;

  IF NOT reachable THEN
    -- 23503 foreign_key_violation, NOT 42501, and the choice is deliberate.
    --
    -- 42501 is what RLS raises when the ROW ITSELF is out of scope, and the
    -- application maps it to "org entity not found" (scope-refusal.ts). Reusing
    -- it here would report the wrong field: a caller who named a valid entity and
    -- an unreachable control would be told its entity was the problem.
    --
    -- 23503 says what actually happened — a reference that cannot be resolved —
    -- and UnknownReferenceError already exists for it, carrying only the field
    -- NAME and never the id. Its docstring describes this exact case: "either
    -- because no such record exists, or because it belongs to another entity".
    --
    -- ⚠️ This does NOT reopen the oracle. Both branches that fail arrive here
    -- through the same NOT EXISTS, so absent and unreadable produce the identical
    -- 23503, exactly as W05's composite foreign key produces the identical error
    -- for its two cases. Re-measured after the change rather than assumed.
    RAISE EXCEPTION '% is not readable in the current scope', parent_column
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END $$;

COMMENT ON FUNCTION assert_parent_in_scope() IS
  'BEFORE INSERT OR UPDATE guard for a reference no composite foreign key can secure. SECURITY INVOKER so the lookup is filtered by the caller policies, and BEFORE the constraint so an absent id and an unreadable one both raise 42501.';

-- OR UPDATE is not decoration: without it a caller could insert a legitimate row
-- and then re-point it at an unreachable parent in a second statement (measured,
-- W07 Day 1 M6).
CREATE TRIGGER "control_tests_control_in_scope"
  BEFORE INSERT OR UPDATE ON "control_tests"
  FOR EACH ROW EXECUTE FUNCTION assert_parent_in_scope('controls', 'control_id');

-- On evidence this trigger does TWO jobs, because there is no foreign key to do
-- the first: it is the missing referential integrity as well as the scope guard.
-- It also fails CLOSED for a linked_type it does not know — a future attestation
-- id would not be found in control_tests and would be refused, which is the right
-- default until that branch is written.
CREATE TRIGGER "evidence_linked_in_scope"
  BEFORE INSERT OR UPDATE ON "evidence"
  FOR EACH ROW EXECUTE FUNCTION assert_parent_in_scope('control_tests', 'linked_id');

COMMENT ON TABLE "control_tests" IS
  'One execution of a control test (02a:225). No result column: 02a section 4 terminal states are the result. control_id is guarded by a trigger, not a composite foreign key.';

COMMENT ON TABLE "evidence" IS
  'Evidence attached to a record (02a:227). linked_id is polymorphic and carries NO foreign key by design; assert_parent_in_scope() supplies both the integrity check and the scope guard.';

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
CREATE TRIGGER "control_tests_validate_extensions"
  BEFORE INSERT OR UPDATE ON "control_tests"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('control_test');

CREATE TRIGGER "evidence_validate_extensions"
  BEFORE INSERT OR UPDATE ON "evidence"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('evidence');
