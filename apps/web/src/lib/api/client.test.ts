/**
 * File: apps/web/src/lib/api/client.test.ts
 * Purpose: The write verb's four answers stay four answers — refusal is not an outage.
 * Category: ui / test
 * Scope: Phase W26
 *
 * Description:
 *   patch() is the shape every future write screen in this app will inherit, so
 *   the assertions that matter are the ones about the failure branches rather
 *   than the happy path: 422 must arrive as a refusal carrying its alternatives,
 *   404 must arrive as an answer, and everything else must arrive as an outage.
 *
 *   ⭐ THE LAST TEST IS THE ONE THAT MAKES THE OTHERS MEAN ANYTHING. Every
 *   assertion here about status codes passes unchanged if patch() sends GET with
 *   no body, because the mock answers whatever it is asked. `sends a PATCH` is
 *   what binds this file to the verb in its own name.
 *
 * Created: 2026-08-21 (Phase W26)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Initial creation (Phase W26) — CH-048
 *
 * Related:
 *   - apps/api/src/modules/policy/policy.controller.ts:186-191 — the 422 body
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRefusedError, ApiUnavailableError, patch } from './client';

const fetchMock = vi.fn();

/** A Response with only the members client.ts actually reads. */
const answer = (status: number, body: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as Response;

/** A response whose body is not JSON — `json()` rejects, as the real one does. */
const unparseable = (status: number): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: (): Promise<unknown> =>
      Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')),
  }) as Response;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('patch() tells the server three answers apart', () => {
  it('returns the envelope when the server performed the change', async () => {
    fetchMock.mockResolvedValue(answer(200, { data: { id: 'a', status: 'approved' } }));

    const result = await patch<{ id: string; status: string }>('/policies/a/status', {
      to: 'approved',
    });

    expect(result?.data.status).toBe('approved');
  });

  it('raises a REFUSAL, not an outage, when the server answers 422', async () => {
    fetchMock.mockResolvedValue(
      answer(422, {
        message: 'a policy in draft cannot move to published',
        from: 'draft',
        to: 'published',
        allowed: ['in_review'],
      }),
    );

    // ⚠️ Not `.rejects.toThrow(ApiRefusedError)`: that passes for any subclass
    // relationship and says nothing about the fields, which are the whole point.
    const error = await patch('/policies/a/status', { to: 'published' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRefusedError);
    const refusal = error as ApiRefusedError;
    expect(refusal.from).toBe('draft');
    expect(refusal.to).toBe('published');
    expect(refusal.allowed).toEqual(['in_review']);
    expect(refusal.detail).toContain('cannot move to published');
  });

  it('resolves null on 404 — an answer, not a failure', async () => {
    fetchMock.mockResolvedValue(answer(404, { message: 'policy a not found' }));

    await expect(patch('/policies/a/status', { to: 'approved' })).resolves.toBeNull();
  });

  it('raises an outage for any other non-ok status', async () => {
    fetchMock.mockResolvedValue(answer(500, { message: 'boom' }));

    await expect(patch('/policies/a/status', { to: 'approved' })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
  });

  it('raises an outage when the request never reached a server', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(patch('/policies/a/status', { to: 'approved' })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );
  });

  it('stays a refusal when the 422 body does not parse', async () => {
    fetchMock.mockResolvedValue(unparseable(422));

    // A proxy that rewrites the body still leaves the status code intact, and
    // the status code is the part that says the server decided rather than fell
    // over. Degrading to ApiUnavailableError here would have the screen offer
    // "check the API is running" for a deliberate governance refusal.
    const error = await patch('/policies/a/status', { to: 'published' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRefusedError);
    expect((error as ApiRefusedError).allowed).toEqual([]);
    expect((error as ApiRefusedError).from).toBeNull();
  });

  it('sends a PATCH carrying the body as JSON', async () => {
    fetchMock.mockResolvedValue(answer(200, { data: {} }));

    await patch('/policies/a/status', { to: 'approved' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/policies/a/status');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe(JSON.stringify({ to: 'approved' }));
    expect(init.cache).toBe('no-store');
  });
});
