/**
 * File: apps/api/src/core-model/policy.repository.ts
 * Purpose: The first consumer of a scoped client — and the thing that proves one can exist here.
 * Category: core-model
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0005-governed-extension-storage.md
 *
 * Description:
 *   AD-ScopedClientDI-1 recorded that "core-model obtains a scoped client by DI"
 *   had never been proven, because W02 built the mechanism and left no consumer.
 *   This is that consumer, and the shape it settled on is not the one the AD
 *   predicted.
 *
 *   The client arrives as a METHOD PARAMETER, not as an injected dependency.
 *   The reason is the boundary matrix plus the absence of M4:
 *
 *     - core-model may import ['api', 'core-model'] only, so it cannot name
 *       ScopedPrismaClient (which lives in entity-scope)
 *     - a scoped client is per-request by construction — the scope comes from
 *       the caller's credential — so a singleton provider cannot hold one
 *     - a request-scoped provider needs a credential source, which is M4
 *
 *   So the caller that already holds both — the modules layer, which the matrix
 *   permits to import entity-scope AND core-model — resolves the scope, obtains
 *   the client, and passes it in. core-model never learns the client's real
 *   type, only the shape it declared itself (ScopedPolicyClient).
 *
 *   ⚠️ The repository cannot fall back to an unscoped client, because it has no
 *   client of its own. That is the property worth having: there is no code path
 *   here that could accidentally query without a scope, since there is nothing
 *   to query with.
 *
 * Key Components:
 *   - PolicyRepository.list(): scoped read
 *   - PolicyRepository.create(): catalog read -> validate -> issue ref_code -> insert -> translate
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Issue a ref_code on create (W04) — counter is entity-scoped
 *   - 2026-08-10: Translate an RLS-refused insert (W03) — drive-through saw 500
 *   - 2026-08-10: Initial creation (Phase W03) — first scoped-client consumer
 *
 * Related:
 *   - docs/01-planning/BACKLOG.md — AD-ScopedClientDI-1
 *   - apps/api/src/core-model/scoped-client.types.ts — why a shape, not a token
 */
import { Injectable } from '@nestjs/common';
import type { Policy } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import { ScopeRefusedError, isScopeRefusal } from './scope-refusal';
import type { ScopedPolicyClient } from './scoped-client.types';

const ENTITY_TYPE = 'policy';

/**
 * The abbreviation that appears in a policy's ref_code.
 *
 * ⚠️ 02a fixes the SHAPE but not the abbreviations: 02a:89 shows `RISK` while
 * the design handoff shows `RSK` (03:110). `POL` is this repository's choice,
 * recorded rather than inherited — and it is load-bearing, because 02a:104 says
 * a ref_code is stable once issued. Changing it later renames nothing already
 * issued; it just makes the estate inconsistent.
 */
const REF_CODE_PREFIX = 'POL';

export interface CreatePolicyInput {
  /**
   * Which entity the policy belongs to. The caller supplies it, and RLS decides
   * whether that was allowed — a value outside the client's scope is refused by
   * the database, not by a check here (CLAUDE.md 約束 8: the scope travels with
   * the connection, never with the argument).
   */
  readonly orgEntityId: string;
  readonly title: string;
  readonly extensions?: Readonly<Record<string, unknown>>;
}

@Injectable()
export class PolicyRepository {
  /** Every policy within the client's scope. No entity filter here — the client carries it. */
  async list(client: ScopedPolicyClient): Promise<Policy[]> {
    return client.policy.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedPolicyClient, input: CreatePolicyInput): Promise<Policy> {
    const extensions = input.extensions ?? {};

    // Read the catalog THROUGH the same scoped client, so the rows that come
    // back are exactly the ones this principal may use: global declarations
    // plus its own. A catalog read outside the scope would let one entity
    // validate against another's field list.
    const catalog = await client.extensionField.findMany({
      where: { entityType: ENTITY_TYPE, retiredAt: null },
    });

    // Validate BEFORE allocating a number. A rejected payload should not consume
    // a reference code — the alternative wastes one per typo.
    validateExtensions(extensions, catalog);

    try {
      // ⚠️ The counter and the insert are two statements, not one transaction,
      // so a failure between them leaves a gap in the sequence. That is
      // accepted: 02a requires ref_code to be unique and stable, never
      // contiguous, and a PostgreSQL sequence would behave the same way. The
      // alternative — threading $transaction through ScopedPolicyClient — widens
      // the interface every repository sees in order to avoid a cosmetic gap.
      //
      // This is also the first thing RLS refuses on a cross-entity write: the
      // counter is entity-scoped, so an out-of-scope orgEntityId fails here,
      // before the policy row is attempted.
      const refCode = await issueRefCode(client, {
        orgEntityId: input.orgEntityId,
        entityType: ENTITY_TYPE,
        prefix: REF_CODE_PREFIX,
      });

      return await client.policy.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          title: input.title,
          extensions: extensions as object,
          // owner_user_id / created_by / updated_by stay NULL: the only source
          // of "who is acting" is a credential, and there is none until M4.
          // Writing a placeholder user here would make the audit question
          // (M3) answerable with a lie.
        },
      });
    } catch (error) {
      // A refused write is an authorisation outcome, not a fault. Translating it
      // here rather than at the controller keeps the driver's error shape inside
      // core-model, which is the layer that owns the Prisma types.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      throw error;
    }
  }
}
