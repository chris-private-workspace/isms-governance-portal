/**
 * File: apps/api/src/bootstrap/security.ts
 * Purpose: Every response-header and CORS decision the API makes, in one place
 *   that a test can call.
 * Category: bootstrap (NOT a scope — it configures the app, it is not domain code)
 * Scope: CH-012
 * Owner: docs/02-architecture/16-secure-development-dod.md §Transport / §Security headers
 *
 * Description:
 *   Extracted from main.ts so `security.spec.ts` can assert the headers against
 *   `16` item by item. It was previously inline in the composition root, where
 *   the only way to check it was to start the server and read a curl dump by
 *   eye — which is how `Permissions-Policy` stayed missing through all of W01
 *   (`16:21` requires it; helmet does not provide it).
 *
 *   `04:93` is why every option is spelled out instead of taking a default:
 *   none of the organisation's 45 web findings was an injection bug — every one
 *   came from an inherited default.
 *
 * Key Components:
 *   - PERMISSIONS_POLICY: the one header helmet has no option for
 *   - applySecurity(app): the whole surface; main.ts and the spec both call it
 *
 * Created: 2026-08-09 (CH-012)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Initial creation (CH-012) — extracted from main.ts, plus Permissions-Policy
 */
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * The slice of the Express response this file touches, stated structurally.
 *
 * Importing express's types would mean adding @types/express for one method —
 * a dependency, a version to keep in step with the one @nestjs/platform-express
 * pins, and another package in the SCA surface. This says exactly what is used
 * and nothing else.
 */
type HeaderWritable = { setHeader(name: string, value: string): void };

/**
 * Kept identical to apps/web/next.config.ts. Two services answering the same
 * browser should not disagree about what that browser may do; if these ever
 * need to differ, that is a decision to write down, not a drift to discover.
 */
export const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=()';

/**
 * Apply every transport-level security decision.
 *
 * Call before `listen()`. Nothing here depends on the database or on any scope
 * module, which is what lets the spec exercise it against a bare app.
 */
export function applySecurity(app: INestApplication): void {
  // `16:18` — no version disclosure. Helmet removes X-Powered-By on its own,
  // so this line is belt to helmet's braces; guardrail 7 asks for the explicit
  // statement rather than the inherited behaviour.
  //
  // ⚠️ Do NOT "simplify" this by passing an xPoweredBy option to helmet. That
  // is not a helmet option (its own is hidePoweredBy), and passing it does not
  // error — it silently turns the default protection OFF. Measured in CH-012:
  //     helmet()                     -> X-Powered-By absent
  //     helmet({ xPoweredBy: false }) -> X-Powered-By: Express
  //     helmet({ noSniff, frameguard }) -> X-Powered-By absent
  // W01 shipped the middle one and the header was live until it was read off
  // the wire. security.spec.ts now fails on exactly that mistake.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Explicit, not inherited. `04:93`: platform defaults are the risk.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          // `16:20` asks for frame-ancestors 'self'. 'none' is strictly
          // narrower and this API is never framed, so it satisfies the intent.
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: false },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // `16:21` requires Permissions-Policy alongside the three helmet does set.
  // Helmet has no option for it, so it is set directly — the gap this closes
  // survived W01 precisely because nothing enumerated `16` against the wire.
  app.use((_request: unknown, response: HeaderWritable, next: () => void) => {
    response.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    next();
  });

  // One named origin. Never `origin: true`, which reflects whatever asked.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? `http://localhost:${process.env.WEB_PORT ?? '3200'}`,
    credentials: true,
  });
}
