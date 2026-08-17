'use client';

/**
 * File: apps/web/src/components/shell/AiDrawer.tsx
 * Purpose: The floating ISMS AI Agent launcher and the slide-over chat drawer it opens.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   The third shell region, ported from fragments/shell/30-ai-drawer.html (66
 *   lines) under the five port rules in AppShell.tsx. Inline style values are
 *   unchanged throughout; all four style-hover attributes in the fragment carry
 *   the same declaration and resolve to data-hov="s3".
 *
 *   THE SAME AGENT AS /ai-assistant, IN A SMALLER SURFACE. The design proves it
 *   — dc.html:4722 hands both surfaces one `ai` object and one `chatMsgs` — so
 *   this file reuses that screen's vocabulary rather than writing a second
 *   account of what the agent is:
 *
 *   - A suggested prompt appends the question AND the matching entry from
 *     data/answers.ts, retrieved by the design's own keyword match
 *     (dc.html:4148 askSuggested). That is the fixture this drawer exists to
 *     render, not a simulated reply: no delay, no typing indicator.
 *   - The composer accepts free text and answers NOTHING, showing the same
 *     assistant.send.notice the full screen shows. Running arbitrary input
 *     through the keyword matcher would produce a confident answer to any
 *     question, which is the exact shape of a fake.
 *   - The fragment's header sub-line read 'Copilot Studio · grounded on 7
 *     sources' (:18). No provider is chosen — constraint 7 forbids binding to
 *     one and ADR-0002 is unsettled — and the source count was wrong anyway
 *     (knowledgeSources has 8 rows, progress.md:316). The slot states the demo
 *     posture instead, through the key the full screen already uses.
 *
 *   TWO DECLARED DEVIATIONS FROM THE FRAGMENT, both reported rather than quiet:
 *
 *   1. assistant.hint.demo is rendered under the composer, which the fragment
 *      has no slot for. Answers appear here with citations attached; the mock
 *      honesty rule (verification-discipline.md) says fixture content must say
 *      it is fixture content ON the surface that renders it. The string is the
 *      full screen's, not a new one.
 *   2. The conversation is local to this component, where the design shares one
 *      chatMsgs between drawer and full screen. Sharing would mean lifting that
 *      screen's state into the shell — a change to an already-audited screen,
 *      outside this port. Asking here and then opening the full page therefore
 *      shows an empty thread.
 *
 *   role="dialog" + aria-label are added rather than inherited, for the same
 *   reason AppShell adds aria-current: the fragments carry zero aria
 *   attributes. It is deliberately NOT aria-modal — nothing traps focus and
 *   the page behind stays operable, so claiming modality would be a lie to a
 *   screen reader.
 *
 * Key Components:
 *   - AiDrawer: launcher when closed, drawer when open; owns the conversation
 *   - answerFor: the design's keyword match from a question to answers.ts
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — the shell fragment closeout found missing
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/shell/30-ai-drawer.html
 *   - apps/web/src/app/(app)/ai-assistant/page.tsx — the full-screen surface
 */

import Link from 'next/link';
import { useState } from 'react';

import { IconAssistant } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { answers } from '@/data/answers';
import { aiSuggested } from '@/data/extended/aiSuggested';

type Answer = (typeof answers)[number];
type Message =
  | { kind: 'user'; text: string }
  | { kind: 'bot'; text: string; bullets: string[]; cites: { id: string; meta: string }[] };

/**
 * Deliberately a second copy of ai-assistant/page.tsx's answerFor.
 *
 * Extracting it would edit that screen, which this port is not scoped to touch;
 * carrying a divergent matcher would be worse than either. Reported for
 * extraction the next time both files are open.
 */
function answerFor(question: string): Answer | undefined {
  const q = question.toLowerCase();
  return answers.find((a) => a.k.some((keyword) => q.includes(keyword)));
}

export function AiDrawer() {
  const { tr } = useShell();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [notice, setNotice] = useState(false);

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

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={tr('assistant.agentName')}
          data-hov="s3"
          style={{
            position: 'fixed',
            right: '22px',
            bottom: '22px',
            zIndex: 60,
            height: '44px',
            padding: '0 18px 0 15px',
            border: '1px solid var(--border-strong)',
            borderRadius: '22px',
            background: 'var(--surface)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(16,24,40,.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
          }}
        >
          <IconAssistant width="17" height="17" stroke="var(--primary)" strokeWidth="1.8" />
          {tr('assistant.agentName')}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={tr('assistant.agentName')}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '392px',
            zIndex: 70,
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border-strong)',
            boxShadow: '-12px 0 40px rgba(16,24,40,.14)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'var(--primary-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconAssistant width="17" height="17" stroke="var(--primary-ink)" strokeWidth="1.8" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{tr('assistant.agentName')}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                {tr('assistant.status.noModel')}
              </div>
            </div>
            {/* The fragment's {{ nav.assistant.go }} button, as the Link this
                port navigates with. Closing on the way out: landing on the full
                screen with the drawer still covering it is not what "open full
                page" says it does. */}
            <Link
              href="/ai-assistant"
              onClick={() => setOpen(false)}
              title={tr('assistant.drawer.openFull')}
              data-hov="s3"
              style={{
                width: '30px',
                height: '30px',
                border: '1px solid var(--border)',
                borderRadius: '7px',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5h10v10" />
                <path d="M19 5L9.5 14.5" />
                <path d="M15 19H5V9" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title={tr('assistant.drawer.close')}
              data-hov="s3"
              style={{
                width: '30px',
                height: '30px',
                border: '1px solid var(--border)',
                borderRadius: '7px',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '.4px',
                    textTransform: 'uppercase',
                    color: 'var(--text-3)',
                  }}
                >
                  {tr('assistant.drawer.tryAsking')}
                </div>
                {/* hint-placeholder-count="4", and aiSuggested holds exactly the
                    four the design lists (dc.html:4083-4088). */}
                {aiSuggested.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    data-hov="s3"
                    style={{
                      textAlign: 'left',
                      padding: '11px 13px',
                      border: '1px solid var(--border)',
                      borderRadius: '9px',
                      background: 'var(--surface-2)',
                      fontFamily: 'inherit',
                      fontSize: '12px',
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
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {m.kind === 'user' && (
                  <div
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '88%',
                      background: 'var(--primary-tint)',
                      border: '1px solid var(--primary)',
                      borderRadius: '11px 11px 4px 11px',
                      padding: '9px 12px',
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                    }}
                  >
                    {m.text}
                  </div>
                )}
                {m.kind === 'bot' && (
                  <div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        lineHeight: 1.55,
                        marginBottom: '8px',
                        textWrap: 'pretty',
                      }}
                    >
                      {m.text}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginBottom: '10px',
                      }}
                    >
                      {m.bullets.map((b) => (
                        <div
                          key={b}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            fontSize: '12px',
                            lineHeight: 1.55,
                            color: 'var(--text-2)',
                            textWrap: 'pretty',
                          }}
                        >
                          <span
                            style={{
                              width: '3px',
                              height: '3px',
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
                    {/* Unlike the full screen's, these chips carry neither
                        cursor:pointer nor a hover in the fragment — so there is
                        nothing here that looks clickable and is not. */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {m.cites.map((c) => (
                        <span
                          key={c.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            background: 'var(--surface-2)',
                            fontSize: '10.5px',
                            color: 'var(--text-2)',
                          }}
                        >
                          <b
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: '10px',
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
                )}
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '12px 14px',
              background: 'var(--surface-2)',
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
                gap: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '9px',
                padding: '0 6px 0 12px',
                height: '40px',
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
                placeholder={tr('assistant.drawer.placeholder')}
                aria-label={tr('assistant.drawer.placeholder')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  color: 'var(--text)',
                }}
              />
              <button
                type="button"
                onClick={send}
                title={tr('assistant.ask')}
                aria-label={tr('assistant.ask')}
                style={{
                  width: '28px',
                  height: '28px',
                  border: 'none',
                  borderRadius: '7px',
                  background: 'var(--primary)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            {/* Declared deviation 1 — see the file header. */}
            <div style={{ marginTop: '9px', fontSize: '11px', color: 'var(--text-3)' }}>
              {tr('assistant.hint.demo')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
