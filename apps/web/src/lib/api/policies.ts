/**
 * File: apps/web/src/lib/api/policies.ts
 * Purpose: What GET /policies puts on the wire, as the policy register reads it.
 * Category: ui
 * Scope: Phase W24 (policies read path)
 * Owner: docs/01-planning/W24-policies-read-path-and-prose-guard/plan.md §3.3
 *
 * Description:
 *   Two calls. The fetch, the envelope and the error types live in ./client.ts.
 *
 *   ⚠️ THE TYPE BELOW IS THIS APPLICATION'S VIEW OF THE WIRE, NOT A CONTRACT.
 *   The API declares no DTO for policies — policy.controller.ts returns the
 *   Prisma row — so putting a PolicyRow in the contracts package would create an
 *   entry only one side reads. Same reasoning, same register, as
 *   AD-RiskContractUndeclared-1; when the API declares the shape, this moves.
 *
 *   ⚠️ WHAT THE API DOES NOT SEND. Measured 2026-08-19 against a running server
 *   (`curl localhost:3210/policies`), not inferred from the schema. Of the eight
 *   columns the register renders, four have no source at all:
 *
 *     category    — no such column on Policy. The screen's five categories
 *                   (Security / Privacy / Compliance / Operational / HR) are a
 *                   fixture vocabulary with nothing behind it. This is also why
 *                   the category filter goes: a filter over a column that does
 *                   not exist can only offer an empty list.
 *     owner       — owner_user_id is on the row and is ALWAYS null. Not "not
 *                   wired yet": seed.ts refuses to invent one because a made-up
 *                   name is made-up PII (guardrail 7), and the column fills from
 *                   a credential at M4.
 *     next review — no such column. A review date is a governance commitment
 *                   about a specific record; rendering a fixture one beside a
 *                   real policy is exactly AD-FixtureProseBecomesForgedEvidence-1.
 *     attestation — no such column and no endpoint. Attestation is its own table
 *                   (W14) with no read path yet, so the percentage and its
 *                   coloured bar have nothing to stand on.
 *
 *   And one that arrives in a different shape than the screen expects:
 *
 *     version     — the API sends an integer (3). The fixture rendered "v4.1".
 *                   There is no minor version anywhere in the schema, so the
 *                   dot-something was invented by the mockup.
 *
 *   `status` DOES arrive, but in the API's own vocabulary: six lifecycle states
 *   from 02a:300-312, where the fixture had three. The mapping is in the page.
 *
 * Key Components:
 *   - PolicyRow: the fields the API actually returns and this app actually reads
 *   - listPolicies: the read
 *   - transitionPolicy: the write — one lifecycle step, guarded server-side
 *
 * Created: 2026-08-19 (Phase W24)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Add transitionPolicy and the `allowed` field (W26) — CH-048
 *   - 2026-08-19: Initial creation (Phase W24) — CH-044
 *
 * Related:
 *   - apps/api/src/modules/policy/policy.controller.ts — the endpoint
 *   - apps/web/src/lib/api/risks.ts — the same shape, one phase earlier
 */
import { ApiUnavailableError, get, patch, type ScopedResponse } from './client';

/** Names this endpoint family in ApiUnavailableError's message. */
const RESOURCE = 'policy register API';

/** What GET /policies actually puts on the wire, as this app reads it. */
export interface PolicyRow {
  id: string;
  refCode: string;
  orgEntityId: string;
  title: string;
  /** An integer. The fixture's "v4.1" had no source — the schema has no minor. */
  version: number;
  /** The API's own six-state vocabulary (02a:300-312), NOT the fixture's three. */
  status: string;
  /**
   * The legal next states, derived server-side from the transition table
   * (policy.controller.ts:123-125). Required, not optional: the API attaches it
   * to every policy it returns, and `retired` carries `[]` — an empty list is
   * the claim "nothing follows this", which is not the same fact as a missing
   * field and must not degrade into it.
   *
   * ⚠️ This app does NOT hold a copy of the table. That is the whole reason the
   * field is on the wire: a second copy here would compile fine and drift the
   * first time 02a §4 gains an edge, rendering buttons that are wrong rather
   * than buttons that are missing.
   */
  allowed: readonly string[];
  updatedAt: string;
}

export async function listPolicies(): Promise<ScopedResponse<PolicyRow[]>> {
  const answer = await get<PolicyRow[]>('/policies', RESOURCE);
  if (!answer) {
    // GET /policies has no 404 case; reaching here means the route moved.
    throw new ApiUnavailableError('GET /policies answered 404', RESOURCE);
  }
  return answer;
}

/**
 * Advance one policy by one lifecycle step.
 *
 * ⚠️ NULL IS A REAL OUTCOME AND IT IS NOT SIMPLY "NOT FOUND". The endpoint
 * answers 404 for absent, out-of-scope, AND "the row moved since the server read
 * it" (policy.controller.ts:202-207), so the caller's message has to hold all
 * three without asserting any one of them.
 *
 * A refusal — the transition is illegal from the current state — arrives as
 * ApiRefusedError instead, carrying what the server says is legal.
 */
export async function transitionPolicy(
  id: string,
  to: string,
): Promise<ScopedResponse<PolicyRow> | null> {
  return patch<PolicyRow>('/policies/' + id + '/status', { to }, RESOURCE);
}
