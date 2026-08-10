/**
 * File: apps/api/src/core-model/scoped-client.types.ts
 * Purpose: The query surface core-model needs, declared without importing entity-scope.
 * Category: core-model
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0005-governed-extension-storage.md
 *
 * Description:
 *   `scope-boundaries.md` recorded an unverified intention: core-model obtains a
 *   scoped client "by DI rather than by import", with the type living in the
 *   contracts layer. W02 measured that the second half cannot work — contracts
 *   is a leaf (MATRIX: api -> ['api']) and the generated Prisma client is
 *   classified as core-model, so a contract type cannot name it.
 *
 *   W03 measured what does work, and it is simpler than the intention: core-model
 *   declares the SHAPE it needs, structurally. The scoped client produced by
 *   entity-scope satisfies that shape without anybody importing across the
 *   boundary in either direction — TypeScript checks the match at the one place
 *   that can legally see both (the modules layer, which the matrix allows).
 *
 *   The same technique already exists one scope over: ScopeCarrier in
 *   scoped-prisma.provider.ts:60 is declared structurally so a test double can
 *   stand in for PrismaClient. This is that idea applied to the boundary.
 *
 *   ⚠️ Why this is NOT a DI token: a token would need a provider, a provider
 *   would need a per-request scope, and a per-request scope needs a credential
 *   source that does not exist until M4. Creating one now yields a token with
 *   zero consumers — AP-5 plus AP-3, which AD-ScopedClientDI-1 names explicitly.
 *
 * Key Components:
 *   - ScopedPolicyClient: the delegates a policy repository needs, and no others
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-10
 *
 * Modification History (newest-first):
 *   - 2026-08-10: Initial creation (Phase W03) — structural shape, not a token
 *
 * Related:
 *   - docs/rules-on-demand/scope-boundaries.md §一個尚未被驗證的設計意圖
 *   - apps/api/src/entity-scope/scoped-prisma.provider.ts:106 — what satisfies this
 */
import type { ExtensionField, Policy, Prisma } from '../generated/prisma';

/**
 * Deliberately narrow: only the operations a policy repository performs.
 *
 * Narrowness is the point. A repository handed the whole PrismaClient can reach
 * any table; handed this, it can reach two, and adding a third is a visible
 * edit here rather than an unnoticed line in a method body.
 */
export interface ScopedPolicyClient {
  readonly policy: {
    findMany(args?: Prisma.PolicyFindManyArgs): Promise<Policy[]>;
    create(args: Prisma.PolicyCreateArgs): Promise<Policy>;
  };
  readonly extensionField: {
    findMany(args?: Prisma.ExtensionFieldFindManyArgs): Promise<ExtensionField[]>;
  };
}
