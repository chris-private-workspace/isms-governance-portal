/**
 * File: apps/api/src/core-model/risk.repository.ts
 * Purpose: The second scoped-client consumer — and the first write path whose refusal is not RLS.
 * Category: core-model
 * Scope: Phase W05 (M1 slice 2)
 * Owner: docs/14-adr/0013-risk-scoring-and-calibration.md
 *
 * Description:
 *   Shaped after policy.repository.ts on purpose. W04's design note claimed seven
 *   invariants were copyable and nothing had tested that claim; this file is the
 *   test. The client still arrives as a METHOD PARAMETER rather than an injected
 *   dependency, for the same three reasons recorded there — the boundary matrix,
 *   the per-request nature of a scope, and the absence of a credential source
 *   until M4. There is still no client of its own, so there is still no code path
 *   here that could query without a scope.
 *
 *   Two things differ from the policy path, and both are the point of this slice:
 *
 *   1. **THE SCORES ARE NOT WRITTEN HERE.** `CreateRiskInput` has no score field
 *      and the insert names none. The database computes them from the inputs in
 *      the same statement (ADR-0013), so there is nothing to keep in step and no
 *      opportunity to. What this layer does own is refusing a score set the
 *      database would also refuse — earlier, and naming the column.
 *
 *   2. **THE REFUSAL POINT MOVED.** A cross-entity POLICY is refused by RLS
 *      (42501) at the counter, before the row is attempted. A cross-entity ASSET
 *      REFERENCE is not: the risk's own entity is in scope, so RLS passes and the
 *      composite foreign key refuses with 23503 instead. Both translate to 404,
 *      and both are safe to translate because the database cannot distinguish
 *      "absent" from "not yours" in either case — but they are two detectors,
 *      not one, and assuming otherwise would have surfaced as a 500.
 *
 * Key Components:
 *   - RiskRepository.list(): scoped read
 *   - RiskRepository.create(): validate -> catalog -> issue ref_code -> insert -> translate
 *
 * Created: 2026-08-11 (Phase W05)
 * Last Modified: 2026-08-11
 *
 * Modification History (newest-first):
 *   - 2026-08-11: Initial creation (Phase W05) — second scoped-client consumer
 *
 * Related:
 *   - apps/api/src/core-model/policy.repository.ts — the shape being copied
 *   - apps/api/prisma/migrations/20260811024841_asset_and_risk_chain/migration.sql
 */
import { Injectable } from '@nestjs/common';
import type { CiaType, Risk } from '../generated/prisma';
import { validateExtensions } from './extension-validator';
import { issueRefCode } from './ref-code';
import { type ScoreSet, validateScoreSet } from './risk-score';
import {
  isScopeRefusal,
  isUnknownReference,
  ScopeRefusedError,
  UnknownReferenceError,
} from './scope-refusal';
import type { ScopedRiskClient } from './scoped-client.types';

const ENTITY_TYPE = 'risk';

/**
 * The one prefix 02a fixes itself (02a:89 shows `RISK-SG-000123`), so unlike
 * `POL` this is not a choice being recorded — it is a value being obeyed.
 * ⚠️ The design handoff shows `RSK` at 03:110; the design document wins
 * (CLAUDE.md authority ordering), and the disagreement is left visible rather
 * than resolved by a registry nobody asked for (W04 D3).
 */
const REF_CODE_PREFIX = 'RISK';

export interface CreateRiskInput {
  /**
   * Which entity the risk belongs to. RLS decides whether that was allowed — a
   * value outside the client's scope is refused by the database, not by a check
   * here (CLAUDE.md 約束 8: scope travels with the connection, never the argument).
   */
  readonly orgEntityId: string;
  readonly title: string;

  /**
   * The chain (已確認參數 #8). All three are required because the methodology
   * defines a risk AS the intersection of an asset, a threat and a vulnerability
   * — a risk naming no asset is not an incomplete record, it is a different
   * methodology.
   */
  readonly assetId: string;
  readonly threatId: string;
  readonly vulnerabilityId: string;
  readonly ciaType: CiaType;

  // `| undefined` explicitly: the project runs exactOptionalPropertyTypes, under
  // which `category?: string` refuses an explicitly-passed undefined. The
  // controller has to pass one — absent and present-but-undefined are the same
  // thing here — so the type says so.
  readonly category?: string | undefined;
  readonly description?: string | undefined;

  /**
   * Each set is complete or absent. 02a:343-353 puts a risk in Identified with
   * no inherent scores and in Treated with no residual ones, so "absent" is a
   * lifecycle state rather than a missing field.
   *
   * ⚠️ There is no `scoreBefore` / `scoreAfter` here, and there never will be.
   * The database refuses a supplied value outright; exposing a field that always
   * fails would be a worse API than not having one.
   */
  readonly before?: ScoreSet | undefined;
  readonly after?: ScoreSet | undefined;

  readonly extensions?: Readonly<Record<string, unknown>> | undefined;
}

@Injectable()
export class RiskRepository {
  /** Every risk within the client's scope. No entity filter — the client carries it. */
  async list(client: ScopedRiskClient): Promise<Risk[]> {
    return client.risk.findMany({
      where: { retiredAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(client: ScopedRiskClient, input: CreateRiskInput): Promise<Risk> {
    const extensions = input.extensions ?? {};

    // Validate BEFORE allocating a number, for the reason policy.repository.ts
    // records: a rejected payload should not consume a reference code. Scores
    // first because they are the cheapest check and the most likely to be wrong.
    validateScoreSet('before', input.before ?? {});
    validateScoreSet('after', input.after ?? {});

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

      return await client.risk.create({
        data: {
          orgEntityId: input.orgEntityId,
          refCode,
          title: input.title,
          category: input.category ?? null,
          description: input.description ?? null,
          assetId: input.assetId,
          threatId: input.threatId,
          vulnerabilityId: input.vulnerabilityId,
          ciaType: input.ciaType,
          extensions: extensions as object,
          ...spreadScoreSet('Before', input.before),
          ...spreadScoreSet('After', input.after),
          // owner_user_id / created_by / updated_by stay NULL until M4 supplies
          // a credential. score_* / acceptance_status / in_it_risk_register are
          // absent because they are generated columns — naming one here is a
          // hard error, not a silently ignored field.
        },
      });
    } catch (error) {
      // The row's own entity was out of scope: RLS refused at the counter.
      if (isScopeRefusal(error)) {
        throw new ScopeRefusedError(input.orgEntityId);
      }
      // The row was in scope but named an asset, threat or vulnerability it
      // cannot reach. Which of the three is not disclosed — the constraint name
      // would answer "does this id exist elsewhere?" by omission.
      if (isUnknownReference(error)) {
        throw new UnknownReferenceError('asset, threat or vulnerability');
      }
      throw error;
    }
  }
}

/**
 * Map one validated score set onto its six suffixed columns.
 *
 * Written as a spread rather than twelve literal properties so the two sets
 * cannot drift apart — the failure this avoids is a residual set that silently
 * writes into the inherent columns, which every gate would call green.
 */
function spreadScoreSet(suffix: 'Before' | 'After', set: ScoreSet | undefined) {
  return {
    [`lkh${suffix}`]: set?.lkh ?? null,
    [`fin${suffix}`]: set?.fin ?? null,
    [`bop${suffix}`]: set?.bop ?? null,
    [`lry${suffix}`]: set?.lry ?? null,
    [`rep${suffix}`]: set?.rep ?? null,
    [`sis${suffix}`]: set?.sis ?? null,
  };
}
