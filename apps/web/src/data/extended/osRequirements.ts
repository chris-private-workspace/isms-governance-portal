/**
 * File: apps/web/src/data/extended/osRequirements.ts
 * Purpose: The security requirements every OS service must meet to be delivered.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper. That directory is a verbatim copy
 *   of the handoff's own `data/` folder and stays diffable against it; this one
 *   is not, so provenance is stated per file.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4263-4269  (osReqs)
 *     design/ISMS Governance Platform.dc.html:4320       (sel.reqs = osReqs.default)
 *   `osServices.ts` describes each service but carries no requirement list, and
 *   neither does the handoff's `data/osServices.js`.
 *
 *   ONE list for every service, named `default` in the prototype — the key name
 *   says the design anticipated per-service overrides and never wrote any. The
 *   single list is carried across as-is; inventing per-service requirements
 *   would put words in the programme's mouth about services it has not scoped.
 *
 *   Only keys are held here — the wording is copy and lives in the i18n
 *   dictionaries (port rule 5).
 *
 * Key Components:
 *   - OS_REQUIREMENT_KEYS: the five delivery requirements, in the design's order
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — OS portfolio port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/24-os-portfolio.html
 */

import type { TranslationKey } from '@/i18n';

export const OS_REQUIREMENT_KEYS: TranslationKey[] = [
  'osPortfolio.req.dpa',
  'osPortfolio.req.pam',
  'osPortfolio.req.assessment',
  'osPortfolio.req.subprocessors',
  'osPortfolio.req.incident',
];
