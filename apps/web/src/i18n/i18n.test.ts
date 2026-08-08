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
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, DICTIONARIES, LOCALES, t } from './index';

const SRC_ROOT = join(import.meta.dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
  });
}

describe('i18n dictionaries', () => {
  const referenceKeys = Object.keys(DICTIONARIES[DEFAULT_LOCALE]).sort();

  it.each(LOCALES)('%s carries exactly the reference key set', (locale) => {
    expect(Object.keys(DICTIONARIES[locale]).sort()).toEqual(referenceKeys);
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

  it('falls back to the default locale rather than leaking the key name', () => {
    const partial = { ...DICTIONARIES.en };
    delete partial['health.state.up'];
    const original = DICTIONARIES.en;
    DICTIONARIES.en = partial;

    try {
      expect(t('en', 'health.state.up')).toBe(DICTIONARIES[DEFAULT_LOCALE]['health.state.up']);
    } finally {
      DICTIONARIES.en = original;
    }
  });
});
