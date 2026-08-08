/**
 * File: packages/types/src/index.ts
 * Purpose: The cross-scope contract layer's public surface.
 * Category: api (contract layer)
 * Scope: Phase W01 (M0)
 * Owner: docs/rules-on-demand/scope-boundaries.md §共用型別的單一來源
 *
 * Description:
 *   Every type shared across scope boundaries lives here and nowhere else.
 *   The import matrix makes this package a leaf: everyone may import it, it
 *   may import no one. That is what stops the same concept being defined twice
 *   and drifting apart — the failure mode scope-boundaries.md warns about,
 *   where both definitions look correct in isolation.
 *
 *   ⚠️ Deliberately TYPE-ONLY, with no build step. `package.json` points
 *   `types` straight at this source file, so consumers compile against the
 *   real thing and CI's `npm run build -w apps/api -w apps/web` does not need
 *   a prior build of this package. The moment a runtime value is needed here
 *   (an enum, a const object, a validator) that stops being true and the CI
 *   build invocation has to change with it.
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Initial creation (Phase W01) — health contract only
 */

/** Liveness of a downstream dependency, as reported by `GET /health`. */
export type DependencyState = 'up' | 'down';

/**
 * Response of `GET /health`.
 *
 * `db` is the result of an actual round trip to PostgreSQL, not a constant.
 * The W01 drive-through proves that by stopping the database and requiring the
 * value to change — a health check that cannot report 'down' is decoration.
 */
export interface HealthResponse {
  readonly status: DependencyState;
  readonly db: DependencyState;
}
