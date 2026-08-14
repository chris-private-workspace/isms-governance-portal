-- The audit trail (W12, M3 spike) — 05:18-24, the table ADR-0003 is about.
-- Field list from multi-tenant-data.md §稽核軌跡, plus the before/after snapshot
-- 05:22 requires and that list omits.
--
-- ⚠️ HAND-WRITTEN, timestamp in UTC. `prisma migrate dev` still refuses while
-- 20260813071857_rm_report_snapshot reports as modified-after-applied on the
-- developer database (W10 corrected that migration's comment in place after a
-- test refuted it). Unchanged since W11, re-checked against _prisma_migrations
-- on 2026-08-14 rather than assumed. The integration suite is unaffected: it
-- DROPs and CREATEs its database every run, so `migrate deploy` meets an empty
-- _prisma_migrations and has no checksum to compare. UTC deliberately —
-- AD-MigrationTimestampTz-1 records a hand-written migration sorting BEFORE an
-- applied one because it used local time while Prisma uses UTC.

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "org_entity_id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_scope" TEXT NOT NULL,
    "operation" VARCHAR(128) NOT NULL,
    "resource_type" VARCHAR(64),
    "resource_id" VARCHAR(256),
    "access_allowed" BOOLEAN NOT NULL DEFAULT true,
    "attempted_entity" UUID,
    "before" JSONB,
    "after" JSONB,
    "prev_hash" BYTEA NOT NULL DEFAULT '\x'::bytea,
    "row_hash" BYTEA NOT NULL DEFAULT '\x'::bytea,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- ⭐ TIMESTAMPTZ(3), AND EVERY OTHER TIMESTAMP IN THIS SCHEMA IS (6). The
-- difference is what makes strategy A's chain verifiable from outside the
-- database at all.
--
-- The hash covers occurred_at, so verifying a row means re-rendering that
-- timestamp byte for byte. At microsecond precision only PostgreSQL can: a
-- JavaScript Date holds milliseconds, so a row stored as .476152 reads back as
-- .476000 and recomputes to a different hash. Measured on this table before the
-- change — every row would have looked tampered with, from the application side,
-- while being perfectly intact.
--
-- (3) is a rounding cast, not a truncating one (.476952 -> .477000, .476152 ->
-- .476000, measured), so both writers land on a millisecond boundary and the
-- value round-trips through a Date without loss in either direction.
--
-- ⚠️ What this costs: two audit rows can now share a timestamp. Nothing depends
-- on them not doing so — order comes from the sequence and identity from the
-- hash, never from occurred_at.

-- ⚠️ THE TWO HASH COLUMNS DEFAULT TO EMPTY, WHICH IS NOT A VALID HASH, and that
-- is deliberate. The BEFORE INSERT trigger below fills them, but Prisma's client
-- would demand both on every create if they had no default — pushing the chain's
-- implementation into the call site of every module that ever writes. An empty
-- default keeps the field optional in the generated types while the trigger
-- keeps it correct in the database. A row with a zero-length row_hash therefore
-- means the trigger did not run, which is exactly what W12's N1 neutralisation
-- produces and exactly what verify must report as a break.

-- ⛔ A jsonb COLUMN HAS TWO EMPTY STATES AND JAVASCRIPT ONLY HAS ONE. SQL NULL
-- means "no snapshot"; the jsonb value `null` is a snapshot whose content is
-- null, and it renders as the four characters `null`, which the hash covers.
-- Read back through Prisma both arrive as JavaScript `null`, so a verifier
-- outside the database cannot tell which one the row holds and recomputes the
-- wrong bytes for one of them.
--
-- Measured, W12 Day 2: the first integration run reported every audit row
-- broken at the first row, because the writer passed null to a Json? field and
-- Prisma stored JSON null. The writer now omits the key — and this constraint
-- makes the ambiguous state impossible, so the chain's verifiability does not
-- depend on every future writer remembering.
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_before_not_json_null"
  CHECK ("before" IS NULL OR jsonb_typeof("before") <> 'null');
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_after_not_json_null"
  CHECK ("after" IS NULL OR jsonb_typeof("after") <> 'null');

-- CreateIndex
-- "the last row for this entity" (the chain read) and the order verify walks.
-- Entity leads because scope is the first predicate of every query
-- (multi-tenant-data.md:50) and because the chain is per-entity — see the
-- trigger's comment for why a SECURITY INVOKER trigger cannot make it global.
CREATE INDEX "audit_log_org_entity_id_id_idx" ON "audit_log"("org_entity_id", "id");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "org_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ⛔ NO FOREIGN KEY ON attempted_entity, unlike org_entity_id above. The attempt
-- worth recording most is one naming an entity id that does not exist — someone
-- guessing identifiers — and a foreign key would refuse to record it. The log
-- would fall silent precisely when it has something to say.
--
-- ⛔ NO FOREIGN KEY ON actor_id either, and that one is load-bearing rather than
-- pragmatic: 02a:311 reconciles the erasure right with guardrail 5 by keeping
-- the actor pseudonymous. A reference to `users` would bind every audit row to a
-- record a data-subject request can empty, leaving a provably intact chain over
-- content that no longer says what it said.

-- ===========================================================================
-- Privileges
-- ===========================================================================
-- ⛔ SELECT AND INSERT ONLY. No UPDATE, no DELETE, no exceptions — this is half
-- of append-only. The other half is the absence of the matching policies below.
--
-- ⭐ WHICH HALF REFUSES, AND HOW, IS NOW MEASURED RATHER THAN ASSERTED. W10
-- claimed the policy did it and was wrong; W11 claimed a WITH CHECK did and was
-- wrong. W12's N3 restored the UPDATE grant alone and watched:
--
--   grant present, zero FOR UPDATE policies, 7 rows readable by the caller
--   UPDATE audit_log SET operation = 'TAMPERED-BY-N3'   ->   UPDATE 0
--   rows actually changed: 0        operation afterwards: unchanged
--
-- So BOTH layers hold, and they do NOT behave the same way:
--
--   the GRANT          raises 42501, an explicit error
--   the absent policy  silently affects zero rows, no error at all
--
-- ⚠️ The consequence worth carrying: append-only survives someone running
-- `GRANT ALL ON ALL TABLES`, but it goes MUTE when that happens. A defence that
-- still holds while no longer saying anything is the hardest kind to notice has
-- become the only one left. That is the concrete form of ADR-0014's "an absent
-- policy is stricter than a narrow one" — stricter, and quieter.
GRANT SELECT, INSERT ON "audit_log" TO isms_app;

-- BIGSERIAL means a sequence, and a sequence carries its own privileges: INSERT
-- on the table does not confer nextval on audit_log_id_seq. Every other table
-- here uses a client-generated UUID, so this is the first migration in the repo
-- that needs the line at all — see the model header for why the id is a
-- sequence.
GRANT USAGE ON SEQUENCE "audit_log_id_seq" TO isms_app;

-- ===========================================================================
-- Row-level security
-- ===========================================================================
-- FORCE as well as ENABLE: without FORCE the table owner bypasses the policies,
-- and the owner is the role migrations run as.
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE  ROW LEVEL SECURITY;

-- Two policies, and the two that are absent are the point (ADR-0014: an absent
-- policy is stricter than a narrow one — there is no expression to get wrong).
-- rm_report_versions is the precedent for a table with no FOR UPDATE policy;
-- this is the first with neither UPDATE nor DELETE.
CREATE POLICY "audit_log_read" ON "audit_log"
  FOR SELECT
  USING ("org_entity_id" = ANY (app_entity_scope()));

CREATE POLICY "audit_log_insert" ON "audit_log"
  FOR INSERT
  WITH CHECK ("org_entity_id" = ANY (app_entity_scope()));

-- ===========================================================================
-- The canonical payload — one definition, two implementations
-- ===========================================================================
-- Strategy A (this trigger) hashes in PL/pgSQL; strategy B (chain.ts) hashes in
-- TypeScript. For the comparison W12 exists to make, both must produce the same
-- bytes for the same row, so the serialisation is specified here and mirrored
-- there, with a test asserting the two agree rather than a comment claiming it.
--
-- ⭐ LENGTH-PREFIXED, NOT DELIMITED. `a|b` and `a` + `|b` are the same string
-- under any delimiter scheme, so a caller who controls one field could forge
-- another. Emitting `<byte length>:<value>` removes the ambiguity for every
-- possible value. NULL is `-1:`, distinct from the empty string's `0:`, because
-- "no resource" and "a resource named ''" are different events.
CREATE OR REPLACE FUNCTION audit_log_field(v TEXT) RETURNS TEXT
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN v IS NULL THEN '-1:'
    ELSE pg_catalog.octet_length(v)::text || ':' || v
  END
$$;

COMMENT ON FUNCTION audit_log_field(TEXT) IS
  'One length-prefixed field of the canonical audit payload. NULL is -1: and the empty string is 0:, so the two cannot be confused. Mirrored by field() in audit-trail/chain.ts.';

-- STABLE, not IMMUTABLE: to_char(timestamp, text) is itself STABLE in
-- PostgreSQL, so claiming otherwise would be a promise the planner is entitled
-- to act on. Nothing here indexes it, so STABLE costs nothing.
--
-- ⚠️ THE TIMESTAMP FORMAT IS FIXED-WIDTH MICROSECONDS ON PURPOSE. Casting a
-- timestamp to text trims trailing zeros from the fraction, so 06:57:11.500000
-- and 06:57:11.5 would render differently depending on the value — reproducible
-- in TypeScript, but only by re-implementing the trimming rule. `.US` is always
-- six digits.
--
-- ⚠️ JSONB ENTERS AS POSTGRES RENDERS IT, which is a normalised form: keys
-- sorted by length then bytewise, `": "` after each key, `", "` between pairs.
-- Measured on this server, not assumed — two differently-ordered inputs both
-- render `{"a": 2, "b": 1, "aa": 3}`. chain.ts reproduces that ordering, and
-- chain.spec.ts asserts the two agree on adversarial inputs. If they ever stop
-- agreeing, that is a finding about the strategies, not a bug to paper over.
CREATE OR REPLACE FUNCTION audit_log_canonical(
  p_org_entity_id  UUID,
  p_actor_id       UUID,
  p_actor_scope    TEXT,
  p_operation      TEXT,
  p_resource_type  TEXT,
  p_resource_id    TEXT,
  p_access_allowed BOOLEAN,
  p_attempted      UUID,
  p_before         JSONB,
  p_after          JSONB,
  p_occurred_at    TIMESTAMPTZ,
  p_prev_hash      BYTEA
) RETURNS BYTEA
  LANGUAGE sql
  STABLE
  PARALLEL SAFE
AS $$
  SELECT pg_catalog.convert_to(
           'isms.audit.v1'
           || audit_log_field(p_org_entity_id::text)
           || audit_log_field(p_actor_id::text)
           || audit_log_field(p_actor_scope)
           || audit_log_field(p_operation)
           || audit_log_field(p_resource_type)
           || audit_log_field(p_resource_id)
           || audit_log_field(p_access_allowed::text)
           || audit_log_field(p_attempted::text)
           || audit_log_field(p_before::text)
           || audit_log_field(p_after::text)
           || audit_log_field(
                to_char(p_occurred_at AT TIME ZONE 'UTC',
                        'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')),
           'UTF8')
         || p_prev_hash
$$;

COMMENT ON FUNCTION audit_log_canonical(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID, JSONB, JSONB, TIMESTAMPTZ, BYTEA) IS
  'The bytes an audit row hashes over: a version tag, eleven length-prefixed fields, then the previous row hash appended raw. Mirrored by canonicalPayload() in audit-trail/chain.ts; chain.spec.ts asserts the two agree.';

-- ===========================================================================
-- Strategy A — the per-row chain, in the database
-- ===========================================================================
-- ⭐ WHY THE CHAIN IS NOT IN THE REPOSITORY, and this is the second phase to
-- reach the same wall. runScoped (scoped-prisma.provider.ts:83) hands
-- $transaction an ARRAY of already-constructed PrismaPromises, which is what
-- lets the entity-scope extension wrap them — and it means no application code
-- can run between two of them. "Read the previous hash, then write this row"
-- needs exactly that. W10 moved promote into a trigger for the identical
-- reason; W12 Day 0 measured that it applies here too, before any of this was
-- written.
--
-- ⭐ BEFORE INSERT, NOT AFTER, AND THE APPEND-ONLY RULE IS WHY. An AFTER trigger
-- cannot modify the row, so storing the hash would take an UPDATE — against a
-- table that deliberately has neither an UPDATE grant nor an UPDATE policy. The
-- two designs are mutually exclusive: a chain written by an AFTER trigger needs
-- the very privilege append-only exists to withhold. (W09's template_version
-- trigger is the other BEFORE trigger in this schema; the promote trigger is
-- AFTER, and its own comment warns that confusing the two is expensive.)
--
-- SECURITY INVOKER, like every other function in this schema, and here it has a
-- visible consequence rather than being a formality: the SELECT below is
-- filtered by audit_log_read, so the trigger can only see rows in the caller's
-- scope. ⇒ THE CHAIN IS PER-ENTITY, NOT GLOBAL. That is not a compromise but a
-- direct reading of 約束 8 — a global chain would make every entity's log
-- depend on rows it must not be able to read, and verifying it would require a
-- reader with no scope at all. It is still a design decision, and ADR-0003
-- states it rather than leaving it to be inferred from this comment.
--
-- ⚠️ WHAT THE ADVISORY LOCK COSTS IS PART OF WHAT W12 MEASURES. Without it two
-- concurrent inserts for one entity both read the same last row and both claim
-- it as their predecessor — a silently forked chain, which is worse than no
-- chain because it still verifies from either fork. The lock is transaction-
-- scoped, so it releases on commit or rollback with no cleanup path to forget,
-- and it serialises writes PER ENTITY rather than globally. Serialising the
-- hottest table in the system is the headline cost of strategy A and belongs in
-- the ADR as a number, not as an adjective.
CREATE OR REPLACE FUNCTION audit_log_chain()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY INVOKER
  AS $$
DECLARE
  prev BYTEA;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."org_entity_id"::text, 0));

  SELECT a."row_hash" INTO prev
    FROM "audit_log" a
   WHERE a."org_entity_id" = NEW."org_entity_id"
   ORDER BY a."id" DESC
   LIMIT 1;

  -- Genesis is 32 zero bytes rather than NULL: prev_hash is NOT NULL, and a
  -- nullable link would make "first row" and "unchained row" the same state.
  NEW."prev_hash" := COALESCE(prev, decode(repeat('00', 32), 'hex'));

  -- pg_catalog-qualified deliberately. sha256 is a core function in PostgreSQL
  -- 11+ (measured here against the published NIST vector for "abc"), so no
  -- extension is needed and none is installed — but pg_catalog is only
  -- implicitly first in search_path, and a caller may put a schema ahead of it.
  -- Under SECURITY INVOKER that is the caller's own search_path, so an
  -- unqualified call could be resolved to a shadowing function of the caller's
  -- choosing. Qualifying it is one token and closes that.
  NEW."row_hash" := pg_catalog.sha256(audit_log_canonical(
      NEW."org_entity_id",
      NEW."actor_id",
      NEW."actor_scope",
      NEW."operation",
      NEW."resource_type",
      NEW."resource_id",
      NEW."access_allowed",
      NEW."attempted_entity",
      NEW."before",
      NEW."after",
      NEW."occurred_at",
      NEW."prev_hash"));

  -- BEFORE trigger: the returned row is the one that gets inserted.
  RETURN NEW;
END;
$$;

CREATE TRIGGER "audit_log_chain"
  BEFORE INSERT ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_chain();

COMMENT ON FUNCTION audit_log_chain() IS
  'Strategy A: links each audit row to the previous one for its entity. BEFORE INSERT because storing the hash from an AFTER trigger would need the UPDATE privilege append-only exists to withhold. SECURITY INVOKER, so the chain is per-entity by construction.';
