/**
 * File: apps/web/src/lib/ago.ts
 * Purpose: Renders a real timestamp in the relative form the design asks for.
 * Category: ui
 * Scope: Phase W22
 *
 * Description:
 *   The mockup writes "2 days ago" and the API sends an ISO timestamp. Keeping
 *   the design's shape while using the real value means formatting, not
 *   approximating — so this exists rather than each screen printing the raw
 *   string. W22's drive-through found exactly that: the register said "today"
 *   while the detail screen printed 2026-08-18T07:57:11.690Z on the same record.
 *
 *   Intl does the wording in both locales. Writing our own would be the third
 *   translation i18n-glossary.md §1 warns about, for a phrase the platform
 *   already gets for free.
 *
 * Key Components:
 *   - ago(iso, locale): "today" / "8 days ago" / "上週"
 *
 * Created: 2026-08-19 (Phase W22)
 * Last Modified: 2026-08-19
 *
 * Modification History (newest-first):
 *   - 2026-08-19: Initial creation (Phase W22) — CH-042
 */
export function ago(iso: string, locale: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return iso;
  }
  const days = Math.round((parsed - Date.now()) / 86_400_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
}
