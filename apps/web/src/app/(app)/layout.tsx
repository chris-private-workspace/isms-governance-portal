/**
 * File: apps/web/src/app/(app)/layout.tsx
 * Purpose: Wraps every in-product screen in the nav rail + topbar, for a known seat.
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
 *   It is also the gate. The persona is read from the session cookie HERE, on
 *   the server, and a request without one is redirected rather than handed a
 *   default seat. That ordering is the point: guardrail 4 says entity identity
 *   comes from the session and never from a request parameter, and the way to
 *   honour it is for the client to have no say in the matter. An unknown
 *   persona id resolves to nobody, so a hand-edited cookie buys nothing.
 *
 *   Reading a cookie makes every screen under this group dynamic. That is the
 *   correct trade — a statically prerendered page cannot be scoped to a seat,
 *   and pretending otherwise is how scoping bugs reach production.
 *
 *   Thin otherwise. The shell is a client component because it owns rail
 *   collapse, theme, locale and menu state; keeping this file a server
 *   component means the boundary sits at exactly one place.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Resolve the persona server-side and gate on it (Phase W19)
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - apps/web/src/lib/demo-session.ts
 */
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/shell/AppShell';
import { readPersonaId } from '@/lib/demo-session';
import { findPersona } from '@/lib/personas';

export default async function InProductLayout({ children }: { children: ReactNode }) {
  const persona = findPersona(await readPersonaId());

  if (!persona) redirect('/login');

  return <AppShell persona={persona}>{children}</AppShell>;
}
