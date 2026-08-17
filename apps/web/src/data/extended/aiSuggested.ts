/**
 * File: apps/web/src/data/extended/aiSuggested.ts
 * Purpose: The four example questions the assistant's empty state offers.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   Extended rather than ported: data/ proper mirrors the handoff's data/*.js
 *   files one-for-one and must stay diffable against them. These four strings
 *   live in the design SOURCE instead — design/ISMS Governance
 *   Platform.dc.html:4083-4088 — so they are transcribed, not invented.
 *
 *   They belong WITH answers.ts, not apart from it: each one is the question
 *   half of a canned exchange whose answer half is already in data/answers.ts,
 *   matched through that file's `k` keyword arrays. Kept as fixture strings
 *   rather than i18n keys for the same reason the answers are — a translated
 *   question over an untranslated answer would read as though one of the two
 *   were live.
 *
 *   All four resolve against answers.ts's keyword lists; verified by
 *   ai-assistant.test.tsx, because an unmatched prompt would render a user
 *   message with nothing under it and look like a failed request.
 *
 * Key Components:
 *   - aiSuggested: string[] — 4 questions, matching the fragment's hint count
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — transcribed from the design source
 *
 * Related:
 *   - apps/web/src/data/answers.ts — the answer half of each exchange
 *   - docs/06-reference/design_handoff_isms_grc_platform/design/ISMS Governance Platform.dc.html
 */

export const aiSuggested: string[] = [
  'What is the reporting timeframe for an S1 incident, and who must be notified?',
  'Which risks in the Software worksheet still score 12 or above before control?',
  'Is Ricoh Vietnam approved to sell managed IT services?',
  'Summarise open external-party assessments where controls are not adequate',
];
