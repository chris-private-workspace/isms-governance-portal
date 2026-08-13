-- CreateTable
CREATE TABLE "rm_reports" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "current_version_id" UUID,
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "rm_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rm_report_versions" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "report_id" UUID NOT NULL,
    "version_label" TEXT NOT NULL,
    "prepared_by" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "effective_date" TIMESTAMPTZ(6) NOT NULL,
    "change_note" TEXT NOT NULL,
    "snapshot_at" TIMESTAMPTZ(6) NOT NULL,
    "sheet" JSONB NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "rm_report_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rm_reports_ref_code_key" ON "rm_reports"("ref_code");

-- CreateIndex
CREATE INDEX "rm_reports_org_entity_id_retired_at_idx" ON "rm_reports"("org_entity_id", "retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "rm_reports_id_org_entity_id_key" ON "rm_reports"("id", "org_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "rm_report_versions_ref_code_key" ON "rm_report_versions"("ref_code");

-- CreateIndex
CREATE INDEX "rm_report_versions_org_entity_id_retired_at_idx" ON "rm_report_versions"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "rm_report_versions_report_id_effective_date_idx" ON "rm_report_versions"("report_id", "effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "rm_report_versions_report_id_version_label_key" ON "rm_report_versions"("report_id", "version_label");

-- CreateIndex
CREATE UNIQUE INDEX "rm_report_versions_id_report_id_key" ON "rm_report_versions"("id", "report_id");

-- AddForeignKey
ALTER TABLE "rm_reports" ADD CONSTRAINT "rm_reports_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_reports" ADD CONSTRAINT "rm_reports_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_reports" ADD CONSTRAINT "rm_reports_current_version_id_id_fkey" FOREIGN KEY ("current_version_id", "id") REFERENCES "rm_report_versions"("id", "report_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_report_versions" ADD CONSTRAINT "rm_report_versions_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rm_report_versions" ADD CONSTRAINT "rm_report_versions_report_id_org_entity_id_fkey" FOREIGN KEY ("report_id", "org_entity_id") REFERENCES "rm_reports"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ⭐ Note what the two foreign keys above COMPOSE into, because neither says it
-- alone. rm_report_versions_report_id_org_entity_id_fkey forces a version's
-- org_entity_id to equal its report's. rm_reports_current_version_id_id_fkey
-- forces the pointer to name a version OF THIS REPORT. Together they make
-- "point at another entity's version" unreachable without a third constraint.
--
-- ⭐ And it closes an oracle rather than opening one. W07 measured that
-- referential-integrity checks bypass RLS, so a caller CAN probe the FK with a
-- guessed UUID. Here both failing cases -- "a version of some other report" and
-- "no such version at all" -- raise the same 23503, because the key is checked
-- against (id, report_id) with report_id pinned to the caller's own row. There
-- is no answer to distinguish. Same shape as W09's COALESCE in the template
-- version trigger: the guard must not become the thing that tells you.

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- ⭐ "rm_report_versions" gets NO UPDATE. It is the first table in this schema
-- that is immutable by design (02a:260 -- correcting a report means issuing a
-- new version, never editing one).
--
-- ⚠️ CORRECTED AFTER MEASUREMENT (W10 Day 2). This comment first called the
-- GRANT "defence in depth" and the absent policy below "the enforcing half".
-- That is not the runtime order: an UPDATE from the application role raises
-- 42501 HERE, because privilege is checked before any policy is consulted. The
-- integration test that found this was written predicting the opposite -- it
-- expected a statement that matched zero rows -- and failed.
--
-- Both layers are real, and the ranking is about durability rather than order.
-- This GRANT is what refuses today. The absent policy is what would still refuse
-- if someone widened this line, which is the guarantee W06's control_library
-- migration means when it says a table "does not depend on the GRANT staying as
-- it is". Day 3's N1 removes them one at a time; until then, "the policy holds
-- on its own" is a prediction and is written as one.
--
-- No DELETE anywhere, as on every other table: records are retired, never
-- removed (guardrail 3).
GRANT SELECT, INSERT, UPDATE ON "rm_reports"         TO isms_app;
GRANT SELECT, INSERT         ON "rm_report_versions" TO isms_app;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
ALTER TABLE "rm_reports"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rm_reports"         FORCE  ROW LEVEL SECURITY;
ALTER TABLE "rm_report_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rm_report_versions" FORCE  ROW LEVEL SECURITY;

-- Three per-command policies on the report, per ADR-0014. The report is the
-- mutable half of the pair: promoting a new version is an UPDATE of
-- current_version_id, and that is the only reason this table has an update
-- policy at all.
CREATE POLICY "rm_reports_read" ON "rm_reports"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "rm_reports_insert" ON "rm_reports"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "rm_reports_update" ON "rm_reports"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ⭐⭐ TWO policies, not three. THE ABSENCE OF "rm_report_versions_update" IS
-- THE FEATURE. ADR-0014 settled that an absent policy is stricter than a narrow
-- one: with RLS forced and no FOR UPDATE policy, an update should be refused no
-- matter what any future GRANT says. That is how a snapshot stays a snapshot --
-- declaratively, covering paths nobody enumerated, rather than by a trigger
-- listing the ones somebody thought of.
--
-- ⚠️ "should be" rather than "is", deliberately: with the GRANT above also
-- withholding UPDATE, nothing has yet reached this layer to find out. Day 3's
-- N1a grants UPDATE and leaves this absence in place; if the row changes then,
-- this whole comment is wrong and the immutability was the GRANT's all along.
--
-- ⛔ Do not "complete the set". Adding rm_report_versions_update would silently
-- make every prior version editable, and no test that passes today would fail.
CREATE POLICY "rm_report_versions_read" ON "rm_report_versions"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "rm_report_versions_insert" ON "rm_report_versions"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

COMMENT ON TABLE "rm_reports" IS
  'Identity of a controlled risk-management deliverable (02a §3.1). Holds current_version_id, the ONE mutable statement of which version is current; 02a:257 also names a `state` column on the version and it is deliberately not built -- two representations of one fact with no reconciliation rule (the 02a:225 judgement).';

COMMENT ON TABLE "rm_report_versions" IS
  'An approved point-in-time sheet. Immutable: no FOR UPDATE policy exists, so RLS refuses every update regardless of GRANT. Superseded is derived -- a version is current iff its report''s current_version_id names it. Retained 3 years per version (05:76); no mechanism enforces that yet.';

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
-- ⚠️ The UPDATE half of the version trigger is UNREACHABLE today -- nothing can
-- update that table. It is written anyway, deliberately: if the archival path
-- 05:76 needs ever adds an update policy, extension validation must not be the
-- thing that silently stopped running. W09 measured the general form of this --
-- a declarative constraint covers the paths you did not think of, an imperative
-- guard covers only the ones you listed.
CREATE TRIGGER "rm_reports_validate_extensions"
  BEFORE INSERT OR UPDATE ON "rm_reports"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('rm_report');

CREATE TRIGGER "rm_report_versions_validate_extensions"
  BEFORE INSERT OR UPDATE ON "rm_report_versions"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('rm_report_version');
