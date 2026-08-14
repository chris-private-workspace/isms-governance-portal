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

/** The Prisma model names audited today. W12 connects exactly one. */
export const AUDITED_MODELS: ReadonlySet<string> = new Set(['StatementOfApplicability']);

@Global()
@Module({
  providers: [{ provide: AUDIT_HOOK, useValue: new AuditLogRecorder(AUDITED_MODELS) }],
  exports: [AUDIT_HOOK],
})
export class AuditModule {}
