/**
 * File: apps/web/src/data/extended/adminUsers.ts
 * Purpose: The demo user directory behind Admin -> Users & roles.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — mostly DERIVED, partly INVENTED. The handoff's own rows are
 *   deliberately NOT carried across, and this is the one file where that matters
 *   enough to spell out:
 *
 *     design/ISMS Governance Platform.dc.html:5095-5103 holds eight users whose
 *     `role` values are 'Regional Governance', 'Risk Owner', 'Control Owner',
 *     'Data Protection Officer', 'Compliance Lead', 'Vendor Risk Manager' and
 *     'Auditor (read-only)'. Confirmed parameter #13 fixes the model at SIX
 *     roles, and those are not them — the same clash lib/personas.ts already
 *     resolved in favour of the charter (15-design-alignment.md:101). Two of the
 *     rows are also scoped to China and Japan: China is out of scope entirely
 *     (parameter #4) and Japan is headquarters, not an OpCo.
 *
 *     So the ROW COUNT is the handoff's (eight, matching
 *     14-admin.html:247 hint-placeholder-count="8") and everything else is
 *     rebuilt:
 *       - DERIVED: the first six rows are lib/personas.ts, one per role, with
 *         their names, addresses, initials and entity scopes unchanged. The demo
 *         can be driven from each of these seats, so the directory listing them
 *         is the same fact stated twice rather than a second invented cast.
 *       - INVENTED: the last two rows, and every `lastKey` and `status` on all
 *         eight. Nothing states who signed in when. The two extra names are
 *         reused from data/accessRequests.ts so the demo does not gain people
 *         who exist nowhere else.
 *
 *   Addresses stay on the reserved `.example` TLD, as personas.ts requires: an
 *   address that could belong to somebody real has no place in a fixture that
 *   will be screenshotted.
 *
 *   No count is stored. 14-admin.html:237 prints a literal '43 users' next to a
 *   loop of eight; the screen counts this array instead (port rule 10).
 *
 * Key Components:
 *   - ADMIN_USERS: the eight rows, six of them the personas
 *   - AdminUser: the row type
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin users panel
 *
 * Related:
 *   - apps/web/src/lib/personas.ts — the six seats rows 1-6 are taken from
 *   - apps/web/src/data/accessRequests.ts — where the two extra names come from
 */

import type { TranslationKey } from '@/i18n';
import { PERSONAS, type RoleKey } from '@/lib/personas';

export type AdminUser = {
  name: string;
  email: string;
  roleKey: RoleKey;
  /** 'APAC' for the region, otherwise an OpCo code from opcos.ts. */
  scope: string;
  initials: string;
  /** Relative last-active label. INVENTED — no source states sign-in times. */
  lastKey: TranslationKey;
  status: 'Active' | 'Invited';
};

/** INVENTED — one per persona, in personas.ts order. */
const SEAT_ACTIVITY: { lastKey: TranslationKey; status: AdminUser['status'] }[] = [
  { lastKey: 'admin.last.min2', status: 'Active' },
  { lastKey: 'admin.last.hour1', status: 'Active' },
  { lastKey: 'admin.last.hours3', status: 'Active' },
  { lastKey: 'admin.last.yesterday', status: 'Active' },
  { lastKey: 'admin.last.hours5', status: 'Active' },
  { lastKey: 'admin.last.hours4', status: 'Active' },
];

/**
 * INVENTED — two more directory entries so the panel shows a scope that is not
 * also a demo seat. Names reused from accessRequests.ts rather than made up
 * again; P. Srisai is 'Invited' because AR-2417 has that request still Pending,
 * which is the same story told from the other side.
 */
const EXTRA_USERS: AdminUser[] = [
  {
    name: 'P. Srisai',
    email: 'p.srisai@group.example',
    roleKey: 'role.opcoAdmin',
    scope: 'RTH',
    initials: 'PS',
    lastKey: 'admin.last.week1',
    status: 'Invited',
  },
  {
    name: 'B. Santoso',
    email: 'b.santoso@group.example',
    roleKey: 'role.controlOwner',
    scope: 'RID',
    initials: 'BS',
    lastKey: 'admin.last.days2',
    status: 'Active',
  },
];

export const ADMIN_USERS: AdminUser[] = [
  ...PERSONAS.map((p, i) => {
    const activity = SEAT_ACTIVITY[i];
    if (!activity) throw new Error(`ADMIN_USERS: no activity for persona ${p.id}`);
    return {
      name: p.name,
      email: p.email,
      roleKey: p.roleKey,
      scope: p.scope,
      initials: p.initials,
      lastKey: activity.lastKey,
      status: activity.status,
    };
  }),
  ...EXTRA_USERS,
];
