/**
 * File: apps/api/src/audit-trail/chain.ts
 * Purpose: The audit hash chain in TypeScript — strategy B, and the definition strategy A mirrors.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 * Owner: docs/14-adr/0003-audit-trail-hash-chain.md
 *
 * Description:
 *   W12 measures two chain strategies against each other, and they live on
 *   opposite sides of the database boundary: A is a BEFORE INSERT trigger
 *   (20260814065711_audit_log/migration.sql), B is this file. Comparing them is
 *   only meaningful if they hash the same bytes for the same row, so the
 *   canonical payload is specified once and implemented twice, with
 *   chain.spec.ts asserting the two agree rather than a comment claiming it.
 *
 *   Reproducing PostgreSQL's side means reproducing how it renders jsonb, which
 *   is a NORMALISED form rather than the caller's text: keys sorted by length
 *   then bytewise, a colon-space after each key, a comma-space between pairs.
 *   Every rule encoded here was measured against PostgreSQL 18 rather than read
 *   from documentation — including the ones that turned out NOT to need special
 *   handling, because assuming a difference is as wrong as assuming a match.
 *
 *   ⚠️ This file imports nothing from the rest of the repository, and that is
 *   enforced rather than incidental: eslint.config.mjs:78 allows audit-trail to
 *   reach only `api` and itself, on the reasoning that an audit trail depending
 *   on domain shape needs editing whenever an entity is added. The row content
 *   below is therefore plain values, not a Prisma type.
 *
 * Key Components:
 *   - canonicalPayload: the exact bytes a row hashes over, mirroring audit_log_canonical()
 *   - canonicalJson: PostgreSQL's jsonb text rendering, reimplemented
 *   - rowHash: strategy A's per-row link, computed outside the database
 *   - contentHash / anchorHash: strategy B — no per-row link, one anchor every N rows
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W12) — the shared hash definition
 *
 * Related:
 *   - apps/api/prisma/migrations/20260814065711_audit_log/migration.sql — strategy A
 *   - docs/rules-on-demand/multi-tenant-data.md §稽核軌跡 — the field list
 */
import { createHash } from 'node:crypto';

/**
 * What the first row of an entity's chain links to. Thirty-two zero bytes rather
 * than an absent value: prev_hash is NOT NULL in the table, so "first row" and
 * "row with no link" would otherwise be the same state, and only one of those is
 * allowed to exist.
 */
export const GENESIS_HASH: Buffer = Buffer.alloc(32);

/** Bumped only if the payload's shape changes; old rows keep verifying under the old tag. */
const PAYLOAD_VERSION = 'isms.audit.v1';
const ANCHOR_VERSION = 'isms.audit.anchor.v1';

/**
 * What marks a row as strategy B's anchor rather than a recorded event.
 *
 * ⚠️ An operation value and not a column, deliberately. A boolean `is_anchor`
 * would be a column on the system's widest table existing solely for the
 * strategy ADR-0003 may not pick — AP-5 with a migration attached. If B wins,
 * promoting it to a column is a decision made with the numbers in hand.
 */
export const ANCHOR_OPERATION = 'audit.anchor';

/**
 * One audit row's content, as plain values.
 *
 * ⚠️ Deliberately not a Prisma type — see the file header. The field ORDER here
 * is part of the specification, not a style choice: canonicalPayload emits them
 * in exactly this sequence and audit_log_canonical() takes its parameters in the
 * same one.
 */
export interface AuditRowContent {
  readonly orgEntityId: string;
  readonly actorId: string | null;
  readonly actorScope: string;
  readonly operation: string;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly accessAllowed: boolean;
  readonly attemptedEntity: string | null;
  /** SQL NULL when null/undefined; any JSON-serialisable value otherwise. */
  readonly before: unknown;
  readonly after: unknown;
  readonly occurredAt: Date;
}

/**
 * One length-prefixed field: the value's UTF-8 byte length, a colon, the value.
 *
 * ⭐ Length-prefixed rather than delimited, because `a|b` and `a` + `|b` are the
 * same string under any delimiter — a caller controlling one field could forge
 * another. NULL is `-1:` and the empty string `0:`, so "no resource" and "a
 * resource named ''" cannot be confused.
 *
 * Mirrors audit_log_field(TEXT) in the migration.
 */
export function field(value: string | null): string {
  return value === null ? '-1:' : `${Buffer.byteLength(value, 'utf8')}:${value}`;
}

/**
 * PostgreSQL's `timestamptz -> text` under the format the migration uses: an
 * ISO-8601 instant with always six fractional digits, always UTC.
 *
 * ⚠️ This is exact ONLY because occurred_at is TIMESTAMPTZ(3). A Date holds
 * milliseconds, so at the schema's usual (6) a stored .476152 reads back .476000
 * and every row would recompute to a different hash — measured on the table
 * before the precision was changed. `toISOString()` always emits exactly three
 * fractional digits, so appending three zeros is a widening, never a guess.
 */
export function canonicalTimestamp(occurredAt: Date): string {
  return `${occurredAt.toISOString().slice(0, -1)}000Z`;
}

/**
 * A UUID as PostgreSQL renders it: canonical lowercase.
 *
 * Casting `uuid::text` normalises case, so a caller passing an uppercase UUID
 * would hash differently here than in the trigger. Lowercasing closes that;
 * nothing else about the representation differs.
 */
function uuidText(value: string | null): string | null {
  return value === null ? null : value.toLowerCase();
}

/** Order jsonb object keys the way PostgreSQL does: length first, then bytewise. */
function comparePgKeys(a: string, b: string): number {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length !== bb.length ? ab.length - bb.length : Buffer.compare(ab, bb);
}

function render(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(render).join(', ')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined,
    );
    entries.sort(([a], [b]) => comparePgKeys(a, b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}: ${render(v)}`).join(', ')}}`;
  }
  // Strings, numbers and booleans: measured to agree with PostgreSQL exactly,
  // including the four cases most likely to have differed — control characters
  // (a lowercase four-digit escape on both sides), tab and backspace (named
  // escapes on both), DEL at 0x7f (escaped by neither), and non-ASCII (emitted
  // as itself by both). That is what JSON.stringify already produces, so no
  // special handling IS the correct handling; chain.spec.ts checks it.
  return JSON.stringify(value);
}

/**
 * A value as PostgreSQL would render it after storing it in a jsonb column.
 *
 * ⭐ THE JSON.parse(JSON.stringify(...)) IS LOAD-BEARING, not defensive copying.
 * Prisma serialises a Json field with JSON.stringify before PostgreSQL ever sees
 * it, so that pass is what actually determines the value stored: it drops
 * undefined members, calls toJSON on Dates, and turns NaN and Infinity into
 * null. Rendering the raw input instead would hash something the database was
 * never given.
 *
 * ⚠️ KNOWN BOUNDARY. PostgreSQL preserves numeric scale — `1.0` stays `1.0` —
 * and JavaScript cannot represent that distinctly, so a value reaching the
 * column from a non-JavaScript writer with a trailing zero would hash
 * differently here than in the trigger. Every writer today goes through Prisma;
 * if one ever does not, this is where it breaks, and it breaks loudly (verify
 * names the row) rather than silently.
 */
export function canonicalJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return render(JSON.parse(JSON.stringify(value)) as unknown);
}

/**
 * The exact bytes a row hashes over. Mirrors audit_log_canonical() field for
 * field and in the same order; chain.spec.ts holds the measured PostgreSQL
 * output for a set of adversarial rows, and audit.int.spec.ts (Day 2) asserts
 * the two against a live database.
 *
 * The previous hash is appended RAW rather than length-prefixed: it is always
 * exactly 32 bytes, so there is no ambiguity to remove, and hex-encoding it
 * would double the hashed length of the widest table in the system.
 */
export function canonicalPayload(row: AuditRowContent, prevHash: Uint8Array): Buffer {
  const text =
    PAYLOAD_VERSION +
    field(uuidText(row.orgEntityId)) +
    field(uuidText(row.actorId)) +
    field(row.actorScope) +
    field(row.operation) +
    field(row.resourceType) +
    field(row.resourceId) +
    field(String(row.accessAllowed)) +
    field(uuidText(row.attemptedEntity)) +
    field(canonicalJson(row.before)) +
    field(canonicalJson(row.after)) +
    field(canonicalTimestamp(row.occurredAt));

  return Buffer.concat([Buffer.from(text, 'utf8'), Buffer.from(prevHash)]);
}

/**
 * Strategy A's link, computed outside the database: this row's content together
 * with the previous row's hash. Altering any earlier row invalidates every later
 * one, which is what makes the trail tamper-evident rather than merely signed.
 */
export function rowHash(row: AuditRowContent, prevHash: Uint8Array): Buffer {
  return createHash('sha256').update(canonicalPayload(row, prevHash)).digest();
}

/**
 * Strategy B's per-row hash: content only, no link to a predecessor.
 *
 * Identical to rowHash against the genesis value by construction, so the two
 * strategies share one definition rather than two that have to be kept in step.
 * The write is cheap — nothing is read first — and that is B's whole proposition.
 */
export function contentHash(row: AuditRowContent): Buffer {
  return rowHash(row, GENESIS_HASH);
}

/**
 * Strategy B's anchor: one row every N covering every content hash since the
 * last anchor.
 *
 * ⚠️ What B trades away, stated plainly: an anchor localises tampering to a
 * SEGMENT, not to a row. A broken anchor says "something among these N rows
 * changed" and verify cannot say which. A's chain names the row. That difference
 * is a property of the design, not of this implementation, and it belongs in
 * ADR-0003 next to the write-cost numbers rather than being discovered later.
 */
export function anchorHash(
  prevAnchorHash: Uint8Array,
  contentHashes: readonly Uint8Array[],
): Buffer {
  const digest = createHash('sha256');
  digest.update(Buffer.from(ANCHOR_VERSION, 'utf8'));
  digest.update(Buffer.from(prevAnchorHash));
  for (const hash of contentHashes) digest.update(Buffer.from(hash));
  return digest.digest();
}
