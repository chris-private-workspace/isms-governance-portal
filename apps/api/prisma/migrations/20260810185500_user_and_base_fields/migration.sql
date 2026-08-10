-- Phase W04 — User, ref_code counters, and the Policy base fields (M1 slice 1).
--
-- Same rule as W02/W03: everything below the Prisma-generated DDL is hand-written
-- and MUST stay in this one migration. A table that exists before its RLS policy
-- is an unscoped table, and 約束 8 has no grace period.
--
-- Three things here are decisions, not mechanics:
--
--   1. `users` gets NO row-level security. It is the second table exempt from
--      約束 8 iron law 1, and the reason differs from org_entities': that one is
--      global because it DEFINES scope; this one is global because scope is not a
--      property of a person (03:31 — scope is derived from the role assignment).
--      Settled in ADR-0012. The cost is recorded there and in the rule itself:
--      a global table of people is cross-entity readable by construction.
--
--   2. `ref_code_counters` IS entity-scoped, and that is the interesting half.
--      Issuing a reference code for another entity is exactly the cross-entity
--      write RLS exists to refuse, so the counter carries org_entity_id and the
--      same policy that answers "may this principal write a HK1 policy?" also
--      answers "may it issue a HK1 reference code?". One mechanism, not two.
--
--   3. `users` is granted SELECT only. There is no user-provisioning path until
--      M4, so withholding INSERT/UPDATE makes that absence structural rather
--      than a matter of nobody having written the code yet.

-- CreateEnum
CREATE TYPE "policy_status" AS ENUM ('draft', 'in_review', 'approved', 'published', 'under_revision', 'retired');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "oidc_subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ref_code_counters" (
    "org_entity_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ref_code_counters_pkey" PRIMARY KEY ("org_entity_id","entity_type")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_oidc_subject_key" ON "users"("oidc_subject");

-- ===========================================================================
-- AlterTable: policies gains its base fields
-- ===========================================================================
-- ⚠️ ref_code is added NULLABLE, then backfilled, then constrained. Prisma
-- generated `ADD COLUMN "ref_code" TEXT NOT NULL`, which fails outright on any
-- table that already holds rows. It happens to succeed today because isms_dev
-- was just reset and isms_test is rebuilt per run — that is precisely the
-- condition that makes the generated form look correct while being wrong for
-- every environment that has ever been used.
ALTER TABLE "policies"
  ADD COLUMN "created_by"    UUID,
  ADD COLUMN "owner_user_id" UUID,
  ADD COLUMN "ref_code"      TEXT,
  ADD COLUMN "status"        "policy_status" NOT NULL DEFAULT 'draft',
  ADD COLUMN "updated_by"    UUID;

-- Backfill: <TYPE>-<ENTITY_CODE>-<seq> per 02a:103, numbered per entity in
-- creation order so an existing record's code reflects when it was created.
UPDATE "policies" p
   SET "ref_code" = 'POL-' || oe."code" || '-' || lpad(seq.n::text, 6, '0')
  FROM "org_entities" oe,
       (SELECT "id",
               row_number() OVER (PARTITION BY "org_entity_id"
                                  ORDER BY "created_at", "id") AS n
          FROM "policies") seq
 WHERE p."org_entity_id" = oe."id"
   AND p."id" = seq."id";

-- ⚠️ Seed the counters from what was just backfilled. Skipping this is the
-- subtle failure: the counters would start at 0, the next issued code would
-- collide with a backfilled one, and the unique index would reject a write that
-- looks entirely legitimate to the caller. The counter and the backfill are one
-- change, not two.
INSERT INTO "ref_code_counters" ("org_entity_id", "entity_type", "last_seq", "updated_at")
SELECT "org_entity_id", 'policy', count(*), now()
  FROM "policies"
 GROUP BY "org_entity_id";

ALTER TABLE "policies" ALTER COLUMN "ref_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "policies_ref_code_key" ON "policies"("ref_code");

-- AddForeignKey
ALTER TABLE "ref_code_counters" ADD CONSTRAINT "ref_code_counters_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- SELECT only, deliberately. Nothing provisions users until M4 (they arrive
-- from an OIDC provider), so the application role has no reason to write here.
-- Withholding the privilege means a stray write fails at the database rather
-- than succeeding quietly in a phase that was never supposed to have one.
GRANT SELECT ON "users" TO isms_app;

-- The counter is read-modify-write by the issuing path, so it needs all three.
-- No DELETE, same as every other table: nothing in this schema is removed.
GRANT SELECT, INSERT, UPDATE ON "ref_code_counters" TO isms_app;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
-- ⚠️ `users` is deliberately NOT listed here. See the header — ADR-0012.
-- If a future migration adds RLS to users, that ADR is being reversed and the
-- rollback cost recorded in it applies.

ALTER TABLE "ref_code_counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ref_code_counters" FORCE ROW LEVEL SECURITY;

-- USING and WITH CHECK are the SAME here, unlike the extension catalog. There
-- is no group-wide counter: a sequence belongs to exactly one entity, so there
-- is nothing an entity may read but not write.
CREATE POLICY "ref_code_counters_entity_scope" ON "ref_code_counters"
  FOR ALL
  USING ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));
