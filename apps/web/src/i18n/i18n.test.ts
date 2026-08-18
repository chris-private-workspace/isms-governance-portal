/**
 * File: apps/web/src/i18n/i18n.test.ts
 * Purpose: The machine gate that makes the i18n rule a rule.
 * Category: Test
 * Scope: Phase W01 (M0)
 * Owner: docs/rules-on-demand/i18n-glossary.md §2
 *
 * Description:
 *   `i18n-glossary.md:65` calls this "整份規則裡唯一有強制力的部分", because
 *   i18n failures are visual: a missing key renders as its own name, nothing
 *   errors, CI stays green, and only someone who switches language ever sees
 *   it. Three checks, matching the rule's checklist:
 *     1. every locale carries exactly the same key set
 *     2. no empty or whitespace-only values
 *     3. every key referenced by a component actually exists
 *
 *   Check 3 scans source rather than trusting types, because a key built at
 *   runtime would type-check and still be missing.
 *
 *   Check 1 is now written as a function the suite also tests in the failing
 *   direction (CH-012) — an assertion nobody has watched fail is
 *   indistinguishable from one that cannot fail.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Derive the locale under test (CH-040) — hardcoded en broke on flip
 *   - 2026-08-09: CH-012 — assert the parity check both ways
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, DICTIONARIES, LOCALES, type Locale, t } from './index';

const SRC_ROOT = join(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

type Dictionaries = Record<string, Record<string, string>>;
type ParityViolation = { locale: string; missing: string[]; extra: string[] };

/**
 * The parity comparison as a function rather than inline expectations, so the
 * suite can assert it BOTH ways: silent on the real dictionaries, and loud on a
 * broken one (CH-012).
 *
 * An assertion nobody has watched fail is indistinguishable from one that
 * cannot fail. This one guards a failure the type checker cannot see —
 * TranslationKey is derived from zh-Hant alone, so every other locale is typed
 * `Record<string, string>` and may quietly lose a key.
 *
 * Lives here rather than in src/: a production module imported only by tests is
 * side-track code (AP-1).
 */
function parityViolations(dicts: Dictionaries): ParityViolation[] {
  const reference = new Set(Object.keys(dicts[DEFAULT_LOCALE] ?? {}));

  return Object.entries(dicts)
    .map(([locale, dict]) => {
      const keys = new Set(Object.keys(dict));
      return {
        locale,
        missing: [...reference].filter((key) => !keys.has(key)).sort(),
        extra: [...keys].filter((key) => !reference.has(key)).sort(),
      };
    })
    .filter((violation) => violation.missing.length > 0 || violation.extra.length > 0);
}

function withoutKey(locale: Locale, key: string): Dictionaries {
  const kept = Object.entries(DICTIONARIES[locale]).filter(([name]) => name !== key);

  return { ...DICTIONARIES, [locale]: Object.fromEntries(kept) };
}

describe('the parity check itself', () => {
  // Any real key would do; this one is picked because the W01 drive-through
  // exercised it on screen, so a failure here has a visible counterpart.
  const SAMPLE_KEY = 'health.state.down';

  /*
   * Break a NON-reference locale, for the same reason the t() fallback test
   * derives its locale: parityViolations() reads DEFAULT_LOCALE as the
   * reference, so damaging the reference itself reports every OTHER locale as
   * violating — a real failure, naming the wrong dictionary. Hardcoding `en`
   * here was correct only while zh-Hant was the default (CH-040 flipped it).
   */
  const OTHER = LOCALES.find((locale) => locale !== DEFAULT_LOCALE)!;

  it('reports nothing for the dictionaries we actually ship', () => {
    expect(parityViolations(DICTIONARIES)).toEqual([]);
  });

  it('names the locale and the key when one goes missing', () => {
    const violations = parityViolations(withoutKey(OTHER, SAMPLE_KEY));

    expect(violations).toEqual([{ locale: OTHER, missing: [SAMPLE_KEY], extra: [] }]);
  });

  it('catches a key that exists only outside the reference locale', () => {
    const drifted: Dictionaries = {
      ...DICTIONARIES,
      [OTHER]: { ...DICTIONARIES[OTHER], 'stray.key': 'x' },
    };

    expect(parityViolations(drifted)).toEqual([
      { locale: OTHER, missing: [], extra: ['stray.key'] },
    ]);
  });
});

describe('i18n dictionaries', () => {
  it('every locale carries exactly the reference key set', () => {
    expect(parityViolations(DICTIONARIES)).toEqual([]);
  });

  it.each(LOCALES)('%s has no empty or whitespace-only values', (locale) => {
    const blank = Object.entries(DICTIONARIES[locale])
      .filter(([, value]) => value.trim().length === 0)
      .map(([key]) => key);

    expect(blank).toEqual([]);
  });

  it('has more than one locale, or the parity checks above assert nothing', () => {
    expect(LOCALES.length).toBeGreaterThan(1);
  });
});

describe('keys referenced by components', () => {
  it('all exist in the dictionaries', () => {
    const referenced = new Set<string>();
    for (const file of sourceFiles(SRC_ROOT)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/\bt\(\s*[A-Za-z0-9_.]+\s*,\s*'([^']+)'\s*\)/g)) {
        referenced.add(match[1]!);
      }
    }

    // A shell with no translated strings would pass this vacuously.
    expect(referenced.size).toBeGreaterThan(0);

    const missing = [...referenced].filter((key) => !(key in DICTIONARIES[DEFAULT_LOCALE]));
    expect(missing).toEqual([]);
  });
});

describe('t()', () => {
  it('returns the requested locale', () => {
    expect(t('en', 'health.state.up')).toBe('Up');
    expect(t('zh-Hant', 'health.state.up')).toBe('正常');
  });

  /*
   * The locale under test is derived, not written literally.
   *
   * This assertion needs a locale that is NOT the default: t() reads the
   * requested dictionary and then the default one, so deleting a key from the
   * default locale makes both lookups the same miss and there is no fallback
   * left to observe. The test would still fail — but for the wrong reason,
   * reporting a broken fallback when what actually broke is the test's premise.
   *
   * CH-040 walked into exactly that by flipping DEFAULT_LOCALE from zh-Hant to
   * en while this test had `en` hardcoded. Deriving the locale means the next
   * change of default cannot repeat it.
   */
  it('falls back to the default locale rather than leaking the key name', () => {
    const other = LOCALES.find((locale) => locale !== DEFAULT_LOCALE);
    if (!other) throw new Error('needs a second locale to have a fallback to observe');

    const partial = { ...DICTIONARIES[other] };
    delete partial['health.state.up'];
    const original = DICTIONARIES[other];
    DICTIONARIES[other] = partial;

    try {
      expect(t(other, 'health.state.up')).toBe(DICTIONARIES[DEFAULT_LOCALE]['health.state.up']);
    } finally {
      DICTIONARIES[other] = original;
    }
  });
});
