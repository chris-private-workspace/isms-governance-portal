/**
 * File: apps/web/src/app/layout.tsx
 * Purpose: Root layout for the W01 scaffold shell.
 * Category: ui
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   Minimal by scope decision (b): the design handoff's tokens.css and
 *   components.css are NOT copied here. 約束 6 requires them to be copied
 *   verbatim rather than rewritten, and there is no page to verify that
 *   fidelity against until M6 — copying them now would leave CSS with no
 *   consumer and no way to check it.
 *
 *   `lang` is zh-Hant per guardrail 9. It is static here because the locale
 *   switcher is client-side in this shell; real per-locale routing arrives
 *   with L1.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import type { ReactNode } from 'react';

export const metadata = {
  title: 'APAC ISMS Governance Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body
        style={{
          margin: 0,
          padding: '2.5rem 1.5rem',
          fontFamily: 'system-ui, "Noto Sans TC", sans-serif',
          lineHeight: 1.6,
        }}
      >
        {children}
      </body>
    </html>
  );
}
