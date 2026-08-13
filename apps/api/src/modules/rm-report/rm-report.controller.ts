/**
 * File: apps/api/src/modules/rm-report/rm-report.controller.ts
 * Purpose: The endpoints that give the controlled deliverable and its snapshots a caller.
 * Category: modules
 * Scope: Phase W10 (M1 slice 7)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3.1
 *
 * Description:
 *   Copies assessment.controller.ts: @Controller() with explicit paths, because
 *   two tables share one module. The behaviours that were required rather than
 *   chosen there are required here for the same reasons and are not re-argued:
 *   404 never 403, the scope is never read from the request, the caller's bad
 *   data is 4xx rather than 500.
 *
 *   ⭐ ONE STATUS CODE IS NEW TO THIS CODEBASE: 409. A duplicate version label is
 *   not a refusal (404 would hide a rule the caller must satisfy) and not a
 *   semantic error in the payload (422's job) — it is a conflict with what
 *   already exists, which is what 409 means. W09 reached the same fork for the
 *   SoD check and chose 422 because the caller already knew both user ids; the
 *   same test applies here and gives 409 because the caller already knows the
 *   label it just sent.
 *
 *   ⚠️ THERE IS NO `isCurrent` ON A VERSION, and its absence is deliberate. Which
 *   version is current is a fact about the REPORT — `currentVersionId`, returned
 *   by GET rm-reports. Computing it here would need the version list joined to
 *   the report, which ScopedRmReportVersionClient cannot reach, and publishing it
 *   twice is the second representation 02a:257's `state` was cut for.
 *
 *   ⚠️ There is no endpoint that updates a version. rm_report_versions has no
 *   FOR UPDATE policy; writing one here would 500 rather than mislead, but not
 *   writing one is clearer.
 *
 * Key Components:
 *   - GET  /rm-reports — this entity's deliverables, each with its current pointer
 *   - POST /rm-reports — create one; server issues ref_code, pointer starts NULL
 *   - GET  /rm-report-versions — the snapshots, newest effective date first
 *   - POST /rm-report-versions — issue one; the database promotes it
 *
 * Created: 2026-08-13 (Phase W10)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W10)
 *
 * Related:
 *   - apps/api/src/modules/assessment/assessment.controller.ts — the shape copied
 *   - apps/api/src/modules/policy/dev-principal.ts — what M4 removes
 */
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { RmReportRepository } from '../../core-model/rm-report.repository';
import {
  DuplicateKeyError,
  ScopeRefusedError,
  UnknownReferenceError,
} from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from '../policy/dev-principal';
import { readTimestamp } from '../shared/read-timestamp';

interface CreateRmReportBody {
  orgEntityId?: unknown;
  title?: unknown;
  ownerUserId?: unknown;
  extensions?: unknown;
}

interface IssueVersionBody {
  orgEntityId?: unknown;
  reportId?: unknown;
  versionLabel?: unknown;
  preparedBy?: unknown;
  approvedBy?: unknown;
  effectiveDate?: unknown;
  changeNote?: unknown;
  snapshotAt?: unknown;
  sheet?: unknown;
  extensions?: unknown;
}

/**
 * Required timestamps, on top of readTimestamp's optional contract.
 *
 * ⚠️ Not folded into readTimestamp: its `undefined` return is what lets every
 * optional date field distinguish "absent" from "unparseable", and a `required`
 * flag would put that decision back inside a helper extracted to take it out.
 */
function requireTimestamp(value: unknown, field: string): Date {
  const parsed = readTimestamp(value, field);
  if (parsed === undefined) {
    throw new BadRequestException(`${field} is required and must be an ISO-8601 string`);
  }
  return parsed;
}

@Controller()
export class RmReportController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly reports: RmReportRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  @Get('rm-reports')
  async listReports() {
    const data = await this.reports.list(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('rm-reports')
  async createReport(@Body() body: CreateRmReportBody) {
    for (const key of ['orgEntityId', 'title'] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    if (body.ownerUserId !== undefined && typeof body.ownerUserId !== 'string') {
      throw new BadRequestException('ownerUserId must be a string when present');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.reports.create(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        title: body.title as string,
        ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : undefined,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      return this.rethrow(error);
    }
  }

  @Get('rm-report-versions')
  async listVersions() {
    const data = await this.reports.listVersions(await this.client());
    return { data, ...DEV_PRINCIPAL_MARKER };
  }

  @Post('rm-report-versions')
  async issueVersion(@Body() body: IssueVersionBody) {
    for (const key of [
      'orgEntityId',
      'reportId',
      'versionLabel',
      'preparedBy',
      'approvedBy',
      'changeNote',
    ] as const) {
      if (typeof body?.[key] !== 'string') {
        throw new BadRequestException(`${key} is required and must be a string`);
      }
    }
    // ⚠️ `sheet` is required and must be an object, but its CONTENTS are not
    // checked — there is no specification to check them against, and a validator
    // asserting a shape nobody agreed would look like a guarantee. What is
    // enforced is that a snapshot is not empty-by-accident: null and a bare
    // string are refused, so an absent payload cannot be stored as if it were one.
    if (body.sheet === undefined || body.sheet === null || typeof body.sheet !== 'object') {
      throw new BadRequestException('sheet is required and must be an object');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.reports.issueVersion(await this.client(), {
        orgEntityId: body.orgEntityId as string,
        reportId: body.reportId as string,
        versionLabel: body.versionLabel as string,
        preparedBy: body.preparedBy as string,
        approvedBy: body.approvedBy as string,
        effectiveDate: requireTimestamp(body.effectiveDate, 'effectiveDate'),
        changeNote: body.changeNote as string,
        snapshotAt: requireTimestamp(body.snapshotAt, 'snapshotAt'),
        sheet: body.sheet,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      return this.rethrow(error);
    }
  }

  /**
   * The four outcomes, and why they differ.
   *
   * ⚠️ Scope refusal and unknown reference collapse to 404 for the reason every
   * controller in this codebase collapses them: answering anything else confirms
   * an id the caller was guessing at. The duplicate does not collapse, because
   * the tuple it conflicts with is one the caller owns — see the class docstring.
   */
  private rethrow(error: unknown): never {
    if (error instanceof ExtensionValidationError) {
      throw new UnprocessableEntityException({ message: error.message, key: error.key });
    }
    if (error instanceof ScopeRefusedError || error instanceof UnknownReferenceError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof DuplicateKeyError) {
      throw new ConflictException(error.message);
    }
    throw error;
  }
}
