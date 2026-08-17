/**
 * File: apps/web/src/types/assets.d.ts
 * Purpose: Declare the stylesheet side-effect import so `type-check` stands alone.
 * Category: ui / tooling
 * Scope: Phase W19
 *
 * Description:
 *   `app/layout.tsx` does `import './globals.css'`, and without a declaration
 *   for it TypeScript raises TS2882 on the side-effect import.
 *
 *   WHY THIS FILE EXISTS RATHER THAN THE ONE NEXT GENERATES. Locally the import
 *   already resolved, through `next-env.d.ts` — which `.gitignore:98` excludes,
 *   so it exists on a developer machine and never in CI. That is precisely the
 *   shape of failure this repo keeps recording: the local green was an artifact
 *   of a generated file the clean checkout does not have, and nothing said so
 *   until CI ran. W19's `layout.tsx` was the first file to import a stylesheet,
 *   so this phase is where it first mattered.
 *
 *   COMMITTING `next-env.d.ts` WOULD BE WORSE, not better: it imports
 *   `./.next/types/routes.d.ts`, which only exists after a build, and CI runs
 *   type-check before build. Tracking it would trade one missing declaration
 *   for two.
 *
 *   Only `*.css` is declared. CSS modules, images and fonts are not imported
 *   anywhere in this app — the port carries the design's inline styles verbatim
 *   and self-hosts its font through `globals.css` — so declaring them would be
 *   an abstraction with no caller (AP-5). Add each one when a real import needs
 *   it, not before.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — CI type-check TS2882 on globals.css
 *
 * Related:
 *   - apps/web/tsconfig.json — `include` lists next-env.d.ts and .next/types, neither in CI
 *   - apps/web/src/app/layout.tsx — the single stylesheet import in the app
 */

declare module '*.css';
