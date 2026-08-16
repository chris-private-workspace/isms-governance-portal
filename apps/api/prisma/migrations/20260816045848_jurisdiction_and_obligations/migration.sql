-- W15 / M1 slice 10 — the jurisdiction spine and the obligation library.
--
-- Hand-written (AD-DevDbChecksumDrift-1: `prisma migrate dev` has been blocked
-- for everyone since W10, and this is the FOURTH phase to walk around it rather
-- than fix it — recorded in progress.md rather than passed over, because every
-- walk-around being cheap is exactly why it has survived four phases).
-- Directory name is a UTC timestamp, not local (AD-MigrationTimestampTz-1;
-- local time here is UTC+8 and would sort eight hours ahead of reality).
--
-- ============================================================================
-- WHY THESE THREE TABLES HAVE NO RLS AND NO POLICIES
-- ============================================================================
--
--   1. `jurisdictions` and `regulations` CONSUME an exemption that already
--      exists. rules-on-demand/multi-tenant-data.md:64 lists both among the
--      legitimate global reference tables. This is the same position W05 was in
--      for threats/vulnerabilities, whose migration says it "simply matches a
--      row already on the list. Nothing here widens it." Neither does this.
--
--   2. `obligations` DOES widen it, and multi-tenant-data.md:81 requires an
--      argument rather than a default for exactly that. It was APPENDED TO THE
--      EXISTING ROW rather than given its own, because that file is cited by
--      100+ `file:line` anchors and AD-MdAnchorLineShift-1's rule is that
--      editing it must not change the line count. The argument, also written
--      into that file and into the PR description:
--
--        All five specified fields (02a:200) are regulatory content. A clause
--        of Singapore's PDPA reads identically for all 13 OpCos; there is no
--        per-entity variant of what the law says. What IS per-entity is which
--        control an entity relies on to satisfy the clause, and that lives in
--        ObligationControlMapping (10:69, Wave 2, deliberately off the 02a §0
--        index so it cannot be built here).
--
--        Scoping this table would model "PDPA s.24 as it applies to SG OpCo 1"
--        as a different row from the same clause for SG OpCo 2. That is not
--        scoping; it is duplicating the statute.
--
--   3. GRANT is SELECT ONLY on all three, copying threats/vulnerabilities
--      (asset_and_risk_chain migration :333-334), users (:119) and org_entities
--      (entity_scope_spike :88). ⭐ This is load-bearing beyond permissions: it
--      is WHY these models are not in AUDITED_MODELS. The application role
--      physically cannot write them, so "no write path to audit" is enforced by
--      the database rather than being a property of today's code. Seeding runs
--      as the superuser, which is how reference data arrives.
--
-- ⛔ Consequence for tests, stated because it is not obvious: the FK-integrity
--    assertions CANNOT insert through the application role. They need the
--    superuser connection, the same shape as W02's tests that bypass the app
--    entirely. Discovered in Day-0 D7 — the plan never mentioned GRANT at all,
--    because nine slices of entity-scoped tables had made the question invisible.

-- CreateEnum
--
-- ⚠️ Every in-scope jurisdiction is `none` today. China left scope on
-- 2026-08-08 (CH-008, ADR-0010) and was the only one that was ever otherwise.
-- The domain is FIXED BY THE SPEC (02a:161), which is what separates it from
-- the status columns W14 declined to build — those had no source at all.
-- ⛔ This is a classification label, NOT residency capability: the seven
-- cross_border_* / deployment_region columns (02a:181-189) are explicitly NOT
-- BUILT in Wave 1, and guardrail 8 calls building them AP-5.
CREATE TYPE "residency_policy" AS ENUM ('none', 'conditional', 'localised');

-- CreateTable
CREATE TABLE "jurisdictions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "residency_policy" "residency_policy" NOT NULL DEFAULT 'none',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "jurisdictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "jurisdiction_id" UUID NOT NULL,
    "effective_date" DATE,
    "source_url" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "regulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obligations" (
    "id" UUID NOT NULL,
    "regulation_id" UUID NOT NULL,
    "jurisdiction_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "summary" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "obligations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
--
-- NULLABLE, and the reason is expressiveness not convenience: org_entities.type
-- includes `region`, and a region node spans all eleven jurisdictions. APAC in
-- the seed is the live example — there is no single correct value for it, so
-- NOT NULL could not express the root of the hierarchy at all (Day-0 D3).
-- Narrowing later is one migration; widening is not.
ALTER TABLE "org_entities" ADD COLUMN "jurisdiction_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "jurisdictions_code_key" ON "jurisdictions"("code");

-- CreateIndex
CREATE INDEX "regulations_jurisdiction_id_idx" ON "regulations"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "obligations_regulation_id_idx" ON "obligations"("regulation_id");

-- CreateIndex
CREATE INDEX "obligations_jurisdiction_id_idx" ON "obligations"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "org_entities_jurisdiction_id_idx" ON "org_entities"("jurisdiction_id");

-- AddForeignKey
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_regulation_id_fkey" FOREIGN KEY ("regulation_id") REFERENCES "regulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obligations" ADD CONSTRAINT "obligations_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_entities" ADD CONSTRAINT "org_entities_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Grants — SELECT only. See the banner above: this is what makes "no write path
-- to audit" a database guarantee rather than an observation about today's code.
GRANT SELECT ON "jurisdictions" TO isms_app;
GRANT SELECT ON "regulations"   TO isms_app;
GRANT SELECT ON "obligations"   TO isms_app;
