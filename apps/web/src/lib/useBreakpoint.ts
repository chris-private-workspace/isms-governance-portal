'use client';

/**
 * File: apps/web/src/lib/useBreakpoint.ts
 * Purpose: Report the current layout band, and report 'wide' on the first frame.
 * Category: ui
 * Scope: Phase W20
 *
 * Description:
 *   The design handoff ships ZERO @media breakpoints and documents itself as
 *   "designed for >=1280px" (README:445). W20 adds responsive behaviour down to
 *   768px as a recorded deviation under 約束 6. Almost all of that work is pure
 *   CSS on inline styles — min(), fluid grids, scroll containers — which needs
 *   no JavaScript at all. This hook exists for the two places that genuinely
 *   have to KNOW the width rather than react to it: the nav rail's automatic
 *   collapse, and the topbar's narrow-width stowing. Keeping the JS surface at
 *   two call sites is the point; a hook read by all 28 screens would put a
 *   hydration boundary on every one of them.
 *
 *   WHY THE FIRST FRAME IS ALWAYS 'wide', and why that is not a bug:
 *   this app server-renders, and `window.matchMedia` does not exist on the
 *   server. Reading it during render — via a lazy useState initialiser, say —
 *   makes the server produce one tree and the client hydrate a different one,
 *   and React resolves that mismatch by discarding and re-rendering. So the
 *   initial value is a fixed constant and the real measurement happens in an
 *   effect, which only ever runs on the client. `useBreakpoint.test.ts` asserts
 *   this by recording the first rendered value while matchMedia reports narrow;
 *   moving the read into the initialiser turns that test red.
 *
 *   Two queries rather than one resize listener: matchMedia fires on band
 *   crossings, a resize listener fires on every pixel. Same answer, far fewer
 *   renders.
 *
 * Key Components:
 *   - Breakpoint: 'wide' | 'mid' | 'narrow' — the three bands from plan §3.1
 *   - useBreakpoint(): the hook; 'wide' until mounted, then the measured band
 *
 * Created: 2026-08-18 (Phase W20)
 * Last Modified: 2026-08-18
 *
 * Modification History (newest-first):
 *   - 2026-08-18: Initial creation (Phase W20) — nav auto-collapse + topbar stowing
 *
 * Related:
 *   - docs/01-planning/W20-responsive-layout/plan.md §3.1 — the band table
 *   - apps/web/src/components/shell/AppShell.tsx — the only consumer
 */
import { useEffect, useState } from 'react';

export type Breakpoint = 'wide' | 'mid' | 'narrow';

/**
 * Band edges. `narrow`'s lower bound (768px) is deliberately absent: below it
 * the app is out of scope (plan §3.1 S1) and horizontal scrolling is accepted,
 * so there is nothing to switch on.
 */
const MID_MAX = '(max-width: 1439px)';
const NARROW_MAX = '(max-width: 1023px)';

/** The value rendered on the server and on the hydration pass. See file header. */
const FIRST_FRAME: Breakpoint = 'wide';

export function useBreakpoint(): Breakpoint {
  const [band, setBand] = useState<Breakpoint>(FIRST_FRAME);

  useEffect(() => {
    const mid = window.matchMedia(MID_MAX);
    const narrow = window.matchMedia(NARROW_MAX);

    const read = () => setBand(narrow.matches ? 'narrow' : mid.matches ? 'mid' : 'wide');

    read();
    mid.addEventListener('change', read);
    narrow.addEventListener('change', read);
    return () => {
      mid.removeEventListener('change', read);
      narrow.removeEventListener('change', read);
    };
  }, []);

  return band;
}
