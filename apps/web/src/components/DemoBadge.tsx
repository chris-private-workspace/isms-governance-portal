'use client';

/**
 * File: apps/web/src/components/DemoBadge.tsx
 * Purpose: Marks a screen as fixture-driven, on the screen, at all times.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Every screen in this port renders sample data. That is fine; what is not
 *   fine is sample data presented as real. verification-discipline.md draws the
 *   line exactly there — use a fixture, but say so — and lists 'fixture data
 *   dressed as real' among the things a drive-through exists to catch.
 *
 *   Deliberately not subtle. A grey footnote satisfies the letter of the rule
 *   and fails its purpose: this is a governance platform, and a screenshot of
 *   it taken out of context must not be able to pass as a real ISMS position.
 *   Amber, bordered, above the page title, before anything else is read.
 *
 *   The same rule's harder lesson applies here: the marker itself has to be
 *   driven, not merely tested. A previous project shipped a mock marker with a
 *   passing test that skipped an entire class of results — the test certified
 *   the gap. So this is on the Day 3 checklist as a per-screen visual check.
 *
 *   ⚠️ W22 added the SECOND failure mode, which is this rule inverted. Once the
 *   risks detail screen reads its header from the API, a badge saying the whole
 *   page is sample is no longer a cautious overstatement — it is false in the
 *   other direction, and a marker that is wrong is a marker people stop reading.
 *   Hence `variant`: `fixture` still means every figure here is invented,
 *   `partial` names which blocks are and leaves the rest alone.
 *
 * Key Components:
 *   - DemoBadge: one banner, placed as the first child of every screen
 *   - variant: 'fixture' (default, unchanged) | 'partial' (some of this is live)
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Add the partial variant (Phase W22) — a page that is half live
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - .claude/rules/verification-discipline.md — the honesty rule for mocks
 */

import { useShell } from '@/components/shell/shell-state';

export type DemoBadgeVariant = 'fixture' | 'partial';

export function DemoBadge({ variant = 'fixture' }: { variant?: DemoBadgeVariant } = {}) {
  const { tr } = useShell();
  const partial = variant === 'partial';

  return (
    <div
      data-demo-badge
      data-demo-variant={variant}
      role="note"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '8px 13px',
        marginBottom: '16px',
        borderRadius: '9px',
        background: 'var(--rag-a-bg)',
        border: '1px solid var(--rag-a)',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--rag-a)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '.5px',
          textTransform: 'uppercase',
          fontFamily: 'var(--mono)',
          color: 'var(--rag-a-ink)',
        }}
      >
        {tr(partial ? 'fixture.badge.partial.tag' : 'fixture.badge.tag')}
      </span>
      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--rag-a-ink)' }}>
        {tr(partial ? 'fixture.badge.partial.text' : 'fixture.badge.text')}
      </span>
    </div>
  );
}
