-- Issuing a version promotes it, and the database does it.
--
-- ⭐ WHY THIS IS NOT IN THE REPOSITORY. Promoting means two writes: INSERT the
-- version, then UPDATE the report's pointer. They must not come apart, and at
-- the application layer they cannot be held together: runScoped
-- (scoped-prisma.provider.ts:83) wraps EVERY operation in its own transaction,
-- because `set_config('app.entity_scope', ..., TRUE)` is transaction-local and
-- that is what stops a pooled connection carrying one request's scope into the
-- next. Two repository calls are therefore two transactions, by construction.
--
-- W04 already ruled on the only application-side fix. policy.repository.ts:111:
-- threading $transaction through the scoped client "widens the interface every
-- repository sees". There the cost of living without it was cosmetic -- a gap in
-- a reference-code sequence. Here it is not: a version inserted whose promote
-- then failed could never be promoted, because rm_report_versions_report_id_
-- version_label_key refuses the retry. A permanently stranded row.
--
-- So the same move W09 made for template_version: when the application cannot do
-- it without widening its interface, the DATABASE does it -- in the same
-- statement, under the caller's own RLS. One INSERT, one atomic outcome.
--
-- ⚠️ WHAT THIS COMMITS US TO, STATED PLAINLY. Issuing a version ALWAYS makes it
-- current. That IS 02a:260's rule (correcting a report means issuing a new
-- version, which supersedes the last), and loading the five historical versions
-- of rmVersions.js in chronological order lands on the right final state. But
-- there is no "issue without promoting" and no "promote an older version" path,
-- so backfilling out of order would leave the wrong version current. If that
-- capability is ever needed, it is a new endpoint plus a policy decision -- not
-- something to work around by disabling this trigger.
CREATE OR REPLACE FUNCTION promote_rm_report_version()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  -- SECURITY INVOKER, as W07's assert_parent_in_scope: the UPDATE below is
  -- subject to rm_reports_update, evaluated against the CALLER's scope. A
  -- definer-rights function here would quietly promote versions on reports the
  -- caller cannot see. The caller has already proved it can reach this report --
  -- rm_report_versions_report_id_org_entity_id_fkey refused the insert otherwise
  -- -- so this never widens anything; it just must not be the place that does.
  SECURITY INVOKER
  AS $$
BEGIN
  UPDATE "rm_reports"
     SET "current_version_id" = NEW."id",
         -- Prisma owns updated_at via @updatedAt on its own writes; a pointer
         -- moved by SQL is still a change to this row, and leaving the column at
         -- its previous value would misreport when the report last changed.
         "updated_at" = NOW()
   WHERE "id" = NEW."report_id";

  -- AFTER trigger: the return value is discarded. NULL rather than NEW so it is
  -- obvious this is not a BEFORE trigger shaping the row (W09's template_version
  -- trigger is the one that does that, and confusing the two is expensive).
  RETURN NULL;
END;
$$;

CREATE TRIGGER "rm_report_versions_promote"
  AFTER INSERT ON "rm_report_versions"
  FOR EACH ROW EXECUTE FUNCTION promote_rm_report_version();

COMMENT ON FUNCTION promote_rm_report_version() IS
  'Points a report at its newly issued version, atomically with the insert. Lives here rather than in the repository because runScoped gives every operation its own transaction, so two repository calls cannot be one unit of work.';
