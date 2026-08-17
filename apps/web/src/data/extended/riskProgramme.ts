/**
 * File: apps/web/src/data/extended/riskProgramme.ts
 * Purpose: The eight-step risk assessment procedure, its triggers and its RACI.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4584-4593  (rp.steps)
 *     design/ISMS Governance Platform.dc.html:4594       (rp.triggers)
 *     design/ISMS Governance Platform.dc.html:4595-4600  (rp.roles)
 *
 *   THIS IS THE COMPANY'S OWN PROCEDURE, digitised — confirmed parameter #9 says
 *   to digitise the existing document and not to invent fields, and parameter
 *   #11 makes the procedure authoritative over the mockup where they differ.
 *   Here they do not differ: the prototype is transcribing the same document.
 *   The sentences are therefore carried across CHARACTER FOR CHARACTER, curly
 *   quotes included, and are not routed through the dictionaries. Translating a
 *   controlled document inside a UI dictionary would produce a second, unversioned
 *   edition of it — the steps' own version and approval history is the fifth tab
 *   of this very screen.
 *
 *   `who` is the accountable party from the procedure, not a platform role: the
 *   procedure names the Information Security Officer, the Information Security
 *   Committee and the Asset Owners, none of which are among the six platform
 *   roles in extended/roles.ts. Kept as written rather than mapped onto them,
 *   because the mapping is a governance decision nobody has made.
 *
 * Key Components:
 *   - RP_STEPS: the eight procedure steps, in order
 *   - RP_TRIGGERS: the six change types that force a reassessment
 *   - RP_RESPONSIBILITIES: four parties and what each owns
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — risk programme port
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/screens/19-risk-programme.html
 */

export type ProcedureStep = { n: string; title: string; who: string; body: string };

/** dc.html:4584-4593, verbatim. */
export const RP_STEPS: ProcedureStep[] = [
  {
    n: '1',
    title: 'Determine scope of risk assessment',
    who: 'Information Security Officer',
    body: 'Consider changes in business requirements and priorities, operating procedures, new or changed information systems, security incidents, and emerging threats. Scope changes are approved by the Chairman of the Information Security Committee.',
  },
  {
    n: '2',
    title: 'Identify sources of risk',
    who: 'Information Security Officer',
    body: 'Review the major business objectives and identify risk sources in the external and internal context of the ISMS, from the perspective of all interested parties — including sources outside the organisation’s control.',
  },
  {
    n: '3',
    title: 'Update the Asset Inventory',
    who: 'ISO with Asset Owners',
    body: 'Identify changes in physical, software, information, services, personnel and intangible assets within the ISMS scope, and record the delegate, value and classification of each changed asset.',
  },
  {
    n: '4',
    title: 'Assess information security risks',
    who: 'ISO with Asset Owners',
    body: 'Identify threats, exploitable vulnerabilities and risk owners. Score likelihood and the five impact types under the “Before Control” columns of the Risk Management Report; the worksheet calculates the risk score.',
  },
  {
    n: '5',
    title: 'Analyse and treat risks',
    who: 'Information Security Officer',
    body: 'Apply Annex A controls, avoid the risk, or transfer it. Record selected controls, then score the “After Control” columns. If the residual score is still 16 or above, apply further controls or record it in the IT Risk Register.',
  },
  {
    n: '6',
    title: 'Submit for review and approval',
    who: 'Information Security Committee',
    body: 'Asset Inventory, Risk Management Report, IT Risk Register and Statement of Applicability are submitted to the ISC for review and approval.',
  },
  {
    n: '7',
    title: 'Implement controls & measure effectiveness',
    who: 'ISO with Asset Owners',
    body: 'Coordinate implementation, design security performance indicators and the Security Metric Program, compare results against target values and perform trend analysis; correct adverse variance at source.',
  },
  {
    n: '8',
    title: 'Review risks',
    who: 'Information Security Officer',
    body: 'Annually, or after a security incident, review the Asset Inventory and Risk Management Report, verify that controls provide the expected protection, and look for improvements to the assessment procedure itself.',
  },
];

/** dc.html:4594, verbatim. */
export const RP_TRIGGERS: string[] = [
  'Business objectives and priorities',
  'Internal and external context',
  'Interested parties and their needs',
  'Interfaces and dependencies with other organisations',
  'Scope of the ISMS',
  'Asset inventory',
];

export type Responsibility = { role: string; items: string[] };

/** dc.html:4595-4600, verbatim. */
export const RP_RESPONSIBILITIES: Responsibility[] = [
  {
    role: 'Information Security Committee',
    items: [
      'Determine the schedule and scope for risk assessment',
      'Review and approve the Asset Inventory, Risk Management Report and Statement of Applicability',
      'Monitor implementation and ensure residual risks are minimised',
    ],
  },
  {
    role: 'Information Security Officer',
    items: [
      'Maintain the Asset Inventory after asset additions or removals',
      'Conduct risk assessment and treatment with relevant parties',
      'Prepare and submit the report and SoA for approval',
      'Implement identified controls and run the regular review',
    ],
  },
  {
    role: 'Asset Owners',
    items: [
      'Work with the ISO to update the Asset Inventory and Risk Management Report',
      'Provide measurement of asset, threat, vulnerability and implications',
    ],
  },
  {
    role: 'Risk Owners',
    items: ['Work with the ISO to implement the controls identified during risk treatment'],
  },
];
