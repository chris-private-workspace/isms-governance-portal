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
 *   English is the default (CH-040): of the 11 jurisdictions in scope only
 *   Taiwan and Hong Kong work primarily in Traditional Chinese, so guardrail 9
 *   now requires both dictionaries at key parity and defaults to `en`.
 *
 *   Note that the default locale and the type source are separate decisions.
 *   TranslationKey still derives from zh-Hant: one decides which keys exist,
 *   the other decides which dictionary renders first.
 *
 * Key Components:
 *   - Locale / TranslationKey: the two types every caller uses
 *   - t(locale, key): resolve one string
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Default locale zh-Hant -> en (CH-040) — guardrail 9 rewritten
 *   - 2026-08-08: Initial creation (Phase W01) — zh-Hant + en
 */
import zhHantShell from './zh-Hant.json';
import enShell from './en.json';
import zhHantRegisters from './registers.zh-Hant.json';
import enRegisters from './registers.en.json';
import zhHantForms from './forms.zh-Hant.json';
import enForms from './forms.en.json';
import zhHantDetails from './details.zh-Hant.json';
import enDetails from './details.en.json';
import zhHantSettings from './settings.zh-Hant.json';
import enSettings from './settings.en.json';
import zhHantDeep from './deep.zh-Hant.json';
import enDeep from './deep.en.json';
import zhHantAuth from './auth.zh-Hant.json';
import enAuth from './auth.en.json';
import zhHantAdmin from './admin.zh-Hant.json';
import enAdmin from './admin.en.json';
import zhHantProfiles from './profiles.zh-Hant.json';
import enProfiles from './profiles.en.json';

export const LOCALES = ['zh-Hant', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * One file per screen batch, merged here.
 *
 * Not an organisational preference — a concurrency one. W19 ports 27 screens,
 * and several are written in parallel; a single pair of dictionaries makes
 * every one of those writers collide on the same two files, and a lost merge
 * shows up as a missing key rather than as a conflict. Splitting by batch
 * gives each writer a file nobody else touches, and this spread is the only
 * place that has to know they exist.
 *
 * Merge order is last-wins, so a batch cannot silently shadow a shell key
 * without the parity test staying quiet — but it would show up here, in one
 * place, rather than as a mystery at a call site.
 */
const zhHant = {
  ...zhHantShell,
  ...zhHantRegisters,
  ...zhHantForms,
  ...zhHantDetails,
  ...zhHantSettings,
  ...zhHantDeep,
  ...zhHantAuth,
  ...zhHantAdmin,
  ...zhHantProfiles,
};

const en = {
  ...enShell,
  ...enRegisters,
  ...enForms,
  ...enDetails,
  ...enSettings,
  ...enDeep,
  ...enAuth,
  ...enAdmin,
  ...enProfiles,
};

/** zh-Hant is the source of truth for the key set; every other locale mirrors it. */
export type TranslationKey = keyof typeof zhHant;

export const DEFAULT_LOCALE: Locale = 'en';

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
