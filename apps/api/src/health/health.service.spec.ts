/**
 * File: apps/api/src/health/health.service.spec.ts
 * Purpose: Proves the health probe reports BOTH outcomes, not just the happy one.
 * Category: Test
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   The negative case is the point. AP-3's detection question is "what breaks
 *   if you switch this off" — for a health check the answer must be "it starts
 *   saying down". A test that only asserts 'up' would pass just as happily
 *   against a hardcoded constant.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Double PrismaService.probe() instead of $queryRaw (Phase W02)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { HealthService } from './health.service';
import type { PrismaService } from '../core-model/prisma.service';

function serviceWith(probe: () => Promise<unknown>): HealthService {
  return new HealthService({ probe } as unknown as PrismaService);
}

describe('HealthService', () => {
  it('reports db up when the probe query succeeds', async () => {
    const service = serviceWith(() => Promise.resolve([{ '?column?': 1 }]));

    await expect(service.check()).resolves.toEqual({ status: 'up', db: 'up' });
  });

  it('reports db down — and keeps the API up — when the probe query throws', async () => {
    const service = serviceWith(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(service.check()).resolves.toEqual({ status: 'up', db: 'down' });
  });

  it('does not cache: a recovered database flips the answer back', async () => {
    let fail = true;
    const service = serviceWith(() =>
      fail ? Promise.reject(new Error('ECONNREFUSED')) : Promise.resolve([]),
    );

    await expect(service.check()).resolves.toMatchObject({ db: 'down' });
    fail = false;
    await expect(service.check()).resolves.toMatchObject({ db: 'up' });
  });
});
