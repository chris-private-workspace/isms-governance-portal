/**
 * File: apps/web/src/lib/api/client.ts
 * Purpose: The one place this application talks to its own API over the wire.
 * Category: ui
 * Scope: Phase W24 (policies read path)
 * Owner: docs/01-planning/W24-policies-read-path-and-prose-guard/plan.md §3.3
 *
 * Description:
 *   `fetch` with `cache: 'no-store'`, the envelope every entity-scoped endpoint
 *   carries, and two error types. Nothing else — no data-fetching library, which
 *   for a handful of endpoints would be AP-5 with a spinner.
 *
 *   ⭐ W26 ADDED THE FIRST WRITE VERB. Until now every call here was a read, so
 *   the only failures worth telling apart were "unreachable" and "no such row".
 *   A write has a third: the server understood the request, could perform it,
 *   and REFUSED — an illegal lifecycle transition (422). Collapsing that into
 *   ApiUnavailableError would report a governance refusal as an outage, and the
 *   screen would offer "check the API is running" for a decision the API made
 *   deliberately. Hence ApiRefusedError, carrying what the server said instead.
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
 *   - ApiRefusedError: "the server said no on purpose" — 422, with the alternatives
 *   - get<T>: one call; resolves null for 404, throws for everything else
 *   - patch<T>: the write verb; 422 refuses, 404 resolves null, rest throws
 *
 * Created: 2026-08-19 (Phase W24)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Add patch() and ApiRefusedError (W26) — the first write path
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
 * Thrown when the server understood the request, was able to perform it, and
 * declined — HTTP 422.
 *
 * ⚠️ THE FIELD NAMES ARE COPIED FROM THE SERVER, NOT CHOSEN. policy.controller
 * .ts:186-191 puts `{message, from, to, allowed}` on the wire; a name guessed
 * wrong here does not fail, it silently reads `undefined` and the screen renders
 * a refusal with no alternatives — which looks like a server that offered none.
 *
 * `allowed` is the point of the type. The API answers an illegal transition by
 * naming the legal ones, so the screen can tell the reader what it should have
 * asked for. It defaults to `[]` when the body does not carry one, and callers
 * must treat empty as "the server named none" rather than printing an empty list
 * of options.
 */
export class ApiRefusedError extends Error {
  constructor(
    readonly detail: string,
    /** The state the server observed. Null when the body did not say. */
    readonly from: string | null,
    /** The state that was requested. Null when the body did not say. */
    readonly to: string | null,
    /** What the server says is legal instead. Empty means it named none. */
    readonly allowed: readonly string[],
    readonly resource = 'API',
  ) {
    super('The ' + resource + ' refused: ' + detail);
    this.name = 'ApiRefusedError';
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

/** What a 422 body might carry. Every field is checked, none is trusted. */
interface RefusalBody {
  message?: unknown;
  from?: unknown;
  to?: unknown;
  allowed?: unknown;
}

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/**
 * The write verb — this application's first.
 *
 * ⚠️ NOT SHARED WITH get(). The two overlap in about five lines of fetch
 * boilerplate and differ in the thing that matters: 422 means "refused" on a
 * write and has no meaning on a read. Folding them together would either give
 * reads a refusal path they cannot produce, or make 422 handling conditional on
 * the method — a branch that exists only to justify the sharing.
 *
 * ⚠️ 404 IS WIDER HERE THAN ON THE READ PATH. It still covers absent and
 * out-of-scope, and it also covers "the row is no longer in the status the
 * server just read" — transitionStatus() does a compare-and-set and does not
 * tell the three apart (policy.controller.ts:202-207). A caller rendering a
 * message for this case must not say "no such policy": it may well exist and
 * have simply moved.
 */
export async function patch<T>(
  path: string,
  body: unknown,
  resource = 'API',
): Promise<ScopedResponse<T> | null> {
  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiUnavailableError(
      error instanceof Error ? error.message : 'network error',
      resource,
    );
  }

  if (response.status === 404) {
    return null;
  }

  if (response.status === 422) {
    // A refusal whose body did not parse is still a refusal. Falling through to
    // ApiUnavailableError here would file the server's decision as an outage.
    const refusal = (await response.json().catch(() => ({}))) as RefusalBody;
    throw new ApiRefusedError(
      asString(refusal.message) ?? 'HTTP 422',
      asString(refusal.from),
      asString(refusal.to),
      Array.isArray(refusal.allowed)
        ? refusal.allowed.filter((value): value is string => typeof value === 'string')
        : [],
      resource,
    );
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
