-- W06 Day 1 — D1 follow-up. Does an ABSENT per-command policy default-deny?
-- If it does, A' should OMIT the FOR DELETE policy rather than write a narrow
-- one that nothing can reach (no table in this repo grants DELETE).

\set ON_ERROR_STOP off
\set VERBOSITY verbose

GRANT USAGE ON SCHEMA public TO isms_app;

CREATE OR REPLACE FUNCTION app_entity_scope() RETURNS uuid[]
LANGUAGE plpgsql STABLE AS $$
DECLARE raw text;
BEGIN
  raw := current_setting('app.entity_scope');
  IF raw IS NULL OR raw = '' THEN
    RAISE EXCEPTION 'app.entity_scope is not set' USING ERRCODE = '42501';
  END IF;
  RETURN string_to_array(raw, ',')::uuid[];
END $$;

CREATE TYPE probe_scope AS ENUM ('entity', 'group');

-- Table with SELECT/INSERT/UPDATE policies but *** NO FOR DELETE POLICY ***
CREATE TABLE probe_nodel (
  id uuid PRIMARY KEY,
  org_entity_id uuid NOT NULL,
  applies_to_scope probe_scope NOT NULL DEFAULT 'entity',
  title text NOT NULL
);
INSERT INTO probe_nodel VALUES
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'entity', 'HK own row'),
  ('d0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'group',  'group row owned by SG1');

ALTER TABLE probe_nodel ENABLE ROW LEVEL SECURITY;
ALTER TABLE probe_nodel FORCE ROW LEVEL SECURITY;
CREATE POLICY probe_nodel_read ON probe_nodel FOR SELECT
  USING (applies_to_scope = 'group' OR org_entity_id = ANY (app_entity_scope()));
CREATE POLICY probe_nodel_insert ON probe_nodel FOR INSERT
  WITH CHECK (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group');
CREATE POLICY probe_nodel_update ON probe_nodel FOR UPDATE
  USING      (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group')
  WITH CHECK (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group');
-- deliberately no FOR DELETE policy

-- DELETE *is* granted here, precisely so the policy layer is what we measure
GRANT SELECT, INSERT, UPDATE, DELETE ON probe_nodel TO isms_app;

SET ROLE isms_app_user;
SET app.entity_scope = '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '=== N1  DELETE own row, DELETE granted, NO FOR DELETE policy ==='
BEGIN;
DELETE FROM probe_nodel WHERE id = 'd0000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo ''
\echo '=== N2  DELETE the group row, same conditions ==='
BEGIN;
DELETE FROM probe_nodel WHERE id = 'd0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== N3  control: SELECT still works (policies for other commands unaffected) ==='
SELECT count(*) AS visible FROM probe_nodel;

\echo ''
\echo '=== N4  control: own-row UPDATE still works ==='
BEGIN;
UPDATE probe_nodel SET title = 'renamed' WHERE id = 'd0000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo ''
\echo '=== N5  what does pg_policies show for this table? ==='
RESET ROLE;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'probe_nodel' ORDER BY policyname;

\echo ''
\echo '=== DONE ==='
