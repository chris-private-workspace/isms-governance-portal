/**
 * File: apps/api/src/core-model/issue.repository.ts
 * Purpose: The issue write path — the shared finding record every module raises into.
 * Category: core-model
 * Scope: Phase W08 (M1 slice 5)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §4 · §5.1
 *
 * Description:
 *   Sixth consumer of the scoped-client shape. The write order is unchanged from
 *   W05-W07 — validate -> catalog -> issueRefCode -> insert -> translate — and is
 *   not re-argued here. What is worth reading is what this file does NOT accept.
 *
 *   **No `status`, and no `source_id` to accept.** 02a §4 moves an issue through
 *   Open -> InProgress -> Remediated -> Verified -> Closed, with a separate
 *   Open -> RiskAccepted branch for formal acceptance. Every one of those is a
 *   transition, and 02a:409 attaches a rule to one of them ("an open issue needs
 *   >=1 action before it can be Remediated") that nothing in this slice could
 *   enforce. Accepting a terminal state at creation would let a caller record a
 *   verified, closed finding that was never actioned — the platform asserting a
 *   governance claim it was never given (guardrail 1).
 *
 *   ⛔ The `source` column says an issue came from a control test. It cannot say
 *   WHICH one, because 02a:229 specifies no companion id. That is a gap in the
 *   specification, recorded in the schema docstring and in BACKLOG rather than
 *   closed by inventing a column (已確認參數 #9). Callers wanting the link today
 *   have to put it in `description`, and that is a real limitation of this slice.
 *
 * Key Components:
 *   - IssueRepository.list(): this entity's issues; no widening
 *   - IssueRepository.create(): validate -> catalog -> issueRefCode -> insert
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08) — the parent half of the CAPA pair
 *
 * Related:
 *   - apps/api/src/core-model/control-test.repository.ts — the shape being copied
 *   - apps/api/prisma/migrations/20260812211801_issue_and_action/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { Issue, IssueSeverity, IssueSource } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedIssueClient } from './scoped-client.types';

const ENTITY_TYPE = 'issue';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'ISSU';

export interface CreateIssueInput {
  /**
   * Which entity raised the finding. RLS decides whether that was allowed; there
   * is no check here (約束 8: scope travels with the connection, not the argument).
   */
  readonly orgEntityId: string;

  readonly title: string;

  /**
   * Where the finding came from (02a:229).
   *
   * ⚠️ Two values only — see the IssueSource docstring. And it is a bare enum:
   * `test` does not name a control test.
   */
  readonly source: IssueSource;

  readonly severity: IssueSeverity;

  readonly description?: string | undefined;

  readonly dueDate?: Date | undefined;

  readonly ownerUserId?: string | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class IssueRepository {
  /**
   * This entity's issues only.
   *
   * ⚠️ No group widening, unlike ControlRepository.list(). A group-shared control
   * is a library entry everyone may consult; a finding is an event that happened
   * at one entity. Reading another OpCo's issues is a roll-up question, and
   * roll-up is an authorised scope expansion rather than a property of the row.
   */
  async list(client: ScopedIssueClient): Promise<Issue[]> {
    return client.issue.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedIssueClient, input: CreateIssueInput): Promise<Issue> {
    const extensions = input.extensions ?? {};

    // Validate before allocating a number: a rejected payload should not consume
    // a reference code (policy.repository.ts records the reasoning).
    const catalog = await client.extensionField.findMany({
      where: { entityType: ENTITY_TYPE, retiredAt: null },
    });
    validateExtensions(extensions, catalog);

    try {
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: ENTITY_TYPE,
        prefix: REF_CODE_PREFIX,
      });

      return await client.issue.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          title: input.title,
          source: input.source,
          severity: input.severity,
          description: input.description ?? null,
          dueDate: input.dueDate ?? null,
          ownerUserId: input.ownerUserId ?? null,
          extensions: extensions as object,
          // status is absent on purpose — it defaults to `open`, and every other
          // value in 02a §4 is reached by a transition this slice does not have.
          // created_by / updated_by stay NULL until M4 supplies a credential.
        },
      });
    } catch (error) {
      // The row's own entity was out of scope: RLS refused, at the counter or at
      // the insert.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // In scope, but named an owner it cannot reach.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('owner');
      }
      throw error;
    }
  }
}
