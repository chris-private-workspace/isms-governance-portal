/**
 * File: apps/web/src/components/shell/ai-drawer.test.tsx
 * Purpose: Guards the four claims this drawer makes that a type check cannot see.
 * Category: Test
 * Scope: Phase W19
 *
 * Description:
 *   Every assertion here catches a failure that would look like a working
 *   feature to lint, tsc and the build:
 *
 *   1. The launcher and the close button really move state. They are the only
 *      two controls in this component that are supposed to DO something, and a
 *      handler that no longer fires renders identically.
 *   2. No provider or model name reaches the DOM. The fragment leaked its
 *      vendor through static TEXT (:18 'Copilot Studio · grounded on 7
 *      sources'), which the import-level constraint-7 lint cannot see.
 *   3. The composer answers nothing. Routing free text through the keyword
 *      matcher would answer arbitrary questions confidently and pass every
 *      other gate; asserting the empty state survives is what notices.
 *   4. Every suggested prompt resolves to its fixture answer. An unmatched
 *      prompt would render a question with nothing under it, which reads as a
 *      failed request rather than as a broken fixture link.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AiDrawer } from '@/components/shell/AiDrawer';
import { ShellStateContext, type ShellState } from '@/components/shell/shell-state';
import { answers } from '@/data/answers';
import { aiSuggested } from '@/data/extended/aiSuggested';
import { t, tf } from '@/i18n';

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

const zh = (key: Parameters<typeof t>[1]) => t('zh-Hant', key);

function renderDrawer() {
  return render(
    <ShellStateContext.Provider value={shell}>
      <AiDrawer />
    </ShellStateContext.Provider>,
  );
}

/** Opens the drawer through the launcher, the way a user reaches it. */
function openDrawer() {
  renderDrawer();
  fireEvent.click(screen.getByTitle(zh('assistant.agentName')));
}

describe('ai drawer — the launcher is the one control that must move state', () => {
  it('shows a launcher and no drawer until it is clicked', () => {
    renderDrawer();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTitle(zh('assistant.agentName'))).toBeDefined();
  });

  it('opens the drawer, and closing returns to the launcher', () => {
    openDrawer();
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.click(screen.getByTitle(zh('assistant.drawer.close')));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTitle(zh('assistant.agentName'))).toBeDefined();
  });

  it('offers a real route to the full-screen surface', () => {
    openDrawer();

    expect(screen.getByTitle(zh('assistant.drawer.openFull')).getAttribute('href')).toBe(
      '/ai-assistant',
    );
  });
});

describe('ai drawer — no model, and nothing that suggests one', () => {
  // The fragment's own header sub-line, at 30-ai-drawer.html:18.
  const FORBIDDEN: [string, RegExp][] = [
    ['Copilot Studio', /Copilot/i],
    ['a grounded-source count', /grounded on/i],
    ['a hosting vendor', /Microsoft/i],
  ];

  it.each(FORBIDDEN)('does not render %s', (_label, pattern) => {
    const { container } = renderDrawer();
    fireEvent.click(screen.getByTitle(zh('assistant.agentName')));

    expect(container.textContent ?? '').not.toMatch(pattern);
  });

  it('says on screen that no model is connected', () => {
    openDrawer();

    expect(screen.getByText(zh('assistant.status.noModel'))).toBeDefined();
    expect(screen.getByText(zh('assistant.hint.demo'))).toBeDefined();
  });

  it('answers nothing when free text is sent, and says so', () => {
    openDrawer();
    const input = screen.getByLabelText(zh('assistant.drawer.placeholder'));

    fireEvent.change(input, { target: { value: 'What is our residual risk appetite?' } });
    fireEvent.click(screen.getByLabelText(zh('assistant.ask')));

    // The notice appears...
    expect(screen.getByRole('status').textContent).toBe(zh('assistant.send.notice'));
    // ...and the question was NOT added as a message. Had it been, the empty
    // state — and with it the suggested prompts — would have gone.
    expect(screen.getByText(zh('assistant.drawer.tryAsking'))).toBeDefined();
  });
});

describe('ai drawer — suggested prompts render fixture answers', () => {
  it.each(aiSuggested)('%s resolves to its answer', (prompt) => {
    const expected = answers.find((a) => a.k.some((k) => prompt.toLowerCase().includes(k)));
    expect(expected).toBeDefined();

    openDrawer();
    fireEvent.click(screen.getByText(prompt));

    expect(screen.getByText(prompt)).toBeDefined();
    expect(screen.getByText(expected!.text)).toBeDefined();
  });
});
