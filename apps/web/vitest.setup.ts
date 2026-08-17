/**
 * File: apps/web/vitest.setup.ts
 * Purpose: Unmount rendered components between tests.
 * Category: Tooling
 * Scope: Phase W19
 *
 * Description:
 *   testing-library registers its own afterEach cleanup only when Vitest runs
 *   with `globals: true`. This config does not, so without this file every
 *   render stays in the document and the second test in a file sees two copies
 *   of the screen — which surfaces as "found multiple elements" on assertions
 *   that are actually correct.
 *
 *   Worth stating because the failure blames the assertion rather than the
 *   setup, and the obvious fix — loosening the query to getAllBy — would make
 *   the suite pass while leaving every test running against accumulated DOM.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19)
 */
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
