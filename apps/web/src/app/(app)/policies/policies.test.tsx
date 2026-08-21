/**
 * File: apps/web/src/app/(app)/policies/policies.test.tsx
 * Purpose: The policy register reads the API, and says so about what it cannot read.
 * Category: ui / test
 * Scope: Phase W24
 *
 * Description:
 *   Mirrors risks.test.tsx one phase later. The assertions that matter are the
 *   negative ones: the fixture must not leak when the API is down, the four
 *   sourceless columns must be marked rather than blank, and `approved` must
 *   not render green — the last one is this phase's whole subject in miniature.
 *
 * Created: 2026-08-19 (Phase W24)
 * Last Modified: 2026-08-20
 *
 * Modification History (newest-first):
 *   - 2026-08-20: Interpolate in the mock; cover the meta count (Phase W24) — CH-044
 *   - 2026-08-19: Initial creation (Phase W24) — CH-044
 *
 * Related:
 *   - apps/web/src/app/(app)/risks/risks.test.tsx — the shape this follows
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { t, tf } from '@/i18n';
import { ApiRefusedError, ApiUnavailableError } from '@/lib/api/client';
import { type PolicyRow } from '@/lib/api/policies';

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => ({}),
}));

const listPolicies = vi.fn();
const transitionPolicy = vi.fn();
vi.mock('@/lib/api/policies', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/policies')>();
  return {
    ...actual,
    listPolicies: () => listPolicies(),
    transitionPolicy: (id: string, to: string) => transitionPolicy(id, to),
  };
});

const { default: PoliciesPage } = await import('./page');

const shell: ShellState = {
  locale: 'zh-Hant',
  tr: (key) => t('zh-Hant', key),
  // Interpolates for real. The first version dropped `vars` and returned the
  // raw template, which made every number the shell prints structurally
  // invisible to this file — the meta-line count below could not have failed.
  trf: (key, vars) => tf('zh-Hant', key, vars),
  scopeCode: 'APAC',
  scopeLabel: 'APAC',
  entity: null,
  setScope: () => {},
  setLocale: () => {},
  periodLabel: '2026-Q3',
};

/**
 * What the API says follows each state, copied from transitions.ts FOR THE
 * FIXTURE ONLY.
 *
 * ⚠️ The application holds no such table — that is the entire reason `allowed`
 * travels on the wire. This copy exists so a fixture row can be internally
 * consistent (a `published` row that offers `Approve` would be testing a
 * situation the server cannot produce). If it drifts from the server, what
 * degrades is these tests' realism, not the product's correctness.
 */
const ALLOWED: Record<string, readonly string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['published'],
  published: ['under_revision', 'retired'],
  under_revision: ['in_review'],
  retired: [],
};

function row(over: Partial<PolicyRow> = {}): PolicyRow {
  const status = over.status ?? 'published';
  return {
    id: '0000ff00-0000-0000-0000-000000000001',
    refCode: 'POL-SG1-900001',
    orgEntityId: '00000000-0000-0000-0000-0000000000c0',
    title: 'DEMO SEED — Cryptographic key handling standard',
    version: 3,
    status,
    allowed: ALLOWED[status] ?? [],
    updatedAt: '2026-08-19T08:25:15.448Z',
    ...over,
  };
}

const renderList = () =>
  render(
    <ShellStateContext.Provider value={shell}>
      <PoliciesPage />
    </ShellStateContext.Provider>,
  );

beforeEach(() => {
  listPolicies.mockReset();
  transitionPolicy.mockReset();
  push.mockReset();
});

/** The <tr> a reference code sits in. */
const rowOf = (refCode: string) => screen.getByText(refCode).closest('tr') as HTMLElement;

/** The verb buttons in that row, in render order. */
const verbs = (refCode: string) =>
  [...rowOf(refCode).querySelectorAll('[data-transition-to]')] as HTMLButtonElement[];

/** The pill's background is the only place the RAG decision is observable. */
function pillBackground(container: HTMLElement, refCode: string): string {
  const cell = screen.getByText(refCode).closest('tr');
  expect(cell).not.toBeNull();
  void container;
  const pill = cell!.querySelector('td:nth-child(5) > span') as HTMLElement | null;
  expect(pill).not.toBeNull();
  return pill!.style.background;
}

describe('the policy register reads the API', () => {
  it('renders the rows the API returned, by their server-issued reference', async () => {
    listPolicies.mockResolvedValue({
      data: [row(), row({ id: 'b', refCode: 'POL-SG1-900002', status: 'draft' })],
    });
    renderList();

    expect(await screen.findByText('POL-SG1-900001')).toBeTruthy();
    expect(screen.getByText('POL-SG1-900002')).toBeTruthy();
  });

  it('shows an error and NOT the fixture when the API is unreachable', async () => {
    listPolicies.mockRejectedValue(new ApiUnavailableError('connection refused'));
    const { container } = renderList();

    await waitFor(() =>
      expect(container.querySelector('[data-source-state="error"]')).not.toBeNull(),
    );

    // The fixture's first row. If a fallback is ever added, this is what leaks.
    expect(screen.queryByText(/Information Security Policy/)).toBeNull();
    expect(screen.getByText(t('zh-Hant', 'policies.source.error.title'))).toBeTruthy();
  });

  it('marks the columns the API has no source for rather than leaving them blank', async () => {
    listPolicies.mockResolvedValue({ data: [row()] });
    const { container } = renderList();

    await waitFor(() => expect(screen.queryByText('POL-SG1-900001')).not.toBeNull());

    // category, owner, next review, attestation — four per row.
    expect(container.querySelectorAll('[data-no-source]').length).toBe(4);
  });

  it('does not render a filter that has no options to offer', async () => {
    listPolicies.mockResolvedValue({ data: [row()] });
    renderList();

    await waitFor(() => expect(screen.queryByText('POL-SG1-900001')).not.toBeNull());

    // Category has no column on Policy, so its filter can only offer nothing.
    //
    // Both labels appear twice over when their filter is live: once as a table
    // header, once on the filter button. So the counts ARE the assertion — 1
    // means header-only (filter dropped), 2 means header plus filter. The first
    // version used queryByText(...).toBeNull() and matched the <th>.
    expect(screen.getAllByText(t('zh-Hant', 'policies.col.category'))).toHaveLength(1);
    expect(screen.getAllByText(t('zh-Hant', 'policies.col.status'))).toHaveLength(2);
  });

  it('does not offer a row link while the detail screen still reads the fixture', async () => {
    listPolicies.mockResolvedValue({ data: [row()] });
    renderList();

    const cell = await screen.findByText('POL-SG1-900001');
    const tr = cell.closest('tr') as HTMLElement;

    // A uuid sent to a fixture-backed detail screen lands on "not found" for a
    // policy the reader just saw listed. No handler, no pointer, no hover.
    expect(tr.style.cursor).toBe('');
    expect(tr.getAttribute('data-hov')).toBeNull();
  });
});

describe('only a policy that is in force renders green', () => {
  it('paints published green and approved not-green', async () => {
    listPolicies.mockResolvedValue({
      data: [row(), row({ id: 'b', refCode: 'POL-SG1-900007', status: 'approved' })],
    });
    const { container } = renderList();

    await waitFor(() => expect(screen.queryByText('POL-SG1-900007')).not.toBeNull());

    const published = pillBackground(container, 'POL-SG1-900001');
    const approved = pillBackground(container, 'POL-SG1-900007');

    // `approved` means a committee said yes and the document is not in force.
    // Green there reads as "this policy is operating", about a real record.
    expect(published).not.toBe(approved);
    expect(published).toContain('rag-g');
    expect(approved).not.toContain('rag-g');
  });

  it('renders every one of the six lifecycle states with a label, not a raw enum', async () => {
    const states = ['draft', 'in_review', 'approved', 'published', 'under_revision', 'retired'];
    listPolicies.mockResolvedValue({
      data: states.map((status, i) => row({ id: String(i), refCode: 'POL-SG1-90000' + i, status })),
    });
    renderList();

    await waitFor(() => expect(screen.queryByText('POL-SG1-900000')).not.toBeNull());

    for (const key of [
      'policies.status.draft',
      'policies.status.underReview',
      'policies.status.approved',
      'policies.status.published',
      'policies.status.underRevision',
      'policies.status.retired',
    ] as const) {
      expect(screen.getByText(t('zh-Hant', key))).toBeTruthy();
    }
    // A state the mapping missed would fall through to the raw enum string.
    expect(screen.queryByText('under_revision')).toBeNull();
  });
});

describe('the meta line counts what the reader can see', () => {
  /** The meta line is the only prose on this screen that carries numbers. */
  const metaLine = () => screen.getByRole('heading', { level: 1 }).parentElement!.textContent!;

  const scope = () => t('zh-Hant', 'policies.scope.serverSide');

  it('counts under-review over the filtered rows, not the whole register', async () => {
    listPolicies.mockResolvedValue({
      data: [row(), row({ id: 'b', refCode: 'POL-SG1-900005', status: 'in_review' })],
    });
    renderList();
    await waitFor(() => expect(screen.queryByText('POL-SG1-900005')).not.toBeNull());

    expect(metaLine()).toContain(
      tf('zh-Hant', 'policies.meta', { n: 2, review: 1, scope: scope() }),
    );

    // Filter to the one published policy. The in-review row is now off screen.
    // The label appears twice — once on the filter button, once as the column
    // header. Picking by index binds this to the DOM order of two unrelated
    // regions; picking the one with a button ancestor does not.
    const trigger = screen
      .getAllByText(t('zh-Hant', 'policies.col.status'))
      .map((el) => el.closest('button'))
      .find(Boolean) as HTMLElement;
    fireEvent.click(trigger);
    const published = [...trigger.parentElement!.querySelectorAll('button')].find(
      (b) => b.textContent === t('zh-Hant', 'policies.status.published'),
    ) as HTMLElement;
    fireEvent.click(published);

    await waitFor(() => expect(screen.queryByText('POL-SG1-900005')).toBeNull());

    // Counting the two halves over different populations printed "1 policy · 1
    // under review" with no such row rendered — a claim about records the
    // screen is not showing. Drive-through found it; every gate was green.
    expect(metaLine()).toContain(
      tf('zh-Hant', 'policies.meta', { n: 1, review: 0, scope: scope() }),
    );
  });
});

describe('an empty scope and an empty filter are different facts', () => {
  it('says the register is empty for this scope when the API returned nothing', async () => {
    listPolicies.mockResolvedValue({ data: [] });
    const { container } = renderList();

    await waitFor(() =>
      expect(container.querySelector('[data-source-state="empty"]')).not.toBeNull(),
    );
    expect(screen.getByText(t('zh-Hant', 'policies.source.empty.title'))).toBeTruthy();
  });
});

describe('the row offers exactly the steps the API said were legal', () => {
  it('renders one verb per target the server named, in the order it named them', async () => {
    listPolicies.mockResolvedValue({ data: [row()] }); // published
    renderList();
    await screen.findByText('POL-SG1-900001');

    expect(verbs('POL-SG1-900001').map((b) => b.dataset.transitionTo)).toEqual([
      'under_revision',
      'retired',
    ]);
    expect(
      within(rowOf('POL-SG1-900001')).getByText(t('zh-Hant', 'policies.action.retire')),
    ).toBeTruthy();
  });

  it('renders NO button on a terminal state, rather than a disabled one', async () => {
    listPolicies.mockResolvedValue({ data: [row({ status: 'retired' })] });
    renderList();
    await screen.findByText('POL-SG1-900001');

    // A disabled Approve on a retired policy would offer an action that does
    // not exist and invite the reader to ask who could enable it.
    expect(rowOf('POL-SG1-900001').querySelectorAll('button')).toHaveLength(0);
  });

  it('sends the target its own button names, not whichever came first', async () => {
    listPolicies.mockResolvedValue({ data: [row()] }); // [under_revision, retired]
    transitionPolicy.mockResolvedValue({ data: row({ status: 'retired' }) });
    renderList();
    await screen.findByText('POL-SG1-900001');

    // ⭐ THE SECOND BUTTON, deliberately. If advance() ignored its argument and
    // always sent allowed[0], every other test in this file still passes.
    fireEvent.click(verbs('POL-SG1-900001')[1]!);

    await waitFor(() =>
      expect(transitionPolicy).toHaveBeenCalledWith(
        '0000ff00-0000-0000-0000-000000000001',
        'retired',
      ),
    );
  });
});

describe('a successful transition updates the row without a reload', () => {
  it('swaps the badge AND the verbs, from the response alone', async () => {
    listPolicies.mockResolvedValue({ data: [row({ status: 'approved' })] });
    transitionPolicy.mockResolvedValue({ data: row({ status: 'published' }) });
    renderList();
    await screen.findByText('POL-SG1-900001');

    expect(verbs('POL-SG1-900001').map((b) => b.dataset.transitionTo)).toEqual(['published']);
    fireEvent.click(verbs('POL-SG1-900001')[0]!);

    // The verbs are the assertion that matters. Setting only `status` would
    // leave `Publish` on screen next to a Published badge — and it would look
    // right, because it was right one moment earlier.
    await waitFor(() =>
      expect(verbs('POL-SG1-900001').map((b) => b.dataset.transitionTo)).toEqual([
        'under_revision',
        'retired',
      ]),
    );
    expect(
      within(rowOf('POL-SG1-900001')).getByText(t('zh-Hant', 'policies.status.published')),
    ).toBeTruthy();

    // No refetch: the response IS the new row (policy.controller.ts:209-214).
    expect(listPolicies).toHaveBeenCalledTimes(1);
  });

  it('disables only the row in flight, and drops its hover with it', async () => {
    listPolicies.mockResolvedValue({
      data: [row(), row({ id: 'b', refCode: 'POL-SG1-900002', status: 'approved' })],
    });
    let settle!: (value: unknown) => void;
    transitionPolicy.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    renderList();
    await screen.findByText('POL-SG1-900002');

    fireEvent.click(verbs('POL-SG1-900001')[0]!);

    await waitFor(() => expect(verbs('POL-SG1-900001')[0]!.disabled).toBe(true));
    expect(verbs('POL-SG1-900001')[0]!.title).toBe(t('zh-Hant', 'policies.transition.pending'));
    // W19 measured this: a disabled button still matches [data-hov]:hover, so
    // the attribute has to go, not just the enabled state.
    expect(verbs('POL-SG1-900001')[0]!.getAttribute('data-hov')).toBeNull();
    // The other row is untouched — pending is an id, not a boolean.
    expect(verbs('POL-SG1-900002')[0]!.disabled).toBe(false);

    settle({ data: row() });
    await waitFor(() => expect(verbs('POL-SG1-900001')[0]!.disabled).toBe(false));
  });
});

describe('the three ways a transition fails stay three different messages', () => {
  it('names what the server accepts instead when it refuses', async () => {
    listPolicies.mockResolvedValue({ data: [row({ status: 'draft' })] });
    transitionPolicy.mockRejectedValue(
      new ApiRefusedError('illegal transition', 'draft', 'published', ['in_review']),
    );
    const { container } = renderList();
    await screen.findByText('POL-SG1-900001');

    fireEvent.click(verbs('POL-SG1-900001')[0]!);

    const banner = (await waitFor(() => {
      const found = container.querySelector('[data-transition-state="refused"]');
      expect(found).not.toBeNull();
      return found;
    })) as HTMLElement;

    // The alternatives ARE the reason the endpoint sends `allowed`. Dropping
    // them turns a helpful refusal into a bare no.
    expect(banner.querySelector('[data-refusal-alternative="in_review"]')).not.toBeNull();
    expect(banner.textContent).toContain(t('zh-Hant', 'policies.status.underReview'));
  });

  it('says the server named none rather than rendering an empty list', async () => {
    listPolicies.mockResolvedValue({ data: [row({ status: 'draft' })] });
    transitionPolicy.mockRejectedValue(
      new ApiRefusedError('illegal transition', 'retired', 'draft', []),
    );
    const { container } = renderList();
    await screen.findByText('POL-SG1-900001');

    fireEvent.click(verbs('POL-SG1-900001')[0]!);

    const banner = (await waitFor(() => {
      const found = container.querySelector('[data-transition-state="refused"]');
      expect(found).not.toBeNull();
      return found;
    })) as HTMLElement;

    expect(container.querySelectorAll('[data-refusal-alternative]')).toHaveLength(0);
    // textContent, not getByText: the banner holds the refusal sentence and this
    // one as sibling text nodes, so no single element carries only this string.
    expect(banner.textContent).toContain(t('zh-Hant', 'policies.transition.refused.none'));
  });

  it('does not claim "no such policy" when the API answers 404', async () => {
    listPolicies.mockResolvedValue({ data: [row({ status: 'approved' })] });
    transitionPolicy.mockResolvedValue(null);
    const { container } = renderList();
    await screen.findByText('POL-SG1-900001');

    fireEvent.click(verbs('POL-SG1-900001')[0]!);

    await waitFor(() =>
      expect(container.querySelector('[data-transition-state="gone"]')).not.toBeNull(),
    );
    // 404 also covers "already moved" and "outside your scope"; the row on
    // screen is unchanged because nothing was changed.
    expect(
      within(rowOf('POL-SG1-900001')).getByText(t('zh-Hant', 'policies.status.approved')),
    ).toBeTruthy();
  });

  it('reports an unreachable API as an outage, not as a refusal', async () => {
    listPolicies.mockResolvedValue({ data: [row({ status: 'approved' })] });
    transitionPolicy.mockRejectedValue(new ApiUnavailableError('connection refused'));
    const { container } = renderList();
    await screen.findByText('POL-SG1-900001');

    fireEvent.click(verbs('POL-SG1-900001')[0]!);

    await waitFor(() =>
      expect(container.querySelector('[data-transition-state="unreachable"]')).not.toBeNull(),
    );
    expect(container.querySelector('[data-transition-state="refused"]')).toBeNull();
  });
});
