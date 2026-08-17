/**
 * File: apps/web/src/data/answers.ts
 * Purpose: Sample AI-assistant Q&A entries, each answer backed by cited source documents.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `answers`, 5 rows, each
 *   with k (search keywords), text, bullets, and cites — the citation objects the UI
 *   renders as source references.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/answers.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const answers = [
    { k:['s1','severity','notify','notification','report','timeframe','escalat'],
      text:'An S1 incident must be reported immediately and updated twice a day until closure.',
      bullets:['S1 covers incidents impacting sensitive company or customer information, critical systems or core network, other OpCos, a critical internal or OS process, or anything likely to reach media and affect Group reputation.',
               'Immediate notification goes to the Group CISO, the Regional Information Security Officer, the OpCo President, the Regional Managing Director and the OpCo IT Operations lead; the Information Security Committee and Legal & Compliance are notified within one hour.',
               'Root cause analysis, corrective action and preventive action sections of the incident report are mandatory for S1 and S2.',
               'The report is reviewed on behalf of the CISO and then approved before the incident can be closed.'],
      cites:[{id:'Incident report template',meta:'Severity level & reporting timeframe'},{id:'POL-280',meta:'Incident Response Plan v4.0'},{id:'INC-2026-0148',meta:'Live S1 — RMY'}] },
    { k:['software','worksheet','12','before control','score','asset class'],
      text:'Five entries in the Software worksheet carry a before-control risk score of 8 or above; two are at 12.',
      bullets:['Cloud Platform Management Console — external intruder attacks / ineffective IDS-IPS: likelihood 3 × impact 4 = 12, reduced to 3 after control.',
               'Cloud Platform Management Console — password guessing and cracking: 8 before control, 3 after (A.5.16, A.5.17, A.8.5).',
               'Virtual Firewall Software — unauthorised configuration change: 8 before, 3 after (A.5.3, A.8.18, A.8.19, A.8.31).',
               'No Software-worksheet residual score reaches the 16 acceptance threshold, so none is carried into the IT Risk Register.'],
      cites:[{id:'RM Report v2025.7',meta:'Software worksheet'},{id:'RM Procedure §11',meta:'Risk acceptance criteria'},{id:'ISO 27001:2022',meta:'Annex A.8'}] },
    { k:['vietnam','rvn','approved','sell','catalogue','managed it','product','service'],
      text:'No. Ricoh Vietnam is not currently in the certified ISMS scope, and managed IT services (OS-201) is not on its approved catalogue.',
      bullets:['Because RVN sits outside the certified scope, every office-services line on its profile is held at Pending — its approved catalogue is office printing only.',
               'OS-201 Managed IT Services requires an in-scope ISMS profile and evidence of CTL-2300 (privileged session recording) operating effectively.',
               'To sell it, RVN must submit an ISMS profile extension for approval by the Information Security Committee, with the related risks and controls mapped.'],
      cites:[{id:'ISMS profile — RVN',meta:'Approved products & services'},{id:'OS-201',meta:'Catalogue entry — conditions'},{id:'RM Procedure §5',meta:'Scope of risk assessment'}] },
    { k:['external party','supplier','third party','vendor','adequate','epr'],
      text:'Three external-party assessments currently record controls that are not fully adequate.',
      bullets:['EPR-022 NexGen NOC Services — existing controls partial; a new control is required and the assessment is conditional until the change-window restriction is enforced.',
               'EPR-020 Iron Vault Document Destruction — both existing and third-party controls partial; under review with a shortened re-assessment date of 9 Sep 2026.',
               'EPR-018 Meridian Logistics — third-party controls inadequate; remediation open and linked to incident INC-2026-0144.',
               'All three require a re-assessment signed off by the Regional Information Security Officer before access continues.'],
      cites:[{id:'External Party Risk Assessment Form',meta:'2025 register'},{id:'INC-2026-0144',meta:'Linked incident'},{id:'POL-330',meta:'Third-party Risk Management'}] },
    { k:['acceptance','16','residual','criteria','treat','matrix','likelihood','impact'],
      text:'Risk is acceptable below 16; at 16 or above controls must be implemented until the score is acceptable.',
      bullets:['Risk = Likelihood × Impact, both on a 5-point scale; the impact level is the highest score across finance, business operations, legal & regulatory, reputation, and sensitive information or life safety.',
               'Below 16, monitoring is sufficient and no written risk assessment is required, though cost-effective improvements should still be considered.',
               'If the residual score is still 16 or above after all necessary controls, the risk is recorded in the IT Risk Register with full details and follow-up actions.',
               'Four residual risks are currently in the register, two of them at 20.'],
      cites:[{id:'RM Procedure §10–11',meta:'Risk level calculation & acceptance'},{id:'IT Risk Register',meta:'4 open entries'}] },
  ];
