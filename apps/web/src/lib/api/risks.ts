/**
 * File: apps/web/src/lib/api/risks.ts
 * Purpose: The first place this application asks its own API for a product screen's data.
 * Category: ui
 * Scope: Phase W22 (M1 slice — risks vertical slice)
 * Owner: docs/01-planning/W22-risks-vertical-slice/plan.md §3.3
 *
 * Description:
 *   Two calls. The fetch, the envelope and the error type moved to ./client.ts
 *   in W24, when policies became the second caller and keeping a private copy
 *   of them here would have been AP-2.
 *
 *   ⚠️ THE TYPE BELOW IS THIS APPLICATION'S VIEW OF THE WIRE, NOT A CONTRACT.
 *   HealthResponse lives in @isms/types because BOTH sides import it. The API
 *   declares no DTO for risks — risk.controller.ts returns the Prisma row — so
 *   putting a RiskRow in the contracts package would create an entry only one
 *   side reads: a parallel definition wearing a contract's clothes, which is
 *   the failure mode packages/types exists to prevent. Recorded as
 *   AD-RiskContractUndeclared-1; when the API declares the shape, this moves.
 *
 *   ⚠️ WHAT THE API DOES NOT SEND. Measured 2026-08-18 against a running server,
 *   not inferred from the schema. Of the twelve columns the risks table renders,
 *   five have no source at all:
 *
 *     entity code   — the row carries org_entity_id, a UUID. No endpoint
 *                     resolves it, and the UI's OpCo list (RSG, RHK, …) and the
 *                     database's entities (SG1, HK1) do not overlap at all
 *                     (AD-EntityVocabularyMismatch-1)
 *     controls      — control linkage is slice 3 (02a:393)
 *     status        — the API's enum is `identified`; the screen's four values
 *                     (Open / Treatment / Monitored / Accepted) are a different
 *                     vocabulary, not a renaming
 *     owner / role  — owner_user_id is null until a credential exists at M4
 *
 *   They are absent from RiskRow on purpose. A field that the screen fills from
 *   somewhere else does not belong in the type describing what the API sent.
 *
 * Key Components:
 *   - RiskRow: the fields the API actually returns and this app actually reads
 *   - listRisks / getRisk: the two calls; getRisk resolves null for 404
 *
 * Created: 2026-08-18 (Phase W22)
 * Last Modified: 2026-08-19
 *
 * Modification History (newest-first):
 *   - 2026-08-19: Move fetch/envelope/error to client.ts (Phase W24) — CH-044
 *   - 2026-08-18: Initial creation (Phase W22) — CH-042
 *
 * Related:
 *   - apps/api/src/modules/risk/risk.controller.ts — the two endpoints
 *   - apps/web/src/app/page.tsx:45 — the fetch pattern this follows
 */
import { ApiUnavailableError, get, type ScopedResponse } from './client';

/** What GET /risks and GET /risks/:id actually put on the wire, as this app reads it. */
export interface RiskRow {
  id: string;
  refCode: string;
  orgEntityId: string;
  title: string;
  category: string | null;
  description: string | null;
  /** The API's own status vocabulary. NOT the four values the screen renders. */
  status: string;
  /** Likelihood, before control. The screen's `lik`. */
  lkhBefore: number | null;
  /**
   * Likelihood, AFTER control. Needed because the residual is a SEPARATE
   * measurement, not a function of the inherent one — W22's drive-through found
   * the list showing 4 and the detail showing 12 for the same risk, because the
   * detail recomputed the residual from the before-control factors.
   */
  lkhAfter: number | null;
  /** lkh × MAX(impacts), computed by the database (ADR-0013). The screen's `inh`. */
  scoreBefore: number | null;
  scoreAfter: number | null;
  acceptanceStatus: string | null;
  inItRiskRegister: boolean | null;
  updatedAt: string;
}

/** Names this endpoint family in ApiUnavailableError's message. */
const RESOURCE = 'risk register API';

export async function listRisks(): Promise<ScopedResponse<RiskRow[]>> {
  const answer = await get<RiskRow[]>('/risks', RESOURCE);
  if (!answer) {
    // GET /risks has no 404 case; reaching here means the route moved.
    throw new ApiUnavailableError('GET /risks answered 404', RESOURCE);
  }
  return answer;
}

/** Resolves null when the id is absent OR out of scope — indistinguishable by design. */
export async function getRisk(id: string): Promise<ScopedResponse<RiskRow> | null> {
  return get<RiskRow>('/risks/' + encodeURIComponent(id), RESOURCE);
}
