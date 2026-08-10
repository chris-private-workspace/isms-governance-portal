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
import type { ExtensionField, Policy } from '../generated/prisma';
import { ExtensionValidationError } from './extension-validator';
import { PolicyRepository, type CreatePolicyInput } from './policy.repository';
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
}

function recordingClient(catalog: ExtensionField[]): Recorder {
  const createCalls: unknown[] = [];
  const catalogQueries: unknown[] = [];

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
    },
    extensionField: {
      findMany: async (args) => {
        catalogQueries.push(args);
        return catalog;
      },
    },
  };

  return { client, createCalls, catalogQueries };
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
});
