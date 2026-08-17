/**
 * File: apps/web/src/app/api/demo-session/route.ts
 * Purpose: Sets and clears the demo persona cookie. The only writer of it.
 * Category: identity (demo scaffold only)
 * Scope: Phase W19
 *
 * Description:
 *   POST takes a persona id, checks it against the six seats, and sets the
 *   cookie. DELETE clears it. There is no password, no token, no credential of
 *   any kind in either direction, and nothing is persisted anywhere else.
 *
 *   The cookie is httpOnly, sameSite=lax and secure outside development. Those
 *   three are not decoration on a demo: guardrail 1 says this platform must
 *   pass the controls it exists to enforce, and a session cookie readable from
 *   JavaScript would fail its own audit. `secure` is conditional only so the
 *   cookie works over plain http on localhost — every deployed environment is
 *   https, so every deployed environment gets it.
 *
 *   An unknown persona id is rejected with 404 rather than 400. Guardrail 4's
 *   rule for scoped records is that a miss is indistinguishable from a
 *   forbidden hit; the same reasoning applies here, and it costs nothing to be
 *   consistent with the rule the rest of the platform will follow.
 *
 * Key Components:
 *   - POST: issue a session for one of the six seats
 *   - DELETE: sign out
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - apps/web/src/lib/demo-session.ts — cookie name and the production guard
 */

import { NextResponse } from 'next/server';

import { assertDemoAuthAllowed, SESSION_COOKIE } from '@/lib/demo-session';
import { findPersona } from '@/lib/personas';

export async function POST(request: Request) {
  assertDemoAuthAllowed();

  const body: unknown = await request.json().catch(() => null);
  const id =
    body && typeof body === 'object' && 'persona' in body && typeof body.persona === 'string'
      ? body.persona
      : null;

  if (!findPersona(id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, id as string, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return response;
}

export async function DELETE() {
  assertDemoAuthAllowed();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
    path: '/',
    maxAge: 0,
  });

  return response;
}
