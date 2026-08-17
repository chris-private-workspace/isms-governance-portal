'use client';

/**
 * File: apps/web/src/app/(app)/assessments/page.tsx
 * Purpose: The RCSA cycle — completion per entity, and the frontline task list.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/13-assessments.html (120 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged throughout.
 *
 *   The fragment is TWO screens behind one sc-if pair: `assessList` (default)
 *   and `assessForm`. Both are ported; the switch is local state, because
 *   opening a task is a within-screen move the design gives no route to.
 *
 *   WHAT THE FRAGMENT HARDCODED AND THIS SCREEN DERIVES:
 *   - `{{ rcsaCompletion }}` was the literal '76%' (dc.html:5331). It is now
 *     total done / total assigned over the rows actually rendered, so narrowing
 *     the topbar scope moves it. 76% was true of the deliverable's six-entity
 *     sample and of nothing here.
 *   - 'Singapore' appears twice as the assessing entity (:43, :62). Entity comes
 *     from useShell() instead — the fragment predates this project's 13 OpCos.
 *   - 'Continue assessment · 2 of 4 done' (:52) counts myTasks.
 *   - Assigned and done per row follow the design's own formula
 *     (dc.html:5062): assigned = 60% of the entity's risks, done = that times
 *     the entity's completion rate.
 *
 *   THE OPTION BUTTONS IN Q1/Q2 are the one place a value is derived rather than
 *   copied, and the reason is that the fragment only ever draws ONE of the three
 *   states. Its selected option is styled green because the demo's answer
 *   happens to be 'Yes' / 'Effective'; copying that literally would paint
 *   'Ineffective' green the moment anyone clicked it. So selection resolves
 *   through tok() over the option's own rating, which reproduces the fragment
 *   exactly for the state it shows and stays truthful for the two it does not.
 *
 *   Elements the fragment draws as <div>/<label> with a click handler are
 *   rendered as <button> so they are reachable by keyboard. That adds only the
 *   declarations needed to cancel the UA button defaults the original element
 *   never had (font-family, background, text-align); no design value changes.
 *
 * Key Components:
 *   - AssessmentsPage: both views, switched by `view`
 *   - rows: per-entity completion, derived from entityPosture
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/13-assessments.html
 *   - apps/web/src/lib/posture.ts — the completion thresholds behind each bar
 */

import { useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconCheck, IconChevronLeft } from '@/components/icons';
import { useShell } from '@/components/shell/shell-state';
import { entityPosture } from '@/data/entityPosture';
import { myTasks } from '@/data/extended/myTasks';
import { band, THRESHOLD } from '@/lib/posture';
import { tok } from '@/lib/tok';

/** Fragment :12 — the cycle's due date, the one date the design states. */
const DUE = '31 Jul 2026';

/** Fragment :64 — the control this sample assessment is against. */
const SUBJECT = 'CTL-2201 · MFA on all administrator accounts · Preventive';

/** Fragment :104 — the design ships exactly one attachment. */
const EVIDENCE = ['idp-mfa-export-2026-06-30.pdf'];

/* === The two graded option rows in the form ===
   Why a rating rather than a copied colour: see the file header. 'Partially'
   and 'Partial' are the same amber band in components/status.md's table, which
   is why the two rows differ in label and not in colour. */
const Q1_OPTIONS = [
  { id: 'yes', labelKey: 'assessments.q1.yes', rating: 'G' as const },
  { id: 'partial', labelKey: 'assessments.q1.partially', rating: 'A' as const },
  { id: 'no', labelKey: 'assessments.q1.no', rating: 'R' as const },
] as const;

const Q2_OPTIONS = [
  { id: 'effective', labelKey: 'assessments.q2.effective', rating: 'G' as const },
  { id: 'partial', labelKey: 'assessments.q2.partial', rating: 'A' as const },
  { id: 'ineffective', labelKey: 'assessments.q2.ineffective', rating: 'R' as const },
] as const;

export default function AssessmentsPage() {
  const { tr, trf, entity, scopeLabel, periodLabel } = useShell();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [q1, setQ1] = useState<string>('yes');
  const [q2, setQ2] = useState<string>('effective');
  const [q3, setQ3] = useState<'accept' | 'escalate'>('accept');
  // The fragment ships the textarea with body text already in it (:96), so the
  // demo opens on a part-written assessment rather than an empty one.
  const [comments, setComments] = useState<string>(tr('assessments.q4.sample'));

  // Entity-scoped by default; the region is the additive case, as everywhere.
  const scoped = entity ? entityPosture.filter((e) => e.code === entity.code) : entityPosture;
  const scopeName = entity ? entity.name : scopeLabel;

  // dc.html:5062 — the design's own derivation, kept rather than re-invented.
  const rows = scoped.map((e) => {
    const assigned = Math.round(e.risks * 0.6);
    return {
      code: e.code,
      name: e.name,
      flag: e.flag,
      assigned,
      done: Math.round((assigned * e.rcsa) / 100),
      pct: e.rcsa,
      rating: band(e.rcsa, THRESHOLD.completion.good, THRESHOLD.completion.watch),
    };
  });

  const totalAssigned = rows.reduce((a, r) => a + r.assigned, 0);
  const totalDone = rows.reduce((a, r) => a + r.done, 0);
  const completion = totalAssigned ? Math.round((totalDone / totalAssigned) * 100) : 0;

  const tasksDone = myTasks.filter((t) => t.done).length;

  // The evidence line emphasises one word mid-sentence. Splitting the sentence
  // into two keys would hand a translator half a clause each; tf() leaves an
  // unknown placeholder as written, so {browse} survives the count substitution
  // and the emphasis can sit wherever the language puts it.
  const [dropBefore, dropAfter] = trf('assessments.evidence.drop', {
    n: EVIDENCE.length,
  }).split('{browse}');

  return (
    <div data-screen-label="Assessments — RCSA">
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
          {tr('assessments.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {trf('assessments.title', { period: periodLabel })}
        </h1>
        <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
          {trf('assessments.meta', { due: DUE, pct: completion })}
        </div>
      </div>

      {view === 'list' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '16px',
            alignItems: 'start',
          }}
        >
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
                padding: '15px 18px',
                borderBottom: '1px solid var(--border)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              {tr('assessments.byEntity')}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 18px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '.5px',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('assessments.col.entity')}
                    </th>
                    {(['assessments.col.assigned', 'assessments.col.done'] as const).map((key) => (
                      <th
                        key={key}
                        style={{
                          textAlign: 'center',
                          padding: '10px 12px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          letterSpacing: '.5px',
                          textTransform: 'uppercase',
                          color: 'var(--text-3)',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        {tr(key)}
                      </th>
                    ))}
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '10px 18px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        letterSpacing: '.5px',
                        textTransform: 'uppercase',
                        color: 'var(--text-3)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      {tr('assessments.col.progress')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const rt = tok(r.rating);
                    return (
                      <tr key={r.code} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: 'var(--row-py) 18px' }}>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}
                          >
                            <span
                              style={{
                                width: '24px',
                                height: '18px',
                                borderRadius: '4px',
                                background: 'var(--surface-3)',
                                border: '1px solid var(--border)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '9px',
                                fontWeight: 700,
                                fontFamily: 'var(--mono)',
                                color: 'var(--text-2)',
                              }}
                            >
                              {r.flag}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{r.name}</span>
                          </span>
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: 'var(--row-py) 12px',
                            fontFamily: 'var(--mono)',
                            fontSize: '12.5px',
                            color: 'var(--text-2)',
                          }}
                        >
                          {r.assigned}
                        </td>
                        <td
                          style={{
                            textAlign: 'center',
                            padding: 'var(--row-py) 12px',
                            fontFamily: 'var(--mono)',
                            fontSize: '12.5px',
                            color: 'var(--text-2)',
                          }}
                        >
                          {r.done}
                        </td>
                        <td style={{ padding: 'var(--row-py) 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                flex: 1,
                                maxWidth: '150px',
                                height: '6px',
                                borderRadius: '3px',
                                background: 'var(--surface-3)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${r.pct}%`,
                                  background: rt.dot,
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: '12.5px',
                                fontFamily: 'var(--mono)',
                                fontWeight: 600,
                                color: rt.ink,
                                minWidth: '38px',
                              }}
                            >
                              {r.pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              {/* Fragment :42. Not IconAssessments — that one carries a third
                  path (the clipboard's clip) this instance does not draw. */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 13l2 2 4-4" />
              </svg>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{tr('assessments.myTasks')}</div>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginBottom: '14px' }}>
              {trf('assessments.myTasks.meta', { scope: scopeName })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {myTasks.map((task) => (
                <button
                  key={task.title}
                  type="button"
                  onClick={() => setView('form')}
                  data-hov="s2"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '11px',
                    padding: '11px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '9px',
                    cursor: 'pointer',
                    // Cancels the UA button defaults the fragment's <label> never had.
                    background: 'transparent',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      border: `1.8px solid ${task.done ? 'var(--primary)' : 'var(--border-strong)'}`,
                      background: task.done ? 'var(--primary)' : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '1px',
                    }}
                  >
                    {task.done && (
                      <IconCheck width="12" height="12" stroke="#fff" strokeWidth="3" />
                    )}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: task.done ? 'var(--text-3)' : 'var(--text)',
                        textDecoration: task.done ? 'line-through' : undefined,
                      }}
                    >
                      {task.title}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        marginTop: '2px',
                      }}
                    >
                      {task.meta}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setView('form')}
              style={{
                width: '100%',
                height: '38px',
                marginTop: '14px',
                border: 'none',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {trf('assessments.continue', { done: tasksDone, total: myTasks.length })}
            </button>
          </div>
        </div>
      )}

      {view === 'form' && (
        <>
          <button
            type="button"
            onClick={() => setView('list')}
            data-hov="s3"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              height: '30px',
              padding: '0 10px 0 6px',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              background: 'var(--surface)',
              color: 'var(--text-2)',
              fontFamily: 'inherit',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '14px',
            }}
          >
            <IconChevronLeft width="15" height="15" stroke="currentColor" strokeWidth="2" />
            {tr('assessments.back')}
          </button>
          <div style={{ maxWidth: '720px' }}>
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
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '.4px',
                    color: 'var(--text-3)',
                    textTransform: 'uppercase',
                    marginBottom: '5px',
                  }}
                >
                  <span>{tr('assessments.form.eyebrow')}</span>
                  <span style={{ color: 'var(--border-strong)' }}>/</span>
                  <span>{scopeName}</span>
                  <span style={{ color: 'var(--border-strong)' }}>/</span>
                  <span>{periodLabel}</span>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 700 }}>
                  {tr('assessments.form.title')}
                </div>
                <div
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-2)',
                    marginTop: '3px',
                    fontFamily: 'var(--mono)',
                  }}
                >
                  {SUBJECT}
                </div>
              </div>
              <div
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '10px' }}>
                    {tr('assessments.q1')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Q1_OPTIONS.map((o) => {
                      const on = q1 === o.id;
                      const ot = tok(o.rating);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setQ1(o.id)}
                          data-hov={on ? undefined : 's2'}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '11px',
                            border: `1.5px solid ${on ? ot.dot : 'var(--border)'}`,
                            borderRadius: '9px',
                            background: on ? ot.bg : 'transparent',
                            color: on ? ot.ink : 'var(--text-2)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {tr(o.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '10px' }}>
                    {tr('assessments.q2')}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Q2_OPTIONS.map((o) => {
                      const on = q2 === o.id;
                      const ot = tok(o.rating);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setQ2(o.id)}
                          data-hov={on ? undefined : 's2'}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '11px',
                            border: `1.5px solid ${on ? ot.dot : 'var(--border)'}`,
                            borderRadius: '9px',
                            background: on ? ot.bg : 'transparent',
                            color: on ? ot.ink : 'var(--text-2)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          {tr(o.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '10px' }}>
                    {tr('assessments.q3')}
                  </div>
                  <div style={{ display: 'flex', gap: '18px' }}>
                    {(
                      [
                        { id: 'accept', labelKey: 'assessments.q3.accept' },
                        { id: 'escalate', labelKey: 'assessments.q3.escalate' },
                      ] as const
                    ).map((o) => {
                      const on = q3 === o.id;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setQ3(o.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: on ? 'var(--text)' : 'var(--text-2)',
                            border: 'none',
                            background: 'transparent',
                            padding: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          <span
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: `1.8px solid ${on ? 'var(--primary)' : 'var(--border-strong)'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {on && (
                              <span
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  background: 'var(--primary)',
                                }}
                              />
                            )}
                          </span>
                          {tr(o.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '10px' }}>
                    {tr('assessments.q4')}
                  </div>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={tr('assessments.q4.placeholder')}
                    aria-label={tr('assessments.q4')}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '11px 13px',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '9px',
                      background: 'var(--surface-2)',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      color: 'var(--text)',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '10px' }}>
                    {tr('assessments.q5')}
                  </div>
                  {/* No handler: there is nowhere for an upload to go. Reported
                      as unwired rather than given a click that does nothing. */}
                  <div
                    data-hov="s2-bp"
                    style={{
                      border: '1.5px dashed var(--border-strong)',
                      borderRadius: '10px',
                      padding: '22px',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Fragment :102 — an upload arrow; IconDownload points the
                        other way and traces a different tray. */}
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--text-3)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ marginBottom: '6px' }}
                    >
                      <path d="M12 16V4M7 9l5-5 5 5" />
                      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
                    </svg>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>
                      {dropBefore}
                      <span style={{ color: 'var(--primary-ink)', fontWeight: 600 }}>
                        {tr('assessments.evidence.browse')}
                      </span>
                      {dropAfter}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-3)',
                        marginTop: '4px',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {EVIDENCE.join(' · ')}
                    </div>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '15px 20px',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}
              >
                <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                  {tr('assessments.autosaved')}
                </span>
                {/* Both unwired. The fragment sends them back to the task list,
                    which would read as 'saved' / 'submitted' when nothing is
                    stored anywhere. Reported instead of faked. */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    data-hov="s3"
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      border: '1px solid var(--border-strong)',
                      borderRadius: '8px',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tr('assessments.saveDraft')}
                  </button>
                  <button
                    type="button"
                    style={{
                      height: '38px',
                      padding: '0 18px',
                      border: 'none',
                      borderRadius: '8px',
                      background: 'var(--primary)',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {tr('assessments.submit')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
