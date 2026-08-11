-- Phase W05 — the asset-based risk chain (M1 slice 2).
--
-- Same rule as W02/W03/W04: everything below the Prisma-generated DDL is
-- hand-written and MUST stay in this one migration. A table that exists before
-- its RLS policy is an unscoped table, and 約束 8 has no grace period.
--
-- Four things here are decisions, not mechanics:
--
--   1. THE SCORE IS A GENERATED COLUMN (ADR-0013). The formula lives here, in
--      SQL, and nowhere else — risk-score.ts deliberately contains no
--      arithmetic. A caller cannot supply a score: PostgreSQL raises a hard
--      error rather than ignoring the field. schema.prisma mirrors each
--      expression as @default(dbgenerated("...")), and that mirror is compared
--      BYTE FOR BYTE by Prisma's diff engine — read it back with
--      pg_get_expr(adbin, adrelid), never write it by hand.
--
--   2. EVERY SCORE SET IS ALL-OR-NONE. GREATEST ignores NULL, so two of five
--      impacts filled yields a confident wrong number instead of an error
--      (measured, W05 Day 0). 02a:343-353 guarantees rows with an empty set, so
--      the constraint permits empty and refuses partial — it does not demand
--      full.
--
--   3. FKs BETWEEN ENTITY-SCOPED TABLES ARE COMPOSITE. W05 Day 2 measured that
--      PostgreSQL's referential-integrity check bypasses row-level security: a
--      principal scoped to SG1 successfully referenced an HK1 row it could not
--      see. Carrying org_entity_id into the FK makes that unrepresentable, and
--      an out-of-scope id and a nonexistent id then produce the IDENTICAL
--      error — so the constraint is not an existence oracle either.
--
--   4. threats AND vulnerabilities GET NO RLS. They are global reference
--      libraries already listed at rules-on-demand/multi-tenant-data.md:63.
--      W04 had to EXTEND that rule for identity data; this phase is the first
--      that simply matches a row already on the list. Nothing here widens it.

-- CreateEnum
CREATE TYPE "asset_category" AS ENUM ('services', 'people', 'intangible', 'physical_and_virtual', 'software', 'information');

-- CreateEnum
CREATE TYPE "asset_classification" AS ENUM ('internal', 'restricted', 'confidential');

-- CreateEnum
CREATE TYPE "cia_type" AS ENUM ('c', 'i', 'a', 'ci', 'ca', 'ia', 'cia');

-- CreateEnum
CREATE TYPE "risk_treatment" AS ENUM ('accept', 'mitigate', 'transfer', 'avoid');

-- CreateEnum
CREATE TYPE "risk_acceptance_status" AS ENUM ('acceptable', 'requires_treatment');

-- CreateEnum
CREATE TYPE "risk_status" AS ENUM ('identified', 'assessed_before', 'treated', 'assessed_after', 'it_risk_register', 'monitored', 'closed');

-- CreateTable
CREATE TABLE "asset_groups" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "asset_category" "asset_category" NOT NULL,
    "description" TEXT,
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "asset_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "asset_group_id" UUID NOT NULL,
    "asset_category" "asset_category" NOT NULL,
    "classification" "asset_classification" NOT NULL,
    "owner_user_id" UUID,
    "custodian_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threats" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "threats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "asset_id" UUID NOT NULL,
    "threat_id" UUID NOT NULL,
    "vulnerability_id" UUID NOT NULL,
    "cia_type" "cia_type" NOT NULL,
    "treatment" "risk_treatment",
    "review_due" DATE,
    "status" "risk_status" NOT NULL DEFAULT 'identified',
    "lkh_before" INTEGER,
    "fin_before" INTEGER,
    "bop_before" INTEGER,
    "lry_before" INTEGER,
    "rep_before" INTEGER,
    "sis_before" INTEGER,
    "lkh_after" INTEGER,
    "fin_after" INTEGER,
    "bop_after" INTEGER,
    "lry_after" INTEGER,
    "rep_after" INTEGER,
    "sis_after" INTEGER,
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_groups_ref_code_key" ON "asset_groups"("ref_code");

-- CreateIndex
CREATE INDEX "asset_groups_org_entity_id_retired_at_idx" ON "asset_groups"("org_entity_id", "retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "asset_groups_id_org_entity_id_key" ON "asset_groups"("id", "org_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_ref_code_key" ON "assets"("ref_code");

-- CreateIndex
CREATE INDEX "assets_org_entity_id_retired_at_idx" ON "assets"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "assets_asset_group_id_idx" ON "assets"("asset_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_id_org_entity_id_key" ON "assets"("id", "org_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "threats_name_key" ON "threats"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerabilities_name_key" ON "vulnerabilities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "risks_ref_code_key" ON "risks"("ref_code");

-- CreateIndex
CREATE INDEX "risks_org_entity_id_retired_at_idx" ON "risks"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "risks_asset_id_idx" ON "risks"("asset_id");

-- AddForeignKey
ALTER TABLE "asset_groups" ADD CONSTRAINT "asset_groups_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_groups" ADD CONSTRAINT "asset_groups_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_custodian_user_id_fkey" FOREIGN KEY ("custodian_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_asset_group_id_org_entity_id_fkey" FOREIGN KEY ("asset_group_id", "org_entity_id") REFERENCES "asset_groups"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_asset_id_org_entity_id_fkey" FOREIGN KEY ("asset_id", "org_entity_id") REFERENCES "assets"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_threat_id_fkey" FOREIGN KEY ("threat_id") REFERENCES "threats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_vulnerability_id_fkey" FOREIGN KEY ("vulnerability_id") REFERENCES "vulnerabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Derived columns (ADR-0013)
-- ===========================================================================
-- ⚠️ Each expression is repeated in full rather than referencing score_before /
-- score_after. That is not an oversight: PostgreSQL refuses a generated column
-- that references another generated column ("A generated column cannot
-- reference another generated column"). Wrapping the formula in an IMMUTABLE
-- function WOULD collapse the repetition, and was rejected — CREATE OR REPLACE
-- FUNCTION succeeds under a dependent generated column and recomputes nothing,
-- leaving the same input reading 20 in one row and 16 in the next (measured,
-- W05 Day 1). Repetition is a legibility cost; two generations of one formula
-- in one column is a compliance incident. The integration suite asserts each
-- expression against risk-score.ts's canonical text, so the repetition cannot
-- drift silently.

ALTER TABLE "risks"
  ADD COLUMN "score_before" INTEGER
    GENERATED ALWAYS AS (
      lkh_before * GREATEST(fin_before, bop_before, lry_before, rep_before, sis_before)
    ) STORED,

  ADD COLUMN "score_after" INTEGER
    GENERATED ALWAYS AS (
      lkh_after * GREATEST(fin_after, bop_after, lry_after, rep_after, sis_after)
    ) STORED,

  -- Answers "does this risk need treatment?" against whichever assessment is
  -- current: the residual once it exists, the inherent before that (W05 D7).
  -- 02a:141 states the criterion twice, once per assessment, and this is the
  -- reading under which both statements are true of one column.
  --
  -- ⚠️ The NULL branch is FIRST and explicit. Without it an unassessed risk
  -- falls through to ELSE and is recorded as 'acceptable' — because NULL >= 16
  -- is NULL, not false. That is the platform inventing a governance claim it
  -- was never told (measured, W05 Day 1 S4).
  ADD COLUMN "acceptance_status" "risk_acceptance_status"
    GENERATED ALWAYS AS (
      CASE
        WHEN lkh_after IS NULL AND lkh_before IS NULL THEN NULL
        WHEN COALESCE(
               lkh_after * GREATEST(fin_after, bop_after, lry_after, rep_after, sis_after),
               lkh_before * GREATEST(fin_before, bop_before, lry_before, rep_before, sis_before)
             ) >= 16
          THEN 'requires_treatment'::risk_acceptance_status
        ELSE 'acceptable'::risk_acceptance_status
      END
    ) STORED,

  -- 02a:196 / 02a:349 — the IT Risk Register holds RESIDUAL risk, so this one
  -- reads score_after only. NULL until the residual assessment exists: a risk
  -- nobody has re-scored is not "out of the register", it is unanswered.
  ADD COLUMN "in_it_risk_register" BOOLEAN
    GENERATED ALWAYS AS (
      (lkh_after * GREATEST(fin_after, bop_after, lry_after, rep_after, sis_after)) >= 16
    ) STORED;

-- The roll-up ranks and filters by residual score (07 M8). Partial, because a
-- risk with no residual assessment has nothing to rank.
CREATE INDEX "risks_org_entity_id_score_after_idx"
  ON "risks" ("org_entity_id", "score_after")
  WHERE "score_after" IS NOT NULL;

-- ===========================================================================
-- Score-set constraints
-- ===========================================================================
-- Band: 1–5 per 02a:115-117. This is also what keeps the product inside the
-- 1–25 range 02a:119 defines — without it a likelihood of 7 stores a score of
-- 35 and the range becomes documentation. NULL passes: a CHECK holds unless it
-- evaluates to FALSE, and an absent set is legitimate.
ALTER TABLE "risks"
  ADD CONSTRAINT "risks_before_band" CHECK (
    lkh_before BETWEEN 1 AND 5 AND fin_before BETWEEN 1 AND 5 AND
    bop_before BETWEEN 1 AND 5 AND lry_before BETWEEN 1 AND 5 AND
    rep_before BETWEEN 1 AND 5 AND sis_before BETWEEN 1 AND 5
  ),
  ADD CONSTRAINT "risks_after_band" CHECK (
    lkh_after BETWEEN 1 AND 5 AND fin_after BETWEEN 1 AND 5 AND
    bop_after BETWEEN 1 AND 5 AND lry_after BETWEEN 1 AND 5 AND
    rep_after BETWEEN 1 AND 5 AND sis_after BETWEEN 1 AND 5
  ),
  -- 0 or 6, never in between. See decision 2 in the header.
  ADD CONSTRAINT "risks_before_all_or_none" CHECK (
    num_nonnulls(lkh_before, fin_before, bop_before, lry_before, rep_before, sis_before) IN (0, 6)
  ),
  ADD CONSTRAINT "risks_after_all_or_none" CHECK (
    num_nonnulls(lkh_after, fin_after, bop_after, lry_after, rep_after, sis_after) IN (0, 6)
  );

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- The three business tables are read-modify-write by the application. No
-- DELETE, same as every other table: records are retired, never removed.
GRANT SELECT, INSERT, UPDATE ON "asset_groups" TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "assets"       TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "risks"        TO isms_app;

-- SELECT only, on the same reasoning as `users` in W04: nothing curates the
-- shared libraries yet. Withholding the privilege makes that absence structural
-- rather than a matter of nobody having written the code — and a shared library
-- that any entity's principal could edit would be a cross-entity write path
-- wearing a reference table's clothes.
GRANT SELECT ON "threats"         TO isms_app;
GRANT SELECT ON "vulnerabilities" TO isms_app;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
-- ⚠️ `threats` and `vulnerabilities` are deliberately absent. See decision 4 in
-- the header. If a future migration adds RLS to either, it is reversing a rule
-- that predates this phase, not tightening this one.

ALTER TABLE "asset_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_groups" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "assets"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets"       FORCE  ROW LEVEL SECURITY;
ALTER TABLE "risks"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risks"        FORCE  ROW LEVEL SECURITY;

-- USING and WITH CHECK are identical, as on ref_code_counters: there is no
-- group-wide asset or risk, so there is nothing an entity may read but not
-- write. (The extension catalog differs precisely because it HAS a global half.)
CREATE POLICY "asset_groups_entity_scope" ON "asset_groups"
  FOR ALL
  USING ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assets_entity_scope" ON "assets"
  FOR ALL
  USING ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "risks_entity_scope" ON "risks"
  FOR ALL
  USING ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
-- Only the entity-scoped tables. validate_extensions() reads NEW.org_entity_id
-- unconditionally, so attaching it to a global library is a runtime error — the
-- absence of `extensions` on threats/vulnerabilities is forced by the mechanism,
-- not chosen.
CREATE TRIGGER "asset_groups_validate_extensions"
  BEFORE INSERT OR UPDATE ON "asset_groups"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('asset_group');

CREATE TRIGGER "assets_validate_extensions"
  BEFORE INSERT OR UPDATE ON "assets"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('asset');

CREATE TRIGGER "risks_validate_extensions"
  BEFORE INSERT OR UPDATE ON "risks"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('risk');
