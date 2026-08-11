-- W06 Day 1 — D1 probe. Throwaway database only; dropped at the end.
-- Question: can the exemption extension_fields holds as a CATALOG be moved onto
-- a BUSINESS table, and what does an asymmetric USING/WITH CHECK actually do?

\set ON_ERROR_STOP off
\set VERBOSITY verbose

-- ===========================================================================
-- Setup (as owner)
-- ===========================================================================
GRANT USAGE ON SCHEMA public TO isms_app;

CREATE OR REPLACE FUNCTION app_entity_scope() RETURNS uuid[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  raw text;
BEGIN
  raw := current_setting('app.entity_scope');
  IF raw IS NULL OR raw = '' THEN
    RAISE EXCEPTION 'app.entity_scope is not set' USING ERRCODE = '42501';
  END IF;
  RETURN string_to_array(raw, ',')::uuid[];
END
$$;

CREATE TABLE probe_entities (id uuid PRIMARY KEY, code text NOT NULL);
INSERT INTO probe_entities VALUES
  ('11111111-1111-1111-1111-111111111111', 'HK1'),
  ('22222222-2222-2222-2222-222222222222', 'SG1');

CREATE TYPE probe_scope AS ENUM ('entity', 'subtree', 'group');

-- ---------------------------------------------------------------------------
-- Shape A — org_entity_id NOT NULL, group marked by a DOMAIN COLUMN value
-- ---------------------------------------------------------------------------
CREATE TABLE probe_a (
  id uuid PRIMARY KEY,
  org_entity_id uuid NOT NULL REFERENCES probe_entities(id),
  applies_to_scope probe_scope NOT NULL DEFAULT 'entity',
  title text NOT NULL
);
INSERT INTO probe_a VALUES
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'entity', 'SG local'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'group',  'GROUP shared, owned by SG1'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'entity', 'HK local');

ALTER TABLE probe_a ENABLE ROW LEVEL SECURITY;
ALTER TABLE probe_a FORCE ROW LEVEL SECURITY;
CREATE POLICY probe_a_scope ON probe_a FOR ALL
  USING (applies_to_scope = 'group' OR org_entity_id = ANY (app_entity_scope()))
  WITH CHECK (org_entity_id = ANY (app_entity_scope()));
GRANT SELECT, INSERT, UPDATE, DELETE ON probe_a TO isms_app;

-- ---------------------------------------------------------------------------
-- Shape B — org_entity_id NULLABLE, group marked by NULL (extension_fields verbatim)
-- ---------------------------------------------------------------------------
CREATE TABLE probe_b (
  id uuid PRIMARY KEY,
  org_entity_id uuid REFERENCES probe_entities(id),
  title text NOT NULL
);
INSERT INTO probe_b VALUES
  ('b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'SG local'),
  ('b0000000-0000-0000-0000-000000000002', NULL, 'GROUP shared, owned by nobody'),
  ('b0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'HK local');

ALTER TABLE probe_b ENABLE ROW LEVEL SECURITY;
ALTER TABLE probe_b FORCE ROW LEVEL SECURITY;
CREATE POLICY probe_b_scope ON probe_b FOR ALL
  USING (org_entity_id IS NULL OR org_entity_id = ANY (app_entity_scope()))
  WITH CHECK (org_entity_id = ANY (app_entity_scope()));
GRANT SELECT, INSERT, UPDATE, DELETE ON probe_b TO isms_app;

-- ---------------------------------------------------------------------------
-- Shape A' — hardened A: WITH CHECK also refuses the group value,
--            and writes get their own NARROW policies per command
-- ---------------------------------------------------------------------------
CREATE TABLE probe_a2 (
  id uuid PRIMARY KEY,
  org_entity_id uuid NOT NULL REFERENCES probe_entities(id),
  applies_to_scope probe_scope NOT NULL DEFAULT 'entity',
  title text NOT NULL
);
INSERT INTO probe_a2 VALUES
  ('c0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'entity', 'SG local'),
  ('c0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'group',  'GROUP shared, owned by SG1'),
  ('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'entity', 'HK local');

ALTER TABLE probe_a2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE probe_a2 FORCE ROW LEVEL SECURITY;
CREATE POLICY probe_a2_read ON probe_a2 FOR SELECT
  USING (applies_to_scope = 'group' OR org_entity_id = ANY (app_entity_scope()));
CREATE POLICY probe_a2_insert ON probe_a2 FOR INSERT
  WITH CHECK (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group');
CREATE POLICY probe_a2_update ON probe_a2 FOR UPDATE
  USING (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group')
  WITH CHECK (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group');
CREATE POLICY probe_a2_delete ON probe_a2 FOR DELETE
  USING (org_entity_id = ANY (app_entity_scope()) AND applies_to_scope <> 'group');
GRANT SELECT, INSERT, UPDATE, DELETE ON probe_a2 TO isms_app;

-- ===========================================================================
-- Switch to the application role. HK1 is the caller for every case below.
-- ===========================================================================
SET ROLE isms_app_user;
SET app.entity_scope = '11111111-1111-1111-1111-111111111111';
\echo '### role/scope ###'
SELECT current_user, current_setting('app.entity_scope') AS scope;

\echo ''
\echo '=== A1  SELECT under shape A — what does HK1 see? ==='
SELECT id, org_entity_id, applies_to_scope, title FROM probe_a ORDER BY id;

\echo ''
\echo '=== A2  UPDATE the group row owned by SG1 (title only) ==='
BEGIN;
UPDATE probe_a SET title = 'taken over' WHERE id = 'a0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== A3  DELETE the group row owned by SG1 (DELETE has no WITH CHECK) ==='
BEGIN;
DELETE FROM probe_a WHERE id = 'a0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== A4  INSERT a NEW group-shared row, owned by HK1 itself ==='
BEGIN;
INSERT INTO probe_a VALUES ('a0000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'group', 'minted by HK1');
ROLLBACK;

\echo ''
\echo '=== A5  PROMOTE HK1 own entity-local row to group-shared ==='
BEGIN;
UPDATE probe_a SET applies_to_scope = 'group' WHERE id = 'a0000000-0000-0000-0000-000000000003';
ROLLBACK;

\echo ''
\echo '=== A6  STEAL: reassign the SG1-owned group row to HK1 ==='
BEGIN;
UPDATE probe_a SET org_entity_id = '11111111-1111-1111-1111-111111111111', applies_to_scope = 'entity'
  WHERE id = 'a0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== A7  UPDATE an INVISIBLE row (SG local) — error or silent 0? ==='
BEGIN;
UPDATE probe_a SET title = 'x' WHERE id = 'a0000000-0000-0000-0000-000000000001';
ROLLBACK;

\echo ''
\echo '=== B1  SELECT under shape B (extension_fields verbatim) ==='
SELECT id, org_entity_id, title FROM probe_b ORDER BY id;

\echo ''
\echo '=== B2  UPDATE the NULL group row (title only) ==='
BEGIN;
UPDATE probe_b SET title = 'taken over' WHERE id = 'b0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== B3  DELETE the NULL group row ==='
BEGIN;
DELETE FROM probe_b WHERE id = 'b0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== B4  INSERT a NEW group-shared row (org_entity_id = NULL) ==='
BEGIN;
INSERT INTO probe_b VALUES ('b0000000-0000-0000-0000-000000000009', NULL, 'minted by HK1');
ROLLBACK;

\echo ''
\echo '=== B5  PROMOTE HK1 own row to group-shared (set org_entity_id = NULL) ==='
BEGIN;
UPDATE probe_b SET org_entity_id = NULL WHERE id = 'b0000000-0000-0000-0000-000000000003';
ROLLBACK;

\echo ''
\echo '=== B6  STEAL: claim the NULL group row for HK1 ==='
BEGIN;
UPDATE probe_b SET org_entity_id = '11111111-1111-1111-1111-111111111111'
  WHERE id = 'b0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== C1  A-prime: SELECT (per-command policies) ==='
SELECT id, org_entity_id, applies_to_scope, title FROM probe_a2 ORDER BY id;

\echo ''
\echo '=== C2  A-prime: UPDATE the group row owned by SG1 ==='
BEGIN;
UPDATE probe_a2 SET title = 'taken over' WHERE id = 'c0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== C3  A-prime: DELETE the group row owned by SG1 ==='
BEGIN;
DELETE FROM probe_a2 WHERE id = 'c0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== C4  A-prime: INSERT a new group-shared row owned by HK1 ==='
BEGIN;
INSERT INTO probe_a2 VALUES ('c0000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'group', 'minted by HK1');
ROLLBACK;

\echo ''
\echo '=== C5  A-prime: PROMOTE own row to group-shared ==='
BEGIN;
UPDATE probe_a2 SET applies_to_scope = 'group' WHERE id = 'c0000000-0000-0000-0000-000000000003';
ROLLBACK;

\echo ''
\echo '=== C6  A-prime: STEAL the SG1-owned group row ==='
BEGIN;
UPDATE probe_a2 SET org_entity_id = '11111111-1111-1111-1111-111111111111', applies_to_scope = 'entity'
  WHERE id = 'c0000000-0000-0000-0000-000000000002';
ROLLBACK;

\echo ''
\echo '=== C7  A-prime: normal own-row UPDATE still works (negative control) ==='
BEGIN;
UPDATE probe_a2 SET title = 'renamed by owner' WHERE id = 'c0000000-0000-0000-0000-000000000003';
ROLLBACK;

\echo ''
\echo '=== C8  A-prime: normal own-row INSERT still works (negative control) ==='
BEGIN;
INSERT INTO probe_a2 VALUES ('c0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'entity', 'normal HK1 control');
ROLLBACK;

\echo ''
\echo '=== DONE ==='
