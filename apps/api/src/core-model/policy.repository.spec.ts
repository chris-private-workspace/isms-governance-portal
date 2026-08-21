/**
 * File: apps/api/src/core-model/policy.repository.spec.ts
 * Purpose: Prove the repository cannot write without consulting the catalog first.
 * Category: core-model
 * Scope: Phase W03
 *
 * Description:
 *   Two claims are worth a test here, and both are negative:
 *
 *     1. an invalid extension never reaches the database. The catalog read still
 *        happens (it is what validation needs), but `policy.create` must not be
 *        called — the same shape as W02's empty-scope guard, which refuses
 *        BEFORE operation() rather than letting the database refuse.
 *     2. the catalog is read through the SAME client as the write. Reading it
 *        through anything else would validate against a field list the caller
 *        may not be entitled to.
 *
 *   The client is a recording double: the repository declared a structural
 *   shape, so a plain object satisfies it and no PostgreSQL is involved.
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 */
import type { ExtensionField, OrgEntity, Policy, RefCodeCounter } from '../generated/prisma';
import { ExtensionValidationError } from './extension-validator';
import { PolicyRepository, type CreatePolicyInput } from './policy.repository';
import { ScopeRefusedError } from './scope-refusal';
import type { ScopedPolicyClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

function catalogRow(over: Partial<ExtensionField> = {}): ExtensionField {
  return {
    id: 'f-1',
    orgEntityId: null,
    entityType: 'policy',
    key: 'reviewCycle',
    dataType: 'string',
    required: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    retiredAt: null,
    ...over,
  } as ExtensionField;
}

interface Recorder {
  client: ScopedPolicyClient;
  createCalls: unknown[];
  catalogQueries: unknown[];
  /** W04: every allocation attempt, so a rejected write can be shown not to burn one. */
  counterUpserts: unknown[];
  /** W25: every transition attempt, so the compare-and-set WHERE can be inspected. */
  updateCalls: unknown[];
}

function recordingClient(catalog: ExtensionField[]): Recorder {
  const createCalls: unknown[] = [];
  const catalogQueries: unknown[] = [];
  const counterUpserts: unknown[] = [];
  const updateCalls: unknown[] = [];

  const client: ScopedPolicyClient = {
    policy: {
      findMany: async (args) => {
        void args;
        return [] as Policy[];
      },
      create: async (args) => {
        createCalls.push(args);
        return { id: 'p-1', ...(args.data as object) } as unknown as Policy;
      },
      // W25: the delegate the transition needs. Tests that care override it, the
      // way every other method here is overridden.
      update: async (args) => {
        updateCalls.push(args);
        return { id: 'p-1', ...(args.data as object) } as unknown as Policy;
      },
    },
    extensionField: {
      findMany: async (args) => {
        catalogQueries.push(args);
        return catalog;
      },
    },
    refCodeCounter: {
      upsert: async (args) => {
        counterUpserts.push(args);
        return { orgEntityId: SG1, entityType: 'policy', lastSeq: 7 } as RefCodeCounter;
      },
    },
    orgEntity: {
      findUnique: async (args) => {
        void args;
        return { id: SG1, code: 'SG1' } as OrgEntity;
      },
    },
  };

  return { client, createCalls, catalogQueries, counterUpserts, updateCalls };
}

const input: CreatePolicyInput = { orgEntityId: SG1, title: 'Access Control' };

describe('PolicyRepository', () => {
  const repo = new PolicyRepository();

  it('lists without adding an entity filter — the client carries the scope', async () => {
    const { client } = recordingClient([]);
    const seen: unknown[] = [];
    client.policy.findMany = async (args) => {
      seen.push(args);
      return [];
    };

    await repo.list(client);

    expect(seen).toHaveLength(1);
    expect(JSON.stringify(seen[0])).not.toContain('orgEntityId');
  });

  it('writes a policy with no extensions', async () => {
    const { client, createCalls } = recordingClient([]);

    await repo.create(client, input);

    expect(createCalls).toHaveLength(1);
  });

  it('reads the catalog through the same client, filtered to this entity type', async () => {
    const { client, catalogQueries } = recordingClient([catalogRow()]);

    await repo.create(client, { ...input, extensions: { reviewCycle: 'annual' } });

    expect(catalogQueries).toHaveLength(1);
    expect(catalogQueries[0]).toMatchObject({
      where: { entityType: 'policy', retiredAt: null },
    });
  });

  // ---- W04: the reference code is issued, never accepted ----

  it('stamps a ref_code the caller had no way to supply', async () => {
    const { client, createCalls } = recordingClient([]);

    await repo.create(client, input);

    // 000007 is the double's lastSeq, so this also proves the value came from
    // the counter rather than from anything in the input.
    expect(createCalls[0]).toMatchObject({ data: { refCode: 'POL-SG1-000007' } });
    expect(JSON.stringify(input)).not.toContain('refCode');
  });

  it('does not burn a reference number when validation rejects the payload', async () => {
    const { client, counterUpserts } = recordingClient([catalogRow()]);

    await expect(
      repo.create(client, { ...input, extensions: { notDeclared: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    // Ordering, asserted rather than assumed: validate first, allocate second.
    // Reversed, every rejected payload would leave a hole in the sequence — a
    // defect no test that only checks the rejection would ever notice.
    expect(counterUpserts).toHaveLength(0);
  });

  // ---- the load-bearing negative ----

  it('never calls create when an extension key is undeclared', async () => {
    const { client, createCalls } = recordingClient([catalogRow()]);

    await expect(
      repo.create(client, { ...input, extensions: { notDeclared: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    // The point of the test: not merely that it threw, but that nothing was
    // written. A repository that wrote first and validated after would also
    // "throw" and would also pass a test that only asserted rejection.
    expect(createCalls).toHaveLength(0);
  });

  it('never calls create when a required field is missing', async () => {
    const { client, createCalls } = recordingClient([catalogRow({ key: 'owner', required: true })]);

    await expect(repo.create(client, input)).rejects.toThrow(/required extension field/);
    expect(createCalls).toHaveLength(0);
  });

  // ---- translating what the database refused ----

  it('turns a refused insert into a scope error naming only what the caller sent', async () => {
    const { client } = recordingClient([]);
    client.policy.create = async () => {
      throw { code: 'P2039', meta: { driverAdapterError: { cause: { code: '42501' } } } };
    };

    const error = await repo.create(client, input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScopeRefusedError);
    expect((error as ScopeRefusedError).orgEntityId).toBe(SG1);
  });

  it('leaves an outage alone — only 42501 is an authorisation outcome', async () => {
    const { client } = recordingClient([]);
    const boom = new Error('connection lost');
    client.policy.create = async () => {
      throw boom;
    };

    // The distinction is the whole point: swallowing this one would file a real
    // failure as "not found" and hide it from anyone watching error rates.
    await expect(repo.create(client, input)).rejects.toBe(boom);
  });

  // === W25: the transition path ===========================================

  it('puts the observed status in the WHERE clause, not in a prior check', async () => {
    // ⭐ THE LOAD-BEARING ASSERTION OF THE WHOLE TRANSITION DESIGN. If `expected`
    // moved out of `where` and into an `if` above the write, this test still
    // reads sensibly while the operation stops being atomic — so it asserts the
    // location, not merely the outcome.
    const { client, updateCalls } = recordingClient([]);

    await repo.transitionStatus(client, { id: 'p-1', expected: 'draft', next: 'in_review' });

    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).toMatchObject({
      where: { id: 'p-1', status: 'draft', retiredAt: null },
      data: { status: 'in_review' },
    });
  });

  it('returns null when the row moved, vanished, or was never in scope', async () => {
    const { client } = recordingClient([]);
    client.policy.update = async () => {
      // What Prisma raises when `where` matched nothing.
      throw { code: 'P2025', meta: { cause: 'Record to update not found.' } };
    };

    // Null, not an error: all three reasons are the same answer to the caller,
    // and the controller turns it into the same 404 a missing policy gets.
    await expect(
      repo.transitionStatus(client, { id: 'p-1', expected: 'draft', next: 'in_review' }),
    ).resolves.toBeNull();
  });

  it('translates a scope-refused transition rather than leaking a driver error', async () => {
    const { client } = recordingClient([]);
    client.policy.update = async () => {
      throw { code: 'P2039', meta: { driverAdapterError: { cause: { code: '42501' } } } };
    };

    const error = await repo
      .transitionStatus(client, { id: 'p-1', expected: 'draft', next: 'in_review' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ScopeRefusedError);
  });

  it('leaves an outage alone on the transition path too', async () => {
    const { client } = recordingClient([]);
    const boom = new Error('connection lost');
    client.policy.update = async () => {
      throw boom;
    };

    await expect(
      repo.transitionStatus(client, { id: 'p-1', expected: 'draft', next: 'in_review' }),
    ).rejects.toBe(boom);
  });

  it('reads one policy by id without naming an entity', async () => {
    const { client } = recordingClient([]);
    const seen: unknown[] = [];
    client.policy.findMany = async (args) => {
      seen.push(args);
      return [{ id: 'p-1', status: 'draft' } as Policy];
    };

    await expect(repo.byId(client, 'p-1')).resolves.toMatchObject({ id: 'p-1' });
    expect(JSON.stringify(seen[0])).not.toContain('orgEntityId');
  });

  it('returns null for a policy the scoped client cannot see', async () => {
    const { client } = recordingClient([]);

    // The default double returns no rows — which is exactly what a scoped client
    // returns for another entity's policy. Absent and out-of-scope are one thing.
    await expect(repo.byId(client, 'p-1')).resolves.toBeNull();
  });
});
