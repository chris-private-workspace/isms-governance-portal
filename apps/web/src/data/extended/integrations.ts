/**
 * File: apps/web/src/data/extended/integrations.ts
 * Purpose: The connected and available signal sources listed under Admin.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed with one edit:
 *     design/ISMS Governance Platform.dc.html:5120-5128  (integrations)
 *   Eight tiles in the prototype's order, with their categories, sync ages and
 *   connected/available state carried across unchanged.
 *
 *   THE ONE EDIT: the identity provider was 'Okta' and is now 'Microsoft Entra
 *   ID'. Not a preference — data/sessionPolicy.ts already made the same change
 *   for the same reason, and the two are rendered by the SAME screen. Leaving
 *   Okta here would have the Authentication card state that sign-on is Microsoft
 *   Entra ID while a tile two sections away reports Okta connected as the
 *   identity provider. A screen that contradicts itself is worse than a screen
 *   that departs from the mockup.
 *
 *   'AWS Config' is carried across UNCHANGED, and the asymmetry is deliberate.
 *   ADR-0010 fixes where this platform is HOSTED; it says nothing about which
 *   clouds the group's own estate runs on, and the platform ingesting posture
 *   from a cloud it is not hosted on is ordinary. Nothing on this screen
 *   contradicts it, so there is nothing to reconcile.
 *
 *   No count is stored. 14-admin.html:294 prints a literal '6 connected' next to
 *   a loop of eight; the screen counts `connected` instead (port rule 10).
 *
 * Key Components:
 *   - INTEGRATIONS: the eight tiles, in the design's order
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin integrations panel
 *
 * Related:
 *   - apps/web/src/data/sessionPolicy.ts — made the same Okta -> Entra ID change
 */

export type Integration = {
  name: string;
  cat: string;
  /** Two-letter monogram for the tile. */
  init: string;
  connected: boolean;
  /** Relative sync age, or an em dash when never synced. */
  sync: string;
};

/** dc.html:5120-5128. Row 4's name is the one edit — see the header. */
export const INTEGRATIONS: Integration[] = [
  { name: 'Jira', cat: 'Issue tracking', init: 'JR', connected: true, sync: '5m ago' },
  { name: 'ServiceNow', cat: 'ITSM', init: 'SN', connected: true, sync: '12m ago' },
  { name: 'Splunk', cat: 'SIEM / logging', init: 'SP', connected: true, sync: '1m ago' },
  {
    name: 'Microsoft Entra ID',
    cat: 'Identity provider',
    init: 'EI',
    connected: true,
    sync: '3m ago',
  },
  { name: 'AWS Config', cat: 'Cloud posture', init: 'AW', connected: true, sync: '8m ago' },
  {
    name: 'Microsoft 365',
    cat: 'Productivity / DLP',
    init: 'MS',
    connected: true,
    sync: '20m ago',
  },
  { name: 'Slack', cat: 'Notifications', init: 'SL', connected: false, sync: '—' },
  { name: 'Qualys', cat: 'Vulnerability scanning', init: 'QL', connected: false, sync: '—' },
];
