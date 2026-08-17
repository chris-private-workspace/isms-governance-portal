/**
 * File: apps/web/src/i18n/index.ts
 * Purpose: L0 string extraction — every user-visible string resolves through here.
 * Category: ui
 * Scope: Phase W01 (M0)
 * Owner: docs/rules-on-demand/i18n-glossary.md
 *
 * Description:
 *   L0 in the rule's three-layer model: copy lives in dictionaries, components
 *   hold keys. `i18n-glossary.md:29` calls L0 "the only layer with a deadline"
 *   — retrofitting it once copy is scattered across hundreds of components
 *   costs an order of magnitude more, so it ships with the scaffold.
 *
 *   Keys are typed from the zh-Hant dictionary, so referencing one that does
 *   not exist is a compile error rather than a string that silently renders as
 *   its own key name. That silent fallback is what `i18n-glossary.md:65` calls
 *   假綠: nothing errors, CI is green, and only someone who switches language
 *   ever sees it.
 *
 *   zh-Hant is the default because guardrail 9 makes it the user-facing
 *   language. English ships alongside it so that both the switcher and the
 *   key-parity test have something real to act on — a parity test over a
 *   single dictionary asserts nothing.
 *
 * Key Components:
 *   - Locale / TranslationKey: the two types every caller uses
 *   - t(locale, key): resolve one string
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01) — zh-Hant + en
 */
import zhHant from './zh-Hant.json';
import en from './en.json';

export const LOCALES = ['zh-Hant', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** zh-Hant is the source of truth for the key set; every other locale mirrors it. */
export type TranslationKey = keyof typeof zhHant;

export const DEFAULT_LOCALE: Locale = 'zh-Hant';

export const DICTIONARIES: Record<Locale, Record<string, string>> = {
  'zh-Hant': zhHant,
  en,
};

/**
 * Resolve one string.
 *
 * Falls back to the default locale rather than to the key name. The parity
 * test makes the fallback unreachable in practice; it exists so that a partial
 * dictionary during future translation work degrades to readable text instead
 * of leaking an identifier into the UI.
 */
export function t(locale: Locale, key: TranslationKey): string {
  return DICTIONARIES[locale][key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key;
}

/**
 * Resolve one string that carries values, e.g. `{n} jurisdictions`.
 *
 * Exists so that screens never assemble a sentence by concatenation. A count
 * and its noun sit on opposite sides in some languages and need a measure word
 * in others — zh-Hant writes `11 個管轄區` where English writes
 * `11 jurisdictions` — so the whole sentence has to be one translatable unit
 * with holes, not a number glued to a translated fragment.
 *
 * Unknown placeholders are left as written rather than blanked, so a typo in a
 * variable name shows up on screen instead of quietly producing a gap.
 */
export function tf(locale: Locale, key: TranslationKey, vars: Record<string, string | number>) {
  return t(locale, key).replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}
