/**
 * File: apps/web/src/data/extended/aiThreads.ts
 * Purpose: The three entries in the assistant's "Recent threads" panel.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   Extended rather than ported, for the reason given in myTasks.ts. Transcribed
 *   from the design SOURCE — design/ISMS Governance Platform.dc.html:4506-4508 —
 *   where the array is inlined in the prototype's logic class rather than in a
 *   data/*.js file.
 *
 *   These are titles and counts ONLY. The design stores no thread bodies
 *   anywhere, which is why the panel is rendered without a click handler: there
 *   is nothing to open. Recorded here so the absence reads as the deliverable's
 *   gap rather than as an oversight in the port.
 *
 * Key Components:
 *   - AiThread: title plus the relative-time and message-count meta line
 *   - aiThreads: AiThread[] — 3 rows, matching the fragment's hint count
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — transcribed from the design source
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/15-ai-assistant.html
 */

export type AiThread = { title: string; meta: string };

export const aiThreads: AiThread[] = [
  { title: 'S1 notification list for the Malaysia ransomware case', meta: 'Today · 6 messages' },
  { title: 'Which OpCos may sell RICOH Spaces?', meta: 'Yesterday · 3 messages' },
  { title: 'Residual risks above the acceptance threshold', meta: '28 Jul · 8 messages' },
];
