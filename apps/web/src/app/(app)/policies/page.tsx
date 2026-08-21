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
 *   "New policy" RENDERS DISABLED: there is no /policies/new route in this port.
 *   Day-3 found it drawn live with no handler, which is indistinguishable from a
 *   working button. ⚠️ W26 gave it its OWN inert text: the shared `shell.inert`
 *   says "this port has no backend that can perform it", and as of this phase
 *   that sentence is false on this screen — the row actions below do reach a
 *   backend. What "New policy" is missing is a route, not a server.
 *
 *   ⭐ W26 ADDED THE ONLY WRITE CONTROL ON THIS SCREEN. Verb buttons per row,
 *   one per legal target, rendered from the `allowed` list the API sends. The
 *   design handoff has no such control anywhere — measured, not assumed — and
 *   the ruling to build it against 02a §4 rather than approximate one is
 *   15-design-alignment.md §4.1, approved 2026-08-21.
 *
 *   ⛔ THESE BUTTONS ARE NOT PERMISSION-AWARE, AND MUST NOT BE READ AS IF THEY
 *   WERE. Role enforcement does not exist yet (M4; AD-RbacUnenforced-1), so
 *   every viewer sees every legal verb. §5.1 (:103) says a role without a verb
 *   should not see its button — that rule cannot be met today and is not faked:
 *   at M4 the server filters `allowed` and this file does not change.
 *
 * Key Components:
 *   - PoliciesPage: the screen
 *   - STATUS: the API's six lifecycle states onto RAG; only `published` is green
 *   - ACTION: the verb per legal target — one sourced, five derived; see below
 *   - Source: rows / failed / loading — no fixture fallback
 *   - Failure: the three ways a transition can fail, kept apart on screen
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-21
 *
 * Modification History (newest-first):
 *   - 2026-08-21: Add the lifecycle verb buttons (Phase W26) — CH-048
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
import { ApiRefusedError } from '@/lib/api/client';
import { listPolicies, transitionPolicy, type PolicyRow } from '@/lib/api/policies';
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

/**
 * The verb offered for each legal TARGET state. Six verbs cover seven edges,
 * because `→ in_review` is reachable from two states and reads the same either
 * way — which is why this is keyed on the target rather than on the edge.
 *
 * ⚠️ ONLY ONE OF THE SIX IS SOURCED. `02a` §4 labels exactly one of its seven
 * edges — `InReview --> Draft: changes requested` (02a:365) — so
 * `draft: requestChanges` is a transcription of procedure vocabulary. The other
 * five are transcriptions of the TARGET STATE NAMES (`Approved` → "Approve"),
 * which is a weaker claim and is recorded as such in 15-design-alignment.md
 * §4.1: if the company procedure ever names these transitions, its words
 * replace these.
 *
 * ⭐ WRITTEN AS LITERALS, not assembled. `('policies.action.' + to)` would need
 * a cast to TranslationKey to compile, and that cast is precisely the check
 * that catches a key which does not exist. A dictionary lookup that has been
 * cast into silence fails by rendering its own key name to a user.
 */
const ACTION: Record<string, TranslationKey> = {
  in_review: 'policies.action.submitForReview',
  approved: 'policies.action.approve',
  published: 'policies.action.publish',
  under_revision: 'policies.action.revise',
  retired: 'policies.action.retire',
  draft: 'policies.action.requestChanges',
};

interface Source {
  rows: PolicyRow[] | null;
  failed: boolean;
  loading: boolean;
}

/**
 * The three ways a transition fails, kept apart because they lead to three
 * different next actions: ask someone with the right state, reload, or call
 * whoever runs the API.
 *
 * ⚠️ `gone` deliberately does not say "not found". The endpoint answers 404 for
 * absent, out-of-scope AND "already moved", and asserting any one of them would
 * be a claim the API did not make (policies.ts transitionPolicy).
 */
type Failure =
  | { kind: 'refused'; title: string; from: string; to: string; allowed: readonly string[] }
  | { kind: 'gone'; title: string }
  | { kind: 'unreachable' };

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
 * Applied to two different things, and only one of them is permanent: "New
 * policy", which needs a route that does not exist, and a verb button while its
 * own request is in flight. Not an invented visual either way — it is the design
 * system's own disabled state.
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

  /** The id of the row whose transition is in flight — not a global boolean. */
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  /** A state code as the reader sees it, falling through to the raw enum. */
  const statusLabel = (status: string) => {
    const meta = STATUS[status];
    return meta ? tr(meta.key) : status;
  };

  /**
   * One lifecycle step. The server decides whether it is legal; this function
   * only reports what the server decided.
   *
   * ⭐ ON SUCCESS THE WHOLE ROW IS REPLACED BY THE RESPONSE, not patched with
   * the new status. The response carries the new state's `allowed`, so the
   * buttons change in the same render as the badge. Setting only `status` would
   * leave the previous state's verbs on screen — and they would look right,
   * because they were right one moment ago.
   */
  async function advance(policy: PolicyRow, to: string) {
    setPending(policy.id);
    setFailure(null);
    try {
      const answer = await transitionPolicy(policy.id, to);
      if (!answer) {
        setFailure({ kind: 'gone', title: policy.title });
        return;
      }
      setSource((cur) => ({
        ...cur,
        rows: (cur.rows ?? []).map((r) => (r.id === policy.id ? answer.data : r)),
      }));
    } catch (error) {
      if (error instanceof ApiRefusedError) {
        // `from` is the state the SERVER observed, which can differ from the one
        // this screen is showing — that difference is the message's whole value.
        setFailure({
          kind: 'refused',
          title: policy.title,
          from: error.from ?? policy.status,
          to: error.to ?? to,
          allowed: error.allowed,
        });
      } else {
        setFailure({ kind: 'unreachable' });
      }
    } finally {
      setPending(null);
    }
  }

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
        {tr('policies.scope.note')}{' '}
        {/* ⭐ THE ABSENCE OF A PERMISSION GATE IS ITSELF A USER-VISIBLE FACT.
            The file header says this for a developer, and a developer is not
            who gets misled: a row of governance verbs reads, by every UI
            convention there is, as "you are allowed to do these". Until M4 that
            reading is wrong for every viewer, so it is said on screen rather
            than only in a comment nobody in the building will open. */}
        {tr('policies.actions.noRoleCheck')}
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
        {/* Inert for a route it does not have — NOT for a backend it does not
            have. shell.inert says the latter, and on this screen that became
            false the moment the row actions below started reaching the server.
            The other 23 call sites still say the true thing and are untouched:
            AD-SharedInertProseInaccurate-1 tracks whether they still should. */}
        <button
          type="button"
          disabled
          title={tr('policies.new.inert')}
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

      {failure && (
        // Same neutral surface the source-error panel uses, deliberately: a
        // refused transition is the server working correctly, and an alarm
        // colour would read as an outage. §6 (:165) is satisfied either way —
        // the message is words, not a colour.
        <div
          data-transition-state={failure.kind}
          role="alert"
          style={{
            marginBottom: '12px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            fontSize: '12.5px',
            lineHeight: 1.7,
            color: 'var(--text-2)',
          }}
        >
          {failure.kind === 'unreachable' && tr('policies.transition.unreachable')}
          {failure.kind === 'gone' && trf('policies.transition.gone', { title: failure.title })}
          {failure.kind === 'refused' && (
            <>
              {trf('policies.transition.refused', {
                title: failure.title,
                from: statusLabel(failure.from),
                to: statusLabel(failure.to),
              })}{' '}
              {/* The API answers an illegal transition by naming the legal ones.
                  Dropping that here would turn a helpful refusal into a bare no
                  — and would waste the one field the endpoint adds for exactly
                  this purpose. An empty list is its own sentence, not an empty
                  row of chips. */}
              {failure.allowed.length > 0 ? (
                <>
                  {tr('policies.transition.refused.alternatives')}{' '}
                  {failure.allowed.map((target) => (
                    <span
                      key={target}
                      data-refusal-alternative={target}
                      style={{
                        display: 'inline-block',
                        marginRight: '6px',
                        padding: '1px 8px',
                        borderRadius: '20px',
                        background: 'var(--surface-2)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {statusLabel(target)}
                    </span>
                  ))}
                </>
              ) : (
                tr('policies.transition.refused.none')
              )}
            </>
          )}
        </div>
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('policies.col.policy')}</th>
                <th style={TH_LEFT}>{tr('policies.col.category')}</th>
                <th style={TH_LEFT}>{tr('policies.col.owner')}</th>
                <th style={{ ...TH_LEFT, textAlign: 'center' }}>{tr('policies.col.version')}</th>
                <th style={TH_LEFT}>{tr('policies.col.status')}</th>
                <th style={TH_LEFT}>{tr('policies.col.nextReview')}</th>
                <th style={TH_LEFT}>{tr('policies.col.attestation')}</th>
                <th style={{ ...TH_LEFT, padding: '10px 16px' }}>{tr('policies.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {view.map((p) => {
                const meta = STATUS[p.status];
                const st = tok(meta?.rating ?? 'N');
                return (
                  // The ROW is not clickable and not disabled-looking either.
                  // ⚠️ W26 narrowed this claim: there ARE actions in this row
                  // now, in the last cell, and they are live. What stays absent
                  // is a row-level navigation action — so the <tr> gets no
                  // cursor and no hover, while the buttons inside it do.
                  // The detail screen still reads the
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
                    <td
                      style={{
                        padding: 'var(--row-py) 12px',
                        fontSize: '12.5px',
                        color: 'var(--text-2)',
                      }}
                    >
                      {/* The bar went with the number. A 0%-wide coloured bar is
                          still a bar, and an empty progress track reads as "zero
                          percent attested" — a measured claim about a real
                          policy, from a table that does not exist yet. */}
                      <NoSource label={tr('policies.noSource.title')} />
                    </td>
                    <td style={{ padding: 'var(--row-py) 16px' }}>
                      {/* ⭐ `p.allowed` COMES FROM THE SERVER AND IS NOT SECOND-
                          GUESSED HERE. A `retired` row has an empty list and
                          therefore renders nothing at all — not a disabled
                          button, which would offer an action that does not
                          exist and invite a reader to wonder who could enable
                          it. Nothing is the honest rendering of "no next step".
                          ⛔ And these are not permission-filtered: see the file
                          header. Every viewer sees every legal verb today. */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {p.allowed.map((target) => {
                          const actionKey = ACTION[target];
                          const busy = pending === p.id;
                          return (
                            <button
                              key={target}
                              type="button"
                              data-transition-to={target}
                              onClick={() => void advance(p, target)}
                              disabled={busy}
                              title={busy ? tr('policies.transition.pending') : undefined}
                              // No data-hov while busy: a disabled button still
                              // matches [data-hov]:hover, which W19 found the
                              // hard way — the guard it added did not cover this.
                              data-hov={busy ? undefined : 's3'}
                              style={{
                                height: '28px',
                                padding: '0 10px',
                                border: '1px solid var(--border-strong)',
                                borderRadius: '7px',
                                background: 'var(--surface)',
                                fontFamily: 'inherit',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: 'var(--text-2)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                ...(busy ? INERT : {}),
                              }}
                            >
                              {actionKey ? tr(actionKey) : target}
                            </button>
                          );
                        })}
                      </div>
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
