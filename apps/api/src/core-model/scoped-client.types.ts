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
 *   - ScopedControlTestClient / ScopedEvidenceClient: same guard, kept by a trigger instead
 *   - ScopedIssueClient / ScopedActionClient: back to a composite key, because Issue can anchor
 *   - ScopedAssessment{Template,Instance,Response}Client: the first omission that cost something
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-13
 *
 * Modification History (newest-first):
 *   - 2026-08-13: Add the assessment trio (W09) — a trigger keeps the parent unread
 *   - 2026-08-12: Add Issue + Action (W08) — the guard swings back to a composite key
 *   - 2026-08-12: Add ControlTest + Evidence (W07) — parent guard is a trigger here
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
  Action,
  AssessmentInstance,
  AssessmentResponse,
  AssessmentTemplate,
  Asset,
  AssetGroup,
  Attestation,
  Control,
  ControlTest,
  Evidence,
  ExtensionField,
  Issue,
  OrgEntity,
  Policy,
  Prisma,
  RefCodeCounter,
  Risk,
  RiskManagementReport,
  RMReportVersion,
  StatementOfApplicability,
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
 * One execution of a control test (W07).
 *
 * ⚠️ Deliberately does NOT expose `control`, for the reason ScopedAssetClient
 * records about `assetGroup` — but arrived at by a different route, and that
 * difference is worth reading before this interface is ever widened. There the
 * oracle was unwritable because a COMPOSITE foreign key gave one error for both
 * "absent" and "not yours". `controls` has no such key and cannot have one, so
 * here the collapsing is done by a BEFORE trigger that runs ahead of the
 * constraint (measured, W07 Day 1 M5). Same guarantee, different mechanism, same
 * conclusion: a repository able to read the control table first could tell the
 * two apart, so it is not given the delegate.
 */
export interface ScopedControlTestClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly controlTest: {
    findMany(args?: Prisma.ControlTestFindManyArgs): Promise<ControlTest[]>;
    create(args: Prisma.ControlTestCreateArgs): Promise<ControlTest>;
  };
}

/**
 * Evidence attached to a record (W07).
 *
 * ⚠️ Deliberately does NOT expose `controlTest`, and the omission carries more
 * weight here than anywhere else in this file: `linked_id` has NO foreign key at
 * all (02a:227 is polymorphic), so without the trigger a row could name any id
 * including one that exists nowhere — measured, W07 Day 1 M3b. Everything
 * standing between this repository and that is in the database. Granting the
 * delegate would put a second, weaker copy of the check up here and invite the
 * two to disagree.
 */
export interface ScopedEvidenceClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly evidence: {
    findMany(args?: Prisma.EvidenceFindManyArgs): Promise<Evidence[]>;
    create(args: Prisma.EvidenceCreateArgs): Promise<Evidence>;
  };
}

/**
 * Findings raised by any module (W08).
 *
 * No omission to justify here, and that is the point worth recording: Issue is a
 * PARENT. Its children name it, not the other way round.
 */
export interface ScopedIssueClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly issue: {
    findMany(args?: Prisma.IssueFindManyArgs): Promise<Issue[]>;
    create(args: Prisma.IssueCreateArgs): Promise<Issue>;
  };
}

/**
 * Corrective actions under an issue (W08).
 *
 * ⚠️ Deliberately does NOT expose `issue` — the same omission as ScopedAssetClient
 * and ScopedControlTestClient, and the third distinct mechanism enforcing it.
 * W05 relied on a composite foreign key, W07 on a BEFORE trigger because the
 * parent refused an anchor; `issues` offers one, so this is back to the key.
 *
 * The reason the omission survives all three: whatever collapses "another
 * entity's issue" and "no such issue" into one error lives in the database, and a
 * repository able to read the issue table first could tell them apart. That is
 * the oracle 約束 8 forbids. Not granting the delegate is what makes it
 * unwritable rather than merely discouraged.
 */
export interface ScopedActionClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly action: {
    findMany(args?: Prisma.ActionFindManyArgs): Promise<Action[]>;
    create(args: Prisma.ActionCreateArgs): Promise<Action>;
  };
}

/**
 * Versioned question sets (W09).
 *
 * The only one of the three assessment interfaces with no parent to withhold —
 * a template references nothing but its own entity and its owner.
 */
export interface ScopedAssessmentTemplateClient
  extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly assessmentTemplate: {
    findMany(args?: Prisma.AssessmentTemplateFindManyArgs): Promise<AssessmentTemplate[]>;
    create(args: Prisma.AssessmentTemplateCreateArgs): Promise<AssessmentTemplate>;
  };
}

/**
 * Assignments (W09).
 *
 * ⚠️ Deliberately does NOT expose `assessmentTemplate`, and W09 is the first
 * phase where that omission cost something rather than merely being observed.
 * 02a:330 requires `template_version` to be a snapshot of the template's version
 * at assignment — which needs the template read. Granting the delegate to fetch
 * one integer would have handed this repository the ability to tell "another
 * entity's template" from "no such template", the oracle every interface above
 * is shaped to prevent.
 *
 * The database takes the snapshot instead (a BEFORE INSERT trigger under the
 * caller's own RLS), so the omission survives AND the column means what 02a says
 * it means. The alternative — accepting the version from the caller — would have
 * kept this interface narrow while making the column a caller's assertion.
 */
export interface ScopedAssessmentInstanceClient
  extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly assessmentInstance: {
    findMany(args?: Prisma.AssessmentInstanceFindManyArgs): Promise<AssessmentInstance[]>;
    create(args: Prisma.AssessmentInstanceCreateArgs): Promise<AssessmentInstance>;
  };
}

/**
 * Answers (W09).
 *
 * ⚠️ Withholds TWO parents — `assessmentInstance` and `evidence` — because a
 * response names both. The composite foreign keys give one error for either
 * being unreachable, and a repository able to read either table could split that
 * back apart one id at a time.
 */
export interface ScopedAssessmentResponseClient
  extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly assessmentResponse: {
    findMany(args?: Prisma.AssessmentResponseFindManyArgs): Promise<AssessmentResponse[]>;
    create(args: Prisma.AssessmentResponseCreateArgs): Promise<AssessmentResponse>;
  };
}

/**
 * Controlled risk-management deliverables (W10).
 *
 * A parent, like Issue — nothing to withhold. Note what is NOT here either:
 * no `update`. Promoting a version is an UPDATE of `current_version_id`, and it
 * is done by an AFTER INSERT trigger in the database, not from here. See
 * ScopedRmReportVersionClient for why that had to be true.
 */
export interface ScopedRmReportClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly riskManagementReport: {
    findMany(args?: Prisma.RiskManagementReportFindManyArgs): Promise<RiskManagementReport[]>;
    create(args: Prisma.RiskManagementReportCreateArgs): Promise<RiskManagementReport>;
  };
}

/**
 * Approved point-in-time sheets (W10).
 *
 * ⚠️ Deliberately does NOT expose `riskManagementReport` — the same omission as
 * every child interface above, kept by the composite key (W08's option B, since
 * rm_reports offers the anchor).
 *
 * ⭐ AND IT NEARLY DID NOT SURVIVE, for a reason none of the earlier ones faced.
 * Issuing a version must also move the report's pointer, so this interface
 * appeared to need `riskManagementReport.update`. Granting a WRITE without a
 * READ would not have been the oracle 約束 8 forbids — an update on an
 * unreachable report is a not-found either way — but the two writes still had to
 * be one unit of work, and runScoped gives every operation its own transaction
 * (scoped-prisma.provider.ts:83). W04 already refused the fix that would help:
 * threading $transaction through these interfaces (policy.repository.ts:111).
 *
 * The database promotes instead, in the same statement as the insert
 * (20260813152548_promote_on_issue). So this interface is narrow AND the two
 * writes cannot come apart — the W09 template_version resolution, second use.
 *
 * ⚠️ Consequence worth knowing before widening this: a version repository cannot
 * compute `isCurrent`, because that fact lives on the report. It should not — a
 * derived copy beside the pointer is the second representation 02a:257 was cut
 * for.
 */
export interface ScopedRmReportVersionClient
  extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly rMReportVersion: {
    findMany(args?: Prisma.RMReportVersionFindManyArgs): Promise<RMReportVersion[]>;
    create(args: Prisma.RMReportVersionCreateArgs): Promise<RMReportVersion>;
  };
}

/**
 * Statement of Applicability rows (W11).
 *
 * ⚠️ Exposes NEITHER `control` NOR any framework table, and for two different
 * reasons. There is no framework table to expose (02a never defines one — see the
 * model header), and `control` is withheld for the reason every other client in
 * this file withholds its neighbours: a repository reaches only what its own
 * writes need, so a future caller cannot travel sideways through a type it was
 * handed for something else.
 */
export interface ScopedSoaClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly statementOfApplicability: {
    findMany(
      args?: Prisma.StatementOfApplicabilityFindManyArgs,
    ): Promise<StatementOfApplicability[]>;
    create(args: Prisma.StatementOfApplicabilityCreateArgs): Promise<StatementOfApplicability>;
  };
}

/**
 * Sign-offs on a policy or control (W14).
 *
 * ⚠️ Deliberately exposes NEITHER `policy` NOR `control`, and this is the first
 * interface in the file that withholds TWO parents of DIFFERENT tables — the
 * assessment-response client withholds two, but both by composite key. Here
 * `subject_id` has no foreign key at all (02a:235 is polymorphic), so everything
 * standing between this repository and an arbitrary uuid is the trigger, exactly
 * as ScopedEvidenceClient records.
 *
 * ⛔ AND ONE DIFFERENCE FROM EVERY OMISSION ABOVE, measured in W14 Day 0 rather
 * than inherited: the collapsing this protects is NOT total. `controls_read`
 * widens for `applies_to_scope = 'group'` (ADR-0014), so for a group-shared
 * control the trigger answers "reachable" from any entity — by design (02a:434).
 * The omission still matters for `policy` subjects and for entity-local
 * controls; it simply does not buy the same guarantee across the whole column,
 * and a test that assumes otherwise proves nothing (AD-VacuousScopeTest-1).
 *
 * ⚠️ No `update`, matching the migration: there is no UPDATE policy and no UPDATE
 * grant on this table. A correction is a new attestation.
 */
export interface ScopedAttestationClient extends ScopedRefCodeClient, ScopedExtensionCatalogClient {
  readonly attestation: {
    findMany(args?: Prisma.AttestationFindManyArgs): Promise<Attestation[]>;
    create(args: Prisma.AttestationCreateArgs): Promise<Attestation>;
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
