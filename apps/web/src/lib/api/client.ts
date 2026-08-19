/**
 * File: apps/web/src/lib/api/client.ts
 * Purpose: The one place this application talks to its own API over the wire.
 * Category: ui
 * Scope: Phase W24 (policies read path)
 * Owner: docs/01-planning/W24-policies-read-path-and-prose-guard/plan.md §3.3
 *
 * Description:
 *   `fetch` with `cache: 'no-store'`, the envelope every entity-scoped endpoint
 *   carries, and one error type. Nothing else — no data-fetching library, which
 *   for a handful of endpoints would be AP-5 with a spinner.
 *
 *   WHY THIS FILE EXISTS AT ALL. W22 wrote all of this inside lib/api/risks.ts
 *   because risks was the only caller. W24 added policies, and copying the
 *   fetch/envelope/error triple into a second file is AP-2 — the same logic
 *   implemented twice, drifting apart the first time one of them learns
 *   something. The anti-pattern checklist's own rule for AP-5 gives the timing:
 *   abstract when the second implementation appears, because that is when the
 *   boundary is known. It appeared.
 *
 * Key Components:
 *   - ScopedResponse<T>: the envelope, dev-principal marker surfaced not stripped
 *   - ApiUnavailableError: "the backend is down" as distinct from "no such row"
 *   - get<T>: one call; resolves null for 404, throws for everything else
 *
 * Created: 2026-08-19 (Phase W24)
 * Last Modified: 2026-08-19
 *
 * Modification History (newest-first):
 *   - 2026-08-19: Initial creation (Phase W24) — extracted from risks.ts, CH-044
 *
 * Related:
 *   - apps/web/src/lib/api/risks.ts · policies.ts — the two callers
 *   - apps/web/src/app/page.tsx:45 — the fetch pattern this follows
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3210';

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
 * ⚠️ It exists so a page can tell this apart from an empty register. Falling
 * back to the fixture here would make a dead backend look like a working screen
 * — the exact shape verification-discipline.md forbids, and the reason the
 * acceptance criteria ask for a visible error state rather than a graceful one.
 */
export class ApiUnavailableError extends Error {
  constructor(
    readonly detail: string,
    /** Which endpoint family failed, so the message names something a reader can find. */
    readonly resource = 'API',
  ) {
    super('The ' + resource + ' did not answer: ' + detail);
    this.name = 'ApiUnavailableError';
  }
}

/**
 * Resolves null on 404 — which is an ANSWER, not a failure, and is the only
 * answer for both "no such record" and "that record belongs to another entity".
 * The API refuses to distinguish them (約束 8), so this layer must not invent a
 * distinction by treating one as an error and the other as a result.
 */
export async function get<T>(path: string, resource = 'API'): Promise<ScopedResponse<T> | null> {
  let response: Response;
  try {
    response = await fetch(API_URL + path, { cache: 'no-store' });
  } catch (error) {
    throw new ApiUnavailableError(
      error instanceof Error ? error.message : 'network error',
      resource,
    );
  }

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new ApiUnavailableError('HTTP ' + response.status, resource);
  }

  try {
    return (await response.json()) as ScopedResponse<T>;
  } catch {
    throw new ApiUnavailableError('the response was not JSON', resource);
  }
}
