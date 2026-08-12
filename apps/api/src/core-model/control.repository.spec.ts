/**
 * File: apps/api/src/core-model/control.repository.spec.ts
 * Purpose: The fields the insert must never contain, and the order it must do things in.
 * Category: Test (unit)
 * Scope: Phase W06
 *
 * Description:
 *   control.int.spec.ts proves the database half. What only a unit test can show
 *   is what this layer CHOOSES to send — and here the interesting part is what it
 *   refuses to send even when a caller insists:
 *
 *     - `applies_to_scope` never appears in the insert, so the column default
 *       decides. A caller passing one gets it dropped here rather than refused by
 *       the database, which matters because the two are indistinguishable from
 *       outside and only one of them is what ADR-0014 decided.
 *     - `effectiveness` likewise — 02a:217 says it comes from the latest test.
 *     - validation happens BEFORE a reference code is allocated.
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 */
import { ControlRepository } from './control.repository';
import { ExtensionValidationError } from './extension-validator';
import { ScopeRefusedError } from './scope-refusal';
import type { ScopedControlClient } from './scoped-client.types';

const SG1 = '00000000-0000-0000-0000-0000000000c0';

const INPUT = {
  orgEntityId: SG1,
  title: 'Quarterly privileged access recertification',
  type: 'detective' as const,
  nature: 'manual' as const,
  frequency: 'quarterly' as const,
};

function build(options: { catalog?: unknown[]; createThrows?: unknown } = {}) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> = {};

  const client = {
    refCodeCounter: {
      upsert: async () => {
        calls.push('issueRefCode');
        return { lastSeq: 7 };
      },
    },
    orgEntity: {
      findUnique: async () => ({ id: SG1, code: 'SG1' }),
    },
    extensionField: {
      findMany: async () => {
        calls.push('catalog');
        return options.catalog ?? [];
      },
    },
    control: {
      findMany: async () => [],
      create: async (args: { data: Record<string, unknown> }) => {
        calls.push('insert');
        inserted = args.data;
        if (options.createThrows) {
          throw options.createThrows;
        }
        return { id: 'created', ...args.data };
      },
    },
  } as unknown as ScopedControlClient;

  return { repo: new ControlRepository(), client, calls, insert: () => inserted };
}

describe('ControlRepository.create', () => {
  it('never names applies_to_scope or effectiveness in the insert', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, {
      ...INPUT,
      // Neither exists on CreateControlInput. This is what a caller who sends
      // them actually achieves — which is nothing.
      appliesToScope: 'group',
      effectiveness: 'effective',
    } as Parameters<ControlRepository['create']>[1]);

    expect(insert()).not.toHaveProperty('appliesToScope');
    expect(insert()).not.toHaveProperty('effectiveness');
  });

  it('issues the ref_code itself, with the CTRL prefix and the entity code', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert()['refCode']).toBe('CTRL-SG1-000007');
  });

  it('sends an empty array rather than NULL when no framework refs are given', async () => {
    const { repo, client, insert } = build();

    await repo.create(client, INPUT);

    expect(insert()['frameworkRefs']).toEqual([]);
  });

  it('copies frameworkRefs rather than storing the caller’s array', async () => {
    const { repo, client, insert } = build();
    const refs = ['ISO 27001 A.5.15'];

    await repo.create(client, { ...INPUT, frameworkRefs: refs });

    expect(insert()['frameworkRefs']).toEqual(refs);
    // A stored reference would let a caller mutate the array after the write.
    expect(insert()['frameworkRefs']).not.toBe(refs);
  });

  it('validates extensions BEFORE allocating a reference code', async () => {
    const { repo, client, calls } = build({
      catalog: [{ key: 'reviewCycle', dataType: 'string', required: false, entityType: 'control' }],
    });

    await expect(
      repo.create(client, { ...INPUT, extensions: { unknownKey: 'x' } }),
    ).rejects.toBeInstanceOf(ExtensionValidationError);

    // A rejected payload must not consume a number.
    expect(calls).toEqual(['catalog']);
  });

  it('runs catalog -> issueRefCode -> insert, in that order', async () => {
    const { repo, client, calls } = build();

    await repo.create(client, INPUT);

    expect(calls).toEqual(['catalog', 'issueRefCode', 'insert']);
  });

  it('translates the database’s 42501 into a domain refusal', async () => {
    const { repo, client } = build({ createThrows: { code: '42501' } });

    await expect(repo.create(client, INPUT)).rejects.toBeInstanceOf(ScopeRefusedError);
  });

  it('does not translate errors it has no detector for', async () => {
    const boom = new Error('connection reset');
    const { repo, client } = build({ createThrows: boom });

    // ⚠️ A repository that swallowed this into a 404 would report an outage as
    // "not found". There is exactly one detector here because a control names no
    // other scoped record — see the file header.
    await expect(repo.create(client, INPUT)).rejects.toBe(boom);
  });
});

describe('ControlRepository.list', () => {
  it('does not filter by entity or by scope — the policy decides both', async () => {
    let args: unknown;
    const client = {
      control: {
        findMany: async (a: unknown) => {
          args = a;
          return [];
        },
      },
    } as unknown as ScopedControlClient;

    await new ControlRepository().list(client);

    // Narrowing here would hide the group-shared half while looking implemented.
    expect(args).toEqual({ where: { retiredAt: null }, orderBy: { createdAt: 'desc' } });
  });
});
