/**
 * File: apps/web/src/app/(app)/layout.tsx
 * Purpose: Wraps every in-product screen in the nav rail + topbar.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   A route GROUP, so the shell applies to the product screens without
 *   putting a segment in their URLs — /dashboard, not /app/dashboard.
 *
 *   Screens that must render WITHOUT the shell stay outside this group:
 *   /login is full-bleed by design (the fragment is literally named
 *   01-auth-full-screen-no-shell).
 *
 *   Thin on purpose. The shell is a client component because it owns rail
 *   collapse, theme, locale and menu state; keeping this file a server
 *   component means the boundary sits at exactly one place.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import type { ReactNode } from 'react';

import { AppShell } from '@/components/shell/AppShell';

export default function InProductLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
