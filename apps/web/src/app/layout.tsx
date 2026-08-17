/**
 * File: apps/web/src/app/layout.tsx
 * Purpose: Root layout — mounts the design-system tokens and loads globals.css.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   `data-grc` is the mount point for every design token. tokens.css:7 scopes
 *   the whole custom-property block to `[data-grc]`, NOT to :root, so the
 *   attribute has to sit on an element enclosing everything painted — <html>.
 *   Getting this wrong does not raise: every colour just falls back and the
 *   page looks plausibly wrong. W19 verifies it by removing the attribute and
 *   confirming the page really does break.
 *
 *   `data-theme` selects the light/dark token block (tokens.css:67). Static
 *   "light" for now; the switcher is a W19 shell control.
 *
 *   `lang` is zh-Hant per guardrail 9. Static here because the locale switcher
 *   is client-side in this shell; real per-locale routing arrives with L1.
 *
 *   Body styling now comes from base.css (margin/font/colour/background), so
 *   the W01 inline style block is gone rather than competing with it.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Mount data-grc + load globals.css (Phase W19) — design system lands
 *   - 2026-08-08: Initial creation (Phase W01)
 *
 * Related:
 *   - apps/web/src/app/globals.css — load order and the font decisions
 */
import type { ReactNode } from 'react';

import './globals.css';

export const metadata = {
  title: 'APAC ISMS Governance Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant" data-grc data-theme="light">
      <body>{children}</body>
    </html>
  );
}
