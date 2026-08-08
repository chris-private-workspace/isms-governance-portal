/**
 * File: apps/web/next.config.ts
 * Purpose: Next.js config; sets response security headers explicitly.
 * Category: ui
 * Scope: Phase W01 (M0)
 * Owner: docs/02-architecture/04-security-by-design.md §93
 *
 * Description:
 *   The API sets its own headers via Helmet; this file does the same job for
 *   everything the browser loads from the web app. Both exist because `04:93`
 *   records that every one of the organisation's 45 scan findings came from an
 *   inherited default rather than an injection bug.
 *
 *   `transpilePackages` covers @isms/types, which ships TypeScript source
 *   rather than compiled output (see packages/types/src/index.ts).
 *
 * Created: 2026-08-08 (Phase W01)
 * Last Modified: 2026-08-08
 *
 * Modification History (newest-first):
 *   - 2026-08-08: Phase W01 — disable agentRules (D3-2)
 *   - 2026-08-08: Initial creation (Phase W01)
 */
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `next dev` otherwise writes AGENTS.md + CLAUDE.md into this directory on
  // every run, and re-creates them when deleted. Claude Code loads a CLAUDE.md
  // found here as project memory, so that file is always-loaded context this
  // repo never reviewed and cannot budget: check_rules_hygiene.py enforces a
  // byte ceiling on .claude/rules/, and a tool-authored instruction file that
  // rewrites itself on each Next upgrade sits outside it. The warning it
  // carries (Next 16 differs from model training data) is real — W01 hit it
  // twice — so it is recorded in our own docs instead of an unreviewed file.
  agentRules: false,
  // Standalone output keeps the runtime container layer to the server plus its
  // traced dependencies (docker/web.Dockerfile) instead of all of node_modules.
  output: 'standalone',
  // fileURLToPath, not URL.pathname: on Windows the latter yields "/C:/..."
  // and the Rust-side path canonicalisation rejects it (os error 123).
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  transpilePackages: ['@isms/types'],
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
