-- Phase W03 — governed extension storage (ADR-0005).
--
-- Same rule as W02: everything below the Prisma-generated DDL is hand-written
-- and MUST stay in this one migration. A JSONB column that exists before its
-- trigger is an ungoverned blob, and guardrail 3's "governed" has no grace
-- period.
--
-- Measured in W03 Day 0/1 on PostgreSQL 18, not inferred:
--   - RLS WITH CHECK does not see JSONB contents at all. A row whose column says
--     SG1 and whose JSONB claims org_entity_id = HK1 is accepted — and HK1 still
--     cannot see it, so there is no read leak. Scope-bearing data is a COLUMN.
--   - a CHECK constraint cannot consult the catalog ("cannot use subquery in
--     check constraint"), so static constraints are not an available option
--   - a trigger CAN consult it, which is what gives extension governance the
--     same two-layer shape entity scoping already has

-- CreateEnum
CREATE TYPE "extension_data_type" AS ENUM ('string', 'number', 'boolean');

-- AlterTable
ALTER TABLE "policies" ADD COLUMN "extensions" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "extension_fields" (
    "id" UUID NOT NULL,
    "org_entity_id" UUID,
    "entity_type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data_type" "extension_data_type" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "extension_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extension_fields_entity_type_key_idx" ON "extension_fields"("entity_type", "key");

-- AddForeignKey
ALTER TABLE "extension_fields" ADD CONSTRAINT "extension_fields_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Uniqueness: two PARTIAL indexes, not one constraint
-- ===========================================================================
-- PostgreSQL treats every NULL as distinct inside a UNIQUE constraint, so a
-- single UNIQUE(entity_type, key, org_entity_id) would happily accept the same
-- GLOBAL key twice — the precise duplicate a catalog exists to prevent. Prisma
-- cannot express partial indexes, which is why these are hand-written and why
-- the model carries only @@index.
CREATE UNIQUE INDEX "extension_fields_global_key"
  ON "extension_fields" ("entity_type", "key")
  WHERE "org_entity_id" IS NULL;

CREATE UNIQUE INDEX "extension_fields_entity_key"
  ON "extension_fields" ("entity_type", "key", "org_entity_id")
  WHERE "org_entity_id" IS NOT NULL;

-- ===========================================================================
-- Privileges
-- ===========================================================================
GRANT SELECT, INSERT, UPDATE ON "extension_fields" TO isms_app;
-- No DELETE, same as policies: retirement is a column, not a removal
-- (guardrail 3). Withholding the privilege makes that structural.

-- ===========================================================================
-- Row-level security on the catalog itself
-- ===========================================================================
ALTER TABLE "extension_fields" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "extension_fields" FORCE ROW LEVEL SECURITY;

-- USING is deliberately WIDER than WITH CHECK.
--
-- Reading: a NULL org_entity_id is a group-wide declaration every entity may
-- use, so it must be visible to all of them.
-- Writing: declaring a field group-wide is not something one OpCo may do on
-- everyone else's behalf. An entity may declare its own fields only; group-wide
-- rows are seeded by migration or by an admin path that does not exist yet.
CREATE POLICY "extension_fields_entity_scope" ON "extension_fields"
  FOR ALL
  USING ("org_entity_id" IS NULL OR "org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ===========================================================================
-- The trigger — this is what makes an extension *governed* rather than merely
-- permitted, and it is the layer RLS cannot provide
-- ===========================================================================
-- SECURITY INVOKER is the default; it is stated explicitly because it is
-- load-bearing. Measured in Day 1: the trigger's catalog read is subject to the
-- catalog's own RLS and still sees global + own rows, so DEFINER is not needed.
-- DEFINER would run this as the schema owner and is an escalation surface — it
-- must not be reached for to "fix" a catalog visibility problem.
CREATE OR REPLACE FUNCTION validate_extensions() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  entity_type_arg text := TG_ARGV[0];
  k               text;
  declared_type   extension_data_type;
  actual_type     text;
  missing         text;
BEGIN
  -- 1. every key present must be declared for this entity (or group-wide)
  FOR k IN SELECT jsonb_object_keys(NEW.extensions) LOOP
    SELECT f.data_type INTO declared_type
      FROM extension_fields f
     WHERE f.entity_type = entity_type_arg
       AND f.key = k
       AND f.retired_at IS NULL
       AND (f.org_entity_id IS NULL OR f.org_entity_id = NEW.org_entity_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'extension key "%" is not declared for % in entity %',
        k, entity_type_arg, NEW.org_entity_id
        USING ERRCODE = '23514';
    END IF;

    -- 2. the value's JSON type must match the declaration. jsonb_typeof returns
    --    'string' / 'number' / 'boolean' / 'object' / 'array' / 'null', and the
    --    enum labels were chosen to match the first three exactly.
    actual_type := jsonb_typeof(NEW.extensions -> k);
    IF actual_type IS DISTINCT FROM declared_type::text THEN
      RAISE EXCEPTION 'extension key "%" expects % but got %',
        k, declared_type, actual_type
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  -- 3. every required field must be present.
  --    jsonb_exists(), not the `?` operator: `?` collides with the parameter
  --    placeholder in some drivers, and this function has to survive being
  --    called through one.
  SELECT string_agg(f.key, ', ' ORDER BY f.key) INTO missing
    FROM extension_fields f
   WHERE f.entity_type = entity_type_arg
     AND f.required
     AND f.retired_at IS NULL
     AND (f.org_entity_id IS NULL OR f.org_entity_id = NEW.org_entity_id)
     AND NOT jsonb_exists(NEW.extensions, f.key);

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'required extension field(s) missing for %: %',
      entity_type_arg, missing
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

CREATE TRIGGER "policies_validate_extensions"
  BEFORE INSERT OR UPDATE ON "policies"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('policy');
