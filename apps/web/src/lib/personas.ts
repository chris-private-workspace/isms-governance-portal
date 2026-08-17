/**
 * File: apps/web/src/lib/personas.ts
 * Purpose: The six demo seats, one per role in the confirmed role model.
 * Category: identity (demo scaffold only)
 * Scope: Phase W19
 *
 * Description:
 *   `docs/02-architecture/15-design-alignment.md:101` fixes the role model:
 *   Platform admin · Regional ISO · OpCo admin · Control owner · OpCo OS ·
 *   Auditor, across eleven modules. One persona per role, so the demo can be
 *   driven from each seat rather than only from the omniscient one — which is
 *   the whole reason a governance platform has roles.
 *
 *   The handoff's registration form offered a different four (Risk Owner,
 *   Control Owner, Auditor (read-only), Regional Governance). Those are not
 *   the project's roles and are not carried across; §5.1 wins over the mockup
 *   on domain logic, which is confirmed parameter #11.
 *
 *   Emails use the reserved `.example` TLD on purpose. These are invented
 *   people, and an address that could belong to somebody real has no place in
 *   a fixture that will be screenshotted.
 *
 *   `scope` is what the seat may see. Only the two regional roles get APAC;
 *   the rest are pinned to one OpCo, because a demo where every seat sees
 *   everything demonstrates the opposite of entity scoping.
 *
 * Key Components:
 *   - PERSONAS: the six seats
 *   - findPersona: id -> persona, or undefined for an id nobody issued
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/02-architecture/15-design-alignment.md §5.1
 *   - apps/web/src/data/permMatrix.ts — the eleven modules these roles act on
 */

/**
 * The six roles, as translation keys.
 *
 * Written out rather than derived from the role name, because a key built at
 * runtime is invisible to the source scan in i18n.test.ts that checks every
 * referenced key exists — the same false green that cost the dashboard five
 * unguarded keys.
 */
export const ROLE_KEYS = [
  'role.platformAdmin',
  'role.regionalIso',
  'role.opcoAdmin',
  'role.controlOwner',
  'role.opcoOs',
  'role.auditor',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export type Persona = {
  id: string;
  name: string;
  email: string;
  /** The translated label. Never render an English role name directly. */
  roleKey: RoleKey;
  /** 'APAC' for the region, otherwise an OpCo code from opcos.ts. */
  scope: string;
  /** Two-letter monogram for the avatar, as the shell renders it. */
  initials: string;
};

export const PERSONAS: Persona[] = [
  {
    id: 'platform-admin',
    name: 'A. Kumar',
    email: 'a.kumar@group.example',
    roleKey: 'role.platformAdmin',
    scope: 'APAC',
    initials: 'AK',
  },
  {
    id: 'regional-iso',
    name: 'W. Cheung',
    email: 'w.cheung@group.example',
    roleKey: 'role.regionalIso',
    scope: 'APAC',
    initials: 'WC',
  },
  {
    id: 'opco-admin',
    name: 'C. Ng',
    email: 'c.ng@group.example',
    roleKey: 'role.opcoAdmin',
    scope: 'RHK',
    initials: 'CN',
  },
  {
    id: 'control-owner',
    name: 'R. Abdullah',
    email: 'r.abdullah@group.example',
    roleKey: 'role.controlOwner',
    scope: 'RMY',
    initials: 'RA',
  },
  {
    id: 'opco-os',
    name: 'J. Lim',
    email: 'j.lim@group.example',
    roleKey: 'role.opcoOs',
    scope: 'RSG',
    initials: 'JL',
  },
  {
    id: 'auditor',
    name: 'S. Fortalis',
    email: 's.fortalis@bsi.example',
    roleKey: 'role.auditor',
    scope: 'APAC',
    initials: 'SF',
  },
];

/** Undefined for an unknown id — never a default seat. */
export function findPersona(id: string | null): Persona | undefined {
  if (!id) return undefined;
  return PERSONAS.find((p) => p.id === id);
}
