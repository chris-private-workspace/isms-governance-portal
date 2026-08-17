/**
 * File: apps/web/src/app/(app)/ai-assistant/ai-assistant.test.tsx
 * Purpose: Guards the three claims this screen makes that a type check cannot see.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   Every assertion here exists because the failure it catches would be INVISIBLE
 *   to lint, tsc and the build, and would look like a working feature:
 *
 *   1. No provider or model name reaches the DOM. Constraint 7 is enforced in CI
 *      at the import level, but the fragment leaked its vendor through static
 *      TEXT — 'Copilot Studio', 'RicohAPAC-ISMS-Agent', 'Microsoft' — which no
 *      import lint can see. This runs against rendered output instead.
 *   2. The composer answers nothing. A future edit that routed free text through
 *      the same keyword match would produce confident answers to arbitrary
 *      questions and pass every other gate. Asserting the message count is
 *      unchanged is the only thing that notices.
 *   3. Every suggested prompt resolves. An unmatched prompt renders a user
 *      message with nothing beneath it, which reads as a request that failed
 *      rather than as a broken fixture link.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { aiSuggested } from '@/data/extended/aiSuggested';
import { t, tf } from '@/i18n';

import AiAssistantPage from './page';

const shell: ShellState = {
  locale: 'zh-Hant',
  tr: (key) => t('zh-Hant', key),
  trf: (key, vars) => tf('zh-Hant', key, vars),
  scopeCode: 'APAC',
  scopeLabel: 'APAC',
  entity: null,
  setScope: () => {},
  periodLabel: '2026-Q3',
};

function renderScreen() {
  return render(
    <ShellStateContext.Provider value={shell}>
      <AiAssistantPage />
    </ShellStateContext.Provider>,
  );
}

describe('ai assistant — no model, and nothing that suggests one', () => {
  // The fragment's own strings, at 15-ai-assistant.html:21 and :115-116.
  const FORBIDDEN: [string, RegExp][] = [
    ['Copilot Studio', /Copilot/i],
    ['the agent id', /RicohAPAC-ISMS-Agent/],
    ['a hosting vendor', /Microsoft/i],
  ];

  it.each(FORBIDDEN)('does not render %s', (_label, pattern) => {
    const { container } = renderScreen();
    expect(container.textContent ?? '').not.toMatch(pattern);
  });

  it('answers nothing when free text is sent, and says so', () => {
    renderScreen();
    const input = screen.getByLabelText(t('zh-Hant', 'assistant.composer.placeholder'));

    fireEvent.change(input, { target: { value: 'What is our residual risk appetite?' } });
    fireEvent.click(screen.getByText(t('zh-Hant', 'assistant.ask')));

    // The notice appears...
    expect(screen.getByRole('status').textContent).toBe(t('zh-Hant', 'assistant.send.notice'));
    // ...and the question itself was NOT added as a message. If it had been,
    // the empty state would have gone.
    expect(screen.getByText(t('zh-Hant', 'assistant.empty.sub'))).toBeDefined();
  });

  it('marks itself as demo data', () => {
    renderScreen();
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });
});

describe('ai assistant — suggested prompts render fixture answers', () => {
  it.each(aiSuggested)('%s resolves to an answer with sources', (prompt) => {
    renderScreen();
    fireEvent.click(screen.getByText(prompt));

    // The question is on screen as a message, and an answer block followed it.
    expect(screen.getByText(prompt)).toBeDefined();
    expect(screen.getByText(t('zh-Hant', 'assistant.sources'))).toBeDefined();
  });
});

describe('ai assistant — the right column is role-gated', () => {
  it('shows the knowledge source index to a platform admin', () => {
    renderScreen();
    expect(screen.getByText(t('zh-Hant', 'assistant.sources.title'))).toBeDefined();
  });

  it('hides it from an OpCo role and explains why', () => {
    renderScreen();
    fireEvent.click(screen.getByText(t('zh-Hant', 'switchRole.role.opcoOs')));

    expect(screen.queryByText(t('zh-Hant', 'assistant.sources.title'))).toBeNull();
    expect(screen.queryByText(t('zh-Hant', 'assistant.cfg.title'))).toBeNull();
    expect(screen.getByText(t('zh-Hant', 'assistant.scoped.adminOnly'))).toBeDefined();
  });
});
