/**
 * File: apps/api/src/bootstrap/main.ts
 * Purpose: Composition root — boots Nest, sets security headers explicitly, opens the port.
 * Category: bootstrap (NOT a scope — it wires scopes together)
 * Scope: Phase W01 (M0)
 * Owner: docs/02-architecture/04-security-by-design.md §93
 *
 * Description:
 *   Assembles the app in four steps: create, apply security, mount Swagger,
 *   listen. The security step is delegated to `./security`, so that it can be
 *   asserted by a test rather than inspected by eye (CH-012).
 *
 *   The listen address defaults to loopback, so a laptop running `npm run dev`
 *   does not publish the API to its whole network; the container image
 *   overrides it to 0.0.0.0.
 *
 * Key Components:
 *   - bootstrap(): assembles the app and opens the port
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Extract security config to ./security (CH-012)
 *   - 2026-08-08: Initial creation (Phase W01)
 *
 * Related:
 *   - docs/02-architecture/16-secure-development-dod.md (transport + headers)
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { applySecurity } from './security';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Every header and CORS decision lives in security.ts, where security.spec.ts
  // asserts it against `16` item by item. Inline here, the only available check
  // was reading a curl dump by eye — which is how Permissions-Policy stayed
  // missing for the whole of W01.
  applySecurity(app);

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
