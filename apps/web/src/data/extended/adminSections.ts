/**
 * File: apps/web/src/data/extended/adminSections.ts
 * Purpose: The eleven Admin sections and the four groups they sit in.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and is diffable against it; this one is
 *   not, so every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:5072-5083  (adminSections)
 *   Eleven sections, in the prototype's order, carrying the prototype's four
 *   group headings. The handoff's `data/` export skipped the logic class, which
 *   is the only place this list is written down.
 *
 *   Only the SHAPE and the ORDER are here. The labels are copy and live in the
 *   i18n dictionaries (port rule 5), so this file holds keys.
 *
 *   `newGrp` is deliberately NOT stored. dc.html:5086 computes it as
 *   `i===0 || arr[i-1].grp!==s.grp` — a fact about the neighbouring row, not a
 *   property of the row. Storing it would let the list be reordered into a state
 *   where a group heading is missing or printed twice, with nothing to catch it.
 *
 * Key Components:
 *   - ADMIN_SECTIONS: the eleven, in order; ADMIN_SECTIONS[i].key selects a panel
 *   - AdminSectionKey: the union the screen's useState is typed on
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin screen port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/14-admin.html
 */

import type { TranslationKey } from '@/i18n';

export type AdminSection = {
  key: string;
  labelKey: TranslationKey;
  groupKey: TranslationKey;
};

/** dc.html:5072-5083, in that order. Reordering changes the group headings. */
export const ADMIN_SECTIONS = [
  {
    key: 'entities',
    labelKey: 'admin.section.entities',
    groupKey: 'admin.group.organisation',
  },
  { key: 'users', labelKey: 'admin.section.users', groupKey: 'admin.group.organisation' },
  { key: 'permissions', labelKey: 'admin.section.permissions', groupKey: 'admin.group.access' },
  { key: 'access', labelKey: 'admin.section.access', groupKey: 'admin.group.access' },
  { key: 'reporting', labelKey: 'admin.section.reporting', groupKey: 'admin.group.operate' },
  {
    key: 'notifications',
    labelKey: 'admin.section.notifications',
    groupKey: 'admin.group.operate',
  },
  { key: 'retention', labelKey: 'admin.section.retention', groupKey: 'admin.group.operate' },
  { key: 'taxonomy', labelKey: 'admin.section.taxonomy', groupKey: 'admin.group.configuration' },
  {
    key: 'integrations',
    labelKey: 'admin.section.integrations',
    groupKey: 'admin.group.configuration',
  },
  {
    key: 'thresholds',
    labelKey: 'admin.section.thresholds',
    groupKey: 'admin.group.configuration',
  },
  { key: 'audit', labelKey: 'admin.section.audit', groupKey: 'admin.group.configuration' },
] as const satisfies readonly AdminSection[];

export type AdminSectionKey = (typeof ADMIN_SECTIONS)[number]['key'];

/** dc.html:3720 opens the screen on this section, not on the first one. */
export const DEFAULT_ADMIN_SECTION: AdminSectionKey = 'thresholds';
