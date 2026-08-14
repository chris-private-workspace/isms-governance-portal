/**
 * File: apps/api/src/audit-trail/audit.module.ts
 * Purpose: Provide the audit hook globally, and name the modules it currently covers.
 * Category: audit-trail
 * Scope: Phase W12 (M3 spike, ADR-0003)
 *
 * Description:
 *   @Global because the consumer cannot import this module. ScopedPrismaFactory
 *   lives in entity-scope, which eslint.config.mjs:74 forbids from reaching
 *   audit-trail, so an ordinary `imports: [AuditModule]` on EntityScopeModule is
 *   not available. A global provider reaches it through the token in
 *   contracts/audit-hook.ts without either scope naming the other.
 *
 *   ⚠️ THE ALLOWLIST IS THE SCOPE OF THIS PHASE, WRITTEN DOWN. plan §3.3 connects
 *   ONE module so the numbers come from a real write path before ADR-0003
 *   chooses a strategy. Connecting the other ten is a wiring change to this line
 *   — not a redesign — and belongs after the decision, not before it.
 *
 *   ⚠️ A model missing from this set is silently unaudited. That is the honest
 *   cost of scoping the phase, and it is why audit.int.spec.ts asserts the
 *   NEGATIVE too: a write to an unlisted model must produce no row, so the list
 *   is demonstrably what decides rather than something that happens to be true.
 *
 * Created: 2026-08-14 (Phase W12)
 * Last Modified: 2026-08-14
 *
 * Modification History (newest-first):
 *   - 2026-08-14: Initial creation (Phase W12) — one model connected
 *
 * Related:
 *   - apps/api/src/contracts/audit-hook.ts — the token and the interface
 */
import { Global, Module } from '@nestjs/common';
import { AUDIT_HOOK } from '../contracts/audit-hook';
import { AuditLogRecorder } from './audit.recorder';

/**
 * The Prisma model names audited today: every model that has a repository write
 * path, minus one deliberate exclusion.
 *
 * ⭐ DERIVED, NOT TRANSCRIBED — rerun the derivation rather than trusting these
 * fifteen strings. Two independent passes, which must agree:
 *
 *   forward   grep -rn 'client\.\w*\.\(create\|update\|upsert\)' src --include='*.ts'
 *             (excluding *.spec.ts) -> 16 delegates
 *   reverse   grep -c '^model' prisma/schema.prisma -> 22, minus the forward set
 *             -> 6 with no write path
 *
 * ⛔ FIVE MODELS ARE ABSENT BECAUSE NOTHING CAN WRITE THEM YET: OrgEntity, User,
 * ExtensionField, Threat, Vulnerability. Listing a name that can never fire
 * would raise the coverage number without auditing anything — a Potemkin entry
 * (AP-3). They join when they get a write path, and the consistency test in
 * audit.int.spec.ts is what will say so.
 *
 * ⛔ REFCODECOUNTER IS EXCLUDED ON PURPOSE. W13 Day 3's N3 wired it back and
 * measured what happens, so these are results rather than arguments:
 *
 *   1. Two audit rows per domain create instead of one, and the second carries
 *      nothing: `resource_id` null, `after` null. An upsert passes
 *      {where, create, update} and no `data` key, so audit.recorder.ts:141 reads
 *      null and there is no payload to record.
 *   2. A MULTI-ENTITY scope THROWS. With no org_entity_id in the payload,
 *      resolveEntity falls back to the scope and refuses to guess between two
 *      entities — measured verbatim as `UnattributableWriteError: refusing
 *      RefCodeCounter.upsert ... the scope names 2 entities`. Every create a
 *      roll-up principal makes would fail.
 *   3. ⭐ A FAILED WRITE WOULD LEAVE AN AUDIT ROW BEHIND. issueRefCode runs in
 *      its OWN transaction, before the domain insert (policy.repository.ts:107
 *      says so and explains why), so when the insert is then rejected the
 *      counter's audit row has already committed. The trail would record
 *      something that did not happen — which is worse for an auditor than a
 *      missing row, and is the reason this exclusion is not a close call.
 *
 * ⚠️ AuditLog itself is absent and needs no exclusion: the recorder writes
 * through the UNEXTENDED client (scoped-prisma.provider.ts:127), so its own
 * insert never re-enters the hook.
 */
export const AUDITED_MODELS: ReadonlySet<string> = new Set([
  'Policy',
  'AssetGroup',
  'Asset',
  'Risk',
  'Control',
  'ControlTest',
  'Evidence',
  'Issue',
  'Action',
  'AssessmentTemplate',
  'AssessmentInstance',
  'AssessmentResponse',
  'RiskManagementReport',
  'RMReportVersion',
  'StatementOfApplicability',
]);

@Global()
@Module({
  providers: [{ provide: AUDIT_HOOK, useValue: new AuditLogRecorder(AUDITED_MODELS) }],
  exports: [AUDIT_HOOK],
})
export class AuditModule {}
