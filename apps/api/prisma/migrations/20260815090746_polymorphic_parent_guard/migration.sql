-- The polymorphic parent guard (W14 Day 2) — one function, two callers, two
-- different mappings.
--
-- ⚠️ HAND-WRITTEN, UTC timestamp (AD-MigrationTimestampTz-1), same reason as
-- 20260815083338_attestation.
--
-- ===========================================================================
-- WHY A NEW FUNCTION RATHER THAN A THIRD ARGUMENT ON THE OLD ONE
-- ===========================================================================
-- assert_parent_in_scope() reads TG_ARGV[0] and TG_ARGV[1], which are literals
-- fixed at CREATE TRIGGER time. "Branch on the row's type column" cannot be
-- expressed by swapping those, because the branch has to happen per ROW.
--
-- Extending it with a third argument was considered and rejected on a measured
-- fact rather than taste: there are TWO polymorphic columns in this schema now
-- and their mappings do not overlap.
--
--   evidence.linked_id     ->  control_test = control_tests, attestation = attestations
--   attestations.subject_id ->  policy = policies,           control     = controls
--
-- So the third argument would have to carry the whole mapping anyway, at which
-- point it is a different function wearing the old one's name. The old one keeps
-- its two arguments and its single caller (control_tests_control_in_scope) and
-- is not touched by this migration — zero regression surface on a guard that
-- three phases depend on.
--
-- ⛔ AND THIS IS NOT AP-5. The function is variadic because it has TWO callers
-- today, which is the same test W07 applied when assert_parent_in_scope() was
-- given parameters at all (W07 retrospective §AP-5: "it takes parameters because
-- there were two call sites at the time, not for the future").
CREATE OR REPLACE FUNCTION assert_polymorphic_parent_in_scope() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  type_column text := TG_ARGV[0];
  id_column   text := TG_ARGV[1];
  type_value  text;
  parent_id   uuid;
  parent_table text;
  reachable   boolean;
  i           int;
BEGIN
  -- to_jsonb rather than dynamic record access, as assert_parent_in_scope() does:
  -- it reads a column by name without building a statement out of NEW.
  type_value := to_jsonb(NEW) ->> type_column;
  parent_id  := (to_jsonb(NEW) ->> id_column)::uuid;

  -- TG_ARGV[2..] are (type_value, table_name) pairs. Walking them here rather
  -- than hard-coding a CASE keeps the mapping visible at the CREATE TRIGGER site,
  -- where a reader looking at the table can see which parents it can name.
  i := 2;
  WHILE i < TG_NARGS LOOP
    IF TG_ARGV[i] = type_value THEN
      parent_table := TG_ARGV[i + 1];
      EXIT;
    END IF;
    i := i + 2;
  END LOOP;

  -- ⛔ FAIL CLOSED ON AN UNMAPPED TYPE. The W07 migration called this "the right
  -- default until that branch is written" and it stays the default now that a
  -- second branch exists: a value added to the enum without a matching pair here
  -- is refused, loudly, instead of silently skipping the check. An enum gaining a
  -- value is a schema change; this makes it also a visible one.
  IF parent_table IS NULL THEN
    RAISE EXCEPTION 'no parent table is mapped for % = %', type_column, type_value
      USING ERRCODE = '23503';
  END IF;

  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE id = $1)', parent_table)
    INTO reachable
    USING parent_id;

  -- 23503, not 42501, and NOT a fresh decision: 20260812055744's function records
  -- the whole argument (42501 is what RLS raises for the ROW ITSELF, so reusing it
  -- for an unreachable PARENT reports the wrong field). Repeating the code here
  -- rather than the reasoning, because the reasoning has one home.
  --
  -- ⚠️ Both failure branches leave through THIS raise or the one above, and both
  -- carry 23503, so "absent" and "not readable" remain indistinguishable. The
  -- BEFORE trigger still runs ahead of any constraint, which is what closes the
  -- oracle rather than renaming it (:170-175 of that migration).
  IF NOT reachable THEN
    RAISE EXCEPTION '% is not readable in the current scope', id_column
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END $$;

COMMENT ON FUNCTION assert_polymorphic_parent_in_scope() IS
  'BEFORE INSERT OR UPDATE guard for a polymorphic reference. TG_ARGV = (type_column, id_column, then (type_value, table) pairs). SECURITY INVOKER so the lookup is filtered by the caller policies; BEFORE the constraint so an absent id and an unreadable one both raise the identical 23503. An unmapped type value is refused, not skipped.';

-- ===========================================================================
-- attestations.subject_id
-- ===========================================================================
-- ⚠️ WHAT THIS DOES *NOT* GUARANTEE, and it is not a defect: `controls_read`
-- admits `applies_to_scope = 'group'` from any entity (ADR-0014), and this
-- function resolves its parent under the caller's own policies. So a
-- group-shared control IS attestable across entities — deliberately (02a:434).
-- The refusal is total for `policy` subjects and conditional for `control` ones.
-- attestation.int.spec.ts tests 7 and 8 pin both halves; neither is meaningful
-- alone (W14 Day 0, D5).
CREATE TRIGGER "attestations_subject_in_scope"
  BEFORE INSERT OR UPDATE ON "attestations"
  FOR EACH ROW EXECUTE FUNCTION assert_polymorphic_parent_in_scope(
    'subject_type', 'subject_id',
    'policy',  'policies',
    'control', 'controls'
  );

-- ===========================================================================
-- evidence.linked_id — the second branch W07 wrote itself a note about
-- ===========================================================================
-- evidence.repository.ts:26 says linkedType becomes an input "in the same change
-- that gives the trigger its second branch, and not before". This is that change.
ALTER TYPE "evidence_linked_type" ADD VALUE 'attestation';

-- Replaced rather than left alongside: two BEFORE triggers on one table run in
-- name order, which is an implicit dependency nobody would remember. One trigger,
-- one mapping, read at the point of definition.
DROP TRIGGER "evidence_linked_in_scope" ON "evidence";

CREATE TRIGGER "evidence_linked_in_scope"
  BEFORE INSERT OR UPDATE ON "evidence"
  FOR EACH ROW EXECUTE FUNCTION assert_polymorphic_parent_in_scope(
    'linked_type', 'linked_id',
    'control_test', 'control_tests',
    'attestation',  'attestations'
  );

COMMENT ON TABLE "evidence" IS
  'Evidence attached to a record (02a:227). linked_id is polymorphic and carries NO foreign key by design; assert_polymorphic_parent_in_scope() supplies both the integrity check and the scope guard, and refuses a linked_type it has no mapping for.';
