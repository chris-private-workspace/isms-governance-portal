/**
 * File: apps/web/src/data/sessionPolicy.ts
 * Purpose: Sample session-security policy settings shown on the security settings screen.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with one edit. Exports
 *   `sessionPolicy`, 6 rows, covering k (setting name) and v (setting value). The
 *   `Authentication` row's identity provider was changed from Okta to Microsoft
 *   Entra ID.
 *
 *   DEMO fixture. Screens consuming it must render the demo marker; unlabelled
 *   fixture data presented as real is an anti-pattern in this project.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — copied from the design handoff
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/sessionPolicy.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const sessionPolicy = [
    { k:'Authentication', v:'SAML 2.0 single sign-on (Microsoft Entra ID) · local passwords disabled' },
    { k:'Multi-factor', v:'Required for all roles; hardware key required for Platform admin' },
    { k:'Session timeout', v:'30 minutes idle · 12 hours absolute' },
    { k:'IP restriction', v:'Corporate network or managed device for administrative roles' },
    { k:'Just-in-time access', v:'Auditor role expires automatically after the approved window' },
    { k:'Break-glass', v:'2 emergency accounts · use raises a P1 alert to the Group CISO' },
  ];
