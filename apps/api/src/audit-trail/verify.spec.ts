/**
 * File: apps/api/src/audit-trail/verify.spec.ts
 * Purpose: Prove verify names the first break and its kind, not merely that something is wrong.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 *
 * Description:
 *   The property under test is narrower than "detects tampering" and harder to
 *   get right: given a chain broken in several places, the verdict must point at
 *   the EARLIEST one. A routine that reports the last break, or any break, would
 *   pass a naive tamper test while sending an auditor to the wrong row.
 *
 *   Each case builds an honest chain first and then damages it, so a test that
 *   goes red says what stopped holding rather than that a fixture drifted.
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 */
import {
  ANCHOR_OPERATION,
  GENESIS_HASH,
  anchorHash,
  contentHash,
  rowHash,
  type AuditRowContent,
} from './chain';
import { verifyAnchoredChain, verifyChain, type StoredAuditRow } from './verify';

const SG1 = '11111111-1111-1111-1111-111111111111';
const HK1 = '22222222-2222-2222-2222-222222222222';

function content(seq: number, overrides: Partial<AuditRowContent> = {}): AuditRowContent {
  return {
    orgEntityId: SG1,
    actorId: null,
    actorScope: SG1,
    operation: 'soa.create',
    resourceType: 'soa',
    resourceId: `SOA-SG1-${seq}`,
    accessAllowed: true,
    attemptedEntity: null,
    before: null,
    after: { clause: `A.5.${seq}` },
    occurredAt: new Date(Date.UTC(2026, 7, 14, 0, 0, seq)),
    ...overrides,
  };
}

/**
 * Indexing under `noUncheckedIndexedAccess` yields `T | undefined`, and spreading
 * that turns every property optional. Throwing here rather than asserting keeps a
 * drifted fixture loud: "no row 4" is a better failure than a verdict computed
 * from a half-built row.
 */
function at(rows: readonly StoredAuditRow[], index: number): StoredAuditRow {
  const row = rows[index];
  if (row === undefined) throw new Error(`fixture has no row at index ${index}`);
  return row;
}

/** An honest strategy-A chain: each row linked to the one before it. */
function chainOf(length: number): StoredAuditRow[] {
  const rows: StoredAuditRow[] = [];
  let prev: Uint8Array = GENESIS_HASH;
  for (let seq = 1; seq <= length; seq += 1) {
    const body = content(seq);
    const hash = rowHash(body, prev);
    rows.push({ ...body, id: BigInt(seq), prevHash: prev, rowHash: hash });
    prev = hash;
  }
  return rows;
}

/** An honest strategy-B chain: content hashes, with an anchor every `every` rows. */
function anchoredChainOf(length: number, every: number): StoredAuditRow[] {
  const rows: StoredAuditRow[] = [];
  let anchor: Uint8Array = GENESIS_HASH;
  let segment: Uint8Array[] = [];
  let id = 1;

  for (let seq = 1; seq <= length; seq += 1) {
    const body = content(seq);
    const hash = contentHash(body);
    rows.push({ ...body, id: BigInt(id), prevHash: GENESIS_HASH, rowHash: hash });
    segment.push(hash);
    id += 1;

    if (segment.length === every) {
      const next = anchorHash(anchor, segment);
      const anchorBody = content(seq, { operation: ANCHOR_OPERATION, resourceType: null });
      rows.push({ ...anchorBody, id: BigInt(id), prevHash: anchor, rowHash: next });
      id += 1;
      anchor = next;
      segment = [];
    }
  }
  return rows;
}

describe('verifyChain — strategy A', () => {
  it('calls an empty chain intact, because an entity never written to has nothing to prove', () => {
    expect(verifyChain([])).toEqual({ intact: true, rowsChecked: 0 });
  });

  it('verifies a single-row chain against genesis', () => {
    expect(verifyChain(chainOf(1))).toEqual({ intact: true, rowsChecked: 1 });
  });

  it('verifies a long chain', () => {
    expect(verifyChain(chainOf(50))).toEqual({ intact: true, rowsChecked: 50 });
  });

  it('names the row whose content was edited', () => {
    const rows = chainOf(5);
    rows[2] = { ...at(rows, 2), resourceId: 'SOA-SG1-tampered' };

    const verdict = verifyChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.index).toBe(2);
    expect(verdict.firstBreak.id).toBe(3n);
    expect(verdict.firstBreak.kind).toBe('content');
  });

  it('names the NEXT row when the edited one was re-hashed to cover the edit', () => {
    // The subtler attack: fix the row's own hash so it verifies, and hope the
    // link is not checked. It is — the successor still points at the old hash.
    const rows = chainOf(5);
    const edited = { ...at(rows, 1), resourceId: 'SOA-SG1-tampered' };
    rows[1] = { ...edited, rowHash: rowHash(edited, edited.prevHash) };

    const verdict = verifyChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.index).toBe(2);
    expect(verdict.firstBreak.kind).toBe('link');
  });

  it('reports the EARLIEST break when a chain is damaged in several places', () => {
    const rows = chainOf(6);
    rows[4] = { ...at(rows, 4), operation: 'later.damage' };
    rows[1] = { ...at(rows, 1), operation: 'earlier.damage' };

    const verdict = verifyChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.index).toBe(1);
    expect(verdict.rowsChecked).toBe(2);
  });

  it('separates a row nothing ever hashed from a row that was edited', () => {
    // What N1 produces, and what a write bypassing the trigger would leave.
    const rows = chainOf(3);
    rows[1] = { ...at(rows, 1), rowHash: new Uint8Array(0) };

    const verdict = verifyChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.kind).toBe('unchained');
  });

  it('refuses a chain assembled from two entities rather than calling it broken', () => {
    // Without this the verdict would say `link`, and someone would go looking
    // for tampering that never happened.
    const rows = chainOf(3);
    rows[1] = { ...at(rows, 1), orgEntityId: HK1 };

    const verdict = verifyChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.kind).toBe('foreign');
    expect(verdict.firstBreak.detail).toContain(HK1);
  });

  it('accepts the entity id in a different case, because the database normalises it', () => {
    const rows = chainOf(2).map((r) => ({ ...r, orgEntityId: r.orgEntityId.toUpperCase() }));
    expect(verifyChain(rows).intact).toBe(true);
  });

  it('detects a deleted row, even though the table forbids deleting one', () => {
    // Defence in depth: append-only is enforced by privileges, and this is what
    // the log itself would say if that enforcement were ever circumvented.
    const rows = chainOf(4);
    rows.splice(1, 1);

    const verdict = verifyChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.kind).toBe('link');
    expect(verdict.firstBreak.index).toBe(1);
  });

  it('detects two rows swapped, which changes neither row content', () => {
    const rows = chainOf(4);
    [rows[1], rows[2]] = [at(rows, 2), at(rows, 1)];

    expect(verifyChain(rows).intact).toBe(false);
  });
});

describe('verifyAnchoredChain — strategy B', () => {
  it('verifies an honest anchored chain', () => {
    const rows = anchoredChainOf(6, 3);
    const verdict = verifyAnchoredChain(rows);
    expect(verdict.intact).toBe(true);
  });

  it('counts only what an anchor actually covers, leaving the tail visible', () => {
    // 5 rows with an anchor every 3: one anchor covers rows 1-3, and rows 4-5
    // are covered by nothing yet. Reporting 7 checked would be true and
    // misleading.
    const rows = anchoredChainOf(5, 3);
    const verdict = verifyAnchoredChain(rows);
    expect(verdict.intact).toBe(true);
    if (!verdict.intact) throw new Error('unreachable');
    expect(verdict.rowsChecked).toBe(rows.length - 2);
  });

  it('names the row when only its content moved', () => {
    const rows = anchoredChainOf(6, 3);
    rows[1] = { ...at(rows, 1), resourceId: 'SOA-SG1-tampered' };

    const verdict = verifyAnchoredChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.kind).toBe('content');
    expect(verdict.firstBreak.index).toBe(1);
  });

  it('⚠️ can only name the SEGMENT when the row was re-hashed with its edit', () => {
    // The comparison that decides ADR-0003: strategy A names this row, B names
    // the three it is among. Pinned as a test so the trade-off is a measured
    // property rather than an adjective in a document.
    const rows = anchoredChainOf(6, 3);
    const edited = { ...at(rows, 1), resourceId: 'SOA-SG1-tampered' };
    rows[1] = { ...edited, rowHash: contentHash(edited) };

    const verdict = verifyAnchoredChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.kind).toBe('link');
    // The anchor, at index 3 — not the row at index 1 that actually moved.
    expect(verdict.firstBreak.index).toBe(3);
    expect(verdict.firstBreak.detail).toContain('segment');
  });

  it('detects a whole segment replaced, because anchors chain to each other', () => {
    const rows = anchoredChainOf(6, 3);
    const replacement = anchoredChainOf(3, 3);
    rows.splice(4, 4, ...replacement);

    expect(verifyAnchoredChain(rows).intact).toBe(false);
  });

  it('reports an unhashed row before anything else', () => {
    const rows = anchoredChainOf(6, 3);
    rows[0] = { ...at(rows, 0), rowHash: new Uint8Array(0) };

    const verdict = verifyAnchoredChain(rows);
    expect(verdict.intact).toBe(false);
    if (verdict.intact) throw new Error('unreachable');
    expect(verdict.firstBreak.kind).toBe('unchained');
  });
});
