/**
 * File: apps/api/src/core-model/rm-report.repository.ts
 * Purpose: Write paths for the controlled risk-management deliverable and its snapshots.
 * Category: core-model
 * Scope: Phase W10 (M1 slice 7)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3.1
 *
 * Description:
 *   Two tables in one file, following asset.repository.ts rather than the
 *   issue/action split: issuing a version is a single act that touches both, and
 *   splitting it would put one table's write inside the other's file or push the
 *   sequencing up into a controller.
 *
 *   ⭐ WHAT IS NOT HERE IS THE INTERESTING PART: THE PROMOTE.
 *   Issuing a version must also move the report's current_version_id. There is no
 *   `update` call below doing that, and there cannot be a correct one. runScoped
 *   (scoped-prisma.provider.ts:83) wraps EVERY operation in its own transaction,
 *   because the scope is set transaction-locally — so two calls here are two
 *   units of work, and a crash between them would strand a version that could
 *   never be promoted afterwards (the label is unique, so the retry is refused).
 *   W04 already declined the fix that would help: threading $transaction through
 *   the scoped client widens the interface every repository sees
 *   (policy.repository.ts:111).
 *
 *   So the database promotes, in the same statement as the insert
 *   (20260813152548_promote_on_issue). This file inserts a row and the pointer
 *   has already moved by the time it returns. The same resolution W09 reached for
 *   template_version, for the same reason: the narrow interface survives AND the
 *   column means what 02a says it means.
 *
 *   ⚠️ There is no update path on versions at all, by design — rm_report_versions
 *   has no FOR UPDATE policy, so RLS refuses one whatever this file tries.
 *
 * Key Components:
 *   - RmReportRepository.list() / create(): the report identity
 *   - RmReportRepository.listVersions() / issueVersion(): the immutable snapshots
 *
 * Created: 2026-08-13 (Phase W10)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Initial creation (Phase W10) — the promote lives in the database
 *
 * Related:
 *   - apps/api/src/core-model/asset.repository.ts — the one-file-two-tables shape
 *   - apps/api/prisma/migrations/20260813153153_version_label_key_scoped
 */
import { Injectable } from '@nestjs/common';
import type { RiskManagementReport, RMReportVersion } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  DuplicateKeyError,
  isScopeRefusal,
  isUniqueViolation,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedRmReportClient, ScopedRmReportVersionClient } from './scoped-client.types';

const REPORT_ENTITY_TYPE = 'rm_report';
const VERSION_ENTITY_TYPE = 'rm_report_version';

/** Self-declared, like every prefix but Risk's (02a:91). */
const REPORT_REF_CODE_PREFIX = 'RMRP';
const VERSION_REF_CODE_PREFIX = 'RMRV';

export interface CreateRmReportInput {
  readonly orgEntityId: string;
  readonly title: string;
  readonly ownerUserId?: string | undefined;
  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

export interface IssueRmReportVersionInput {
  readonly orgEntityId: string;

  /**
   * The report this version belongs to.
   *
   * ⚠️ Never checked here. rm_report_versions_report_id_org_entity_id_fkey
   * decides, and it decides for both halves at once: a report that does not
   * exist and a report belonging to another entity are the same 23503.
   */
  readonly reportId: string;

  /** `2025.7`, `1.2` — not semver, not validated (rmVersions.js:4-8). */
  readonly versionLabel: string;

  /** Governance bodies as free text — `ITSC`, `ISC`. Never coerced to a user (02a:262). */
  readonly preparedBy: string;
  readonly approvedBy: string;

  readonly effectiveDate: Date;
  readonly changeNote: string;

  /**
   * When the sheet was frozen. Supplied rather than defaulted to now(): the
   * caller may be recording a snapshot taken before it reached this platform,
   * and 02a:255 lists it as data rather than as a row timestamp.
   */
  readonly snapshotAt: Date;

  /** The frozen sheet. Structure not validated — see the schema docstring. */
  readonly sheet: unknown;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class RmReportRepository {
  async list(client: ScopedRmReportClient): Promise<RiskManagementReport[]> {
    return client.riskManagementReport.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    client: ScopedRmReportClient,
    input: CreateRmReportInput,
  ): Promise<RiskManagementReport> {
    const extensions = input.extensions ?? {};

    const catalog = await client.extensionField.findMany({
      where: { entityType: REPORT_ENTITY_TYPE, retiredAt: null },
    });
    validateExtensions(extensions, catalog);

    try {
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: REPORT_ENTITY_TYPE,
        prefix: REPORT_REF_CODE_PREFIX,
      });

      return await client.riskManagementReport.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          title: input.title,
          ownerUserId: input.ownerUserId ?? null,
          // current_version_id stays NULL. A report exists before its first
          // version is issued, and the composite pointer FK permits that only
          // because MATCH SIMPLE lets a NULL through (measured, W10 Day 0 D3).
          extensions: extensions as object,
        },
      });
    } catch (error) {
      // A report names its own entity and an owner. One refusal point, like
      // policies — the owner is a global table, so it cannot be out of scope.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      throw error;
    }
  }

  async listVersions(client: ScopedRmReportVersionClient): Promise<RMReportVersion[]> {
    return client.rMReportVersion.findMany({
      where: { retiredAt: null },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  /**
   * Insert a snapshot. The report's pointer moves with it, in the database.
   *
   * ⚠️ No read of the report happens first, and none may be added: this client
   * cannot name that delegate, which is what keeps "another entity's report" and
   * "no such report" the same answer.
   */
  async issueVersion(
    client: ScopedRmReportVersionClient,
    input: IssueRmReportVersionInput,
  ): Promise<RMReportVersion> {
    const extensions = input.extensions ?? {};

    const catalog = await client.extensionField.findMany({
      where: { entityType: VERSION_ENTITY_TYPE, retiredAt: null },
    });
    validateExtensions(extensions, catalog);

    try {
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: VERSION_ENTITY_TYPE,
        prefix: VERSION_REF_CODE_PREFIX,
      });

      return await client.rMReportVersion.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          reportId: input.reportId,
          versionLabel: input.versionLabel,
          preparedBy: input.preparedBy,
          approvedBy: input.approvedBy,
          effectiveDate: input.effectiveDate,
          changeNote: input.changeNote,
          snapshotAt: input.snapshotAt,
          sheet: input.sheet as object,
          extensions: extensions as object,
        },
      });
    } catch (error) {
      // THREE refusal points here, and the third is new to this codebase.
      //   42501 — this row's own entity, refused by RLS at the counter.
      //   23503 — the report it names, refused by the composite FK afterwards.
      //   23505 — the label, on a report the caller demonstrably owns.
      // The order matters less than the fact that the third one is SAFE to
      // report at all, which it was not until the unique key gained
      // org_entity_id (see scope-refusal.ts's DuplicateKeyError).
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('risk management report');
      }
      if (isUniqueViolation(error)) {
        throw new DuplicateKeyError('version label');
      }
      throw error;
    }
  }
}
