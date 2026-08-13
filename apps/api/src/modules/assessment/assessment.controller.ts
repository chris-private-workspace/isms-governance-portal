/**
 * File: apps/api/src/modules/assessment/assessment.controller.ts
 * Purpose: The six endpoints of the shared assessment engine — templates, assignments, answers.
 * Category: modules
 * Scope: Phase W09 (M1 slice 6)
 * Owner: docs/02-architecture/05-platform-foundation-services.md §Shared assessment engine
 *
 * Description:
 *   One controller for three tables, not three controllers. 05:39 builds the
 *   engine once because RCSA, control testing and vendor audits are the same
 *   pattern; splitting the HTTP surface by table would re-introduce at the edge
 *   the separation that the data model just removed.
 *
 *   ⚠️ THREE refusals, THREE different answers, and the differences are the point:
 *     - out of scope / unreachable reference -> 404. Anything else confirms an id.
 *     - segregation of duties -> 422. The caller supplied both user ids; refusing
 *       to say which rule it broke would hide a control from the person who has
 *       to satisfy it, and conceal nothing (guardrail 6).
 *     - unknown enum value / missing field -> 400. Published contract, safe to name.
 *
 *   ⛔ No `templateVersion` on the create body. The database snapshots it; see
 *   assessment-instance.repository.ts. A caller that sends one is ignored rather
 *   than rejected — the field is not part of the contract, so rejecting it would
 *   be asserting a rule about a name this API does not define.
 *
 * Key Components:
 *   - GET/POST /assessment-templates · /assessment-instances · /assessment-responses
 *
 * Created: 2026-08-13 (Phase W09)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W09) — six endpoints over one engine
 *
 * Related:
 *   - apps/api/src/modules/issue/issue.controller.ts — the shape being copied
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AssessmentInstanceRepository,
  SegregationOfDutiesError,
} from '../../core-model/assessment-instance.repository';
import { AssessmentResponseRepository } from '../../core-model/assessment-response.repository';
import { AssessmentTemplateRepository } from '../../core-model/assessment-template.repository';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { ScopeRefusedError, UnknownReferenceError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { AssessmentSubjectType } from '../../generated/prisma';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

/**
 * Derived from the generated client, never restated — the issue controller's
 * reasoning. If `process` is ever added to close the gap this phase recorded, a
 * literal list here would keep rejecting it with no test failing to say so.
 */
const SUBJECT_TYPES = Object.values(AssessmentSubjectType) as string[];

interface CreateTemplateBody {
  orgEntityId?: unknown;
  name?: unknown;
  subjectType?: unknown;
  definition?: unknown;
  ownerUserId?: unknown;
  extensions?: unknown;
}

interface CreateInstanceBody {
  orgEntityId?: unknown;
  templateId?: unknown;
  subjectType?: unknown;
  subjectId?: unknown;
  period?: unknown;
  assigneeUserId?: unknown;
  reviewerUserId?: unknown;
  extensions?: unknown;
}

interface CreateResponseBody {
  orgEntityId?: unknown;
  instanceId?: unknown;
  questionId?: unknown;
  answer?: unknown;
  evidenceId?: unknown;
  extensions?: unknown;
}

function requireStrings(body: Record<string, unknown>, keys: readonly string[]): void {
  for (const key of keys) {
    if (typeof body?.[key] !== 'string') {
      throw new BadRequestException(`${key} is required and must be a string`);
    }
  }
}

function optionalStrings(body: Record<string, unknown>, keys: readonly string[]): void {
  for (const key of keys) {
    if (body[key] !== undefined && typeof body[key] !== 'string') {
      throw new BadRequestException(`${key} must be a string when present`);
    }
  }
}

function optionalExtensions(value: unknown): void {
  if (value !== undefined && typeof value !== 'object') {
    throw new BadRequestException('extensions must be an object when present');
  }
}

function requireSubjectType(value: unknown): void {
  if (!SUBJECT_TYPES.includes(value as string)) {
    throw new BadRequestException(`subjectType must be one of: ${SUBJECT_TYPES.join(', ')}`);
  }
}

@Controller()
export class AssessmentController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly templates: AssessmentTemplateRepository,
    private readonly instances: AssessmentInstanceRepository,
    private readonly responses: AssessmentResponseRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  /**
   * The three write paths share exactly this translation and nothing else, so it
   * is a function rather than a base class: the differences between them live in
   * validation, which is where a reader looks for them.
   */
  private translate(error: unknown): never {
    if (error instanceof ExtensionValidationError) {
      throw new UnprocessableEntityException({ message: error.message, key: error.key });
    }
    // 422, not 404. The caller already holds both ids; this is a stated rule.
    if (error instanceof SegregationOfDutiesError) {
      throw new UnprocessableEntityException({ message: error.message, rule: 'sod' });
    }
    // Two different refusals, one answer. Which one it was — and whether the
    // thing exists at all — is not something the caller gets to learn.
    if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
      throw new NotFoundException(error.message);
    }
    throw error;
  }

  @Get('assessment-templates')
  async listTemplates() {
    const data = await this.templates.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('assessment-templates')
  async createTemplate(@Body() body: CreateTemplateBody) {
    const record = body as Record<string, unknown>;
    requireStrings(record, ['orgEntityId', 'name', 'subjectType']);
    requireSubjectType(body.subjectType);
    optionalStrings(record, ['ownerUserId']);
    optionalExtensions(body.extensions);
    // `definition` is required but its SHAPE is not checked — 02a specifies none,
    // and asserting one here would enforce a guess (see the repository).
    if (body.definition === undefined || body.definition === null) {
      throw new BadRequestException('definition is required');
    }

    try {
      const data = await this.templates.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        name: body.name as string,
        subjectType: body.subjectType as AssessmentSubjectType,
        definition: body.definition,
        ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      this.translate(error);
    }
  }

  @Get('assessment-instances')
  async listInstances() {
    const data = await this.instances.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('assessment-instances')
  async createInstance(@Body() body: CreateInstanceBody) {
    const record = body as Record<string, unknown>;
    requireStrings(record, ['orgEntityId', 'templateId', 'subjectType', 'subjectId']);
    requireSubjectType(body.subjectType);
    optionalStrings(record, ['assigneeUserId', 'reviewerUserId']);
    optionalExtensions(body.extensions);

    const period = readTimestamp(body.period, 'period');
    if (period === undefined) {
      throw new BadRequestException('period is required');
    }

    try {
      const data = await this.instances.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        templateId: body.templateId as string,
        subjectType: body.subjectType as AssessmentSubjectType,
        subjectId: body.subjectId as string,
        period,
        assigneeUserId: typeof body.assigneeUserId === 'string' ? body.assigneeUserId : undefined,
        reviewerUserId: typeof body.reviewerUserId === 'string' ? body.reviewerUserId : undefined,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      this.translate(error);
    }
  }

  @Get('assessment-responses')
  async listResponses() {
    const data = await this.responses.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('assessment-responses')
  async createResponse(@Body() body: CreateResponseBody) {
    const record = body as Record<string, unknown>;
    requireStrings(record, ['orgEntityId', 'instanceId', 'questionId']);
    optionalStrings(record, ['evidenceId']);
    optionalExtensions(body.extensions);
    // ⛔ `questionId` is NOT checked against the template. Nothing can check it —
    // there is no questions table, and this module cannot read templates anyway.
    if (body.answer === undefined) {
      throw new BadRequestException('answer is required');
    }

    try {
      const data = await this.responses.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        instanceId: body.instanceId as string,
        questionId: body.questionId as string,
        answer: body.answer,
        evidenceId: typeof body.evidenceId === 'string' ? body.evidenceId : undefined,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      this.translate(error);
    }
  }
}
