-- ===========================================================================
-- template_version is taken by the database, never accepted from the caller
-- ===========================================================================
-- 02a:330 gives AssessmentInstance a `template_version`, and the point of it is
-- that later edits to a template do not silently rewrite what an assignment was
-- answered against. That only holds if the value is a SNAPSHOT OF TRUTH. A
-- caller-supplied integer is an assertion, and an assertion labelled as a
-- snapshot is worse than no column at all — it reads as provenance while
-- carrying whatever the caller typed.
--
-- ⛔ The repository cannot read the template either. Every scoped client in this
-- codebase since W05 withholds the parent delegate (ScopedAssetClient has no
-- assetGroup, ScopedActionClient has no issue), and the reason given each time is
-- that not granting it makes the oracle unwritable rather than merely
-- discouraged. Granting `assessmentTemplate` here to fetch one integer would
-- undo that for the sake of a convenience.
--
-- So the database does it. The lookup runs under the caller's own RLS, so a
-- template belonging to another entity is simply not there.
--
-- ⭐ COALESCE, not a RAISE, and that is the whole design. If the template is
-- invisible or absent, this leaves 0 behind and returns — and the composite
-- foreign key added in the previous migration then refuses the row with 23503.
-- Raising here would have produced a DIFFERENT error for "another entity's
-- template" than for "no such template", which is exactly the existence oracle
-- 約束 8 forbids. W07 measured the same trap from the other side: what closed
-- its oracle was the ORDER of execution, not the trigger's presence.
--
-- ⚠️ A BEFORE trigger runs ahead of NOT NULL as well as ahead of the foreign key,
-- so leaving NULL here would raise 23502 before the key could raise 23503 — the
-- oracle again, by a different route. 0 is chosen because no template can have
-- it: `version` defaults to 1 and 02a:326 counts up.
CREATE OR REPLACE FUNCTION assessment_instance_snapshot_template_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.template_version := COALESCE(
    (SELECT t.version FROM assessment_templates t WHERE t.id = NEW.template_id),
    0
  );
  RETURN NEW;
END;
$$;

-- INSERT only. An instance's snapshot is taken once, at assignment; re-taking it
-- on UPDATE would defeat the column's purpose by quietly re-pointing an answered
-- assignment at whatever the template says today.
--
-- ⚠️ This is the opposite of the SoD CHECK one migration earlier, which covers
-- UPDATE for free and should. The difference is what each guards: a constraint
-- states something that must be true of every version of the row, while this
-- states something that was true at one moment.
CREATE TRIGGER "assessment_instances_snapshot_template_version"
  BEFORE INSERT ON "assessment_instances"
  FOR EACH ROW EXECUTE FUNCTION assessment_instance_snapshot_template_version();

COMMENT ON FUNCTION assessment_instance_snapshot_template_version() IS
  'Fills assessment_instances.template_version from the referenced template, under the caller''s RLS. Returns 0 rather than raising when the template is unreachable, so the composite foreign key produces the refusal and both "not yours" and "not there" give 23503.';
