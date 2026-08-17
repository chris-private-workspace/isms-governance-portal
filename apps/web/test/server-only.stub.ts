/**
 * File: apps/web/test/server-only.stub.ts
 * Purpose: Stands in for the `server-only` package under Vitest.
 * Category: Tooling
 * Scope: Phase W19
 *
 * Description:
 *   `server-only` resolves through an exports map: the `react-server`
 *   condition gets an empty module, everything else gets one that throws on
 *   import. Next sets that condition; Vitest does not, in either environment,
 *   so a server module that imports it cannot be unit-tested at all.
 *
 *   Aliasing it here rather than deleting the import from the source, because
 *   the import is the point — it is what stops `demo-session.ts` from being
 *   pulled into a client bundle, and that check happens where it matters, in
 *   the Next build. Losing it in tests costs nothing; losing it in the build
 *   would mean a session module shipped to the browser.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
export {};
