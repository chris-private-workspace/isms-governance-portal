/**
 * File: apps/api/src/bootstrap/main.ts
 * Purpose: Composition root — boots Nest, sets security headers explicitly, opens the port.
 * Category: bootstrap (NOT a scope — it wires scopes together)
 * Scope: Phase W01 (M0)
 * Owner: docs/02-architecture/04-security-by-design.md §93
 *
 * Description:
 *   Three things happen here and each is a guardrail-7 obligation rather than
 *   boilerplate. (1) Helmet is configured field by field, because `04:93`
 *   records that none of the organisation's 45 scan findings was an injection
 *   bug — every one was an inherited default. (2) CORS names one origin
 *   instead of reflecting the request's. (3) The listen address defaults to
 *   loopback, so a laptop running `npm run dev` does not publish the API to
 *   its whole network; the container image overrides it to 0.0.0.0.
 *
 * Key Components:
 *   - bootstrap(): assembles the app; every security decision is visible here
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 *
 * Related:
 *   - docs/02-architecture/16-secure-development-dod.md (transport + headers)
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Explicit, not inherited. `04:93`: platform defaults are the risk.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
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
      xPoweredBy: false,
    }),
  );

  // One named origin. Never `origin: true`, which reflects whatever asked.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? `http://localhost:${process.env.WEB_PORT ?? '3200'}`,
    credentials: true,
  });

  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('APAC ISMS Governance Platform API')
        .setDescription('API-first contract layer (05:33). The UI is just another client.')
        .setVersion('0.0.0')
        .build(),
    ),
  );

  const port = Number(process.env.API_PORT ?? 3210);
  const host = process.env.API_HOST ?? '127.0.0.1';
  await app.listen(port, host);

  // Startup log line used as evidence during clean restarts (Risk Class C).
  console.log(`[isms-api] listening on http://${host}:${port} (api-docs at /api-docs)`);
}

void bootstrap();
