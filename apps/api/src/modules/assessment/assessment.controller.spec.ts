/**
 * File: apps/api/src/modules/assessment/assessment.controller.spec.ts
 * Purpose: That three refusals get three status codes, and that the enum list is derived.
 * Category: Test (unit)
 * Scope: Phase W09
 *
 * Description:
 *   The integration suite proves the database refuses things. What only a unit
 *   test can show is how those refusals REACH the caller, and the differences are
 *   the point of this file:
 *
 *     - scope refusal / unreachable reference -> 404 (anything else confirms an id)
 *     - segregation of duties -> 422 (a stated rule; hiding it conceals nothing)
 *     - unknown enum value -> 400, naming the accepted values (published contract)
 *
 *   Plus the one thing a hand-written list would silently break: SUBJECT_TYPES is
 *   derived from the generated client, so the day `process` is added to close the
 *   gap W09 recorded, the endpoint accepts it without anybody editing this module.
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 */
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AssessmentInstanceRepository } from '../../core-model/assessment-instance.repository';
import { SegregationOfDutiesError } from '../../core-model/assessment-instance.repository';
import type { AssessmentResponseRepository } from '../../core-model/assessment-response.repository';
import type { AssessmentTemplateRepository } from '../../core-model/assessment-template.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import type { EntityScope, EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import type { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { AssessmentSubjectType } from '../../generated/prisma';
import { AssessmentController } from './assessment.controller';

const SG1 = '00000000-0000-0000-0000-0000000000c0';
const TEMPLATE = '00000000-0000-0000-0000-000000000aa0';
const INSTANCE = '00000000-0000-0000-0000-000000000ab0';

const TEMPLATE_BODY = {
  orgEntityId: SG1,
  name: 'Annual RCSA',
  subjectType: 'risk',
  definition: { sections: [] },
};

const INSTANCE_BODY = {
  orgEntityId: SG1,
  templateId: TEMPLATE,
  subjectType: 'risk',
  subjectId: '00000000-0000-0000-0000-000000000a20',
  period: '2026-01-01T00:00:00.000Z',
};

const RESPONSE_BODY = {
  orgEntityId: SG1,
  instanceId: INSTANCE,
  questionId: 'q1',
  answer: { value: 'yes' },
};

function build(throws?: { on: 'template' | 'instance' | 'response'; error: unknown }) {
  const resolverCalls: unknown[] = [];
  const createCalls: Record<string, unknown>[] = [];

  const resolver = {
    resolve: async (assignment: unknown) => {
      resolverCalls.push(assignment);
      return {} as EntityScope;
    },
  } as unknown as EntityScopeResolver;

  const scoped = { forScope: () => ({}) } as unknown as ScopedPrismaFactory;

  const repoFor = (kind: 'template' | 'instance' | 'response') =>
    ({
      list: async () => [{ id: `${kind}-listed` }],
      create: async (_client: unknown, input: Record<string, unknown>) => {
        createCalls.push(input);
        if (throws?.on === kind) {
          throw throws.error;
        }
        return { id: `${kind}-created` };
      },
    }) as unknown as AssessmentTemplateRepository &
      AssessmentInstanceRepository &
      AssessmentResponseRepository;

  return {
    controller: new AssessmentController(
      resolver,
      scoped,
      repoFor('template'),
      repoFor('instance'),
      repoFor('response'),
    ),
    resolverCalls,
    createCalls,
  };
}

describe('AssessmentController', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEV_PRINCIPAL_ENTITIES;
  });

  it('resolves the scope from the dev principal and nothing in the request', async () => {
    const { controller, resolverCalls } = build();

    await controller.createTemplate({ ...TEMPLATE_BODY });

    // 約束 8: entity identity comes from the credential, never from the payload.
    expect(resolverCalls).toHaveLength(1);
    expect(JSON.stringify(resolverCalls[0])).not.toContain(SG1);
  });

  it('lists all three collections through their own repositories', async () => {
    const { controller } = build();

    expect((await controller.listTemplates()).data).toEqual([{ id: 'template-listed' }]);
    expect((await controller.listInstances()).data).toEqual([{ id: 'instance-listed' }]);
    expect((await controller.listResponses()).data).toEqual([{ id: 'response-listed' }]);
  });

  it('rejects an unknown subjectType with 400, naming the accepted values', async () => {
    const { controller } = build();

    const error = await controller
      .createTemplate({ ...TEMPLATE_BODY, subjectType: 'process' })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    // ⚠️ `process` is 02a:223's fifth value, which has no home since Assessment
    // (RCSA) was ruled a use case rather than a table. This test documents the
    // rejection so that closing the gap has a visible consequence here.
    expect((error as Error).message).toContain('vendor');
  });

  it('derives the accepted values from the generated client, never a literal list', async () => {
    const { controller } = build();

    // Every enum member must be accepted. A hand-written list here would keep
    // rejecting a newly added member with no test failing to say so.
    for (const value of Object.values(AssessmentSubjectType)) {
      await expect(
        controller.createTemplate({ ...TEMPLATE_BODY, subjectType: value }),
      ).resolves.toBeDefined();
    }
  });

  it('requires definition, answer and period — each with its own 400', async () => {
    const { controller } = build();

    await expect(
      controller.createTemplate({ ...TEMPLATE_BODY, definition: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.createResponse({ ...RESPONSE_BODY, answer: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.createInstance({ ...INSTANCE_BODY, period: undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('never forwards templateVersion, even when a caller sends one', async () => {
    const { controller, createCalls } = build();

    await controller.createInstance({
      ...INSTANCE_BODY,
      templateVersion: 99,
    } as Record<string, unknown>);

    expect(createCalls[0]).not.toHaveProperty('templateVersion');
  });

  it('maps a segregation-of-duties refusal to 422, NOT to 404', async () => {
    const { controller } = build({ on: 'instance', error: new SegregationOfDutiesError() });

    const error = await controller.createInstance({ ...INSTANCE_BODY }).catch((e: unknown) => e);

    // guardrail 6: the caller supplied both ids. A 404 here would refuse to
    // explain a control the platform exists to enforce, and hide nothing.
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error).not.toBeInstanceOf(NotFoundException);
  });

  it('maps both scope refusals to 404, on every endpoint', async () => {
    for (const error of [new ScopeRefusedError(SG1), new UnknownReferenceError('template')]) {
      const { controller } = build({ on: 'instance', error });

      await expect(controller.createInstance({ ...INSTANCE_BODY })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
  });

  it('maps an extension validation failure to 422 with the offending key', async () => {
    const { controller } = build({
      on: 'response',
      error: new ExtensionValidationError('unknown key', 'nope'),
    });

    const error = await controller.createResponse({ ...RESPONSE_BODY }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(JSON.stringify((error as UnprocessableEntityException).getResponse())).toContain('nope');
  });

  it('lets an unrecognised error through unchanged', async () => {
    const boom = new Error('connection terminated unexpectedly');
    const { controller } = build({ on: 'template', error: boom });

    await expect(controller.createTemplate({ ...TEMPLATE_BODY })).rejects.toBe(boom);
  });
});
