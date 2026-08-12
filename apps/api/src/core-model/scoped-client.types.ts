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
 *   - ScopedRefCodeClient: what issuing a reference code needs
 *   - ScopedExtensionCatalogClient: what validating governed extensions needs
 *   - ScopedPolicyClient / ScopedRiskClient / ScopedControlClient: the above, plus one table each
 *   - ScopedAssetGroupClient / ScopedAssetClient: split so the asset path cannot read groups
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Add Control + the split asset pair (W06) — the split is an oracle guard
 *   - 2026-08-11: Add ScopedRiskClient; extract the catalog half (W05) — second consumer
 *   - 2026-08-10: Add ScopedRefCodeClient (W04) — ScopedPolicyClient extends it
 *   - 2026-08-10: Initial creation (Phase W03) — structural shape, not a token
 *
 * Related:
 *   - docs/rules-on-demand/scope-boundaries.md §一個尚未被驗證的設計意圖
 *   - apps/api/src/entity-scope/scoped-prisma.provider.ts:106 — what satisfies this
 */
import type {
  Asset,
  AssetGroup,
  Control,
  ExtensionField,
  OrgEntity,
  Policy,
  Prisma,
  RefCodeCounter,
  Risk,
} from '../generated/prisma';

/**
 * Deliberately narrow: only the operations a policy repository performs.
 *
 * Narrowness is the point. A repository handed the whole PrismaClient can reach
 * any table; handed this, it can reach two, and adding a third is a visible
 * edit here rather than an unnoticed line in a method body.
 */
export interface ScopedPolicyClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly policy: {
    findMany(args?: Prisma.PolicyFindManyArgs): Promise<Policy[]>;
    create(args: Prisma.PolicyCreateArgs): Promise<Policy>;
  };
}

/**
 * The same narrowness, for the second business table (W05).
 *
 * ⚠️ Deliberately does NOT expose `asset`, `threat` or `vulnerability`. A risk
 * names all three, but it names them by id and the DATABASE decides whether
 * those ids are reachable — the composite foreign key refuses another entity's
 * asset, and W05 measured that it gives the identical error for an id that does
 * not exist. A repository that could read the asset table first would be able to
 * tell those two apart, which is precisely the oracle 約束 8 forbids. Not
 * granting the delegate is what makes that unwritable rather than merely
 * discouraged.
 */
export interface ScopedRiskClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly risk: {
    findMany(args?: Prisma.RiskFindManyArgs): Promise<Risk[]>;
    create(args: Prisma.RiskCreateArgs): Promise<Risk>;
  };
}

/**
 * The control library (W06).
 *
 * ⚠️ `findMany` here reaches rows this client does NOT own — the read policy is
 * widened for `applies_to_scope = 'group'` (ADR-0014). That is the one place in
 * this file where a scoped delegate is not a synonym for "my entity's rows", and
 * it is deliberate: a group-shared control library that only its author can read
 * is not the thing 00:59 promises.
 */
export interface ScopedControlClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly control: {
    findMany(args?: Prisma.ControlFindManyArgs): Promise<Control[]>;
    create(args: Prisma.ControlCreateArgs): Promise<Control>;
  };
}

/**
 * The asset-group half of the asset chain (W06).
 *
 * Separate from ScopedAssetClient rather than merged, and the separation is the
 * control: see that interface for what merging them would make writable.
 */
export interface ScopedAssetGroupClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly assetGroup: {
    findMany(args?: Prisma.AssetGroupFindManyArgs): Promise<AssetGroup[]>;
    create(args: Prisma.AssetGroupCreateArgs): Promise<AssetGroup>;
  };
}

/**
 * The asset half (W06).
 *
 * ⚠️ Deliberately does NOT expose `assetGroup`, for the reason ScopedRiskClient
 * records about `asset`. Creating an asset names a group by id, and the
 * COMPOSITE foreign key refuses another entity's group with the identical error
 * it gives for a group that does not exist (measured, W05 Day 2). A repository
 * that could read the group table first would be able to tell those apart —
 * which is the oracle 約束 8 forbids. Both delegates exist on the same runtime
 * object; what makes the oracle unwritable is that this TYPE cannot name one.
 */
export interface ScopedAssetClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly asset: {
    findMany(args?: Prisma.AssetFindManyArgs): Promise<Asset[]>;
    create(args: Prisma.AssetCreateArgs): Promise<Asset>;
  };
}

/**
 * The catalog read that governed-extension validation needs (ADR-0005).
 *
 * Extracted in W05 rather than in W03, on purpose: with one consumer this would
 * have been an abstraction with a single implementation (AP-5). The second
 * consumer is what shows where the seam actually is.
 */
export interface ScopedExtensionCatalogClient {
  readonly extensionField: {
    findMany(args?: Prisma.ExtensionFieldFindManyArgs): Promise<ExtensionField[]>;
  };
}

/**
 * What issuing a reference code needs, and nothing else.
 *
 * Split from ScopedPolicyClient rather than merged into it: the issuer is used
 * by every repository that mints a ref_code, and a shared interface that
 * happens to also expose `policy` would let a future caller reach a table it
 * has no business touching.
 */
export interface ScopedRefCodeClient {
  readonly refCodeCounter: {
    upsert(args: Prisma.RefCodeCounterUpsertArgs): Promise<RefCodeCounter>;
  };
  readonly orgEntity: {
    findUnique(args: Prisma.OrgEntityFindUniqueArgs): Promise<OrgEntity | null>;
  };
}
