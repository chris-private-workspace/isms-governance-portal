/**
 * File: apps/api/src/core-model/prisma.service.spec.ts
 * Purpose: Covers the construction guard and the two lifecycle hooks.
 * Category: Test
 * Scope: Phase W01 (M0)
 *
 * Description:
 *   The guard is the test worth having. Its whole reason for existing is that
 *   a client pointing nowhere turns a configuration mistake into an
 *   intermittent runtime one — so the failure has to happen at construction,
 *   loudly, and that is only true as long as something checks.
 *
 *   The lifecycle assertions are thinner by nature, but they are what stands
 *   between `onModuleInit` and a rename that leaves the pool unconnected until
 *   the first query. They stub the connection's methods rather than calling
 *   through, so the suite needs no database.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-09
 *
 * Modification History (newest-first):
 *   - 2026-08-09: Follow the connection/probe split (Phase W02)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { PrismaService } from './prisma.service';

const VALID_URL = 'postgresql://u:p@127.0.0.1:5433/db?schema=public';

describe('PrismaService', () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it('throws at construction when DATABASE_URL is absent', () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService()).toThrow(/DATABASE_URL is not set/);
  });

  it('constructs when DATABASE_URL is present', () => {
    process.env.DATABASE_URL = VALID_URL;

    expect(() => new PrismaService()).not.toThrow();
  });

  it('connects on module init and disconnects on destroy', async () => {
    process.env.DATABASE_URL = VALID_URL;
    const service = new PrismaService();
    const connect = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    const disconnect = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
    Object.assign(service.connection, { $connect: connect, $disconnect: disconnect });

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('is not itself a queryable client — a table is not one property away', () => {
    process.env.DATABASE_URL = VALID_URL;
    const service = new PrismaService();

    // W02 stopped this class extending PrismaClient. If it ever extends it
    // again, every injector regains an unscoped `.policy.findMany()` and
    // guardrail 4's application half is gone without a single test turning red
    // — so this asserts the absence directly.
    expect((service as unknown as Record<string, unknown>).policy).toBeUndefined();
    expect((service as unknown as Record<string, unknown>).$queryRaw).toBeUndefined();
  });
});
