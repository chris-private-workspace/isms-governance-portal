/**
 * File: apps/api/src/core-model/action.repository.ts
 * Purpose: The CAPA write path — a child whose parent CAN be anchored, unlike W07's.
 * Category: core-model
 * Scope: Phase W08 (M1 slice 5)
 * Owner: docs/02-architecture/02a-data-model-spec.md §3 · §5.1
 *
 * Description:
 *   Seventh consumer of the scoped-client shape, and the third distinct mechanism
 *   guarding a cross-entity reference. The order of arrivals matters more than
 *   any one of them:
 *
 *     W05  assets -> asset_groups     composite foreign key
 *     W07  control_tests -> controls  BEFORE trigger — the parent refused an anchor
 *     W08  actions -> issues          composite foreign key again
 *
 *   W07's design note (D1) framed the trigger as what you reach for when option B
 *   is STRUCTURALLY unavailable, not as the better mechanism. `issues` has no link
 *   table forcing its two sides apart, so it offers (id, org_entity_id) and the
 *   key applies. Copying the trigger here would have added a per-row dynamic
 *   query whose cost is still unmeasured (W07 design note §4) for a guarantee the
 *   key already gives.
 *
 *   ⚠️ Nothing in this file reads the issue table, and that is the invariant all
 *   three mechanisms exist to protect: whatever refuses the write must give the
 *   IDENTICAL error for "another entity's issue" and "no such issue". A
 *   repository able to look the parent up first could tell them apart, which is
 *   the oracle 約束 8 forbids. ScopedActionClient is deliberately unable to
 *   express the lookup.
 *
 *   **No `status`, `completed_at` or `verified_by` on input.** 02a:398 moves an
 *   action Open -> InProgress -> Completed -> Verified. Those three columns
 *   describe an action that has been done and checked, and doing it is the
 *   transition's job — which does not exist before M5. Accepting them here would
 *   let the assignee record their own verification.
 *
 * Key Components:
 *   - ActionRepository.list(): this entity's actions
 *   - ActionRepository.create(): validate -> catalog -> issueRefCode -> insert
 *
 * Created: 2026-08-12 (Phase W08)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W08) — composite key, not a trigger
 *
 * Related:
 *   - apps/api/src/core-model/asset.repository.ts — the composite-key precedent
 *   - docs/02-architecture/design-notes/W07-cross-entity-references.md §1 D1
 */
import { Injectable } from '@nestjs/common';
import type { Action } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedActionClient } from './scoped-client.types';

const ENTITY_TYPE = 'action';

/** Self-declared, as every other prefix in this layer is (02a:91 fixes the rule). */
const REF_CODE_PREFIX = 'ACTN';

export interface CreateActionInput {
  /**
   * Which entity owns the action. RLS decides whether that was allowed; there is
   * no check here (約束 8).
   */
  readonly orgEntityId: string;

  /**
   * The issue being actioned (02a:409 — 1:N, an open issue needs >=1 action).
   *
   * ⚠️ Must belong to the SAME entity, and the composite foreign key is what says
   * so. Unlike ControlTest's parent, there is no legitimate cross-entity case
   * here: a group-shared control is a library entry any OpCo may test, but a
   * finding at HK1 is not something SG1 opens actions against — that would make
   * one entity accountable for another's remediation.
   */
  readonly issueId: string;

  readonly description: string;

  readonly assigneeUserId?: string | undefined;

  readonly dueDate?: Date | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class ActionRepository {
  async list(client: ScopedActionClient): Promise<Action[]> {
    return client.action.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedActionClient, input: CreateActionInput): Promise<Action> {
    const extensions = input.extensions ?? {};

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

      return await client.action.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          issueId: input.issueId,
          description: input.description,
          assigneeUserId: input.assigneeUserId ?? null,
          dueDate: input.dueDate ?? null,
          extensions: extensions as object,
          // status / completed_at / verified_by are absent on purpose — see the
          // file header. created_by / updated_by stay NULL until M4.
        },
      });
    } catch (error) {
      // The row's own entity was out of scope: RLS refused.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // In scope, but named an issue or an assignee it cannot reach. Which of the
      // two is not disclosed, for the reason risk.repository.ts records: naming
      // the constraint would answer "does this id exist elsewhere?" by omission.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('issue or assignee');
      }
      throw error;
    }
  }
}
