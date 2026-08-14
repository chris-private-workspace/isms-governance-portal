/**
 * File: apps/api/src/audit-trail/verify.ts
 * Purpose: Walk a stored audit chain and name the first row that does not hold up.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 * Owner: docs/14-adr/0003-audit-trail-hash-chain.md
 *
 * Description:
 *   05:21 asks that the platform "verify the chain on demand", and guardrail 2
 *   asks something stronger: that it can PROVE its own log's integrity. A
 *   boolean cannot do the second. An auditor told "the trail is broken" has been
 *   given an alarm, not evidence — the useful answer names the row, says which
 *   property failed, and stops there so the report is about the earliest
 *   divergence rather than the cascade behind it.
 *
 *   So this returns the FIRST break and its kind. The four kinds are separable
 *   on purpose: they distinguish an edited row from a re-hashed one from a row
 *   the chain never covered, and those imply different things about who did it.
 *
 *   ⚠️ Verifying strategy A from here is only possible because occurred_at is
 *   TIMESTAMPTZ(3) — see chain.ts's canonicalTimestamp. At the schema's usual
 *   microsecond precision every row would be reported broken, which would make
 *   this routine an alarm that is always on.
 *
 * Key Components:
 *   - verifyChain: strategy A — per-row links, names the exact row
 *   - verifyAnchoredChain: strategy B — segment anchors, can only name the segment
 *   - ChainVerdict: intact, or the first break with its position and kind
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W12) — first break, not a boolean
 *
 * Related:
 *   - apps/api/src/audit-trail/chain.ts — the hash definition both strategies use
 */
import {
  ANCHOR_OPERATION,
  GENESIS_HASH,
  anchorHash,
  contentHash,
  rowHash,
  type AuditRowContent,
} from './chain';

/** An audit row as stored: its content, plus the two hash columns. */
export interface StoredAuditRow extends AuditRowContent {
  /** The sequence position. Only used for reporting — ordering comes from the array. */
  readonly id: bigint;
  readonly prevHash: Uint8Array;
  readonly rowHash: Uint8Array;
}

/**
 * Why a row failed. Separate kinds rather than one "broken", because they are
 * evidence of different things:
 *
 * - `content`   the row was edited and its hash was not updated — the ordinary case
 * - `link`      the row's hash is self-consistent but does not follow its predecessor,
 *               which is what re-hashing an edited row leaves behind
 * - `unchained` the row carries no hash at all, so nothing ever covered it
 * - `foreign`   the row belongs to a different entity than the chain being walked
 */
export type BreakKind = 'content' | 'link' | 'unchained' | 'foreign';

export interface ChainBreak {
  /** Zero-based position in the array handed in. */
  readonly index: number;
  readonly id: bigint;
  readonly kind: BreakKind;
  /** One sentence, safe to put in front of an auditor. */
  readonly detail: string;
}

export type ChainVerdict =
  | { readonly intact: true; readonly rowsChecked: number }
  | { readonly intact: false; readonly rowsChecked: number; readonly firstBreak: ChainBreak };

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/** First eight bytes is enough to identify a hash in a report and to fit on a line. */
function shortHex(bytes: Uint8Array): string {
  return bytes.length === 0 ? '(empty)' : `${hex(bytes).slice(0, 16)}…`;
}

/**
 * Strategy A: verify a per-row hash chain for ONE entity, in ascending id order.
 *
 * ⚠️ The caller is responsible for the ordering and for the rows all belonging to
 * one entity — this routine cannot fetch them itself (audit-trail may not reach
 * the Prisma client, eslint.config.mjs:78). It checks the entity anyway rather
 * than trusting the caller: a chain assembled from two entities' rows would
 * otherwise report a link break and send someone hunting for tampering that
 * never happened.
 *
 * An empty chain is intact. That is not a technicality — an entity that has
 * never been written to has nothing to prove, and reporting it as broken would
 * make the routine's alarm meaningless on a new deployment.
 */
export function verifyChain(rows: readonly StoredAuditRow[]): ChainVerdict {
  let expectedPrev: Uint8Array = GENESIS_HASH;
  const entityId = rows[0]?.orgEntityId.toLowerCase() ?? null;

  for (const [index, row] of rows.entries()) {
    const broken = (kind: BreakKind, detail: string): ChainVerdict => ({
      intact: false,
      rowsChecked: index + 1,
      firstBreak: { index, id: row.id, kind, detail },
    });

    if (entityId !== null && row.orgEntityId.toLowerCase() !== entityId) {
      return broken(
        'foreign',
        `row belongs to entity ${row.orgEntityId}, but the chain being walked is ${entityId}`,
      );
    }

    // Checked before the link, because an unchained row would otherwise be
    // reported as a link break and read as tampering rather than as a write
    // that bypassed the chain entirely.
    if (row.rowHash.length === 0) {
      return broken('unchained', 'row carries no hash: nothing ever covered its content');
    }

    if (!equalBytes(row.prevHash, expectedPrev)) {
      return broken(
        'link',
        `row links to ${shortHex(row.prevHash)} but its predecessor hashes to ${shortHex(expectedPrev)}`,
      );
    }

    const recomputed = rowHash(row, row.prevHash);
    if (!equalBytes(row.rowHash, recomputed)) {
      return broken(
        'content',
        `row stores ${shortHex(row.rowHash)} but its content hashes to ${shortHex(recomputed)}`,
      );
    }

    expectedPrev = row.rowHash;
  }

  return { intact: true, rowsChecked: rows.length };
}

/**
 * Strategy B: verify a chain of content hashes tied down by periodic anchors.
 *
 * ⚠️ THIS CANNOT NAME A ROW, AND THAT IS THE DESIGN RATHER THAN AN OMISSION.
 * Ordinary rows carry no link, so a row whose content and hash were BOTH
 * rewritten is undetectable until its segment's anchor is recomputed — at which
 * point all the anchor can say is that something in those N rows moved. The
 * break is therefore reported at the anchor. Where a row is individually
 * detectable (its stored hash no longer matches its content) it is still named,
 * so B is not blind — only coarser, and only for the harder case.
 *
 * Anchor rows are identified by their operation, which is the only marker they
 * have: no column distinguishes them, because adding one would be a column that
 * exists solely for the strategy that ADR-0003 might not choose.
 */
export function verifyAnchoredChain(rows: readonly StoredAuditRow[]): ChainVerdict {
  let expectedAnchor: Uint8Array = GENESIS_HASH;
  let segment: Uint8Array[] = [];

  for (const [index, row] of rows.entries()) {
    const broken = (kind: BreakKind, detail: string): ChainVerdict => ({
      intact: false,
      rowsChecked: index + 1,
      firstBreak: { index, id: row.id, kind, detail },
    });

    if (row.rowHash.length === 0) {
      return broken('unchained', 'row carries no hash: nothing ever covered its content');
    }

    if (row.operation === ANCHOR_OPERATION) {
      const expected = anchorHash(expectedAnchor, segment);
      if (!equalBytes(row.rowHash, expected)) {
        return broken(
          'link',
          `anchor over the preceding ${segment.length} row(s) stores ${shortHex(row.rowHash)} ` +
            `but recomputes to ${shortHex(expected)}; the changed row is inside that segment`,
        );
      }
      expectedAnchor = row.rowHash;
      segment = [];
      continue;
    }

    const recomputed = contentHash(row);
    if (!equalBytes(row.rowHash, recomputed)) {
      return broken(
        'content',
        `row stores ${shortHex(row.rowHash)} but its content hashes to ${shortHex(recomputed)}`,
      );
    }
    segment.push(row.rowHash);
  }

  // ⚠️ Rows after the last anchor are covered by NOTHING yet. Reporting the
  // chain intact here would be true and misleading, so the count says how much
  // was actually checked and the caller can see the tail is unanchored.
  return { intact: true, rowsChecked: rows.length - segment.length };
}
