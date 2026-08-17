/**
 * File: apps/web/src/lib/useBreakpoint.test.tsx
 * Purpose: Pin the first-frame constant, because that is the only part of this
 *     hook that a type checker, a linter and a passing render cannot see.
 * Category: Test
 * Scope: Phase W20
 *
 * Description:
 *   The band logic is trivial and would survive almost any refactor. The part
 *   that would not is the rule that the FIRST rendered value is the constant
 *   'wide', never a measurement. Break it — read matchMedia in a lazy useState
 *   initialiser, which is the obvious "simplification" — and everything still
 *   compiles, every other test still passes, and the only symptom is a
 *   hydration mismatch in production on narrow viewports.
 *
 *   So the first test records EVERY value the hook renders, while matchMedia is
 *   stubbed to report narrow, and asserts the first entry is 'wide' and a later
 *   one is 'narrow'. Asserting only the settled value would pass under the
 *   broken version too — that is exactly the vacuous shape this project keeps
 *   recording (AD-VacuousScopeTest-1), so the assertion is on the sequence.
 *
 *   jsdom does not implement window.matchMedia at all, so each test installs its
 *   own stub. The hook deliberately does not guard against its absence: it only
 *   ever runs inside an effect, and an effect only runs in a browser.
 *
 * Created: 2026-08-18 (Phase W20)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W20)
 *
 * Related:
 *   - apps/web/src/lib/useBreakpoint.ts — the file header explains why the constant exists
 */
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBreakpoint, type Breakpoint } from './useBreakpoint';

type Listener = () => void;

/**
 * Installs a matchMedia whose answers are driven by a width we control, and
 * returns a setter that re-fires the listeners the way a real resize would.
 */
function stubMatchMedia(initialWidth: number) {
  let width = initialWidth;

  // One listener list PER MediaQueryList, which is what the real API does. A
  // single shared Set looks equivalent and is not: the hook registers the same
  // `read` function on both lists, so a shared Set silently dedupes it and the
  // lifecycle test counts 1 where the browser would hold 2.
  const lists: Array<Set<Listener>> = [];

  const parseMax = (query: string) => Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Infinity);

  vi.stubGlobal('matchMedia', (query: string) => {
    const own = new Set<Listener>();
    lists.push(own);
    return {
      get matches() {
        return width <= parseMax(query);
      },
      media: query,
      addEventListener: (_: string, fn: Listener) => own.add(fn),
      removeEventListener: (_: string, fn: Listener) => own.delete(fn),
    };
  });

  return {
    resizeTo(next: number) {
      // act() because the listener sets React state from outside React's own
      // event handling; without it the assertion can run before the re-render.
      act(() => {
        width = next;
        lists.forEach((set) => set.forEach((fn) => fn()));
      });
    },
    get listenerCount() {
      return lists.reduce((n, set) => n + set.size, 0);
    },
  };
}

/** Renders the hook and records the value of every render, in order. */
function renderRecorded() {
  const seen: Breakpoint[] = [];
  function Probe() {
    seen.push(useBreakpoint());
    return null;
  }
  const view = render(<Probe />);
  return { seen, view };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useBreakpoint — the first frame is a constant, not a measurement', () => {
  it('renders wide first even when matchMedia already reports narrow', () => {
    stubMatchMedia(800);

    const { seen } = renderRecorded();

    // The assertion is on the SEQUENCE. `seen.at(-1) === 'narrow'` alone would
    // also pass if the hook read matchMedia during render, which is the bug.
    expect(seen[0]).toBe('wide');
    expect(seen.at(-1)).toBe('narrow');
  });

  it('renders wide first at mid width too', () => {
    stubMatchMedia(1200);

    const { seen } = renderRecorded();

    expect(seen[0]).toBe('wide');
    expect(seen.at(-1)).toBe('mid');
  });
});

describe('useBreakpoint — bands', () => {
  it.each([
    [2560, 'wide'],
    [1440, 'wide'],
    [1439, 'mid'],
    [1024, 'mid'],
    [1023, 'narrow'],
    [768, 'narrow'],
  ])('settles on %s -> %s', (width, expected) => {
    stubMatchMedia(width);

    const { seen } = renderRecorded();

    expect(seen.at(-1)).toBe(expected);
  });

  it('follows a resize across every band', () => {
    const mq = stubMatchMedia(2560);
    const { seen } = renderRecorded();
    expect(seen.at(-1)).toBe('wide');

    mq.resizeTo(1200);
    expect(seen.at(-1)).toBe('mid');

    mq.resizeTo(800);
    expect(seen.at(-1)).toBe('narrow');

    mq.resizeTo(1600);
    expect(seen.at(-1)).toBe('wide');
  });
});

describe('useBreakpoint — subscription lifecycle', () => {
  it('removes both listeners on unmount, so repeated mounts do not accumulate', () => {
    const mq = stubMatchMedia(1600);

    const { view } = renderRecorded();
    expect(mq.listenerCount).toBe(2);

    view.unmount();
    expect(mq.listenerCount).toBe(0);
  });
});
