/**
 * File: apps/web/src/data/extended/permKey.ts
 * Purpose: What each letter in permMatrix means, and how it is coloured.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4190-4192  (permKey)
 *   `data/permMatrix.ts` stores six letters per module and defines none of them.
 *   extended/roles.ts names the six COLUMNS; this file decodes the six VALUES.
 *   Together they make the matrix readable; either alone leaves it a grid of
 *   single characters.
 *
 *   The `ink` and `bg` values are copied character for character from the
 *   prototype — they are not routed through lib/tok.ts, and that is deliberate.
 *   tok() maps a RAG status letter; these are permission levels, and 'Approve'
 *   uses --primary-tint, which is not a RAG token at all. Forcing them through
 *   tok() would mean inventing a status meaning for 'Edit'.
 *
 *   Labels are copy and live in the dictionaries (port rule 5).
 *
 * Key Components:
 *   - PERM_KEY: letter -> label key + the two colour values
 *   - PERM_LEGEND: the legend's order, which is not the object's key order
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin permissions panel
 *
 * Related:
 *   - apps/web/src/data/permMatrix.ts — the letters this decodes
 *   - apps/web/src/data/extended/roles.ts — the columns those letters sit under
 */

import type { TranslationKey } from '@/i18n';

export type PermLevel = { labelKey: TranslationKey; ink: string; bg: string };

/** dc.html:4190-4192, values verbatim. */
export const PERM_KEY: Record<string, PermLevel> = {
  F: { labelKey: 'admin.perm.full', ink: 'var(--rag-g-ink)', bg: 'var(--rag-g-bg)' },
  A: { labelKey: 'admin.perm.approve', ink: 'var(--primary-ink)', bg: 'var(--primary-tint)' },
  E: { labelKey: 'admin.perm.edit', ink: 'var(--rag-a-ink)', bg: 'var(--rag-a-bg)' },
  C: { labelKey: 'admin.perm.create', ink: 'var(--rag-a-ink)', bg: 'var(--rag-a-bg)' },
  R: { labelKey: 'admin.perm.read', ink: 'var(--text-2)', bg: 'var(--surface-3)' },
  '—': { labelKey: 'admin.perm.none', ink: 'var(--text-3)', bg: 'transparent' },
};

/**
 * The legend's order — dc.html:4729 spells it out rather than reading the object
 * back, because it is a reading order (most access first) and not the storage
 * order. Kept separate for the same reason.
 */
export const PERM_LEGEND = ['F', 'A', 'E', 'C', 'R', '—'] as const;

/** Unknown letters fall back to 'None' rather than rendering a blank cell. */
export function permLevel(code: string): PermLevel {
  return PERM_KEY[code] ?? PERM_KEY['—']!;
}
