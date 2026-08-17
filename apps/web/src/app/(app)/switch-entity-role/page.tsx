'use client';

/**
 * File: apps/web/src/app/(app)/switch-entity-role/page.tsx
 * Purpose: Change the entity the user is acting for, and with it the page scope.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/29-switch-entity-role.html (27 lines) under the
 *   five port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   THIS SCREEN'S JOB IS THE SHELL'S SCOPE, so it uses setScope() from
 *   useShell() rather than any state of its own. Selecting a row here changes
 *   what every other screen renders and updates the topbar's scope control —
 *   which is the difference between a working control and a list of buttons that
 *   highlight themselves.
 *
 *   ROW COUNT IS DERIVED. The fragment's hint-placeholder-count said 7: the
 *   deliverable's six sample entities plus the region row. This renders 14 —
 *   the charter's 13 OpCos plus the region — because the list comes from the
 *   OpCo fixture. India and China never appear, in this or any other list, for
 *   the same reason.
 *
 *   THE ROLE NAMES ARE THE SIX, the sub-line's assignment is not. Confirmed
 *   parameter #13 fixes six roles; the deliverable's sub-lines named 'Regional
 *   Governance' and 'Entity Oversight' (dc.html:5157), neither of which is one
 *   of them. The six names are used instead. WHICH of the six the demo user
 *   holds at each scope is genuinely invented and is declared as such in
 *   data/extended/roles.ts, in one place, rather than being spelled out here as
 *   though a source had settled it.
 *
 * Key Components:
 *   - SwitchEntityRolePage: the region row plus one row per OpCo
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/29-switch-entity-role.html
 *   - apps/web/src/components/shell/shell-state.ts — setScope, the control behind this screen
 */

import { DemoBadge } from '@/components/DemoBadge';
import { useShell } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';

/** Fragment :17 — the region row's badge, where entities carry a country code. */
const REGION_FLAG = '◎';

export default function SwitchEntityRolePage() {
  const { tr, trf, scopeCode, setScope } = useShell();

  const options = [
    {
      code: 'APAC',
      name: tr('switchRole.region'),
      sub: trf('switchRole.sub.region', { role: tr('switchRole.role.regionalIso') }),
      flag: REGION_FLAG,
    },
    ...entityPosture.map((e) => ({
      code: e.code,
      name: e.name,
      sub: trf('switchRole.sub.entity', {
        role: tr('switchRole.role.opcoAdmin'),
        juris: e.juris,
      }),
      flag: e.flag,
    })),
  ];

  return (
    <div data-screen-label="Switch entity role">
      <DemoBadge />

      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '.5px',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            marginBottom: '6px',
          }}
        >
          {tr('switchRole.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('switchRole.title')}
        </h1>
        <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
          {tr('switchRole.subtitle')}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '620px',
        }}
      >
        {options.map((o) => {
          const active = scopeCode === o.code;
          return (
            <button
              key={o.code}
              type="button"
              aria-pressed={active}
              onClick={() => setScope(o.code)}
              data-hov="s3"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                width: '100%',
                padding: '14px 16px',
                border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '11px',
                background: active ? 'var(--primary-tint)' : 'var(--surface)',
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '22px',
                  borderRadius: '5px',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  color: 'var(--text-2)',
                  flexShrink: 0,
                }}
              >
                {o.flag}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                  {o.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>{o.sub}</div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: active ? '#fff' : 'var(--text-2)',
                  background: active ? 'var(--primary)' : 'var(--surface-3)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  flexShrink: 0,
                }}
              >
                {tr(active ? 'switchRole.chip.current' : 'switchRole.chip.switch')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
