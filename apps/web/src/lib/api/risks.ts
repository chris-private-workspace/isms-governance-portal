/**
 * File: apps/web/src/lib/api/risks.ts
 * Purpose: The first place this application asks its own API for a product screen's data.
 * Category: ui
 * Scope: Phase W22 (M1 slice — risks vertical slice)
 * Owner: docs/01-planning/W22-risks-vertical-slice/plan.md §3.3
 *
 * Description:
 *   Two calls, no library. `fetch` with `cache: 'no-store'` is the pattern
 *   app/page.tsx:45 already uses against /health, and adding a data-fetching
 *   dependency to serve two endpoints is AP-5 with a spinner.
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
 *   - ApiUnavailableError: distinguishes "the backend is down" from "no such row"
 *
 * Created: 2026-08-18 (Phase W22)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W22) — CH-042
 *
 * Related:
 *   - apps/api/src/modules/risk/risk.controller.ts — the two endpoints
 *   - apps/web/src/app/page.tsx:45 — the fetch pattern this follows
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3210';

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
  /** lkh × MAX(impacts), computed by the database (ADR-0013). The screen's `inh`. */
  scoreBefore: number | null;
  scoreAfter: number | null;
  acceptanceStatus: string | null;
  inItRiskRegister: boolean | null;
  updatedAt: string;
}

/**
 * The envelope every entity-scoped endpoint carries while the scope comes from
 * a stub rather than a credential (dev-principal.ts). It is surfaced rather than
 * stripped: a screen that renders scoped data has to be able to say the scope
 * was not authenticated, and it cannot say so if the fetch layer ate the marker.
 */
export interface ScopedResponse<T> {
  data: T;
  _devPrincipal?: boolean;
  _warning?: string;
}

/**
 * Thrown when the API could not be reached or answered with something other
 * than a row or a 404.
 *
 * ⚠️ It exists so the page can tell this apart from an empty register. Falling
 * back to the fixture here would make a dead backend look like a working screen
 * — the exact shape verification-discipline.md forbids, and the reason AC-5
 * asks for a visible error state rather than a graceful one.
 */
export class ApiUnavailableError extends Error {
  constructor(readonly detail: string) {
    super('The risk register API did not answer: ' + detail);
    this.name = 'ApiUnavailableError';
  }
}

async function get<T>(path: string): Promise<ScopedResponse<T> | null> {
  let response: Response;
  try {
    response = await fetch(API_URL + path, { cache: 'no-store' });
  } catch (error) {
    throw new ApiUnavailableError(error instanceof Error ? error.message : 'network error');
  }

  // 404 is an answer, not a failure. It is also the ONLY answer for both "no
  // such risk" and "that risk belongs to another entity" — the API refuses to
  // distinguish them (約束 8), so this layer must not invent a distinction by
  // treating one as an error and the other as a result.
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new ApiUnavailableError('HTTP ' + response.status);
  }

  try {
    return (await response.json()) as ScopedResponse<T>;
  } catch {
    throw new ApiUnavailableError('the response was not JSON');
  }
}

export async function listRisks(): Promise<ScopedResponse<RiskRow[]>> {
  const answer = await get<RiskRow[]>('/risks');
  if (!answer) {
    // GET /risks has no 404 case; reaching here means the route moved.
    throw new ApiUnavailableError('GET /risks answered 404');
  }
  return answer;
}

/** Resolves null when the id is absent OR out of scope — indistinguishable by design. */
export async function getRisk(id: string): Promise<ScopedResponse<RiskRow> | null> {
  return get<RiskRow>('/risks/' + encodeURIComponent(id));
}
