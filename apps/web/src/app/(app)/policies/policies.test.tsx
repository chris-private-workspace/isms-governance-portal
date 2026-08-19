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
 * Last Modified: 2026-08-19
 *
 * Modification History (newest-first):
 *   - 2026-08-19: Initial creation (Phase W24) — CH-044
 *
 * Related:
 *   - apps/web/src/app/(app)/risks/risks.test.tsx — the shape this follows
 */
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { t } from '@/i18n';
import { ApiUnavailableError } from '@/lib/api/client';
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
vi.mock('@/lib/api/policies', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/policies')>();
  return { ...actual, listPolicies: () => listPolicies() };
});

const { default: PoliciesPage } = await import('./page');

const shell: ShellState = {
  locale: 'zh-Hant',
  tr: (key) => t('zh-Hant', key),
  trf: (key, vars) => {
    void vars;
    return t('zh-Hant', key);
  },
  scopeCode: 'APAC',
  scopeLabel: 'APAC',
  entity: null,
  setScope: () => {},
  setLocale: () => {},
  periodLabel: '2026-Q3',
};

function row(over: Partial<PolicyRow> = {}): PolicyRow {
  return {
    id: '0000ff00-0000-0000-0000-000000000001',
    refCode: 'POL-SG1-900001',
    orgEntityId: '00000000-0000-0000-0000-0000000000c0',
    title: 'DEMO SEED — Cryptographic key handling standard',
    version: 3,
    status: 'published',
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
  push.mockReset();
});

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
