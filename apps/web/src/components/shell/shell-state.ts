/**
 * File: apps/web/src/components/shell/shell-state.ts
 * Purpose: Lets a screen read the scope, period and locale the topbar owns.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Nearly every screen fragment contains a {{ scopeLabel }} or
 *   {{ periodLabel }} hole, and all copy resolves through t(locale, key).
 *   All three values live in AppShell's state, so without a channel a screen
 *   has two options and both are wrong: hardcode the labels, or keep its own
 *   copy of the state and let the two drift.
 *
 *   The consequence is not cosmetic. The topbar's scope selector and period
 *   control are rendered as interactive; if changing them cannot reach the
 *   screen, they are controls that look like they work — the exact shape
 *   verification-discipline.md calls a dead control. This context is what
 *   makes them real.
 *
 *   `entity` is resolved here rather than at each call site so that "APAC" and
 *   "one OpCo" are distinguishable by a null check instead of by a string
 *   comparison repeated in 27 screens.
 *
 * Key Components:
 *   - ShellState: what a screen may read
 *   - ShellStateContext / useShell: provider side and consumer side
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */

import { createContext, useContext } from 'react';

import type { OpCo } from '@/data/opcos';
import type { Locale, TranslationKey } from '@/i18n';

export type ShellState = {
  locale: Locale;
  /** Translate, with the locale already bound. Screens never pass a locale. */
  tr: (key: TranslationKey) => string;
  /** Translate a string carrying values, e.g. `{n} jurisdictions`. */
  trf: (key: TranslationKey, vars: Record<string, string | number>) => string;
  /** 'APAC' for the whole region, otherwise an OpCo code. */
  scopeCode: string;
  /** What the fragments call {{ scopeLabel }}. */
  scopeLabel: string;
  /** The selected OpCo, or null when the scope is the whole region. */
  entity: OpCo | null;
  /**
   * Narrow the scope from a screen. The dashboard's entity rows say they
   * "drill into a single entity"; without this they would be rows that look
   * clickable and are not.
   */
  setScope: (code: string) => void;
  /**
   * Change the language from a screen, for the same reason setScope exists.
   * The preferences screen draws a card per locale; without this they are cards
   * that look selectable and are not — the topbar owns the only working
   * switcher, and a second one that silently does nothing is worse than none.
   */
  setLocale: (locale: Locale) => void;
  /** What the fragments call {{ periodLabel }}. */
  periodLabel: string;
};

export const ShellStateContext = createContext<ShellState | null>(null);

/**
 * Throws outside the shell rather than returning a default.
 *
 * A default would let a screen render plausible-looking labels while wired to
 * nothing, which is precisely the failure this context exists to prevent — so
 * the miswiring is made loud instead of silent.
 */
export function useShell(): ShellState {
  const state = useContext(ShellStateContext);
  if (!state) {
    throw new Error('useShell must be called inside AppShell — is this screen under (app)/?');
  }
  return state;
}
