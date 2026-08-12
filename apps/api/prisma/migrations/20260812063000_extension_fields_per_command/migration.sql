-- ===========================================================================
-- AD-GroupRowTheft-1 — split the catalog's FOR ALL policy per command
-- ===========================================================================
-- The catalog shipped in W03 with ONE policy whose USING is wider than its
-- WITH CHECK, so that a group-wide declaration (org_entity_id IS NULL) is
-- readable by every entity and writable only by its owner:
--
--   USING      (org_entity_id IS NULL OR org_entity_id = ANY (app_entity_scope()))
--   WITH CHECK (org_entity_id = ANY (app_entity_scope()))
--
-- For SELECT and INSERT that is exactly right. For UPDATE it is not, because
-- PostgreSQL applies the two clauses to DIFFERENT ROWS: USING sees the OLD row
-- and WITH CHECK sees the NEW one. A group-wide row therefore passes USING (it
-- is group-wide) and the rewritten row passes WITH CHECK (the caller has made
-- itself the owner). One OpCo could take a group declaration out of the group.
--
-- Measured before this migration existed (W07 Day 2): the update reported
-- count = 1 and org_entity_id became SG1. The test that saw it fail is
-- policy.int.spec.ts "no entity can pull a group-wide extension field into
-- itself" — written first, watched red, and kept.
--
-- ⛔ DELETE is NOT addressed here and needs nothing: isms_app was never granted
-- it, and the privilege check runs ahead of row-level security (W06 test 10).
-- Adding a FOR DELETE policy would be strictly weaker than the absence of one.
--
-- The shape is ADR-0014's, arrived at independently in W06 for `controls`: read
-- wide, write narrow, no FOR DELETE policy at all.
DROP POLICY "extension_fields_entity_scope" ON "extension_fields";

-- READ: unchanged from the original USING. A group-wide declaration every entity
-- may use must be visible to all of them.
CREATE POLICY "extension_fields_read" ON "extension_fields"
  FOR SELECT
  USING ("org_entity_id" IS NULL OR "org_entity_id" = ANY (app_entity_scope()));

-- WRITE: your own entity only. Declaring a field for the whole group is not
-- something one OpCo does on the others' behalf; group-wide rows arrive by
-- migration or by an admin path that does not exist yet.
--
-- ⚠️ Group rows are excluded WITHOUT a special case, and the reason is worth
-- stating rather than leaving to be rediscovered: `NULL = ANY (array)` evaluates
-- to NULL, not false, and row-level security treats NULL as a refusal. So a
-- group-wide row fails this predicate on its own.
CREATE POLICY "extension_fields_insert" ON "extension_fields"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- Both clauses identical, and that is the fix: the row you may leave behind is
-- exactly the row you were allowed to select, so no two-step walks a declaration
-- out of the group.
CREATE POLICY "extension_fields_update" ON "extension_fields"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

COMMENT ON TABLE "extension_fields" IS
  'Governed extension catalog (ADR-0005). Read is widened for group-wide rows (org_entity_id IS NULL); write is not, and UPDATE is narrowed on BOTH clauses so a group row cannot be re-owned (AD-GroupRowTheft-1). No FOR DELETE policy — DELETE is withheld at the grant.';
