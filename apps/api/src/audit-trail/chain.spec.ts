/**
 * File: apps/api/src/audit-trail/chain.spec.ts
 * Purpose: Hold the TypeScript hash to vectors measured from PostgreSQL, not to my reading of the SQL.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 *
 * Description:
 *   W12's whole comparison rests on strategies A and B hashing the same bytes,
 *   and the two implementations cannot see each other: one is PL/pgSQL in a
 *   migration, one is TypeScript here. A test that only exercised chain.ts
 *   against itself would pass no matter how far apart they drifted.
 *
 *   So the expected values below are OUTPUTS, captured from PostgreSQL 18 by
 *   calling audit_log_canonical() directly with fixed arguments. If either side
 *   changes its serialisation, these go red. The full round trip against a live
 *   database is audit.int.spec.ts (Day 2); this file is what makes the unit
 *   suite meaningful on its own.
 *
 *   ⚠️ Control characters are constructed with fromCharCode rather than written
 *   literally. An earlier draft of chain.ts carried a raw 0x01 byte in a comment
 *   because a tool rendered an escape sequence into the character it names —
 *   invisible in every diff, and it would have shipped.
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 */
import {
  GENESIS_HASH,
  anchorHash,
  canonicalJson,
  canonicalPayload,
  canonicalTimestamp,
  contentHash,
  field,
  rowHash,
  type AuditRowContent,
} from './chain';

const SG1 = '11111111-1111-1111-1111-111111111111';
const HK1 = '22222222-2222-2222-2222-222222222222';
const ACTOR = '33333333-3333-3333-3333-333333333333';

/**
 * The row behind vector v1. Every field populated, adversarial JSON on both
 * sides: key orders that PostgreSQL reorders, a newline inside a string, an
 * array, and multi-byte characters whose UTF-8 length differs from their
 * character count.
 */
const V1: AuditRowContent = {
  orgEntityId: SG1,
  actorId: ACTOR,
  actorScope: `${SG1},${HK1}`,
  operation: 'soa.update',
  resourceType: 'soa',
  resourceId: 'SOA-SG1-7',
  accessAllowed: true,
  attemptedEntity: HK1,
  before: { bb: 1, a: 2, B: 3 },
  after: { note: 'l\nm', x: [1, 2], u: '繁體' },
  occurredAt: new Date('2026-08-14T07:03:21.476Z'),
};

const V1_PREV_HASH = Buffer.from('ab'.repeat(32), 'hex');

/** The NULL-heavy shape: a system-initiated first event, no actor, no resource. */
const V2: AuditRowContent = {
  orgEntityId: SG1,
  actorId: null,
  actorScope: SG1,
  operation: 'audit.genesis',
  resourceType: null,
  resourceId: null,
  accessAllowed: false,
  attemptedEntity: null,
  before: null,
  after: null,
  occurredAt: new Date('2026-08-14T00:00:00.000Z'),
};

/** V2 with resource_id set to the empty string rather than left absent. */
const V3: AuditRowContent = { ...V2, resourceId: '' };

describe('canonicalJson — PostgreSQL jsonb rendering, reimplemented', () => {
  // Each expectation is a measured `SELECT '...'::jsonb::text` on PostgreSQL 18.
  it('sorts object keys by byte length first, then bytewise', () => {
    expect(canonicalJson({ bb: 1, a: 2, b: 3, aaa: 4, B: 5 })).toBe(
      '{"B": 5, "a": 2, "b": 3, "bb": 1, "aaa": 4}',
    );
  });

  it('applies the same ordering inside nested objects and leaves arrays alone', () => {
    expect(canonicalJson({ z: { y: 1, x: [1, 2] }, a: null })).toBe(
      '{"a": null, "z": {"x": [1, 2], "y": 1}}',
    );
  });

  it('renders empty containers and top-level non-objects', () => {
    expect(canonicalJson({ o: {}, a: [] })).toBe('{"a": [], "o": {}}');
    expect(canonicalJson([3, 1, { b: 1, a: 2 }])).toBe('[3, 1, {"a": 2, "b": 1}]');
    expect(canonicalJson('hello')).toBe('"hello"');
  });

  it('escapes strings exactly as PostgreSQL does', () => {
    expect(canonicalJson({ a: 'x"y', b: 'p\\q', c: 'l\nm', d: 't\tu' })).toBe(
      '{"a": "x\\"y", "b": "p\\\\q", "c": "l\\nm", "d": "t\\tu"}',
    );
  });

  it('leaves non-ASCII and the solidus unescaped, like PostgreSQL', () => {
    expect(canonicalJson({ a: '繁體中文', b: 'é' })).toBe('{"a": "繁體中文", "b": "é"}');
    expect(canonicalJson({ a: 'a/b' })).toBe('{"a": "a/b"}');
    expect(canonicalJson({ a: '😀' })).toBe('{"a": "😀"}');
  });

  it('matches PostgreSQL on control characters, including the ones it does not escape', () => {
    const value = {
      a: String.fromCharCode(1),
      b: String.fromCharCode(9),
      c: String.fromCharCode(31),
      d: String.fromCharCode(127),
      e: String.fromCharCode(8),
    };
    // Measured: jsonb_build_object('a', chr(1), ...) renders 0x01 and 0x1f as
    // lowercase four-digit escapes, tab and backspace by name, and DEL raw.
    const expected =
      '{"a": "\\u0001", "b": "\\t", "c": "\\u001f", ' +
      `"d": "${String.fromCharCode(127)}", "e": "\\b"}`;
    expect(canonicalJson(value)).toBe(expected);
  });

  it('renders numbers as PostgreSQL renders what JSON.stringify sends it', () => {
    // ⚠️ The JavaScript values 1.0 and 1e2 do not survive as written — stringify
    // emits 1 and 100 — and that is exactly the point: the column is given the
    // stringified form, so agreeing with it is agreeing with the database.
    expect(canonicalJson({ a: 1.0, b: 1e2, c: 0.1, d: -0, e: 1e-3, f: 1e19 })).toBe(
      '{"a": 1, "b": 100, "c": 0.1, "d": 0, "e": 0.001, "f": 10000000000000000000}',
    );
  });

  it('drops undefined members, as the stringify pass Prisma performs would', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a": 1}');
  });

  it('distinguishes an absent value from a JSON null', () => {
    expect(canonicalJson(null)).toBeNull();
    expect(canonicalJson(undefined)).toBeNull();
    expect(canonicalJson({ a: null })).toBe('{"a": null}');
  });
});

describe('field — length prefixing', () => {
  it('separates NULL from the empty string', () => {
    expect(field(null)).toBe('-1:');
    expect(field('')).toBe('0:');
  });

  it('counts UTF-8 bytes, not characters', () => {
    expect(field('繁體')).toBe('6:繁體');
  });

  it('cannot be forged by moving the boundary between two fields', () => {
    // The delimiter-based failure this replaces: 'a|b' + 'c' and 'a' + 'b|c'
    // are one string. Length prefixes keep them apart.
    expect(field('a') + field('bc')).not.toBe(field('ab') + field('c'));
  });
});

describe('canonicalTimestamp', () => {
  it('always emits six fractional digits in UTC', () => {
    expect(canonicalTimestamp(new Date('2026-08-14T07:03:21.476Z'))).toBe(
      '2026-08-14T07:03:21.476000Z',
    );
    expect(canonicalTimestamp(new Date('2026-08-14T00:00:00.000Z'))).toBe(
      '2026-08-14T00:00:00.000000Z',
    );
  });
});

describe('canonicalPayload / rowHash — held to PostgreSQL vectors', () => {
  // encode(audit_log_canonical(...), 'hex') on PostgreSQL 18, same arguments.
  // ⚠️ Chunked mechanically, never by hand. The first draft of this constant was
  // hand-wrapped and lost two bytes, and the failure was instructive: the three
  // hash vectors below still passed, which is what proved the TypeScript side
  // right and the transcription wrong rather than the other way round.
  const V1_PAYLOAD_HEX =
    '69736d732e61756469742e763133363a31313131313131312d313131312d3131' +
    '31312d313131312d31313131313131313131313133363a33333333333333332d' +
    '333333332d333333332d333333332d33333333333333333333333337333a3131' +
    '3131313131312d313131312d313131312d313131312d31313131313131313131' +
    '31312c32323232323232322d323232322d323232322d323232322d3232323232' +
    '3232323232323231303a736f612e757064617465333a736f61393a534f412d53' +
    '47312d37343a7472756533363a32323232323232322d323232322d323232322d' +
    '323232322d32323232323232323232323232353a7b2242223a20332c20226122' +
    '3a20322c20226262223a20317d34343a7b2275223a2022e7b981e9ab94222c20' +
    '2278223a205b312c20325d2c20226e6f7465223a20226c5c6e6d227d32373a32' +
    '3032362d30382d31345430373a30333a32312e3437363030305aabababababab' +
    'abababababababababababababababababababababababababab';

  it('produces the bytes PostgreSQL produces for the same row', () => {
    expect(canonicalPayload(V1, V1_PREV_HASH).toString('hex')).toBe(V1_PAYLOAD_HEX);
  });

  it('produces the hash PostgreSQL produces — every field populated', () => {
    expect(rowHash(V1, V1_PREV_HASH).toString('hex')).toBe(
      '87aa13ba23bbc80b26cefff9afb5b702af22ce0cdafefc5501cd31bb536cd330',
    );
  });

  it('produces the hash PostgreSQL produces — the NULL-heavy genesis row', () => {
    expect(rowHash(V2, GENESIS_HASH).toString('hex')).toBe(
      'c13528c9fa96057f1cc375ed17a25578d104d1c7512cf5de0e3e775fcd10e9c3',
    );
  });

  it('gives an empty string a different hash from an absent value', () => {
    // Both sides measured on PostgreSQL. If field() ever collapsed NULL and ''
    // these two would coincide, and an attacker could blank a resource id
    // without disturbing the chain.
    expect(rowHash(V3, GENESIS_HASH).toString('hex')).toBe(
      'cb4095880de0e9adba12a641ed77cb5fd009fc315c5ddfc186f13feef2840976',
    );
    expect(rowHash(V3, GENESIS_HASH)).not.toEqual(rowHash(V2, GENESIS_HASH));
  });

  it('changes when the predecessor changes, which is what makes the chain a chain', () => {
    const other = Buffer.from('cd'.repeat(32), 'hex');
    expect(rowHash(V1, other)).not.toEqual(rowHash(V1, V1_PREV_HASH));
  });

  it('normalises UUID case, because casting uuid to text does', () => {
    expect(rowHash({ ...V1, orgEntityId: SG1.toUpperCase() }, V1_PREV_HASH)).toEqual(
      rowHash(V1, V1_PREV_HASH),
    );
  });

  it('is unmoved by the key order the caller happened to use', () => {
    const reordered: AuditRowContent = { ...V1, before: { B: 3, a: 2, bb: 1 } };
    expect(rowHash(reordered, V1_PREV_HASH)).toEqual(rowHash(V1, V1_PREV_HASH));
  });
});

describe('strategy B — content hashes and anchors', () => {
  it('defines contentHash as the row against genesis, so both strategies share one definition', () => {
    expect(contentHash(V2)).toEqual(rowHash(V2, GENESIS_HASH));
  });

  it('changes the anchor when any covered row changes', () => {
    const a = contentHash(V1);
    const b = contentHash(V2);
    const tampered = contentHash({ ...V1, resourceId: 'SOA-SG1-8' });

    expect(anchorHash(GENESIS_HASH, [a, b])).not.toEqual(anchorHash(GENESIS_HASH, [tampered, b]));
  });

  it('changes the anchor when covered rows are reordered', () => {
    const a = contentHash(V1);
    const b = contentHash(V2);
    expect(anchorHash(GENESIS_HASH, [a, b])).not.toEqual(anchorHash(GENESIS_HASH, [b, a]));
  });

  it('chains anchor to anchor, so a whole segment cannot be replaced wholesale', () => {
    const segment = [contentHash(V1), contentHash(V2)];
    const first = anchorHash(GENESIS_HASH, segment);
    expect(anchorHash(first, segment)).not.toEqual(anchorHash(GENESIS_HASH, segment));
  });

  it('cannot tell WHICH row in a segment moved — the trade-off, pinned as a test', () => {
    // ⚠️ This asserts a LIMITATION on purpose. Two different tampered segments
    // are distinguishable from the honest one but the anchor gives no way to say
    // which member changed; only re-checking each content hash does, and B does
    // not store enough to do that per row. ADR-0003 has to state this next to
    // B's write-cost advantage.
    const honest = [contentHash(V1), contentHash(V2)];
    const firstMoved = [contentHash({ ...V1, resourceId: 'x' }), contentHash(V2)];
    const secondMoved = [contentHash(V1), contentHash({ ...V2, operation: 'x' })];

    const anchorOf = (s: Buffer[]): string => anchorHash(GENESIS_HASH, s).toString('hex');
    expect(anchorOf(firstMoved)).not.toBe(anchorOf(honest));
    expect(anchorOf(secondMoved)).not.toBe(anchorOf(honest));
    // Both break it, and the anchor alone says nothing about which.
    expect(anchorOf(firstMoved)).not.toBe(anchorOf(secondMoved));
  });
});
