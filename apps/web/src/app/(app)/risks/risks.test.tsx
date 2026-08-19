/**
 * File: apps/web/src/app/(app)/risks/risks.test.tsx
 * Purpose: Guards the three claims the wired risk screens make that no other gate can see.
 * Category: Test
 * Scope: Phase W22
 *
 * Description:
 *   W22 rewired both risk screens from a fixture to the API, and the full web
 *   suite stayed green through every step of it — 88 passing tests, none of
 *   which touched either page. That is the measurement this file exists because
 *   of, and it is the same shape Day 1 found on the API side, where 21 unit
 *   tests stayed green with the entity scope completely neutralised.
 *
 *   Three assertions, each guarding a failure that would look like a working
 *   screen:
 *
 *   1. NO FIXTURE FALLBACK (AC-5). When the API is down the screen must show an
 *      error, not ten invented risks. This asserts on a string that exists ONLY
 *      in the fixture — if someone re-adds a `catch { return risks }`, the
 *      screen will look perfect and this is the only thing that will notice.
 *   2. THE TWO REFUSALS ARE ONE SCREEN (AC-6). An absent id and an id belonging
 *      to another entity both resolve to null, and both must render the same
 *      DOM. Comparing the markup — rather than checking each renders "some"
 *      not-found state — is what catches a future branch that says "this one
 *      exists but is not yours".
 *   3. THE UNSOURCED COLUMNS SAY SO. Five columns have no API source. If they
 *      ever render blank, a control count of nothing reads as a risk with no
 *      controls, which is a false statement about a real risk.
 *
 * Created: 2026-08-18 (Phase W22)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W22) — CH-042
 *
 * Related:
 *   - apps/web/src/lib/api/risks.ts — the fetch layer these mock
 *   - .claude/rules/verification-discipline.md — why a green suite is not enough
 */
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { t, tf } from '@/i18n';
import { ApiUnavailableError, type RiskRow } from '@/lib/api/risks';

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: { children: ReactNode }) => <a {...rest}>{children}</a>,
}));

const push = vi.fn();
const params: { id?: string } = {};
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useParams: () => params,
}));

const listRisks = vi.fn();
const getRisk = vi.fn();
vi.mock('@/lib/api/risks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/risks')>();
  return { ...actual, listRisks: () => listRisks(), getRisk: (id: string) => getRisk(id) };
});

const { default: RisksPage } = await import('./page');
const { default: RiskDetailPage } = await import('./[id]/page');

const shell: ShellState = {
  locale: 'zh-Hant',
  tr: (key) => t('zh-Hant', key),
  trf: (key, vars) => tf('zh-Hant', key, vars),
  scopeCode: 'APAC',
  scopeLabel: 'APAC',
  entity: null,
  setScope: () => {},
  setLocale: () => {},
  periodLabel: '2026-Q3',
};

function row(over: Partial<RiskRow> = {}): RiskRow {
  return {
    id: '0000ee00-0000-0000-0000-000000000001',
    refCode: 'RISK-SG1-900001',
    orgEntityId: '00000000-0000-0000-0000-0000000000c0',
    title: 'Credential stuffing against the payments API',
    category: 'Access control',
    description: 'DEMO SEED — sample',
    status: 'identified',
    lkhBefore: 4,
    lkhAfter: 2,
    scoreBefore: 20,
    scoreAfter: 6,
    acceptanceStatus: 'acceptable',
    inItRiskRegister: false,
    updatedAt: '2026-08-18T07:57:11.690Z',
    ...over,
  };
}

const renderList = () =>
  render(
    <ShellStateContext.Provider value={shell}>
      <RisksPage />
    </ShellStateContext.Provider>,
  );

const renderDetail = () =>
  render(
    <ShellStateContext.Provider value={shell}>
      <RiskDetailPage />
    </ShellStateContext.Provider>,
  );

beforeEach(() => {
  listRisks.mockReset();
  getRisk.mockReset();
  delete params.id;
});

describe('the risk register reads the API', () => {
  it('renders the rows the API returned, by their server-issued reference', async () => {
    listRisks.mockResolvedValue({ data: [row(), row({ id: 'b', refCode: 'RISK-SG1-900002' })] });

    renderList();

    expect(await screen.findByText('RISK-SG1-900001')).toBeTruthy();
    expect(screen.getByText('RISK-SG1-900002')).toBeTruthy();
  });

  it('shows an error and NOT the fixture when the API is unreachable', async () => {
    listRisks.mockRejectedValue(new ApiUnavailableError('connection refused'));

    const { container } = renderList();

    await waitFor(() =>
      expect(container.querySelector('[data-source-state="error"]')).not.toBeNull(),
    );

    // 'Unpatched externally-facing systems' is the first row of @/data/risks and
    // appears nowhere else in the product. Its absence is the assertion: a
    // fixture fallback would put it on screen and every other gate would pass.
    expect(screen.queryByText(/Unpatched externally-facing systems/)).toBeNull();
    expect(screen.getByText(t('zh-Hant', 'risks.source.error.title'))).toBeTruthy();
  });

  it('marks the columns the API has no source for rather than leaving them blank', async () => {
    listRisks.mockResolvedValue({ data: [row()] });

    const { container } = renderList();

    await waitFor(() => expect(screen.queryByText('RISK-SG1-900001')).not.toBeNull());

    // entity, controls, owner, status — four cells on one row. A blank cell
    // would satisfy "does not show the fixture" while still reading as a value.
    expect(container.querySelectorAll('[data-no-source]').length).toBeGreaterThanOrEqual(4);
  });

  it('does not render a filter that has no options to offer', async () => {
    listRisks.mockResolvedValue({ data: [row()] });

    renderList();
    await waitFor(() => expect(screen.queryByText('RISK-SG1-900001')).not.toBeNull());

    // Entity and status have no values at all today. A select that can only
    // ever say "All" is a dead control — W19 shipped twenty-five of those.
    //
    // ⚠️ Asserted by COUNT, not by absence: 'risks.filter.entity' and
    // 'risks.col.entity' translate to the same word, so querying for the text
    // finds the column header and passes whether or not the filter is there.
    // One occurrence means header only; two would mean the filter came back.
    expect(screen.getAllByText(t('zh-Hant', 'risks.col.entity'))).toHaveLength(1);
    expect(screen.getAllByText(t('zh-Hant', 'risks.col.status'))).toHaveLength(1);
  });
});

describe('the two refusals are indistinguishable on screen (AC-6)', () => {
  it('renders identical markup for an absent id and an out-of-scope id', async () => {
    // Both are what the API answers 404 for, and it refuses to say which is
    // which. getRisk collapses both to null; the screen must not re-open the gap.
    const ABSENT = '0000ee00-0000-0000-0000-0000deadbeef';
    const OTHER_ENTITY = '0000ee00-0000-0000-0000-000000000005';

    getRisk.mockResolvedValue(null);

    params.id = ABSENT;
    const absent = renderDetail();
    await waitFor(() =>
      expect(absent.container.querySelector('[data-source-state="not-found"]')).not.toBeNull(),
    );
    const absentHtml = absent.container.innerHTML.split(ABSENT).join('<ID>');
    absent.unmount();

    params.id = OTHER_ENTITY;
    const other = renderDetail();
    await waitFor(() =>
      expect(other.container.querySelector('[data-source-state="not-found"]')).not.toBeNull(),
    );
    const otherHtml = other.container.innerHTML.split(OTHER_ENTITY).join('<ID>');

    // Once the id itself is masked, nothing may differ. Any remaining difference
    // is a channel telling the caller which ids are real.
    expect(otherHtml).toBe(absentHtml);
  });

  it('stops at the header for a risk with no assessment, rather than scoring it zero', async () => {
    params.id = '0000ee00-0000-0000-0000-000000000004';
    getRisk.mockResolvedValue({
      data: row({
        id: params.id,
        refCode: 'RISK-SG1-900004',
        lkhBefore: null,
        scoreBefore: null,
        scoreAfter: null,
        acceptanceStatus: null,
      }),
    });

    const { container } = renderDetail();

    await waitFor(() =>
      expect(container.querySelector('[data-source-state="unassessed"]')).not.toBeNull(),
    );
    // A zero here would draw a heat-map cell and a band chip for a risk nobody
    // has assessed — a measurement that was never taken.
    expect(screen.getByText('RISK-SG1-900004')).toBeTruthy();
  });
});

describe('the demo marker tells the truth about a half-live screen', () => {
  it('uses the partial variant once the register reads the API', async () => {
    listRisks.mockResolvedValue({ data: [row()] });

    const { container } = renderList();

    await waitFor(() => expect(screen.queryByText('RISK-SG1-900001')).not.toBeNull());
    // The plain variant claims every figure on the page is invented. That became
    // false the moment the rows came from the database.
    expect(container.querySelector('[data-demo-variant="partial"]')).not.toBeNull();
    expect(container.querySelector('[data-demo-variant="fixture"]')).toBeNull();
  });
});
