-- Attestation (W14, M1 slice 9) — 02a:235. A person's sign-off on a policy or
-- control, and the second polymorphic link in this schema.
--
-- ⚠️ HAND-WRITTEN, timestamp in UTC. `prisma migrate dev --create-only` still
-- cannot run on the developer database — 20260813071857_rm_report_snapshot
-- reports as "modified after it was applied", which is true and was left that way
-- deliberately in W10. The integration suite DROPs and CREATEs its database every
-- run, so `migrate deploy` meets an empty _prisma_migrations and no checksum to
-- compare. UTC rather than local time: AD-MigrationTimestampTz-1 records a
-- hand-written migration sorting BEFORE an already-applied one because it used
-- local time while Prisma uses UTC.
--
-- ⛔ WHAT THIS MIGRATION DELIBERATELY DOES NOT DO: there is no parent guard on
-- `subject_id` yet. That is W14 Day 2's work, and splitting it is the point —
-- W07 Day 1 measured what a polymorphic column accepts with nothing watching
-- (another entity's id, and an id that exists nowhere, both accepted, M3/M3b).
-- Shipping the table and the guard in one statement would leave that unmeasured
-- here and make the guard's contribution a claim instead of a reading.

-- CreateEnum
CREATE TYPE "attestation_subject_type" AS ENUM ('policy', 'control');

-- CreateTable
CREATE TABLE "attestations" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "subject_type" "attestation_subject_type" NOT NULL,
    "subject_id" UUID NOT NULL,
    "user_id" UUID,
    "attested_at" TIMESTAMPTZ(6) NOT NULL,
    "result" TEXT NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attestations_ref_code_key" ON "attestations"("ref_code");

-- CreateIndex
CREATE INDEX "attestations_org_entity_id_retired_at_idx" ON "attestations"("org_entity_id", "retired_at");

-- ⭐ NOT A UNIQUE INDEX, and the distinction is AD-UniqueKeyOracle-1's whole
-- subject. (subject_type, subject_id) is how "what has been attested" is queried,
-- but making it unique would be wrong twice over: an entity may legitimately
-- attest the same policy in successive periods, AND a unique tuple whose parts
-- come from the request body is an existence oracle, because unique-index
-- enforcement does not respect row-level security. W10 measured that on
-- rm_report_versions and had to ship a second migration to close it.
--
-- CreateIndex
CREATE INDEX "attestations_subject_type_subject_id_idx" ON "attestations"("subject_type", "subject_id");

-- AddForeignKey
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ⛔ NO FOREIGN KEY ON "subject_id". A column cannot reference two tables
-- (02a:235 is polymorphic), and the one Prisma would emit if a relation were
-- declared would reject every id belonging to whichever table it did not name.
-- The guard arrives in Day 2 as a trigger, which is also the only thing that can
-- collapse "absent" and "not yours" into one answer.

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- Explicit, not defaults (guardrail 7). No DELETE: retirement is `retired_at`
-- (02a:99). ⛔ AND NO UPDATE EITHER — see the policy section.
GRANT SELECT, INSERT ON "attestations" TO isms_app;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
-- FORCE as well as ENABLE: without FORCE the table OWNER bypasses the policies,
-- and the owner is the role migrations run as.
ALTER TABLE "attestations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attestations" FORCE  ROW LEVEL SECURITY;

-- ⭐ TWO POLICIES, NOT THE THREE EVERY TABLE SINCE ADR-0014 HAS SHIPPED.
--
-- The measured shape across this schema is INSERT/SELECT/UPDATE for controls,
-- control_tests, evidence, issues, actions, the assessment trio, rm_reports and
-- statements_of_applicability — and INSERT/SELECT only for rm_report_versions,
-- because a version snapshot is not editable. This table follows the second.
--
-- An attestation is a record that a person signed something at a moment. Editing
-- it afterwards does not correct a fact, it replaces evidence — which is the
-- reasoning 02a:260 applies to version rows and guardrail 5 applies to the audit
-- trail. A correction is a new attestation; a withdrawal is `retired_at`.
--
-- ⛔ So there is no UPDATE policy AND no UPDATE grant, which is stricter than a
-- narrow policy would be: an absent policy has no expression to get wrong
-- (ADR-0014). This also means "does the write path need one" cannot quietly
-- become true later without an explicit migration — which is the intended cost.

CREATE POLICY "attestations_read" ON "attestations"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "attestations_insert" ON "attestations"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ===========================================================================
-- Governed extensions (ADR-0005)
-- ===========================================================================
CREATE TRIGGER "attestations_validate_extensions"
  BEFORE INSERT OR UPDATE ON "attestations"
  FOR EACH ROW EXECUTE FUNCTION validate_extensions('attestation');

COMMENT ON TABLE "attestations" IS
  'A person''s sign-off on a policy or control (02a:235). subject_id is polymorphic and carries NO foreign key by design. No UPDATE policy or grant: a correction is a new row, a withdrawal is retired_at.';
