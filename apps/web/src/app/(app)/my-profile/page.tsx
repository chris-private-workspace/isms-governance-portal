'use client';

/**
 * File: apps/web/src/app/(app)/my-profile/page.tsx
 * Purpose: The signed-in user's record — identity, entity assignments, security.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/27-my-profile.html (66 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   ENTITY ASSIGNMENTS ARE DERIVED, not stored on the profile. The design built
 *   the same list by mapping its entity fixture (dc.html:5145), and keeping that
 *   shape matters more here than anywhere else on the screen: a profile that
 *   stored its own entity names could claim an assignment to an OpCo the
 *   platform does not have — which is precisely the class of drift the charter's
 *   India and China exclusions exist to prevent. The fragment's
 *   hint-placeholder-count said 6; this renders 13, because the deliverable's
 *   sample was six entities and the charter's scope is thirteen.
 *
 *   THREE BUTTONS ARE RENDERED DISABLED — 'Edit profile', 'Change password' and
 *   'Manage sessions'. All three write to a directory or a session store this
 *   port does not reach, so they carry controls.md:7's disabled state and
 *   shell.inert on hover. Their data-hov is deliberately dropped: the s3 hover
 *   rule still fires on a disabled element, and a hover response would undo the
 *   disable by re-asserting that the control is live.
 *
 *   'CHANGE PASSWORD' IS KEPT, DISABLED, BY AN EXPLICIT RULING (2026-08-17).
 *   The Day-3 drive-through raised it as a contradiction: ADR-0007 is adopted,
 *   identity is Entra ID, and the login screen has no password field because the
 *   persona picker replaced it — so the control asserts a credential this
 *   platform does not hold. The stakeholder ruled the other way: a local account
 *   flow should survive as a local-development and fallback path.
 *
 *   That ruling is architecture-level, so it does not land here. It needs an
 *   ADR-0007 amendment (AD-LocalPasswordFallback-1), and the amendment has to
 *   settle whether the path is break-glass — MFA, vaulted, audited, time-boxed —
 *   or a general login, because guardrail 2 governs this platform by its own
 *   controls and a general local password path is what those controls flag.
 *   Until that lands the button stays disabled: this port has no auth backend,
 *   and a password field over no backend is the Potemkin control this same
 *   drive-through spent its time removing.
 *
 *   The permissions list is the design's own four-line summary. data/permMatrix
 *   is the spec-grade source — eleven modules by six roles — but reading it needs
 *   a user-to-role binding this codebase does not have, and it would render
 *   eleven rows where the fragment's hint says four. Left as the deliverable had
 *   it, with the gap in the phase report instead of guessed at here.
 *
 * Key Components:
 *   - MyProfilePage: the two-column profile screen
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/27-my-profile.html
 *   - apps/web/src/data/extended/profile.ts — provenance of every value shown
 */

import { DemoBadge } from '@/components/DemoBadge';
import { IconCheck, IconShield } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { profile } from '@/data/extended/profile';

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Not an invented visual: it is the design system's own disabled state, and the
 * only honest rendering of an action this port has no backend to perform.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

export default function MyProfilePage() {
  const { tr } = useShell();

  // dc.html:5145 derived this from the entity fixture too — see the header.
  const entitiesAssigned = entityPosture.map((e) => ({ name: e.name, flag: e.flag }));

  const FIELDS = [
    { key: 'profile.field.email', value: profile.email, mono: true },
    { key: 'profile.field.phone', value: profile.phone, mono: false },
    { key: 'profile.field.timezone', value: profile.tz, mono: false },
    { key: 'profile.field.memberSince', value: profile.joined, mono: false },
  ] as const;

  return (
    <div data-screen-label="My profile">
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
          {tr('profile.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('profile.title')}
        </h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,var(--primary),var(--primary-ink))',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile.init}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>{profile.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>{profile.role}</div>
              </div>
              {/* Disabled: editing the profile writes to a directory this port
                  does not reach. Every field below it is read-only fixture. */}
              <button
                type="button"
                disabled
                title={tr('shell.inert')}
                style={{
                  height: '34px',
                  padding: '0 14px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  ...INERT,
                }}
              >
                {tr('profile.edit')}
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2,1fr)',
                gap: '16px',
                marginTop: '20px',
                paddingTop: '18px',
                borderTop: '1px solid var(--border)',
              }}
            >
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '.4px',
                      marginBottom: '4px',
                    }}
                  >
                    {tr(f.key)}
                  </div>
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      fontFamily: f.mono ? 'var(--mono)' : undefined,
                    }}
                  >
                    {f.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              padding: '18px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              {tr('profile.entities')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {entitiesAssigned.map((ea) => (
                <span
                  key={ea.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                  }}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '16px',
                      borderRadius: '4px',
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8.5px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {ea.flag}
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                    {ea.name}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              padding: '18px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              {tr('profile.activity')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profile.activity.map((ac) => (
                <div
                  key={ac.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '9px 11px',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: '12.5px', color: 'var(--text-2)' }}>
                    {ac.action}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-3)',
                      fontFamily: 'var(--mono)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ac.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              padding: '18px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              <IconShield width="16" height="16" stroke="var(--rag-g)" strokeWidth="1.8" />
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{tr('profile.security')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.4px',
                    marginBottom: '4px',
                  }}
                >
                  {tr('profile.mfa')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: 'var(--rag-g)',
                    }}
                  />
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)' }}>
                    {profile.mfa}
                  </span>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.4px',
                    marginBottom: '4px',
                  }}
                >
                  {tr('profile.lastSignIn')}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-2)',
                  }}
                >
                  {profile.lastLogin}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.4px',
                    marginBottom: '4px',
                  }}
                >
                  {tr('profile.sessions')}
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 600 }}>{profile.sessions}</div>
              </div>
            </div>
            {/* Both disabled. 'Change password' is KEPT by an explicit 2026-08-17
                ruling — a local account path is wanted for local development and
                as a fallback — but it needs an ADR-0007 amendment before it can
                do anything. See the file header. */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              {(['profile.changePassword', 'profile.manageSessions'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled
                  title={tr('shell.inert')}
                  style={{
                    flex: 1,
                    height: '34px',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                    ...INERT,
                  }}
                >
                  {tr(key)}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              padding: '18px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
              {tr('profile.permissions')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {profile.permissions.map((pm) => (
                <div
                  key={pm}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    fontSize: '12.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  <IconCheck width="15" height="15" stroke="var(--rag-g)" strokeWidth="2.2" />
                  {pm}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
