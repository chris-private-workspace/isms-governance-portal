'use client';

/**
 * File: apps/web/src/app/(app)/policies/page.tsx
 * Purpose: The policy library — lifecycle state, review date and attestation reach.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Ported from fragments/screens/09-policies.html (49 lines) under the five
 *   port rules in AppShell.tsx. Inline style values are unchanged.
 *
 *   ⛔ W24 CORRECTION — THIS SCREEN *IS* ENTITY-SCOPED. The W19 header claimed
 *   the opposite, and said so confidently: the fragment's subtitle ends in the
 *   literal word "group-wide" (:12) and its fixture carries no entity column,
 *   from which the port concluded that a policy belongs to the group rather
 *   than to an OpCo. The database says otherwise and always did — `policies`
 *   has `org_entity_id NOT NULL` with RLS over it (schema.prisma:329), and
 *   GET /policies returns only the rows in the caller's scope. The design
 *   deliverable and the data model disagree here; the data model wins
 *   (CLAUDE.md 約束 6 exception: domain logic follows the procedure, not the
 *   mockup). The scope selector still does not filter this list, but for the
 *   ordinary reason it does not filter the risk register either: scope is set
 *   on the server from the principal, never from the client (約束 8 rule 3).
 *
 *   ATTESTATION AND NEXT REVIEW ARE GONE, not restyled. Neither has a column on
 *   Policy and attestation has no read path at all (its table arrived in W14
 *   with no endpoint). A progress bar at 0% is still a progress bar, and it
 *   would be asserting a measured attestation rate for a real policy.
 *
 *   "New policy" RENDERS DISABLED: there is no /policies/new route in this port
 *   and no write path behind it. Day-3 found it drawn live with no handler,
 *   which is indistinguishable from a working button.
 *
 * Key Components:
 *   - PoliciesPage: the screen
 *   - STATUS: the API's six lifecycle states onto RAG; only `published` is green
 *   - Source: rows / failed / loading — no fourth state, and no fixture fallback
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-20
 *
 * Modification History (newest-first):
 *   - 2026-08-20: Count under-review over the filtered view (Phase W24) — CH-044
 *   - 2026-08-19: Read the API; four columns have no source (Phase W24) — CH-044
 *   - 2026-08-17: Disable server-backed actions (Phase W19) — Day-3 dead controls
 *   - 2026-08-17: Initial creation (Phase W19)
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/09-policies.html
 */

import { useEffect, useState } from 'react';

import { DemoBadge } from '@/components/DemoBadge';
import { IconSearch } from '@/components/icons';
import { NoSource } from '@/components/NoSource';
import { useShell } from '@/components/shell/shell-state';
import type { TranslationKey } from '@/i18n';
import { listPolicies, type PolicyRow } from '@/lib/api/policies';
import { tok, type Rating } from '@/lib/tok';

/**
 * The API's six lifecycle states (02a:300-312) onto RAG.
 *
 * ⚠️ ONLY `published` IS GREEN, and the reason is not aesthetic. The fixture had
 * three states and painted "Published" green, which was fine when every row was
 * invented. Six real states make the question sharp: `approved` means a
 * committee said yes and the document is NOT in force yet. Green on that row
 * would read as "this policy is operating" — a governance claim about a real
 * record that nothing in the API supports. `retired` is neutral rather than red
 * for the same kind of reason: a retired policy is not a failure, it is a
 * document at the end of its life.
 */
const STATUS: Record<string, { key: TranslationKey; rating: Rating }> = {
  draft: { key: 'policies.status.draft', rating: 'N' },
  in_review: { key: 'policies.status.underReview', rating: 'A' },
  approved: { key: 'policies.status.approved', rating: 'A' },
  published: { key: 'policies.status.published', rating: 'G' },
  under_revision: { key: 'policies.status.underRevision', rating: 'A' },
  retired: { key: 'policies.status.retired', rating: 'N' },
};

interface Source {
  rows: PolicyRow[] | null;
  failed: boolean;
  loading: boolean;
}

const TH_LEFT = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: '10.5px',
  fontWeight: 700,
  letterSpacing: '.5px',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
  borderBottom: '1px solid var(--border)',
} as const;

/**
 * components/controls.md:7 — disabled is opacity .5 with cursor not-allowed.
 *
 * Applied to New policy, which would need a route and a write path. Not an
 * invented visual: it is the design system's own disabled state.
 */
const INERT: React.CSSProperties = { cursor: 'not-allowed', opacity: 0.5 };

export default function PoliciesPage() {
  const { tr, trf } = useShell();

  const [source, setSource] = useState<Source>({ rows: null, failed: false, loading: true });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const answer = await listPolicies();
        if (!cancelled) setSource({ rows: answer.data, failed: false, loading: false });
      } catch {
        // ⛔ NO FIXTURE FALLBACK. Same reason as the risk register: falling back
        // here would render a dead backend as a working policy library, and a
        // policy library is the one place a reader is entitled to assume that
        // what is listed is what the organisation actually holds.
        if (!cancelled) setSource({ rows: null, failed: true, loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [fCategory, setFCategory] = useState<string | null>(null);
  const [fStatus, setFStatus] = useState<string | null>(null);

  const rows = source.rows ?? [];
  const view = rows.filter((p) => fStatus === null || p.status === fStatus);

  // Counted over `view`, not `rows`, because the meta line prints it in the same
  // sentence as `view.length`. Counting the two over different populations made
  // the Published filter read "1 policies · 1 under review" with no such row on
  // screen — a count of records the reader cannot see is exactly the kind of
  // unsupported statement this phase exists to remove. Found by drive-through;
  // every gate was green, because the tests only ever assert the unfiltered view.
  const underReview = view.filter((p) => p.status === 'in_review').length;

  const unique = (values: string[]) => [...new Set(values)];

  const FILTERS = [
    {
      id: 'category',
      labelKey: 'policies.filter.category' as TranslationKey,
      allKey: 'policies.filter.category.all' as TranslationKey,
      value: fCategory,
      set: setFCategory,
      // Always empty: Policy has no category column, so there is nothing to
      // offer. Left in place rather than deleted because LIVE_FILTERS below
      // drops it on that basis, and the day the API grows a category this
      // filter comes back on its own. Deleting it would need someone to
      // remember to write it again.
      options: [] as { value: string; label: string }[],
    },
    {
      id: 'status',
      labelKey: 'policies.filter.status' as TranslationKey,
      allKey: 'policies.filter.status.all' as TranslationKey,
      value: fStatus,
      set: setFStatus,
      options: unique(rows.map((p) => p.status)).map((v) => {
        const meta = STATUS[v];
        return { value: v, label: meta ? tr(meta.key) : v };
      }),
    },
  ];

  // A filter whose options are empty is a control that cannot do anything.
  // Copied from the risk register (risks/page.tsx:228), where the same shape
  // appeared for the same reason one phase earlier.
  const LIVE_FILTERS = FILTERS.filter((f) => f.options.length > 0);

  if (source.loading || source.failed) {
    return (
      <div data-screen-label="Policies">
        <DemoBadge variant="partial" />
        <div
          data-source-state={source.loading ? 'loading' : 'error'}
          style={{
            maxWidth: '560px',
            padding: '18px 20px',
            borderRadius: '10px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {source.loading ? (
            <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
              {tr('policies.source.loading')}
            </div>
          ) : (
            <>
              <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                {tr('policies.source.error.title')}
              </div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'var(--text-2)' }}>
                {tr('policies.source.error.body')}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-screen-label="Policies">
      <DemoBadge variant="partial" />

      <div
        data-partial-source
        style={{
          marginBottom: '14px',
          fontSize: '12px',
          lineHeight: 1.6,
          color: 'var(--text-3)',
        }}
      >
        {tr('policies.partialSource.text')} {tr('policies.detailNotWired')}{' '}
        {tr('policies.scope.note')}
      </div>

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
          {tr('policies.eyebrow')}
        </div>
        <h1 style={{ margin: 0, fontSize: '23px', fontWeight: 700, letterSpacing: '-.3px' }}>
          {tr('policies.title')}
        </h1>
        <div style={{ marginTop: '5px', fontSize: '12.5px', color: 'var(--text-2)' }}>
          {trf('policies.meta', {
            n: view.length,
            review: underReview,
            scope: tr('policies.scope.serverSide'),
          })}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        {LIVE_FILTERS.map((f) => {
          const current = f.options.find((o) => o.value === f.value);
          return (
            <div key={f.id} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenMenu((cur) => (cur === f.id ? null : f.id))}
                data-hov="s3"
                style={{
                  height: '34px',
                  padding: '0 12px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '8px',
                  background: 'var(--surface)',
                  fontFamily: 'inherit',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--text-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                }}
              >
                {current ? current.label : tr(f.labelKey)}{' '}
                <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>▼</span>
              </button>
              {openMenu === f.id && (
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: 0,
                    minWidth: '180px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '10px',
                    boxShadow: '0 10px 30px rgba(16,24,40,.16)',
                    padding: '6px',
                    zIndex: 30,
                  }}
                >
                  {[{ value: null, label: tr(f.allKey) }, ...f.options].map((o) => (
                    <button
                      key={o.value ?? '__all'}
                      type="button"
                      onClick={() => {
                        f.set(o.value);
                        setOpenMenu(null);
                      }}
                      data-hov="s3"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '8px 10px',
                        border: 'none',
                        borderRadius: '7px',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {o.label}
                      {f.value === o.value && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--primary)"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* Inert: there is no /policies/new route in this port. */}
        <button
          type="button"
          disabled
          title={tr('shell.inert')}
          style={{
            height: '34px',
            padding: '0 14px',
            border: 'none',
            borderRadius: '8px',
            background: 'var(--primary)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            ...INERT,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {tr('policies.new')}
        </button>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '960px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('policies.col.policy')}</th>
                <th style={TH_LEFT}>{tr('policies.col.category')}</th>
                <th style={TH_LEFT}>{tr('policies.col.owner')}</th>
                <th style={{ ...TH_LEFT, textAlign: 'center' }}>{tr('policies.col.version')}</th>
                <th style={TH_LEFT}>{tr('policies.col.status')}</th>
                <th style={TH_LEFT}>{tr('policies.col.nextReview')}</th>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>
                  {tr('policies.col.attestation')}
                </th>
              </tr>
            </thead>
            <tbody>
              {view.map((p) => {
                const meta = STATUS[p.status];
                const st = tok(meta?.rating ?? 'N');
                return (
                  // Not clickable, and not disabled-looking either — there is no
                  // action here to disable. The detail screen still reads the
                  // fixture, so its ids are POL-301-shaped and these are uuids:
                  // every click would land on "policy not found" for a policy the
                  // reader just saw listed. policies.detailNotWired says so above
                  // the table rather than letting the reader discover it by
                  // clicking. (Day-0 D2 found the same shape already shipped on
                  // /dashboard, pointing at the live /risks/[id].)
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontFamily: 'var(--mono)',
                          color: 'var(--primary-ink)',
                          fontWeight: 600,
                        }}
                      >
                        {p.refCode}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                        {p.title}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      <NoSource label={tr('policies.noSource.title')} />
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      <NoSource label={tr('policies.noSource.title')} />
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        padding: 'var(--row-py) 12px',
                        fontFamily: 'var(--mono)',
                        fontSize: '12px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {p.version}
                    </td>
                    <td style={{ padding: 'var(--row-py) 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: st.bg,
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: st.dot,
                          }}
                        />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: st.ink }}>
                          {meta ? tr(meta.key) : p.status}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12px',
                        color: 'var(--text-3)',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      <NoSource label={tr('policies.noSource.title')} />
                    </td>
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      {/* The bar went with the number. A 0%-wide coloured bar is
                          still a bar, and an empty progress track reads as "zero
                          percent attested" — a measured claim about a real
                          policy, from a table that does not exist yet. */}
                      <NoSource label={tr('policies.noSource.title')} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {view.length === 0 && (
          // Not in the fragment — see the note on the controls screen.
          //
          // TWO EMPTIES, TWO MESSAGES. "the API returned nothing for this scope"
          // and "your filter matched nothing" are different facts and lead to
          // different next actions. The risk register renders one message for
          // both, which is why its risks.source.empty.* keys exist and are
          // never read — a dead key is what happens when the distinction is
          // written down in the dictionary and not in the branch.
          <div
            data-source-state={rows.length === 0 ? 'empty' : 'filtered'}
            style={{ padding: '44px', textAlign: 'center' }}
          >
            <IconSearch
              width="30"
              height="30"
              stroke="var(--text-3)"
              strokeWidth="1.5"
              style={{ marginBottom: '8px', opacity: 0.7 }}
            />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>
              {rows.length === 0 ? tr('policies.source.empty.title') : tr('policies.empty.title')}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {rows.length === 0 ? tr('policies.source.empty.body') : tr('policies.empty.body')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
