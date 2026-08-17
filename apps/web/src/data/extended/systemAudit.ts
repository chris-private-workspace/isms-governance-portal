/**
 * File: apps/web/src/data/extended/systemAudit.ts
 * Purpose: The tail of the platform audit log shown under Admin.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed with actor names realigned:
 *     design/ISMS Governance Platform.dc.html:5130-5140  (systemAudit)
 *   Ten entries, newest first, with their timestamps, actions, objects and
 *   source addresses carried across unchanged.
 *
 *   THE EDIT — three actor names. The prototype's log is written by 'M. Tan',
 *   'K. Sato' and 'L. Wang', none of whom exist anywhere else in this repo, and
 *   two of whom are scoped to jurisdictions the charter excludes (Japan is
 *   headquarters rather than an OpCo; China is out of scope under parameter #4).
 *   data/riskRegister.ts already replaced L. Wang with Y. Chen for exactly this
 *   reason. Each is remapped to somebody the rest of the fixture knows, chosen
 *   so the entry stays TRUE rather than merely populated:
 *     - K. Sato    -> H. Park   — RSK-1042 is an RKR risk owned by H. Park
 *                                 (data/risks.ts), so its rating is his to move
 *     - L. Wang    -> Y. Chen   — CTL-2255 is the DPA review control and Y. Chen
 *                                 is the Data Protection Officer (riskRegister)
 *     - M. Tan     -> A. Kumar  — signing in, approving treatment and changing a
 *                                 RAG threshold are Platform admin acts
 *   'Internal Audit' and 'System' are parties rather than people and stay.
 *
 *   AN AUDIT LOG IS NOT A LIST OF LABELS. `action` and `object` are the recorded
 *   content of an append-only entry, so they are stored and rendered as written,
 *   the same way the register's threat descriptions are. Routing them through
 *   the dictionaries would make the log say whatever the translation says.
 *
 *   Addresses: RFC1918 private ranges and one already-masked public address, as
 *   the prototype had them. Nothing here identifies a real host or person.
 *
 * Key Components:
 *   - SYSTEM_AUDIT: ten entries, newest first
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — admin audit log panel
 *
 * Related:
 *   - apps/web/src/data/riskRegister.ts — made the same L. Wang -> Y. Chen change
 */

/**
 * Which dot colour the row carries. The prototype stored a letter and resolved
 * it in the view (dc.html:5141); the letter is kept so the resolution stays in
 * one place and the fixture holds no colour of its own.
 */
export type AuditDot = 'primary' | 'g' | 'a' | 'n';

export type AuditEntry = {
  ts: string;
  actor: string;
  action: string;
  object: string;
  ip: string;
  dot: AuditDot;
};

/** dc.html:5130-5140. Three actor names realigned — see the header. */
export const SYSTEM_AUDIT: AuditEntry[] = [
  {
    ts: '2026-07-05 09:12 SGT',
    actor: 'H. Park',
    action: 'Updated residual rating',
    object: 'RSK-1042',
    ip: '10.4.2.19',
    dot: 'primary',
  },
  {
    ts: '2026-07-05 08:58 SGT',
    actor: 'Internal Audit',
    action: 'Recorded control test result',
    object: 'CTL-2201',
    ip: '10.4.9.02',
    dot: 'n',
  },
  {
    ts: '2026-07-05 08:40 SGT',
    actor: 'A. Kumar',
    action: 'Signed in (MFA)',
    object: 'session',
    ip: '118.201.x.x',
    dot: 'g',
  },
  {
    ts: '2026-07-04 17:22 SGT',
    actor: 'Y. Chen',
    action: 'Attached evidence workpaper',
    object: 'CTL-2255',
    ip: '10.7.1.44',
    dot: 'n',
  },
  {
    ts: '2026-07-04 16:05 SGT',
    actor: 'A. Kumar',
    action: 'Approved treatment decision',
    object: 'RSK-0987',
    ip: '118.201.x.x',
    dot: 'a',
  },
  {
    ts: '2026-07-04 14:30 SGT',
    actor: 'System',
    action: 'Synced posture from AWS Config',
    object: 'integration',
    ip: 'automated',
    dot: 'n',
  },
  {
    ts: '2026-07-04 11:12 SGT',
    actor: 'R. Abdullah',
    action: 'Raised issue',
    object: 'ISS-5610',
    ip: '10.9.3.71',
    dot: 'a',
  },
  {
    ts: '2026-07-03 18:44 SGT',
    actor: 'A. Kumar',
    action: 'Changed RAG threshold',
    object: 'Control coverage',
    ip: '118.201.x.x',
    dot: 'a',
  },
  {
    ts: '2026-07-03 15:20 SGT',
    actor: 'C. Ng',
    action: 'Completed RCSA cycle',
    object: 'Hong Kong · Q3',
    ip: '10.6.2.08',
    dot: 'g',
  },
  {
    ts: '2026-07-03 09:03 SGT',
    actor: 'J. Lim',
    action: 'Updated vendor record',
    object: 'Primary cloud region',
    ip: '10.5.1.19',
    dot: 'n',
  },
];

/** dc.html:5141 — the letter-to-token resolution, kept out of the fixture. */
export const AUDIT_DOT: Record<AuditDot, string> = {
  primary: 'var(--primary)',
  g: 'var(--rag-g)',
  a: 'var(--rag-a)',
  n: 'var(--rag-n)',
};
