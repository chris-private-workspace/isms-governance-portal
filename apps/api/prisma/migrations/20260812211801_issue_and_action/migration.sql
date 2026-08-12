-- CreateEnum
CREATE TYPE "issue_source" AS ENUM ('test', 'manual');

-- CreateEnum
CREATE TYPE "issue_severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "issue_status" AS ENUM ('open', 'in_progress', 'remediated', 'verified', 'closed', 'risk_accepted');

-- CreateEnum
CREATE TYPE "action_status" AS ENUM ('open', 'in_progress', 'completed', 'verified');

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source" "issue_source" NOT NULL,
    "severity" "issue_severity" NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMPTZ(6),
    "status" "issue_status" NOT NULL DEFAULT 'open',
    "owner_user_id" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "assignee_user_id" UUID,
    "due_date" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "verified_by" UUID,
    "status" "action_status" NOT NULL DEFAULT 'open',
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issues_ref_code_key" ON "issues"("ref_code");

-- CreateIndex
CREATE INDEX "issues_org_entity_id_retired_at_idx" ON "issues"("org_entity_id", "retired_at");

-- CreateIndex
CREATE UNIQUE INDEX "issues_id_org_entity_id_key" ON "issues"("id", "org_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "actions_ref_code_key" ON "actions"("ref_code");

-- CreateIndex
CREATE INDEX "actions_org_entity_id_retired_at_idx" ON "actions"("org_entity_id", "retired_at");

-- CreateIndex
CREATE INDEX "actions_issue_id_retired_at_idx" ON "actions"("issue_id", "retired_at");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_issue_id_org_entity_id_fkey" FOREIGN KEY ("issue_id", "org_entity_id") REFERENCES "issues"("id", "org_entity_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ⭐ Note what is NOT below: no assert_parent_in_scope trigger on "actions".
-- W07 built that trigger for children whose parent refuses a composite anchor,
-- and its design note (D1) records the refusal as structural: "controls" cannot
-- offer (id, org_entity_id) because M7's link table needs the two sides to differ.
-- "issues" has no such constraint, so option B applies here and the composite key
-- above IS the guard. Day 3 removes it and re-runs the cross-entity test; if that
-- test stays red without the key, something else is doing the work and this
-- comment is wrong.

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- No DELETE, same as every other table: records are retired, never removed
-- (guardrail 3).
GRANT SELECT, INSERT, UPDATE ON "issues"  TO isms_app;
GRANT SELECT, INSERT, UPDATE ON "actions" TO isms_app;

-- ===========================================================================
-- Row-level security — three per-command policies each, per ADR-0014
-- ===========================================================================
ALTER TABLE "issues"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "issues"  FORCE  ROW LEVEL SECURITY;
ALTER TABLE "actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "actions" FORCE  ROW LEVEL SECURITY;

-- ⚠️ Neither read policy is widened the way "controls_read" is. A finding belongs
-- to the entity that raised it; reading another OpCo's issues is a roll-up
-- question, and roll-up is an explicit authorised scope expansion (約束 8), never
-- a property of the row.
CREATE POLICY "issues_read" ON "issues"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "issues_insert" ON "issues"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "issues_update" ON "issues"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "actions_read" ON "actions"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "actions_insert" ON "actions"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "actions_update" ON "actions"
  FOR UPDATE
  USING      ("org_entity_id" = ANY (app_entity_scope()))
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

COMMENT ON TABLE "issues" IS
  'Findings, shared by every module that raises them (02a §0). Offers the composite anchor (id, org_entity_id) that "actions" references; unlike "controls" it has no link table requiring the two sides to differ.';

COMMENT ON TABLE "actions" IS
  'CAPA under an issue (02a:231). Cross-entity references are refused by the composite foreign key actions_issue_id_org_entity_id_fkey, not by a trigger.';

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
CREATE TRIGGER "issues_validate_extensions"
  BEFORE INSERT OR UPDATE ON "issues"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('issue');

CREATE TRIGGER "actions_validate_extensions"
  BEFORE INSERT OR UPDATE ON "actions"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('action');
