'use client';

/**
 * File: apps/web/src/app/(app)/ai-assistant/page.tsx
 * Purpose: The ISMS AI Agent screen, rendering canned exchanges and calling no model.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/15-ai-assistant.html (136 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   THIS SCREEN CALLS NOTHING. Constraint 7 forbids importing any LLM provider
 *   SDK or using a provider's native schema, and ADR-0002 is still unsettled, so
 *   there is no client to call even if one were allowed. Everything on screen is
 *   fixture content, and the work here was making that legible rather than
 *   letting a static page imitate a running agent:
 *
 *   - A suggested prompt appends the user's question AND the matching entry from
 *     data/answers.ts. That is not a simulated reply — it is the fixture this
 *     screen exists to render, retrieved by the same keyword match the design's
 *     own askSuggested used, with no delay and no typing indicator.
 *   - The composer accepts free text and answers NOTHING. Sending shows an
 *     inline notice saying so. A keyword matcher would have produced a plausible
 *     answer for arbitrary input, which is the exact shape of a fake.
 *   - The fragment's status pill read 'Copilot Studio · RicohAPAC-ISMS-Agent'
 *     (:21) beside a green health dot, and the configuration card named a host,
 *     an agent id, a channel, a grounding mode and a retention period (:115-119).
 *     None of that is configuration in this codebase. The pill states the demo
 *     posture instead, and every configuration row reads 'not configured' rather
 *     than repeating a vendor choice nobody has made. The original strings are
 *     in the phase report, not paraphrased into the UI.
 *
 *   ROLE SWITCH: the fragment offers Platform admin / OpCo IT / OpCo OS (:17,
 *   dc.html:4494). 'OpCo IT' is not one of the six roles confirmed parameter #13
 *   fixes, so it is rendered as 'OpCo admin' — the only one of the six that is
 *   entity-bound with edit rights. The three-way gating the design builds on
 *   (admin sees the source index, the other two get a scoped-access card) is
 *   unchanged.
 *
 *   The dot in the status pill resolves through tok('N') because the screen's
 *   state is 'no backend', not 'healthy'. Its green glow — a literal
 *   rgba(30,138,92,.18) in the fragment — is dropped rather than recoloured:
 *   there is no neutral counterpart in the design to copy, and mixing one would
 *   be the re-derivation rule 1 forbids.
 *
 * Key Components:
 *   - AiAssistantPage: conversation column plus the role-gated right column
 *   - answerFor: the design's keyword match from a question to answers.ts
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/15-ai-assistant.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/components/chat.md
 */

import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconAssistant } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { answers } from '@/data/answers';
import { aiSuggested } from '@/data/extended/aiSuggested';
import { aiThreads } from '@/data/extended/aiThreads';
import { ROLE } from '@/data/extended/roles';
import { knowledgeSources } from '@/data/knowledgeSources';
import { tok } from '@/lib/tok';

type Answer = (typeof answers)[number];
type Message =
  | { kind: 'user'; text: string }
  | { kind: 'bot'; text: string; bullets: string[]; cites: { id: string; meta: string }[] };

/**
 * The design's own retrieval (dc.html askSuggested): first entry in answers.ts
 * whose keyword list has a member contained in the question.
 *
 * Kept rather than replaced by an index map because the keyword arrays are part
 * of the fixture; an index map would let answers.ts be reordered and this screen
 * silently pair the wrong answer with the right question.
 */
function answerFor(question: string): Answer | undefined {
  const q = question.toLowerCase();
  return answers.find((a) => a.k.some((keyword) => q.includes(keyword)));
}

/** Fragment :115-119 — the rows the configuration card lists, values removed. */
const CONFIG_ROWS = [
  'assistant.cfg.host',
  'assistant.cfg.agent',
  'assistant.cfg.channel',
  'assistant.cfg.grounding',
  'assistant.cfg.retention',
] as const;

export default function AiAssistantPage() {
  const { tr, trf, scopeLabel } = useShell();
  const [role, setRole] = useState<string>(ROLE.platformAdmin);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState(false);

  const isAdmin = role === ROLE.platformAdmin;

  // Role labels live under switchRole.* and are read from there rather than
  // restated here. The six names are fixed by confirmed parameter #13, and two
  // namespaces each holding their own spelling of 'OpCo admin' is exactly how a
  // fixed vocabulary drifts.
  const ROLE_TABS = [
    { id: ROLE.platformAdmin, labelKey: 'switchRole.role.platformAdmin' },
    { id: ROLE.opcoAdmin, labelKey: 'switchRole.role.opcoAdmin' },
    { id: ROLE.opcoOs, labelKey: 'switchRole.role.opcoOs' },
  ] as const;

  function ask(question: string) {
    const found = answerFor(question);
    if (!found) return;
    setNotice(false);
    setMessages((prev) => [
      ...prev,
      { kind: 'user', text: question },
      { kind: 'bot', text: found.text, bullets: found.bullets, cites: found.cites },
    ]);
  }

  /** Free text is never answered — see the file header. */
  function send() {
    if (text.trim().length === 0) return;
    setNotice(true);
  }

  const statusTok = tok('N');

  return (
    <div data-screen-label="ISMS AI Agent">
      <DemoBadge />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <div>
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
            {tr('assistant.eyebrow')}
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-.3px' }}>
            {tr('assistant.title')}
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--text-2)',
              marginTop: '5px',
              maxWidth: '640px',
              textWrap: 'pretty',
            }}
          >
            {tr('assistant.subtitle')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              background: 'var(--surface-3)',
              borderRadius: '8px',
              padding: '3px',
            }}
          >
            {ROLE_TABS.map((r) => {
              const on = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRole(r.id)}
                  style={{
                    height: '26px',
                    padding: '0 11px',
                    border: `1px solid ${on ? 'var(--border-strong)' : 'transparent'}`,
                    borderRadius: '6px',
                    background: on ? 'var(--surface)' : 'transparent',
                    color: on ? 'var(--primary-ink)' : 'var(--text-2)',
                    fontFamily: 'inherit',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tr(r.labelKey)}
                </button>
              );
            })}
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              height: '30px',
              padding: '0 11px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--surface)',
              fontSize: '11.5px',
              fontWeight: 600,
              color: 'var(--text-2)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: statusTok.dot,
              }}
            />
            {tr('assistant.status.noModel')}
          </span>
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setNotice(false);
            }}
            data-hov="s3"
            style={{
              height: '30px',
              padding: '0 12px',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tr('assistant.newThread')}
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 296px',
          gap: '18px',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '560px',
          }}
        >
          <div
            style={{
              flex: 1,
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  padding: '14px 0 4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <span
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '9px',
                      background: 'var(--primary-tint)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconAssistant
                      width="19"
                      height="19"
                      stroke="var(--primary-ink)"
                      strokeWidth="1.8"
                    />
                  </span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>
                      {tr('assistant.agentName')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      {tr('assistant.empty.sub')}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
                    gap: '10px',
                  }}
                >
                  {aiSuggested.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      data-hov="s3-bs"
                      style={{
                        textAlign: 'left',
                        padding: '13px 15px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        background: 'var(--surface-2)',
                        fontFamily: 'inherit',
                        fontSize: '12.5px',
                        lineHeight: 1.5,
                        color: 'var(--text)',
                        cursor: 'pointer',
                        textWrap: 'pretty',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {m.kind === 'user' && (
                  <div
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '76%',
                      background: 'var(--primary-tint)',
                      border: '1px solid var(--primary)',
                      borderRadius: '12px 12px 4px 12px',
                      padding: '11px 14px',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      color: 'var(--text)',
                    }}
                  >
                    {m.text}
                  </div>
                )}
                {m.kind === 'bot' && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'var(--primary-tint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {/* Fragment :51 draws the same two paths as IconAssistant in
                          the OPPOSITE order — spark first, speech bubble second.
                          Inlined rather than swapped for the shared icon so the
                          markup still matches the fragment line by line. */}
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--primary-ink)"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 8.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
                        <path d="M4 5h16v11H9l-5 4V5z" />
                      </svg>
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 600,
                          lineHeight: 1.55,
                          color: 'var(--text)',
                          marginBottom: '9px',
                          textWrap: 'pretty',
                        }}
                      >
                        {m.text}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '7px',
                          marginBottom: '12px',
                        }}
                      >
                        {m.bullets.map((b) => (
                          <div
                            key={b}
                            style={{
                              display: 'flex',
                              gap: '9px',
                              fontSize: '12.5px',
                              lineHeight: 1.6,
                              color: 'var(--text-2)',
                              textWrap: 'pretty',
                            }}
                          >
                            <span
                              style={{
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: 'var(--text-3)',
                                flexShrink: 0,
                                marginTop: '8px',
                              }}
                            />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '.5px',
                            textTransform: 'uppercase',
                            color: 'var(--text-3)',
                            marginRight: '2px',
                          }}
                        >
                          {tr('assistant.sources')}
                        </span>
                        {/* Citation chips carry cursor:pointer in the fragment and
                            resolve to no record here — reported as unwired. */}
                        {m.cites.map((c) => (
                          <span
                            key={c.id}
                            data-hov="s3"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 9px',
                              border: '1px solid var(--border)',
                              borderRadius: '7px',
                              background: 'var(--surface-2)',
                              fontSize: '11px',
                              color: 'var(--text-2)',
                              cursor: 'pointer',
                            }}
                          >
                            <b
                              style={{
                                fontFamily: 'var(--mono)',
                                fontSize: '10.5px',
                                color: 'var(--primary-ink)',
                              }}
                            >
                              {c.id}
                            </b>
                            {c.meta}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '14px 18px',
              background: 'var(--surface-2)',
              borderRadius: '0 0 12px 12px',
            }}
          >
            {notice && (
              <div
                role="status"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '8px 13px',
                  marginBottom: '10px',
                  borderRadius: '9px',
                  background: 'var(--rag-a-bg)',
                  border: '1px solid var(--rag-a)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--rag-a-ink)',
                }}
              >
                {tr('assistant.send.notice')}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '10px',
                padding: '0 8px 0 14px',
                height: '46px',
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                placeholder={tr('assistant.composer.placeholder')}
                aria-label={tr('assistant.composer.placeholder')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '13.5px',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={send}
                style={{
                  height: '32px',
                  padding: '0 15px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                {tr('assistant.ask')}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginTop: '9px',
                fontSize: '11px',
                color: 'var(--text-3)',
              }}
            >
              <span>{trf('assistant.hint.scope', { scope: scopeLabel })}</span>
              {/* The fragment's second hint asserted that restricted documents
                  are filtered by entity role. Nothing filters anything here. */}
              <span>{tr('assistant.hint.demo')}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isAdmin && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow)',
                padding: '16px 18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  marginBottom: '9px',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '7px',
                    background: 'var(--surface-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {/* Fragment :88 — a padlock, used nowhere else in the shell. */}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-2)"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8.5 11V8a3.5 3.5 0 017 0v3" />
                  </svg>
                </span>
                <div style={{ fontSize: '12.5px', fontWeight: 700 }}>
                  {trf('assistant.scoped.title', {
                    role: tr(
                      role === ROLE.opcoAdmin
                        ? 'switchRole.role.opcoAdmin'
                        : 'switchRole.role.opcoOs',
                    ),
                  })}
                </div>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  lineHeight: 1.65,
                  color: 'var(--text-2)',
                  textWrap: 'pretty',
                }}
              >
                {tr(
                  role === ROLE.opcoAdmin
                    ? 'assistant.scoped.opcoAdmin'
                    : 'assistant.scoped.opcoOs',
                )}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-3)',
                  lineHeight: 1.6,
                  marginTop: '11px',
                  paddingTop: '11px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                {tr('assistant.scoped.adminOnly')}
              </div>
            </div>
          )}

          {isAdmin && (
            <>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '13px 15px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                  }}
                >
                  {tr('assistant.sources.title')}
                </div>
                {knowledgeSources.map((s) => (
                  <div
                    key={s.name}
                    style={{
                      display: 'flex',
                      gap: '10px',
                      padding: '10px 15px',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {/* dc.html:4505 fills the fragment's {{ s.dot }} / {{ s.ink }}
                        holes from `ok`; both are RAG tokens, so tok() resolves them. */}
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: s.ok ? tok('G').dot : tok('N').dot,
                        flexShrink: 0,
                        marginTop: '5px',
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.35 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px' }}>
                        {s.meta}
                      </div>
                      <div
                        style={{
                          fontSize: '10.5px',
                          color: s.ok ? 'var(--text-3)' : tok('N').dot,
                          marginTop: '2px',
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {s.status}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-3)',
                      }}
                    >
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow)',
                  padding: '15px',
                }}
              >
                <div style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '11px' }}>
                  {tr('assistant.cfg.title')}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '9px',
                    fontSize: '11.5px',
                    color: 'var(--text-2)',
                  }}
                >
                  {CONFIG_ROWS.map((key) => (
                    <div
                      key={key}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}
                    >
                      <span style={{ color: 'var(--text-3)' }}>{tr(key)}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {tr('assistant.cfg.unset')}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-3)',
                    lineHeight: 1.6,
                    marginTop: '11px',
                    paddingTop: '11px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  {tr('assistant.cfg.note')}
                </div>
              </div>
            </>
          )}

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '13px 15px',
                borderBottom: '1px solid var(--border)',
                fontSize: '12.5px',
                fontWeight: 700,
              }}
            >
              {tr('assistant.threads.title')}
            </div>
            {/* No handler: the deliverable stores thread titles and no bodies. */}
            {aiThreads.map((t) => (
              <div
                key={t.title}
                data-hov="s2"
                style={{
                  padding: '10px 15px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    textWrap: 'pretty',
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '3px' }}>
                  {t.meta}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
