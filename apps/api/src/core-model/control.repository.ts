/**
 * File: apps/api/src/core-model/control.repository.ts
 * Purpose: The control library's write path — and the first read path that legitimately
 *   returns another entity's rows.
 * Category: core-model
 * Scope: Phase W06 (M1 slice 3)
 * Owner: docs/14-adr/0014-row-level-entity-scope-and-per-command-policies.md
 *
 * Description:
 *   Third consumer of the scoped-client shape, and the first one where "scoped"
 *   does not mean "my entity's rows". `list()` returns every group-shared control
 *   as well, because the read policy is widened for them (ADR-0014). Nothing in
 *   this file arranges that — the widening is in the policy, and this file simply
 *   does not filter it back out.
 *
 *   The write order is W05's, unchanged: validate -> catalog -> issueRefCode ->
 *   insert -> translate. What differs is what the input CANNOT carry:
 *
 *   1. **NO `appliesToScope`.** The insert policy refuses `group`
 *      (`WITH CHECK ... AND applies_to_scope <> 'group'`), so the only value a
 *      caller could legally pass is the column default. A field with one legal
 *      value is not a field — the same reasoning risk.repository.ts applies to
 *      scores, arrived at from the opposite direction: there the database refuses
 *      every value, here it refuses every value but one.
 *
 *      ⚠️ This is what ADR-0014 means by "group rows are seeded by migration".
 *      It is a real product gap, not an implementation detail: 00:59 promises a
 *      group-shared control library and this slice delivers reading it, not
 *      authoring it.
 *
 *   2. **NO `effectiveness`.** It comes "from latest test" (02a:217) and
 *      `ControlTest` does not exist until M7, so the only honest source is the
 *      column default `not_tested`. Accepting one from a caller would let the
 *      platform be told a control is effective by the person who wrote it.
 *
 * Key Components:
 *   - ControlRepository.list(): own rows plus group-shared ones, by policy
 *   - ControlRepository.create(): validate -> catalog -> issueRefCode -> insert -> translate
 *
 * Created: 2026-08-12 (Phase W06)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W06) — third scoped-client consumer
 *
 * Related:
 *   - apps/api/src/core-model/risk.repository.ts — the shape being copied
 *   - apps/api/prisma/migrations/20260811093148_control_library/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { Control, ControlFrequency, ControlNature, ControlType } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import { isScopeRefusal, ScopeRefusedError } from './scope-refusal';
import type { ScopedControlClient } from './scoped-client.types';

const ENTITY_TYPE = 'control';

/**
 * Self-declared. 02a:91 fixes the RULE — prefix by record type and entity — and
 * names a prefix only for Risk (02a:89). W04's D3 ruling applies: each repository
 * names its own and the choice is recorded here, not in a registry nobody asked
 * for.
 */
const REF_CODE_PREFIX = 'CTRL';

export interface CreateControlInput {
  /**
   * Which entity owns the control. RLS decides whether that was allowed — a value
   * outside the client's scope is refused by the database, not by a check here
   * (約束 8: scope travels with the connection, never the argument).
   *
   * ⚠️ A group-shared control has one of these too. "Group-shared" describes who
   * may READ it, never that nobody is accountable for it — which is precisely
   * what the nullable alternative could not say (ADR-0014 §否決 B).
   */
  readonly orgEntityId: string;
  readonly title: string;

  readonly type: ControlType;
  readonly nature: ControlNature;

  /**
   * Required, not optional. `event_driven` already IS the answer for a control
   * with no fixed cadence (02a:124), so a NULL here would be a second way to say
   * the same thing with no way to tell them apart.
   */
  readonly frequency: ControlFrequency;

  // `| undefined` explicitly: the project runs exactOptionalPropertyTypes, under
  // which `description?: string` refuses an explicitly-passed undefined.
  readonly description?: string | undefined;

  /**
   * Clause references as free text, e.g. `ISO 27001 A.5.9` (02a:217). Not
   * validated against anything: `Framework` / `FrameworkControl` are slice 4, and
   * checking a reference against a table that does not exist is not available to
   * be done. Absent means an empty array, never NULL — a control that cites no
   * clause has cited none, which is a fact rather than a missing value.
   */
  readonly frameworkRefs?: readonly string[] | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class ControlRepository {
  /**
   * Every control this client may read: its own entities' plus every
   * group-shared one.
   *
   * ⚠️ No `where` on `orgEntityId` and no `where` on `appliesToScope`. Adding
   * either would narrow the result BELOW what the policy allows, and the
   * group-shared half would then be invisible while looking implemented — the
   * failure mode ADR-0014 exists to avoid, reintroduced one layer up.
   */
  async list(client: ScopedControlClient): Promise<Control[]> {
    return client.control.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedControlClient, input: CreateControlInput): Promise<Control> {
    const extensions = input.extensions ?? {};

    // Validate BEFORE allocating a number: a rejected payload should not consume
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

      return await client.control.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          title: input.title,
          description: input.description ?? null,
          type: input.type,
          nature: input.nature,
          frequency: input.frequency,
          frameworkRefs: [...(input.frameworkRefs ?? [])],
          extensions: extensions as object,
          // applies_to_scope / effectiveness are absent on purpose — see the
          // file header. owner_user_id / created_by / updated_by stay NULL until
          // M4 supplies a credential.
        },
      });
    } catch (error) {
      // ⚠️ ONE detector here, not two. A control names no other scoped record —
      // no composite foreign key, so no 23503 path. If a later slice gives it
      // one (the M7 Risk↔Control link is the candidate), the second detector
      // must arrive WITH it; risk.repository.ts documents what assuming
      // otherwise costs.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      throw error;
    }
  }
}
