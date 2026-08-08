/**
 * File: apps/api/src/health/health.controller.spec.ts
 * Purpose: Proves the endpoint hands back the probe's real answer, including 'down'.
 * Category: Test
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   health.service.spec.ts proves the probe itself reports both outcomes. This
 *   file covers the layer above it, where a different Potemkin lives: a
 *   controller that calls the service and then returns its own optimistic
 *   payload would pass any test that only asserts the happy path, and the
 *   drive-through would only catch it if the database happened to be down at
 *   that moment.
 *
 *   It compiles the real HealthModule with PrismaService swapped out, so the
 *   module's own wiring — controller registered, service resolvable — is
 *   exercised rather than asserted about.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthModule } from './health.module';
import { PrismaService } from '../core-model/prisma.service';

async function controllerWith(queryRaw: () => Promise<unknown>): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({ imports: [HealthModule] })
    .overrideProvider(PrismaService)
    .useValue({ $queryRaw: queryRaw })
    .compile();

  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('resolves from the module and answers up when the probe succeeds', async () => {
    const controller = await controllerWith(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(controller.check()).resolves.toEqual({ status: 'up', db: 'up' });
  });

  it('passes the down state through instead of substituting its own', async () => {
    const controller = await controllerWith(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(controller.check()).resolves.toEqual({ status: 'up', db: 'down' });
  });
});
