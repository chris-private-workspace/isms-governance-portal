/**
 * File: apps/api/src/bootstrap/security.spec.ts
 * Purpose: Assert the response headers against `16`, item by item, on the wire.
 * Category: Test
 * Scope: CH-012
 * Owner: docs/02-architecture/16-secure-development-dod.md
 *
 * Description:
 *   The assertion list is transcribed from `16`, not from what applySecurity
 *   currently sets. Written the other way round it would only restate the
 *   implementation and could never fail — which is how `Permissions-Policy`
 *   survived W01: the manual curl walkthrough checked "are the headers I
 *   configured present", never "is every header `16` requires present".
 *
 *   Boots a bare app on an ephemeral port and reads real responses, rather than
 *   inspecting the helmet options object. W01 proved the difference is not
 *   academic: `xPoweredBy: false` was set, and `X-Powered-By: Express` was
 *   still on the wire.
 *
 *   No supertest — @nestjs/testing plus Node's global fetch cover it, and a
 *   dependency bought only syntax sugar would still enlarge the SCA surface.
 *
 * Created: 2026-08-09 (CH-012)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (CH-012)
 */
import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PERMISSIONS_POLICY, applySecurity } from './security';

@Controller('probe')
class ProbeController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

const ALLOWED_ORIGIN = 'http://localhost:3200';
const HOSTILE_ORIGIN = 'https://not-our-frontend.example';

describe('applySecurity', () => {
  let app: INestApplication;
  let url: string;
  let headers: Headers;

  beforeAll(async () => {
    process.env.WEB_ORIGIN = ALLOWED_ORIGIN;
    app = await NestFactory.create(ProbeModule, { logger: false });
    applySecurity(app);
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/probe`;
    headers = (await fetch(url)).headers;
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  // `16:2` — Strict-Transport-Security issued on all responses.
  it('issues HSTS with at least a one-year max-age', () => {
    const hsts = headers.get('strict-transport-security');

    expect(hsts).toContain('includeSubDomains');
    expect(Number(/max-age=(\d+)/.exec(hsts ?? '')?.[1])).toBeGreaterThanOrEqual(31_536_000);
  });

  // `16:18` — fingerprinting headers removed. X-Powered-By is the one that
  // survived being "configured off" in W01, so it is asserted absent, not empty.
  it.each(['x-powered-by', 'server', 'x-aspnet-version', 'x-aspnetmvc-version'])(
    'does not disclose %s',
    (header) => {
      expect(headers.get(header)).toBeNull();
    },
  );

  // `16:20` — CSP implemented, including frame-ancestors. We send 'none', which
  // is narrower than the 'self' the checklist asks for.
  it('sends a CSP that forbids framing', () => {
    const csp = headers.get('content-security-policy');

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'none'");
  });

  // `16:21` — all four present. Permissions-Policy is the one helmet does not
  // provide; before CH-012 it was absent while the other three were fine.
  it.each([
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['permissions-policy', PERMISSIONS_POLICY],
    ['referrer-policy', 'no-referrer'],
  ])('sets %s', (header, expected) => {
    expect(headers.get(header)).toBe(expected);
  });

  describe('CORS', () => {
    it('names one origin rather than reflecting the caller', async () => {
      const response = await fetch(url, { headers: { Origin: HOSTILE_ORIGIN } });
      const allowed = response.headers.get('access-control-allow-origin');

      expect(allowed).not.toBe(HOSTILE_ORIGIN);
      expect(allowed).not.toBe('*');
      expect(allowed).toBe(ALLOWED_ORIGIN);
    });

    it('admits the configured frontend', async () => {
      const response = await fetch(url, { headers: { Origin: ALLOWED_ORIGIN } });

      expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
    });
  });
});
