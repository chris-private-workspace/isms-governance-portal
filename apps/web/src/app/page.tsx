/**
 * File: apps/web/src/app/page.tsx
 * Purpose: The one page W01 ships — proves the stack is wired end to end.
 * Category: ui
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   Three things must be observably real here, because each is an acceptance
 *   criterion the W01 drive-through checks by hand:
 *     1. the locale switcher changes the rendered words (not a re-render of
 *        the same dictionary)
 *     2. the database state comes from apps/api over HTTP, not from a constant
 *     3. re-check actually re-fetches, so stopping PostgreSQL flips the value
 *
 *   Every user-visible string goes through `t()`. That includes the button
 *   labels and the aria-label on the switcher — `i18n-glossary.md:100` names
 *   aria-label and empty-state copy as the two most commonly missed.
 *
 * Key Components:
 *   - HomePage: locale state + health fetch + re-check control
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HealthResponse } from '@isms/types';
import { DEFAULT_LOCALE, LOCALES, type Locale, t } from '../i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3210';

type Probe = { data: HealthResponse | null; failed: boolean; loading: boolean };

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [probe, setProbe] = useState<Probe>({ data: null, failed: false, loading: true });

  const check = useCallback(async () => {
    setProbe((p) => ({ ...p, loading: true }));
    try {
      const response = await fetch(`${API_URL}/health`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setProbe({ data: (await response.json()) as HealthResponse, failed: false, loading: false });
    } catch {
      setProbe({ data: null, failed: true, loading: false });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const stateLabel = (value: 'up' | 'down' | undefined): string =>
    value === 'up'
      ? t(locale, 'health.state.up')
      : value === 'down'
        ? t(locale, 'health.state.down')
        : t(locale, 'health.state.unknown');

  return (
    <main style={{ maxWidth: '44rem', margin: '0 auto' }}>
      <label style={{ display: 'block', marginBottom: '2rem', fontSize: '0.875rem' }}>
        {t(locale, 'locale.label')}{' '}
        <select
          value={locale}
          aria-label={t(locale, 'locale.label')}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>
              {t(locale, code === 'en' ? 'locale.en' : 'locale.zh-Hant')}
            </option>
          ))}
        </select>
      </label>

      <h1 style={{ marginBottom: '0.25rem' }}>{t(locale, 'app.title')}</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>{t(locale, 'app.subtitle')}</p>
      <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>{t(locale, 'app.scaffoldNotice')}</p>

      <h2 style={{ marginTop: '2.5rem' }}>{t(locale, 'health.heading')}</h2>
      {probe.failed ? (
        <p role="alert">{t(locale, 'health.error')}</p>
      ) : (
        <dl>
          <dt>{t(locale, 'health.apiLabel')}</dt>
          <dd data-testid="api-state">{stateLabel(probe.data?.status)}</dd>
          <dt>{t(locale, 'health.dbLabel')}</dt>
          <dd data-testid="db-state">{stateLabel(probe.data?.db)}</dd>
        </dl>
      )}

      <button type="button" onClick={() => void check()} disabled={probe.loading}>
        {probe.loading ? t(locale, 'health.refreshBusy') : t(locale, 'health.refresh')}
      </button>
    </main>
  );
}
