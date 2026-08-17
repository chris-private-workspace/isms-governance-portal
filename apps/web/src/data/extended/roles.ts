/**
 * File: apps/web/src/data/extended/roles.ts
 * Purpose: The six role names that index permMatrix's per-module arrays.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   THE GAP THIS CLOSES: data/permMatrix.ts carries eleven modules x a six-slot
 *   permission array, and names none of the six slots. Confirmed parameter #13
 *   fixes the model at six roles x eleven modules, so the column order is
 *   load-bearing and reading a matrix without it is guesswork.
 *
 *   The names are NOT invented. They are the handoff's own, in the handoff's own
 *   order — `permRoles` at design/ISMS Governance Platform.dc.html:4189, restated
 *   at ARCHITECTURE.md:44. The order below is that array's order, so ROLES[i]
 *   names permMatrix[*].p[i]. Reordering this list silently relabels every
 *   permission in the product.
 *
 *   Extended rather than added to permMatrix.ts: that file is a verbatim copy of
 *   a handoff data/*.js file and its diffability against that file is the point.
 *
 *   WHAT IS ACTUALLY INVENTED, and it is not the names: which role the demo user
 *   holds at each entity. Nothing in the handoff or the charter states it, so the
 *   two constants below are labelled as the assumptions they are, in one place,
 *   rather than spread across the screens that display them.
 *
 * Key Components:
 *   - ROLES: the six, in permMatrix column order
 *   - ROLE: named lookups, so a call site reads as a role and not as an index
 *   - DEMO_REGION_ROLE / DEMO_ENTITY_ROLE: the two invented assumptions
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — names sourced from the handoff
 *
 * Related:
 *   - apps/web/src/data/permMatrix.ts — the columns these name
 *   - docs/06-reference/design_handoff_isms_grc_platform/ARCHITECTURE.md
 */

/** In permMatrix column order. ROLES[i] names permMatrix[*].p[i]. */
export const ROLES = [
  'Platform admin',
  'Regional ISO',
  'OpCo admin',
  'Control owner',
  'OpCo OS',
  'Auditor',
] as const;

export type Role = (typeof ROLES)[number];

/** Named access, so no screen indexes ROLES with a bare number. */
export const ROLE = {
  platformAdmin: ROLES[0],
  regionalIso: ROLES[1],
  opcoAdmin: ROLES[2],
  controlOwner: ROLES[3],
  opcoOs: ROLES[4],
  auditor: ROLES[5],
} as const;

/**
 * INVENTED — the role the demo user acts in at region level.
 *
 * Regional ISO rather than Platform admin: the region row is an oversight scope,
 * and the charter's flagship reader is the regional ISO. No source states it.
 */
export const DEMO_REGION_ROLE: Role = ROLE.regionalIso;

/**
 * INVENTED — the role the demo user acts in at a single OpCo.
 *
 * OpCo admin is the only one of the six that is both entity-bound and able to
 * edit; the alternatives are read-only or function-specific. No source states it.
 */
export const DEMO_ENTITY_ROLE: Role = ROLE.opcoAdmin;
