-- Phase W02 — make fail-closed real instead of accidental.
--
-- Day-0 measured that current_setting('app.entity_scope') WITHOUT missing_ok
-- raises 42704 when the parameter is unset, and concluded that an unset scope
-- fails closed at the database for free. Day-2 measured where that claim stops
-- holding, and it stops almost immediately:
--
--   virgin connection, never scoped        -> ERROR 42704        (Day-0's case)
--   same connection after ONE scoped query -> 0 rows, no error   (silent)
--
-- set_config(..., true) is transaction-local in *value*, but defining the GUC
-- is not undone at COMMIT: the parameter is left defined as the empty string,
-- so current_setting stops raising and string_to_array('', ',') yields an empty
-- array, which filters every row away. In production every pooled connection is
-- in the second state from its second request onwards. The failure mode is
-- therefore not "the query errors" but "this OpCo has no policies" — the exact
-- silent lie multi-tenant-data.md:207-210 says must never be possible here.
--
-- So the promise is kept explicitly rather than inherited from an accident.
-- This also restores the two-independent-layers property the phase depends on:
-- the extension refuses an empty scope, AND the database refuses one, and
-- neither relies on the other being correct.

-- STABLE, so the planner evaluates it once per statement rather than per row.
-- SECURITY INVOKER (the default) is required: the scope must be the caller's,
-- and a DEFINER function here would silently run as the schema owner.
CREATE OR REPLACE FUNCTION app_entity_scope() RETURNS uuid[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw text;
BEGIN
  -- No missing_ok: a connection that has never been scoped still raises 42704
  -- here, which keeps Day-0's measured behaviour intact for that case.
  raw := current_setting('app.entity_scope');

  -- The case Day-0 could not see. Empty is not "no entities"; it is "nobody
  -- said". Returning '{}' would answer a question that was never asked.
  IF raw IS NULL OR raw = '' THEN
    RAISE EXCEPTION 'app.entity_scope is not set'
      USING ERRCODE = '42501',
            HINT = 'Every query must go through the entity-scope client extension.';
  END IF;

  RETURN string_to_array(raw, ',')::uuid[];
END
$$;

COMMENT ON FUNCTION app_entity_scope() IS
  'Entity scope for row-level security. Raises rather than returning an empty array: an unset scope must fail, never look like "this entity has no records".';

-- Replace the policy in place. Both USING and WITH CHECK move to the function
-- together; leaving either on the raw current_setting expression would keep a
-- half-silent path open on exactly one of read or write.
DROP POLICY "policies_entity_scope" ON "policies";

CREATE POLICY "policies_entity_scope" ON "policies"
  FOR ALL
  USING ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));
