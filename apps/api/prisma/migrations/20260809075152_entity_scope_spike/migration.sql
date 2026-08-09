-- Phase W02 — entity-scoping spike.
--
-- Everything below the Prisma-generated DDL is hand-written and MUST stay in
-- this same migration. Splitting "create the table" from "protect the table"
-- leaves a window in which rows exist unprotected, and guardrail 4 has no
-- grace period (plan §Scope decisions (e)).
--
-- Measured on PostgreSQL 18 during W02 Day-0, not inferred:
--   - a table owner bypasses RLS unless FORCE is set
--   - a SUPERUSER bypasses RLS even WITH FORCE — so the role the application
--     connects as is what actually decides whether any of this works
--   - current_setting() WITHOUT missing_ok raises 42704 when unset, which is
--     what makes an unset scope fail closed instead of returning zero rows

-- CreateEnum
CREATE TYPE "org_entity_type" AS ENUM ('region', 'country', 'legal_entity', 'business_unit');

-- CreateTable
CREATE TABLE "org_entities" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "org_entity_type" NOT NULL,
    "parent_id" UUID,
    "path" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "org_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_entities_code_key" ON "org_entities"("code");

-- CreateIndex
CREATE INDEX "org_entities_parent_id_idx" ON "org_entities"("parent_id");

-- CreateIndex
CREATE INDEX "org_entities_path_idx" ON "org_entities"("path");

-- CreateIndex
CREATE INDEX "policies_org_entity_id_retired_at_idx" ON "policies"("org_entity_id", "retired_at");

-- AddForeignKey
ALTER TABLE "org_entities" ADD CONSTRAINT "org_entities_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "org_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Application role
-- ===========================================================================
-- A NOLOGIN group role carrying the privileges, with no password. The actual
-- login account is created by the environment (docker/compose.yml locally,
-- infra in deployed environments) and granted membership. That split is what
-- keeps a credential out of version control (guardrail 7) while keeping the
-- privilege set itself reviewable in git.
--
-- Idempotent because migrations run against environments where a previous
-- deploy may already have created it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'isms_app') THEN
    CREATE ROLE isms_app NOLOGIN;
  END IF;
END
$$;

-- org_entities is deliberately readable by every scope: it *defines* scope, so
-- filtering it by scope would make the hierarchy — and therefore subtree
-- roll-up — unresolvable (multi-tenant-data.md:61 lists it as a legitimate
-- global table). It carries organisational structure, not business records.
GRANT SELECT ON "org_entities" TO isms_app;

GRANT SELECT, INSERT, UPDATE ON "policies" TO isms_app;
-- No DELETE, on purpose: guardrail 3 requires soft delete. Records are retired
-- via retired_at, never removed. Withholding the privilege makes that
-- structural rather than a convention someone has to remember.

-- The login role is created by the environment, not here, because it carries a
-- password. On a fresh volume docker/init-app-role.sh runs BEFORE this
-- migration, so grant membership conditionally; on an existing volume
-- `npm run db:app-role` performs the same grant after the fact. Either order
-- converges.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'isms_app_user') THEN
    GRANT isms_app TO isms_app_user;
  END IF;
END
$$;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
ALTER TABLE "policies" ENABLE ROW LEVEL SECURITY;
-- FORCE so that the table owner is subject to the policy too. This does NOT
-- constrain a superuser — verified in Day-0 — which is why the application
-- must connect as isms_app and never as the bootstrap superuser.
ALTER TABLE "policies" FORCE ROW LEVEL SECURITY;

-- USING governs which rows are visible; WITH CHECK governs which rows may be
-- written. Both are required: with USING alone, an INSERT could place a row
-- under another entity's id, and an UPDATE could move one there. That is
-- exactly the "cross-entity write" case the scope tests have to prove is
-- refused (CLAUDE.md 約束 8).
--
-- current_setting() is called WITHOUT the missing_ok argument on purpose. Unset
-- => ERROR 42704 => the query fails. With missing_ok the expression evaluates
-- to NULL, the predicate filters everything out, and the caller sees an empty
-- result that reads exactly like "this OpCo has no policies"
-- (multi-tenant-data.md:207-210).
CREATE POLICY "policies_entity_scope" ON "policies"
  FOR ALL
  USING (
    "org_entity_id" = ANY (string_to_array(current_setting('app.entity_scope'), ',')::uuid[])
  )
  WITH CHECK (
    "org_entity_id" = ANY (string_to_array(current_setting('app.entity_scope'), ',')::uuid[])
  );
