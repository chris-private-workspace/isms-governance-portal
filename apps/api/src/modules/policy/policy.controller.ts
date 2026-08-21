/**
 * File: apps/api/src/modules/policy/policy.controller.ts
 * Purpose: The platform's first business endpoint — and the only place that sees both scopes.
 * Category: modules
 * Scope: Phase W03 (governed extensions)
 * Owner: docs/14-adr/0005-governed-extension-storage.md
 *
 * Description:
 *   This is the layer the boundary matrix permits to import BOTH core-model and
 *   entity-scope, which is what makes the W03 split work: it resolves a scope,
 *   obtains a scoped client, and hands that client to a repository that could
 *   never have named its type.
 *
 *   Three behaviours here are required rather than chosen:
 *
 *   1. **404, never 403, for a record outside the scope.** 403 confirms the id
 *      exists, which tells a caller they guessed right (CLAUDE.md 約束 8). The
 *      scoped client cannot see the row at all, so "denied" and "absent" reach
 *      this code as the same thing — which is the point, not a limitation.
 *      The write path answers 404 for the same reason: the database refuses an
 *      out-of-scope INSERT and a nonexistent entity id with the identical error
 *      (W03 Day 3 measured 4 × 42501, 0 × 23503), so it too cannot distinguish
 *      them. Before this, that refusal surfaced as 500 — see scope-refusal.ts.
 *   2. **The scope is never read from the request.** No header, no query
 *      parameter, no body field. Today it comes from a dev stub that announces
 *      itself; at M4 it comes from the token, and this file changes by one line.
 *   3. **Extension failures are 422, not 500.** They are the caller's data, not
 *      an outage — ExtensionValidationError carries the offending key.
 *
 * Key Components:
 *   - GET /policies — scoped list
 *   - GET /policies/:id — the 404-not-403 case
 *   - POST /policies — catalog-validated write
 *   - PATCH /policies/:id/status — the lifecycle transition; guard here, set in the repository
 *   - withAllowed() — attaches the legal next states, derived so no client holds a second table
 *
 * Created: 2026-08-10 (Phase W03)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Attach `allowed` to every policy response (W26) — the UI needs the edges
 *   - 2026-08-21: Add the status transition endpoint (W25) — the repo's first update path
 *   - 2026-08-10: Answer 404 for a scope-refused write (W03) — was leaking 500
 *   - 2026-08-10: Initial creation (Phase W03)
 *
 * Related:
 *   - docs/rules-on-demand/multi-tenant-data.md — 404-not-403
 *   - apps/api/src/modules/policy/dev-principal.ts — what M4 removes
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExtensionValidationError } from '../../core-model/extension-validator';
import { PolicyRepository } from '../../core-model/policy.repository';
import { ScopeRefusedError } from '../../core-model/scope-refusal';
import { EntityScopeResolver } from '../../entity-scope/entity-scope.resolver';
import { ScopedPrismaFactory } from '../../entity-scope/scoped-prisma.provider';
import type { PolicyStatus } from '../../generated/prisma';
import { IllegalTransitionError, assertTransition } from '../../workflow/transition.guard';
import { POLICY_STATUSES, allowedTargets } from '../../workflow/transitions';
import { DEV_PRINCIPAL_MARKER, devPrincipal } from './dev-principal';

interface CreatePolicyBody {
  orgEntityId?: unknown;
  title?: unknown;
  extensions?: unknown;
}

interface TransitionBody {
  to?: unknown;
}

/**
 * ⚠️ Narrows an unknown body field against the SAME list the state machine is
 * keyed on, so an unrecognised status is a 400 here rather than reaching Prisma
 * as an invalid enum value and surfacing as a 500.
 */
function isPolicyStatus(value: unknown): value is PolicyStatus {
  return typeof value === 'string' && (POLICY_STATUSES as readonly string[]).includes(value);
}

@Controller('policies')
export class PolicyController {
  constructor(
    private readonly resolver: EntityScopeResolver,
    private readonly scoped: ScopedPrismaFactory,
    private readonly policies: PolicyRepository,
  ) {}

  /** Resolve -> scoped client. The one place the two scopes meet. */
  private async client() {
    const scope = await this.resolver.resolve(devPrincipal());
    return this.scoped.forScope(scope);
  }

  /**
   * Attach the legal next states, so a caller never has to hold a second copy
   * of the transition table.
   *
   * ⚠️ This is DERIVED, not stored and not a second source of truth:
   * allowedTargets() reads the one exhaustive Record that ADR-0002 chose
   * precisely because it binds to the Prisma enum at compile time. A UI that
   * duplicated the table would throw that binding away and drift silently —
   * and worse than silently, because the drift would render buttons that are
   * wrong rather than buttons that are missing.
   *
   * ⭐ It is computed server-side rather than shipped as a table for a reason
   * that only pays off at M4: once roles exist, the server filters this list by
   * the caller's verbs (15-design-alignment.md §5.1) and no client changes.
   *
   * `retired` yields `[]`, which is a claim and not an omission — see
   * transitions.ts:63-67. An empty array renders no buttons; an absent field
   * would render whatever the client decided absence meant.
   */
  private withAllowed<T extends { status: PolicyStatus }>(row: T) {
    return { ...row, allowed: allowedTargets(row.status) };
  }

  @Get()
  async list() {
    const rows = await this.policies.list(await this.client());
    return { data: rows.map((row) => this.withAllowed(row)), ...DEV_PRINCIPAL_MARKER };
  }

  @Get(':id')
  async byId(@Param('id') id: string) {
    const all = await this.policies.list(await this.client());
    const found = all.find((p) => p.id === id);

    // Absent and out-of-scope are indistinguishable here BECAUSE the scoped
    // client never returned the row. Returning 403 would require knowing the row
    // exists — which would mean querying outside the scope to find out.
    if (!found) {
      throw new NotFoundException(`policy ${id} not found`);
    }

    return { data: this.withAllowed(found), ...DEV_PRINCIPAL_MARKER };
  }

  /**
   * The lifecycle transition — and the first endpoint in this repo that UPDATES.
   *
   * Three steps, and the order is the design:
   *   1. read the policy through the scoped client (404 covers absent AND
   *      out-of-scope, exactly as byId does, and for the same reason)
   *   2. apply the workflow guard to (observed status -> requested status).
   *      ⚠️ This is why the check runs HERE: core-model may not import workflow,
   *      so the repository cannot know the lifecycle, and the modules layer is
   *      the one place permitted to see both.
   *   3. compare-and-set on the OBSERVED status, so a row that moved between
   *      step 1 and step 3 answers 404 rather than being overwritten
   *
   * ⚠️ Step 2 before step 3 means an illegal transition is refused WITHOUT a
   * write being attempted — so it leaves no audit row. That is correct: nothing
   * happened. What it also means is that the audit trail records transitions,
   * not attempts; refused attempts are not visible to an auditor today. Recorded
   * here rather than fixed, because "log the refusal" needs an actor to be worth
   * reading and there is none until M4.
   */
  @Patch(':id/status')
  async transition(@Param('id') id: string, @Body() body: TransitionBody) {
    if (!isPolicyStatus(body?.to)) {
      throw new BadRequestException(`to must be one of ${POLICY_STATUSES.join(', ')}`);
    }

    const client = await this.client();
    const current = await this.policies.byId(client, id);
    if (!current) {
      throw new NotFoundException(`policy ${id} not found`);
    }

    // Throws IllegalTransitionError, which carries the legal alternatives — the
    // caller gets told what it should have asked for, not merely that it was wrong.
    try {
      assertTransition(current.status, body.to);
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        throw new UnprocessableEntityException({
          message: error.message,
          from: error.from,
          to: error.to,
          allowed: error.allowed,
        });
      }
      throw error;
    }

    const data = await this.policies.transitionStatus(client, {
      id,
      expected: current.status,
      next: body.to,
    });

    // Null means the row is gone, out of scope, or no longer in the status just
    // read. All three answer 404 — see transitionStatus() for why the third is
    // not told apart.
    if (!data) {
      throw new NotFoundException(`policy ${id} not found`);
    }

    // Carries `allowed` for the SAME reason the reads do, and one more: the
    // caller replaces its row with this response, so a transition that returned
    // only the new status would leave the client rendering the OLD state's
    // buttons until something refetched. The list of what you can do next
    // changes at exactly the moment the state does.
    return { data: this.withAllowed(data), ...DEV_PRINCIPAL_MARKER };
  }

  @Post()
  async create(@Body() body: CreatePolicyBody) {
    if (typeof body?.orgEntityId !== 'string' || typeof body?.title !== 'string') {
      throw new BadRequestException('orgEntityId and title are required strings');
    }
    if (body.extensions !== undefined && typeof body.extensions !== 'object') {
      throw new BadRequestException('extensions must be an object when present');
    }

    try {
      const data = await this.policies.create(await this.client(), {
        orgEntityId: body.orgEntityId,
        title: body.title,
        extensions: (body.extensions ?? {}) as Record<string, unknown>,
      });
      return { data, ...DEV_PRINCIPAL_MARKER };
    } catch (error) {
      // The caller's data was wrong, not the service. 422 carries the key so a
      // form can mark the field; a 500 here would read as an outage.
      if (error instanceof ExtensionValidationError) {
        throw new UnprocessableEntityException({
          message: error.message,
          key: error.key,
        });
      }
      // Same answer the read path gives, for the same reason: the caller named
      // an entity they cannot see, and whether it exists is not something they
      // get to learn. 500 would have been a refusal filed as an outage.
      if (error instanceof ScopeRefusedError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
