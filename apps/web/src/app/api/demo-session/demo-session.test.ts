/**
 * @vitest-environment node
 */

/**
 * File: apps/web/src/app/api/demo-session/demo-session.test.ts
 * Purpose: Turns three claims about the session cookie into a gate.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   The route's header asserts httpOnly, sameSite and secure. An assertion in
 *   a comment protects nothing — a later edit that drops a flag reads exactly
 *   the same, type-checks, lints, and ships a session cookie readable from
 *   JavaScript. So the flags are asserted here against the real Set-Cookie
 *   header the handler produces.
 *
 *   The unknown-persona case is checked too, and for its STATUS as well as its
 *   refusal: 404 rather than 400, so a caller cannot tell an id that does not
 *   exist from one it is not allowed to have. That is the same rule guardrail
 *   4 sets for scoped records, and it is only worth writing down if something
 *   watches it.
 *
 *   Runs in the `node` environment, not the suite default. `demo-session.ts`
 *   imports `server-only`, which throws the moment a browser-conditioned
 *   resolver reaches it — under jsdom that is every time. The failure is the
 *   guard doing its job: this module must never end up in a client bundle.
 *

 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { describe, expect, it } from 'vitest';

import { PERSONAS } from '@/lib/personas';

import { DELETE, POST } from './route';

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/demo-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('demo session cookie', () => {
  it('sets httpOnly, SameSite and Secure on sign-in', async () => {
    const response = await post({ persona: PERSONAS[0]?.id });
    const header = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
    // NODE_ENV is 'test' here, which is not 'development', so Secure is on.
    expect(header).toMatch(/Secure/i);
  });

  it('carries only the persona id, never a name, email or role', async () => {
    const persona = PERSONAS[2];
    const response = await post({ persona: persona?.id });
    const header = response.headers.get('set-cookie') ?? '';

    expect(header).toContain(persona?.id);
    expect(header).not.toContain(persona?.name);
    expect(header).not.toContain(persona?.email);
    expect(header).not.toContain(persona?.scope);
  });

  it('answers 404 for an id nobody issued', async () => {
    const response = await post({ persona: 'chief-executive' });
    expect(response.status).toBe(404);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('answers 404 for a malformed body rather than throwing', async () => {
    const response = await POST(
      new Request('http://localhost/api/demo-session', { method: 'POST', body: 'not json' }),
    );
    expect(response.status).toBe(404);
  });

  it('expires the cookie on sign-out', async () => {
    const response = await DELETE();
    const header = response.headers.get('set-cookie') ?? '';

    expect(header).toMatch(/Max-Age=0/i);
    expect(header).toMatch(/HttpOnly/i);
  });
});
