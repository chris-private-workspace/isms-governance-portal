'use client';

/**
 * File: apps/web/src/app/login/page.tsx
 * Purpose: The four auth states, with the persona picker where the password used to be.
 * Category: ui / identity (demo scaffold)
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/shell/01-auth-full-screen-no-shell.html (217 lines).
 *   It lives outside the (app) route group because it is full-bleed by design —
 *   the fragment is literally named "no shell".
 *
 *   The fragment holds SEVEN states, not one (Day-0 D1). Four are ported —
 *   LOGIN (variant A, split), REGISTER, MFA, SSO. FORGOT and RESET are not,
 *   and variants B and C are not: ADR-0007 says there is no local credential
 *   store, so a password-reset flow would be a screen for a mechanism that
 *   does not exist. That is a recorded deviation, not an omission.
 *
 *   FIVE THINGS IN THE FRAGMENT ARE NOT CARRIED ACROSS, each for a stated
 *   reason rather than taste:
 *
 *   1. Every `<input type="password">` — five of them across the states. Same
 *      ADR. The login form's password field is replaced by the persona picker,
 *      which is what this demo actually authenticates with (nothing).
 *   2. The registration form's Entity dropdown (:124) hardcoded six options
 *      including Japan and China. Japan is headquarters and China is out of
 *      scope entirely; it now reads the 13 OpCos from the fixture.
 *   3. The registration form's four roles (:125) are invented. The project's
 *      role model is fixed at six (15-design-alignment.md §5.1) and those are
 *      what it offers.
 *   4. The SSO screen listed Okta, Entra ID and Google Workspace. This
 *      platform federates with Entra ID (ADR-0001); presenting two providers
 *      it does not use as choosable is a fabrication, not a mockup.
 *   5. The floating "Layout explorations" switcher (:100-105) is a design tool
 *      for comparing three login variants. It is not product UI.
 *
 *   The MFA code boxes render empty. The fragment prefills 4-1-9, which reads
 *   as a half-typed real code; an empty field the user can type into is both
 *   honest and more useful to drive.
 *
 *   The persona buttons reuse the SSO provider row's exact geometry from the
 *   same fragment (:207-209) rather than inventing a control — same monogram,
 *   same two-line label, same chevron.
 *
 * Key Components:
 *   - LoginPage: owns which of the four states is showing
 *   - signIn: POSTs a persona id and lands on the dashboard
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/shell/01-auth-full-screen-no-shell.html
 *   - apps/web/src/lib/personas.ts
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { opcos } from '@/data/opcos';
import { DEFAULT_LOCALE, t, tf, type TranslationKey } from '@/i18n';
import { PERSONAS, ROLE_KEYS } from '@/lib/personas';

/**
 * No locale switcher here.
 *
 * The fragment has none, and adding a control the design does not carry is the
 * kind of small invention that constraint 6 exists to stop. Copy resolves
 * through DEFAULT_LOCALE — `en` since CH-040 — and the switcher lives in the
 * topbar, one screen later.
 */
const tr = (key: TranslationKey) => t(DEFAULT_LOCALE, key);
const trf = (key: TranslationKey, vars: Record<string, string | number>) =>
  tf(DEFAULT_LOCALE, key, vars);

type View = 'login' | 'register' | 'mfa' | 'sso';

// Labels come from ROLE_KEYS, not from English strings written here. A role
// name rendered raw is user-visible text bypassing i18n — the rule this port
// applies to every other string on the screen.

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 13px',
  border: '1px solid var(--border-strong)',
  borderRadius: '9px',
  background: 'var(--surface-2)',
  fontFamily: 'inherit',
  fontSize: '13.5px',
  color: 'var(--text)',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-2)',
  marginBottom: '6px',
};

const primaryButtonStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  border: 'none',
  borderRadius: '9px',
  background: 'var(--primary)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  boxShadow: '0 12px 44px rgba(16,24,40,.09)',
  padding: '30px',
};

const IconShieldMark = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 11.5l2 2 3.5-4" />
  </svg>
);

// W24: the stroke was var(--rag-g). A green tick reads as "certified", and it
// was sitting beside a claim that this platform holds SOC 2 Type II and ISO/IEC
// 27001 — which it does not. The three claims are now all true (built to the
// standards / the audit chain is real / RLS is real), but a green tick still
// stamps each one as verified by someone. Neutral is what a bullet should be.
// Changing the stroke rather than the markup keeps the ported structure intact
// (約束 6): the three claims share one <IconTick/> inside a .map().
const IconTick = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--rag-n)"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const IconLock = ({ stroke = 'var(--primary)' }: { stroke?: string }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M7 11V8a5 5 0 0110 0v3" />
  </svg>
);

const IconBack = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('login');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function signIn(personaId: string) {
    setBusy(personaId);
    setError(null);
    try {
      const response = await fetch('/api/demo-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ persona: personaId }),
      });
      if (!response.ok) throw new Error(String(response.status));
      router.push('/dashboard');
    } catch {
      setError(tr('auth.signInFailed'));
      setBusy(null);
    }
  }

  const backLink = (target: View, key: TranslationKey) => (
    <button
      type="button"
      onClick={() => setView(target)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12.5px',
        fontWeight: 600,
        color: 'var(--text-2)',
        cursor: 'pointer',
        marginBottom: '20px',
        border: 'none',
        background: 'transparent',
        fontFamily: 'inherit',
        padding: 0,
      }}
    >
      <IconBack />
      {tr(key)}
    </button>
  );

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: '100vh', display: 'flex' }}>
      {view === 'login' && (
        <div style={{ flex: 1, display: 'flex', minHeight: '100vh' }}>
          <div
            style={{
              width: '44%',
              maxWidth: '520px',
              background: 'var(--nav-bg)',
              color: '#fff',
              padding: '48px 44px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9px',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconShieldMark />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{tr('auth.brand')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--nav-text-2)' }}>
                    {tr('auth.brandSub')}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '60px', maxWidth: '390px' }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: '30px',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: '-.4px',
                  }}
                >
                  {tr('auth.headline')}
                </h1>
                <p
                  style={{
                    margin: '16px 0 0',
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: 'var(--nav-text)',
                  }}
                >
                  {tr('auth.blurb')}
                </p>
              </div>
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '11px',
                  marginBottom: '26px',
                }}
              >
                {(['auth.claim1', 'auth.claim2', 'auth.claim3'] as const).map((key) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '12.5px',
                      color: 'var(--nav-text)',
                    }}
                  >
                    <IconTick />
                    {tr(key)}
                  </div>
                ))}
              </div>
              {/* The fragment's footer read "Production SG-1 · v2.4". This is a
                  demonstration build, and a line claiming otherwise is exactly
                  the kind of detail a screenshot carries out of context. */}
              <div style={{ fontSize: '11px', color: 'var(--nav-text-2)' }}>
                {tr('auth.footer')}
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              background: 'var(--surface)',
            }}
          >
            <div style={{ width: '100%', maxWidth: '360px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '.5px',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                  marginBottom: '8px',
                }}
              >
                {tr('auth.signIn')}
              </div>
              <h2
                style={{
                  margin: '0 0 5px',
                  fontSize: '23px',
                  fontWeight: 700,
                  letterSpacing: '-.3px',
                }}
              >
                {tr('auth.welcome')}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px' }}>
                {tr('auth.pickPersona')}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void signIn(p.id)}
                    disabled={busy !== null}
                    data-hov="s3"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 14px',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '10px',
                      background: 'var(--surface)',
                      fontFamily: 'inherit',
                      cursor: busy ? 'progress' : 'pointer',
                      textAlign: 'left',
                      opacity: busy && busy !== p.id ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '7px',
                        background: 'var(--surface-3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-2)',
                      }}
                    >
                      {p.initials}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        {tr(p.roleKey)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        {p.name} · {p.scope}
                      </div>
                    </div>
                    <span style={{ fontSize: '16px', color: 'var(--text-3)' }}>›</span>
                  </button>
                ))}
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    marginTop: '14px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    background: 'var(--rag-r-bg)',
                    color: 'var(--rag-r-ink)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{tr('auth.or')}</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>

              <button
                type="button"
                onClick={() => setView('sso')}
                data-hov="s3"
                style={{
                  width: '100%',
                  height: '44px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '9px',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '9px',
                }}
              >
                <IconLock />
                {tr('auth.continueSso')}
              </button>

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '22px',
                  fontSize: '12.5px',
                  color: 'var(--text-3)',
                }}
              >
                {tr('auth.noAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setView('register')}
                  style={{
                    color: 'var(--primary-ink)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    fontFamily: 'inherit',
                    fontSize: '12.5px',
                    padding: 0,
                  }}
                >
                  {tr('auth.requestAccess')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'register' && (
        <div style={{ flex: 1, display: 'flex', minHeight: '100vh' }}>
          <div
            style={{
              width: '40%',
              maxWidth: '480px',
              background: 'var(--nav-bg)',
              color: '#fff',
              padding: '48px 44px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconShieldMark />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{tr('auth.brand')}</div>
                <div style={{ fontSize: '11px', color: 'var(--nav-text-2)' }}>
                  {tr('auth.brandSub')}
                </div>
              </div>
            </div>
            <div style={{ maxWidth: '340px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '26px',
                  fontWeight: 700,
                  lineHeight: 1.25,
                  letterSpacing: '-.3px',
                }}
              >
                {tr('auth.register.headline')}
              </h1>
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: '13.5px',
                  lineHeight: 1.65,
                  color: 'var(--nav-text)',
                }}
              >
                {tr('auth.register.blurb')}
              </p>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--nav-text-2)' }}>
              {tr('auth.register.footer')}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              background: 'var(--surface)',
              overflowY: 'auto',
            }}
          >
            <div style={{ width: '100%', maxWidth: '440px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '.5px',
                  textTransform: 'uppercase',
                  color: 'var(--text-3)',
                  marginBottom: '8px',
                }}
              >
                {tr('auth.register.eyebrow')}
              </div>
              <h2
                style={{
                  margin: '0 0 22px',
                  fontSize: '23px',
                  fontWeight: 700,
                  letterSpacing: '-.3px',
                }}
              >
                {tr('auth.register.title')}
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  marginBottom: '15px',
                }}
              >
                <div>
                  <label style={labelStyle} htmlFor="reg-name">
                    {tr('auth.register.fullName')}
                  </label>
                  <input
                    id="reg-name"
                    placeholder={tr('auth.register.namePlaceholder')}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="reg-email">
                    {tr('auth.register.workEmail')}
                  </label>
                  <input
                    id="reg-email"
                    placeholder={tr('auth.register.emailPlaceholder')}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="reg-entity">
                    {tr('auth.register.entity')}
                  </label>
                  {/* The 13 in-scope OpCos, from the fixture. The fragment
                      hardcoded six countries including Japan and China. */}
                  <select
                    id="reg-entity"
                    style={{ ...inputStyle, padding: '0 11px', cursor: 'pointer' }}
                    defaultValue=""
                  >
                    <option value="">{tr('auth.register.selectEntity')}</option>
                    {opcos.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.code} — {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="reg-role">
                    {tr('auth.register.role')}
                  </label>
                  {/* The project's six roles, not the fragment's invented four. */}
                  <select
                    id="reg-role"
                    style={{ ...inputStyle, padding: '0 11px', cursor: 'pointer' }}
                    defaultValue=""
                  >
                    <option value="">{tr('auth.register.selectRole')}</option>
                    {ROLE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {tr(key)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '9px',
                  fontSize: '12px',
                  color: 'var(--text-2)',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginTop: '1px',
                    accentColor: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
                {tr('auth.register.consent')}
              </label>

              <button
                type="button"
                disabled={!agreed}
                onClick={() => setNotice(tr('auth.demoNoSubmit'))}
                style={{
                  ...primaryButtonStyle,
                  opacity: agreed ? 1 : 0.5,
                  cursor: agreed ? 'pointer' : 'not-allowed',
                }}
              >
                {tr('auth.register.submit')}
              </button>

              {notice && (
                <div
                  role="status"
                  style={{
                    marginTop: '14px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    background: 'var(--rag-a-bg)',
                    color: 'var(--rag-a-ink)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  {notice}
                </div>
              )}

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  fontSize: '12.5px',
                  color: 'var(--text-3)',
                }}
              >
                {tr('auth.haveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  style={{
                    color: 'var(--primary-ink)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    fontFamily: 'inherit',
                    fontSize: '12.5px',
                    padding: 0,
                  }}
                >
                  {tr('auth.signIn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'mfa' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg)',
            padding: '40px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px' }}>
            {backLink('login', 'auth.back')}
            <div style={cardStyle}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--primary-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--primary-ink)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="5" y="2" width="14" height="20" rx="3" />
                  <line x1="12" y1="18" x2="12" y2="18" />
                </svg>
              </div>
              <h2
                style={{
                  margin: '0 0 5px',
                  fontSize: '21px',
                  fontWeight: 700,
                  letterSpacing: '-.3px',
                }}
              >
                {tr('auth.mfa.title')}
              </h2>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  marginBottom: '22px',
                  lineHeight: 1.5,
                }}
              >
                {tr('auth.mfa.blurb')}
              </div>
              <div style={{ display: 'flex', gap: '9px', marginBottom: '22px' }}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    aria-label={trf('auth.mfa.digitLabel', { n: i + 1 })}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const next = [...code];
                      next[i] = e.target.value.replace(/\D/g, '').slice(0, 1);
                      setCode(next);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      height: '52px',
                      textAlign: 'center',
                      border: `1.5px solid ${digit ? 'var(--primary)' : 'var(--border-strong)'}`,
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      fontFamily: 'var(--mono)',
                      fontSize: '22px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNotice(tr('auth.demoNoMfa'))}
                style={primaryButtonStyle}
              >
                {tr('auth.mfa.verify')}
              </button>
              {notice && (
                <div
                  role="status"
                  style={{
                    marginTop: '14px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    background: 'var(--rag-a-bg)',
                    color: 'var(--rag-a-ink)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                  }}
                >
                  {notice}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'sso' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg)',
            padding: '40px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '380px' }}>
            {backLink('login', 'auth.backToSignIn')}
            <div style={cardStyle}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'var(--primary-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <IconLock stroke="var(--primary-ink)" />
              </div>
              <h2
                style={{
                  margin: '0 0 5px',
                  fontSize: '21px',
                  fontWeight: 700,
                  letterSpacing: '-.3px',
                }}
              >
                {tr('auth.sso.title')}
              </h2>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-2)',
                  marginBottom: '22px',
                  lineHeight: 1.5,
                }}
              >
                {tr('auth.sso.blurb')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {/* One provider, not the fragment's three. This platform
                    federates with Entra ID; offering Okta and Google as
                    choosable would be a claim about the product. */}
                <button
                  type="button"
                  onClick={() => setView('mfa')}
                  data-hov="s3"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '10px',
                    background: 'var(--surface)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '7px',
                      background: 'var(--surface-3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: 'var(--mono)',
                      color: 'var(--text-2)',
                    }}
                  >
                    AZ
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      {tr('auth.sso.entra')}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {tr('auth.sso.entraSub')}
                    </div>
                  </div>
                  <span style={{ fontSize: '16px', color: 'var(--text-3)' }}>›</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
