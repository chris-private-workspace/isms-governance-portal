import 'server-only';

/**
 * File: apps/web/src/lib/demo-session.ts
 * Purpose: The demo persona session — cookie shape, and the switch that keeps it out of production.
 * Category: identity (demo scaffold only)
 * Scope: Phase W19
 *
 * Description:
 *   W19 needs a way to enter the product as somebody, so the roll-up can be
 *   shown from a Regional ISO's seat and from one OpCo's. It is NOT
 *   authentication and must never be mistaken for it. Real auth is Entra ID
 *   (ADR-0001) with no local credential store (ADR-0007); nothing here
 *   verifies anything.
 *
 *   What is deliberately absent, because a demo is exactly where these creep
 *   in: no password is accepted anywhere, no credential is stored, nothing is
 *   written to localStorage or sessionStorage, and the cookie carries a
 *   persona id — not a name, an email, a role or an entity. Those are looked
 *   up server-side from the id, so a client cannot widen its own scope by
 *   editing the cookie to a value it invented. Guardrail 4 says entity
 *   identity comes from the session and never from a request parameter; that
 *   is enforceable even in a fixture, so it is enforced.
 *
 *   THE PRODUCTION GUARD IS AT REQUEST TIME, NOT MODULE LOAD, and the reason
 *   matters: `next build` itself runs with NODE_ENV=production, so a top-level
 *   throw would fail every production build rather than protect anything. The
 *   check runs where a request does, and production has to opt in explicitly
 *   through DEMO_AUTH — silence is refusal. The W20 demo deployment therefore
 *   has to set that variable on purpose, which is the point.
 *
 * Key Components:
 *   - assertDemoAuthAllowed: refuses to serve demo sessions unless invited
 *   - readPersonaId / SESSION_COOKIE: the cookie contract, one place
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/14-adr/ — ADR-0007, no local credential store
 *   - apps/web/src/lib/personas.ts — the six seats this hands out
 */

import { cookies } from 'next/headers';

/** Named once so the route, the layout and the sign-out path cannot drift. */
export const SESSION_COOKIE = 'isms_demo_persona';

/**
 * Refuse to hand out a demo session in production unless someone asked for it.
 *
 * Throws rather than returning false: a caller that forgets to check a boolean
 * gets a working demo login in production, which is the failure this exists to
 * prevent. An exception cannot be ignored by omission.
 */
export function assertDemoAuthAllowed(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.DEMO_AUTH === 'enabled') return;

  throw new Error(
    'Demo persona sessions are disabled in production builds. ' +
      'Set DEMO_AUTH=enabled to run a demonstration deployment deliberately.',
  );
}

/** True when the demo session may be served, without throwing. For layouts. */
export function demoAuthAllowed(): boolean {
  try {
    assertDemoAuthAllowed();
    return true;
  } catch {
    return false;
  }
}

/**
 * The persona id on this request, or null.
 *
 * Reads the cookie and nothing else — never a query string, never a header a
 * client controls, never a body. The caller resolves the id to a persona; an
 * unknown id resolves to nobody rather than to a default seat.
 */
export async function readPersonaId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
