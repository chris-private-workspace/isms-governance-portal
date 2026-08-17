-- W18 / M1 slice 13 — Event skeleton and posture snapshot.
--
-- Hand-written, as every migration since W11 has been. ⚠️ STATE THE REASON
-- ACCURATELY rather than repeat the old one: AD-DevDbChecksumDrift-1 was
-- narrowed in W17, which found that `prisma migrate deploy` works fine (it took
-- isms_dev from 17/23 to 24/24 in one command) and only `migrate dev` is
-- blocked. So this file is hand-written because the repo generates migrations
-- by hand, not because the database cannot be migrated. Six phases wrote the
-- wider claim before anyone tried the other subcommand.
--
-- Directory name is a UTC timestamp, not local (AD-MigrationTimestampTz-1).
-- Measured again today: 20260817033944 UTC vs 20260817113944 local — local here
-- is UTC+8 and would have sorted eight hours ahead of every migration written
-- after it in the same working day.
--
-- ============================================================================
-- 1. THE LINE THIS SLICE DOES NOT CROSS
-- ============================================================================
--
-- 02a:38 puts `Event` in Wave 1. 02a:58 puts "extended into the incident record
-- by 11" in Wave 2. Everything below follows from where that line falls, and
-- none of it is this phase's judgement:
--
--   BUILT     — the six columns at 02a:233, plus org_entity_id and the §1.1
--               base-field envelope that attestations and legal_holds carry.
--   NOT BUILT — business_unit, ticket_number, incident_type, location,
--               damage_impact, iso_clause_refs, awareness_related, the
--               IncidentHistoryEntry / RootCauseAnalysis child entities, and
--               the permission-gated restricted block (violating acts, motives,
--               disciplinary action, president view).
--
-- ⛔ The restricted block is doubly blocked and would be doubly wrong to build:
--    Wave 2 by 02a:58, AND inexpressible today because 11:87-89 gates it on
--    CISO / HR roles while Role is an M4 entity that 02a:71 says "must not be
--    built until specified". Shipping the columns without the gate would be
--    shipping the disclosure and calling the restriction future work — the same
--    construction W17 refused for releasing a legal hold. Tracked as
--    AD-Incident-1 (P0).
--
-- ============================================================================
-- 2. NO `status` ON `events` — and the first reason drafted for it was wrong
-- ============================================================================
--
-- The plan's draft reason was "status is not on 02a:233's field list". Day-0
-- verification killed it: 02a:157 says §3 shows only entity-specific fields and
-- that every entity ALSO carries the §1.1 base fields, of which status is one
-- (02a:93). That argument would hold for every base field on every entity,
-- which is how you can tell it is not an argument. It is written down here
-- because it was one grep away from becoming the template the next slice
-- copies.
--
-- The real reason is narrower and is a JUDGEMENT, not a structural fact: two
-- authorities give this entity INCOMPATIBLE lifecycles.
--
--   02a:417   Reported → Triaged → Investigating → Resolved → Closed   (5)
--   11:45-58  Reported → Triaged → Investigating → RCA / ActionPlanning
--             → Remediating → Review → Approved → Closed               (8)
--
-- Four states are common to both. Nobody has ruled, and 已確認參數 #9 forbids
-- inventing the vocabulary — the platform digitises the company's procedure, it
-- does not author it. ⚠️ Note this is the MIRROR IMAGE of the same omission on
-- attestations (20260815083338 / schema :2228): there §4 gives no lifecycle at
-- all, so there is no domain to draw from; here there are two and they
-- disagree. Same missing column, opposite reason. Unblocked at M6, before the
-- incident form exists.
--
-- ============================================================================
-- 3. `severity` BORROWS A WAVE 2 DOCUMENT'S VALUE DOMAIN
-- ============================================================================
--
-- 11:35-39 is the only place S1 / S2 / S3 are defined, with distinct initial
-- reporting, update cadence and RCA obligations per level. 02a §2's enum
-- registry has NO ROW for this column. So a Wave 1 table depends on a Wave 2
-- document, and that dependency is recorded rather than resolved — the fix is
-- to register the domain in 02a, which is a documentation change this slice
-- does not make unilaterally (AD-EventSeverityUnregistered-1).
--
-- ⚠️ Lowercased here while 11 writes them in caps. All 33 enums predating this
-- slice are lowercase and `cia_type` ('c','i','a','ci') is the precedent for
-- lowercasing an acronym. What was ruled on 2026-08-17 was three graded levels;
-- casing was not part of the ruling, and user-facing text is the i18n layer's
-- job (guardrail 9).
--
-- ============================================================================
-- 4. `posture_snapshots` — the envelope is AuditLog's, not Attestation's
-- ============================================================================
--
-- 02a:465-473 lists seven columns and stops. The reasons the audit log gives
-- for its own omissions (20260814065711 / schema :2063-2072) land on this table
-- independently, so the column list and the reasoning agree without either
-- being derived from the other:
--
--   no ref_code   rows arrive in batches from a scheduled job (13 OpCos × 9
--                 metrics = 117 rows per period) and are read as a matrix,
--                 never cited individually.
--   no version /  nothing updates a snapshot. 02a:475: "snapshots are
--   updated_at    historical record — do not retro-edit them".
--   no retired_at ⛔ on an append-only record this IS A REDACTION MECHANISM: a
--                 supported way to make a past posture stop showing up. The
--                 board reporting at 08:51 is what would be reading it.
--   no extensions ⚠️ JUDGEMENT, and explicitly NOT retention_policies'
--                 MECHANICAL reason — that one is "validate_extensions() reads
--                 NEW.org_entity_id and there is none", and THIS TABLE HAS ONE,
--                 so borrowing that argument would be AD-BorrowedRefusal-1's
--                 exact shape. The real reason: 02a:477-486 governs the metric
--                 key set so that nobody widens it without a review step, and a
--                 free-form JSONB column beside it reopens by the side what the
--                 enum closes at the front.
--
-- ⛔ THE FIVE RESIDENCY COLUMNS ARE NOT BUILT (source_region,
--    replicated_to_region, replicated_at, transfer_approved_by/_at). 02a:488's
--    banner is explicit: with a single deployment region (ADR-0010) nothing
--    replicates and they have no consumer. guardrail 8 names building them
--    AP-5. They unblock only if ADR-0010 is overturned — not by Wave 2.
--
-- ============================================================================

-- CreateEnum
CREATE TYPE "event_severity" AS ENUM ('s1', 's2', 's3');

-- CreateEnum
--
-- Nine values, transcribed from 02a:482-483 and NOT from 08's metric table,
-- which names them in prose ("Total risks", "High / critical") and would have
-- required inventing the identifiers.
CREATE TYPE "posture_metric_key" AS ENUM (
  'total_risks',
  'high_critical_count',
  'control_coverage_risk',
  'control_coverage_effective',
  'overdue_tests',
  'open_critical_issues',
  'rcsa_completion',
  'policy_attestation',
  'posture_rag'
);

-- CreateEnum
--
-- ⚠️ The spec disagrees with itself on the literal: 08:35's table header writes
-- Green / Amber / Red, 08:45's rule writes "red … amber … else green", and
-- 02a:472 gives no domain at all. With no authority to copy, the house
-- convention decides — 33 of 33 enums lowercase.
--
-- ⚠️ `posture_rag` is BOTH this type's name and a value of posture_metric_key
-- above. PostgreSQL keeps type names and enum labels in separate namespaces so
-- this is not a collision, and it is not a coincidence either: the ninth metric
-- IS the overall band (08:31). What metric_value holds on such a row is
-- UNSPECIFIED and this slice does not decide it (AD-PostureRagMetricValueUndefined-1).
CREATE TYPE "posture_rag" AS ENUM ('green', 'amber', 'red');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    -- Two timestamps kept apart because the source form keeps them apart —
    -- 11:75, verbatim: "Distinguish occurred vs discovered — the template
    -- does". ⚠️ Named detected_at while 11:75 calls it discovered_at; 02a:233
    -- wins on 權威排序 and is the document that puts the column in Wave 1 at
    -- all. Marked overturnable: the Wave 2 form is written against 11's
    -- vocabulary, and if it says "discovered" to users the rename belongs
    -- there.
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "detected_at" TIMESTAMPTZ(6) NOT NULL,
    "severity" "event_severity" NOT NULL,
    "description" TEXT NOT NULL,
    -- ⚠️ CANNOT BE READ MEANINGFULLY TODAY, for two INDEPENDENT reasons, and
    -- built anyway on an explicit ruling (2026-08-17):
    --   1. nothing writes it — zero repositories, zero endpoints, so every row
    --      is NULL until M6. That is the AP-3 shape and this phase records it
    --      as one rather than filing it under N/A.
    --   2. ⛔ NO CURRENCY COLUMN, and 02a:233 specifies none. Thirteen OpCos
    --      across eleven jurisdictions do not share a currency, so a bare
    --      amount is uninterpretable even once something writes it.
    -- Building the pair would be inventing a field 02a does not have
    -- (已確認參數 #9); building the amount alone is what was ruled. Both facts
    -- are recorded so M6 SEES the gap instead of discovering it
    -- (AD-LossAmountNoCurrency-1).
    "loss_amount" DECIMAL(18,2),
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "extensions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "retired_at" TIMESTAMPTZ(6),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posture_snapshots" (
    "id" UUID NOT NULL,
    "org_entity_id" UUID NOT NULL,
    -- TEXT because 02a:469 gives two shapes — "e.g. 2026-Q3 or month key" — and
    -- no rule for choosing. A date or an enum would silently rule on a question
    -- the spec left open.
    "period" TEXT NOT NULL,
    "metric_key" "posture_metric_key" NOT NULL,
    "metric_value" DECIMAL(18,4) NOT NULL,
    -- The band AT CAPTURE TIME (02a:472), stored rather than derived on read.
    -- That is the point of the table: 08:44 lets governance move the
    -- thresholds, so recomputing an old row under today's thresholds would
    -- silently rewrite history the board already saw.
    "rag" "posture_rag" NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posture_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_ref_code_key" ON "events"("ref_code");

-- CreateIndex
--
-- ⛔ ONE index on events, and none on occurred_at or severity however obvious
-- they look: there is no consumer to shape them for, and an index chosen for a
-- query nobody has written is AP-5. This one is not speculative — it serves the
-- RLS predicate that every read of the table passes through.
CREATE INDEX "events_org_entity_id_retired_at_idx" ON "events"("org_entity_id", "retired_at");

-- CreateIndex
--
-- ⭐ org_entity_id IS IN THE KEY, and AD-UniqueKeyOracle-1's predicate was RUN
-- against this table rather than cited. The predicate: "is this tuple
-- caller-supplied?" — period and metric_key both are, since the scheduled job
-- passes them. A key of (period, metric_key) alone would be an existence
-- oracle: a unique index is NOT subject to RLS and fires BEFORE any policy, so
-- colliding with another entity's row reports 23505 while a fresh combination
-- succeeds, and those two outcomes are distinguishable by the caller.
--
-- ⚠️ W11 corrected that AD's own wording and the correction matters here: the
-- test is "two DISTINGUISHABLE OUTCOMES", not "two different SQLSTATEs" —
-- success counts as one of the two. org_entity_id is redundant on legitimate
-- rows, exactly as on rm_report_versions (W10's fix) and
-- statements_of_applicability (W11's). That redundancy IS the mechanism.
CREATE UNIQUE INDEX "posture_snapshots_org_entity_id_period_metric_key_key" ON "posture_snapshots"("org_entity_id", "period", "metric_key");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posture_snapshots" ADD CONSTRAINT "posture_snapshots_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- ROW LEVEL SECURITY — both tables
-- ===========================================================================
--
-- ENABLE **and** FORCE on each. W16's plan wrote ENABLE and stopped and its
-- Day 0 caught it; W17 carried the lesson forward; this slice writes both from
-- the start. The point is worth repeating on every new table: without FORCE the
-- table OWNER reads straight through every policy, and the integration suite
-- connects as isms_app_user — so every scope assertion would pass against a
-- guardrail-4 hole none of them can see.
-- ===========================================================================

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE  ROW LEVEL SECURITY;

ALTER TABLE "posture_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posture_snapshots" FORCE  ROW LEVEL SECURITY;

-- TWO per-command policies per table, not three (ADR-0014: absence is the
-- strictest setting, so an unwritten command is a refused one).
--
-- ⛔ NO `FOR UPDATE` policy and NO `GRANT UPDATE` on either table — and the two
-- tables reach that same construction by DIFFERENT reasons, which is worth
-- keeping distinct because only one of them can ever be lifted:
--
--   posture_snapshots — 02a:475 is a direct instruction: "snapshots are
--     historical record, do not retro-edit them". This is append-only BY
--     SPECIFICATION and there is no unblock condition.
--   events — append-only BY INABILITY. Advancing an event's state needs
--     `status`, and §2 above records that two authorities disagree about what
--     its values are. Granting UPDATE would ship an unrestricted edit path and
--     call the restriction future work, which is the construction W17 refused
--     for releasing a hold and W10 for rm_report_versions. This one DOES unblock
--     — at M6, once the lifecycle is ruled on.
--
-- ⚠️ The two layers fail DIFFERENTLY and W10's N1a plus W16's N3a measured it
-- on separate tables: with no GRANT the attempt raises 42501; with a GRANT but
-- no policy it raises nothing at all and reports rowCount 0. The tests assert
-- the layer they mean and never claim "the table is immutable".

CREATE POLICY "events_read" ON "events"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "events_insert" ON "events"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "posture_snapshots_read" ON "posture_snapshots"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "posture_snapshots_insert" ON "posture_snapshots"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- Grants. SELECT + INSERT on both, no UPDATE and no DELETE.
--
-- ⚠️ Unlike W17's retention_policies, neither table is isolated BY THE GRANT —
-- both are entity-scoped and RLS is what isolates them. The withheld half of
-- the grant is doing a different job here: it is what makes "no retro-edit" a
-- database guarantee rather than a property of today's code.
GRANT SELECT, INSERT ON "events" TO isms_app;
GRANT SELECT, INSERT ON "posture_snapshots" TO isms_app;

COMMENT ON TABLE "events" IS
  'Security event / incident skeleton (02a:233) — the six specified columns and no more. Entity-scoped, ENABLE + FORCE RLS, SELECT and INSERT policies only. No status: 02a:417 and 11:45-58 give incompatible lifecycles and neither has been ruled on (M6). The full incident record, including the permission-gated restricted block, is Wave 2 per 02a:58 and additionally needs M4''s Role (AD-Incident-1).';

COMMENT ON TABLE "posture_snapshots" IS
  'Per-entity, per-period metric values — the roll-up dashboard''s only data source (02a:459, 08:56). Append-only by specification (02a:475), written by a scheduled job at M8. Base-field envelope follows AuditLog rather than Attestation: no ref_code, version, updated_at or retired_at, because a retired_at on an append-only trail is a redaction mechanism. The five residency columns are NOT BUILT (02a:488, ADR-0010).';
