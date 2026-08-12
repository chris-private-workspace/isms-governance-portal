-- ===========================================================================
-- Correct the stored comment on assert_parent_in_scope() — it named 42501
-- ===========================================================================
-- The function was written raising 42501 and changed to 23503 the same day
-- (20260812055744_control_test_and_evidence/migration.sql:196-213 records why:
-- 42501 is what RLS raises when the ROW ITSELF is out of scope, so reusing it
-- for an unreachable PARENT would report the wrong field). The body was changed
-- and re-measured; the COMMENT one statement below it was not.
--
-- That left a wrong claim living in the database rather than in a source file:
-- `\df+ assert_parent_in_scope` and pg_description both answered "42501" for a
-- function that raises 23503. Anyone writing a handler from the catalogue would
-- have caught a code that never arrives and let the real one fall through.
--
-- ⚠️ Corrected by a NEW migration rather than by editing the applied one:
-- Prisma stores each migration's checksum, and rewriting a file that is already
-- in _prisma_migrations makes every later `migrate dev` refuse to run
-- (AD-MigrationChecksum-1, measured in W04 Day 2).
COMMENT ON FUNCTION assert_parent_in_scope() IS
  'BEFORE INSERT OR UPDATE guard for a reference no composite foreign key can secure. SECURITY INVOKER so the lookup is filtered by the caller policies, and BEFORE the constraint so an absent id and an unreadable one both raise the identical 23503.';
