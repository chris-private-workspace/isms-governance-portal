'use client';

/**
 * File: apps/web/src/components/NoSource.tsx
 * Purpose: Renders a column the API has no source for, without letting it read as a value.
 * Category: ui
 * Scope: Phase W22
 *
 * Description:
 *   ⛔ NOT a loading placeholder and not "coming soon". These fields have no
 *   source in the API at all today — lib/api/risks.ts lists which and why — and
 *   the wrong renderings are worse than they look:
 *
 *     a blank cell        reads as a value someone forgot to enter
 *     a zero              reads as a measured zero, which for a control count
 *                         is a claim that the risk is uncontrolled
 *     the fixture's value reads as real, which is the thing DemoBadge exists
 *                         to prevent
 *
 *   So: an em dash carrying the reason, on hover and to a screen reader. It is
 *   deliberately not styled to look like data.
 *
 *   Pairs with <DemoBadge variant="partial" />, which names the affected blocks
 *   once at the top rather than repeating the reason in every cell.
 *
 * Key Components:
 *   - NoSource: one cell's worth of "the API cannot answer this yet"
 *
 * Created: 2026-08-18 (Phase W22)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W22) — CH-042
 *
 * Related:
 *   - apps/web/src/lib/api/risks.ts — the list of fields with no source
 *   - .claude/rules/verification-discipline.md §Mock 的誠實原則
 */
export function NoSource({ label }: { label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      data-no-source
      style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}
    >
      —
    </span>
  );
}
