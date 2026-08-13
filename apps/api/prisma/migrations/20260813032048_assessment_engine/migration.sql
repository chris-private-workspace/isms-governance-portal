-- CreateEnum
CREATE TYPE "assessment_subject_type" AS ENUM ('risk', 'control', 'vendor', 'entity');

-- CreateEnum
CREATE TYPE "assessment_question_type" AS ENUM ('yes_no_na', 'score', 'free_text');

-- CreateEnum
CREATE TYPE "assessment_instance_status" AS ENUM ('scheduled', 'in_progress', 'submitted', 'reviewed', 'completed');

-- ⚠️ assessment_question_type has no column. It types the entries inside
-- assessment_templates.definition, which is JSONB because 02a specifies no
-- AssessmentQuestion entity. The type is declared here anyway: 02a:327 names
-- three question types, and a database that cannot name them has lost a piece
-- of the specification. Day 2's validation reads the enum's labels rather than
-- repeating the three strings in TypeScript.

-- CreateTable
CREATE TABLE "assessment_templates" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject_type" "assessment_subject_type" NOT NULL,
    "definition" JSONB NOT NULL,
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_instances" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version" INTEGER NOT NULL,
    "subject_type" "assessment_subject_type" NOT NULL,
    "subject_id" UUID NOT NULL,
    "period" TIMESTAMPTZ(6) NOT NULL,
    "assignee_user_id" UUID,
    "reviewer_user_id" UUID,
    "status" "assessment_instance_status" NOT NULL DEFAULT 'scheduled',
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "assessment_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "instance_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "evidence_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_templates_ref_code_key" ON "assessment_templates"("ref_code");

-- CreateIndex
CREATE INDEX "assessment_templates_org_entity_id_retired_at_idx" ON "assessment_templates"("org_entity_id", "retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_templates_id_org_entity_id_key" ON "assessment_templates"("id", "org_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_instances_ref_code_key" ON "assessment_instances"("ref_code");

-- CreateIndex
CREATE INDEX "assessment_instances_org_entity_id_retired_at_idx" ON "assessment_instances"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "assessment_instances_template_id_retired_at_idx" ON "assessment_instances"("template_id", "retired_at");

-- CreateIndex
CREATE INDEX "assessment_instances_subject_type_subject_id_idx" ON "assessment_instances"("subject_type", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_instances_id_org_entity_id_key" ON "assessment_instances"("id", "org_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_ref_code_key" ON "assessment_responses"("ref_code");

-- CreateIndex
CREATE INDEX "assessment_responses_org_entity_id_retired_at_idx" ON "assessment_responses"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "assessment_responses_instance_id_retired_at_idx" ON "assessment_responses"("instance_id", "retired_at");

-- ⭐ The first anchor this project has added to a table an earlier phase built.
-- asset_groups, assets and issues each got theirs in the same migration as the
-- child that needed one, so "can this parent offer (id, org_entity_id)" had never
-- been asked retroactively. W07's D1 criterion answers it: a trigger is for
-- parents that STRUCTURALLY cannot offer the pair — "controls" cannot, because a
-- group-shared control legitimately belongs to a different entity than its child.
-- "evidence" has no applies_to_scope; one row belongs to one entity. So it can,
-- and the response below gets a key rather than a trigger that would have been
-- the wrong mechanism for the right fear.
-- CreateIndex
CREATE UNIQUE INDEX "evidence_id_org_entity_id_key" ON "evidence"("id", "org_entity_id");

-- AddForeignKey
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_instances" ADD CONSTRAINT "assessment_instances_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_instances" ADD CONSTRAINT "assessment_instances_template_id_org_entity_id_fkey" FOREIGN KEY ("template_id", "org_entity_id") REFERENCES "assessment_templates"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_instances" ADD CONSTRAINT "assessment_instances_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_instances" ADD CONSTRAINT "assessment_instances_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_instance_id_org_entity_id_fkey" FOREIGN KEY ("instance_id", "org_entity_id") REFERENCES "assessment_instances"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ⚠️ evidence_id is nullable while org_entity_id is not. PostgreSQL's default
-- MATCH SIMPLE skips a composite foreign key when ANY of its columns is NULL,
-- which is exactly the behaviour wanted here: no evidence means no check, and a
-- named evidence must live in the same entity. MATCH FULL would reject the
-- (NULL, entity) pair and make the optional column non-optional.
-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_evidence_id_org_entity_id_fkey" FOREIGN KEY ("evidence_id", "org_entity_id") REFERENCES "evidence"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Segregation of duties — the first cross-column constraint in this schema
-- ===========================================================================
-- 02a:336-338 and 05:47 both state it: "the reviewer must not be the assignee".
-- guardrail 6 makes separation of duties a platform obligation rather than a
-- module feature, and this is the first place the data model can carry one.
--
-- ⚠️ NULL is permitted on purpose. An instance may be scheduled before anyone is
-- assigned, and before a reviewer is named; a constraint that forced both to be
-- present would turn a duty separation into a mandatory-field rule. The check
-- fires only when the platform actually has two names to compare.
--
-- ⛔ What this does NOT cover: 05:47's second sentence, "for vendor audits the
-- auditor must be independent of the relationship manager". That needs a
-- `vendors` table and a relationship-manager column, neither of which exists
-- (02a:59 puts vendors in Wave 2). Half the rule is enforced and the other half
-- is named here so the gap is visible from the schema itself.
ALTER TABLE "assessment_instances" ADD CONSTRAINT "assessment_instances_sod"
  CHECK ("reviewer_user_id" IS NULL OR "reviewer_user_id" <> "assignee_user_id");

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- No DELETE, same as every other table: records are retired, never removed
-- (guardrail 3).
GRANT SELECT, INSERT, UPDATE ON "assessment_templates" TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "assessment_instances" TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "assessment_responses" TO isms_app;

-- ===========================================================================
-- Row-level security — three per-command policies each, per ADR-0014
-- ===========================================================================
ALTER TABLE "assessment_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_templates" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "assessment_instances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_instances" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "assessment_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assessment_responses" FORCE  ROW LEVEL SECURITY;

-- ⚠️ No read policy here is widened the way "controls_read" is. 05:39 calls this
-- engine shared across three CONSUMERS (RCSA, control testing, vendor audits) —
-- that is reuse of a mechanism, not sharing of rows. A template belongs to the
-- entity that wrote it. If group-standard templates are wanted later, that is
-- ADR-0014's row-level shape and a deliberate migration, not a default.
CREATE POLICY "assessment_templates_read" ON "assessment_templates"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_templates_insert" ON "assessment_templates"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_templates_update" ON "assessment_templates"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_instances_read" ON "assessment_instances"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_instances_insert" ON "assessment_instances"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_instances_update" ON "assessment_instances"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_responses_read" ON "assessment_responses"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_responses_insert" ON "assessment_responses"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "assessment_responses_update" ON "assessment_responses"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

COMMENT ON TABLE "assessment_templates" IS
  'Versioned question sets for the shared assessment engine (05 §Shared assessment engine, built once for RCSA, control testing and vendor audits). Entity-scoped by default, not by specification: 02a and 05 are silent, and the most restrictive of the three available shapes was taken.';

COMMENT ON TABLE "assessment_instances" IS
  'A template assigned to a subject for a period (02a:330). Carries the §4 lifecycle and the segregation-of-duties check. Also serves as Assessment (RCSA) (02a:223), which was ruled a use case rather than a separate table on 2026-08-13.';

COMMENT ON TABLE "assessment_responses" IS
  'One answer to one question (02a:333). question_id is a key into the template definition document, NOT a foreign key — no questions table is specified, so nothing refuses an answer to a question that was never asked.';

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
CREATE TRIGGER "assessment_templates_validate_extensions"
  BEFORE INSERT OR UPDATE ON "assessment_templates"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('assessment_template');

CREATE TRIGGER "assessment_instances_validate_extensions"
  BEFORE INSERT OR UPDATE ON "assessment_instances"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('assessment_instance');

CREATE TRIGGER "assessment_responses_validate_extensions"
  BEFORE INSERT OR UPDATE ON "assessment_responses"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('assessment_response');
