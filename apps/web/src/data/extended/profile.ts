/**
 * File: apps/web/src/data/extended/profile.ts
 * Purpose: The signed-in demo user's record, as /my-profile renders it.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   Extended rather than ported for the reason given in myTasks.ts: data/ proper
 *   holds verbatim copies of handoff data/*.js files and must stay diffable.
 *   This record has no such file — it is transcribed from the design SOURCE,
 *   design/ISMS Governance Platform.dc.html:5144-5148.
 *
 *   Two fields are NOT stored here even though the design's object carries them:
 *   `entitiesAssigned` is derived from the OpCo fixture at the call site (the
 *   design derived it too, from its own entity list), so the profile can never
 *   claim an assignment to an entity the platform does not have.
 *
 *   `phone` is masked in the design source and is left masked. Seeding anything
 *   that reads as a real personal number would breach guardrail 7, and a demo
 *   screen has no use for one.
 *
 *   `permissions` is the design's own four-line summary, NOT a derivation of
 *   permMatrix. permMatrix is the spec-grade source (11 modules x 6 roles), but
 *   using it needs a user -> role binding that does not exist yet, and it would
 *   render 11 rows where the fragment's hint-placeholder-count says 4. Recorded
 *   as an open item rather than settled by guesswork; see the page header.
 *
 * Key Components:
 *   - profile: the single demo user record
 *   - ProfileActivity: one row of the recent-activity list
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — transcribed from the design source
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/design/ISMS Governance Platform.dc.html
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/27-my-profile.html
 */

export type ProfileActivity = { action: string; time: string };

export const profile = {
  name: 'Mei Lin Tan',
  /** Job title as the topbar avatar shows it — see the page header on roles. */
  role: 'Regional Governance',
  email: 'mei.lin.tan@group.com',
  /** Masked in the design source and kept masked. */
  phone: '+65 6xxx 1180',
  tz: 'Asia/Singapore · SGT',
  joined: 'Mar 2023',
  init: 'ML',
  mfa: 'Enabled · Authenticator app',
  lastLogin: '2026-07-05 08:40 SGT · Singapore',
  sessions: '3 active devices',
  permissions: [
    'Read/write across all entities',
    'Approve treatment decisions',
    'Sign-off on risks & controls',
    'Manage users, roles & thresholds',
  ],
  activity: [
    { action: 'Approved treatment for RSK-0987', time: '2h ago' },
    { action: 'Signed off CTL-2201 test', time: 'Yesterday' },
    { action: 'Exported Q3 audit evidence', time: '2 days ago' },
    { action: 'Changed control-coverage threshold', time: '2 days ago' },
  ] as ProfileActivity[],
};
