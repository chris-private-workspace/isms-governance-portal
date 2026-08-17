/**
 * File: apps/web/src/data/osServices.ts
 * Purpose: Sample OS business-line portfolio entries with lifecycle stage and risk rating.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name, with edits. Exports
 *   `osServices`, 11 rows, covering code, name, cat, owner, stage, opcos, data, rev,
 *   risk, ctl, cert, clients, and note. An out-of-scope OpCo code (`RIN`) was removed
 *   from 3 rows' `opcos` arrays, and 1 owner name was changed.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/osServices.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const osServices = [
    { code:'OS-201', name:'Managed IT Services', cat:'Managed services', owner:'S. Nguyen', stage:'Live', opcos:['RAP','RSG','RHK','RAU','RKR'], data:'Confidential', rev:'2026-05-14', risk:'A', ctl:'CTL-2300', cert:'In ISO 27001 scope', clients:184, note:'Service desk, endpoint management and patching delivered from regional operation centres.' },
    { code:'OS-210', name:'Cloud workspace & Azure landing zone', cat:'Cloud', owner:'A. Kumar', stage:'Live', opcos:['RAP','RSG','RAU','RHK'], data:'Confidential', rev:'2026-06-02', risk:'G', ctl:'CTL-2255', cert:'ISO 27017 controls applied', clients:96, note:'Tenant build, landing zone guardrails and ongoing cloud posture management.' },
    { code:'OS-220', name:'Cyber security services — SOC & VA', cat:'Security', owner:'W. Cheung', stage:'Live', opcos:['RAP','RAPO','RSG','RAU'], data:'Restricted', rev:'2026-06-20', risk:'A', ctl:'CTL-2201', cert:'In ISO 27001 scope', clients:63, note:'Managed detection, vulnerability assessment and incident support with a named MDR partner.' },
    { code:'OS-231', name:'Communication services — UCC / Teams Rooms', cat:'Workplace', owner:'C. Ng', stage:'Live', opcos:['RHK','RSG','RTW','RKR'], data:'Internal', rev:'2026-04-11', risk:'G', ctl:'CTL-2199', cert:'In ISO 27001 scope', clients:141, note:'Meeting room deployment, telephony migration and adoption services.' },
    { code:'OS-240', name:'RICOH Spaces — digital workplace', cat:'Software', owner:'S. Nguyen', stage:'Growth', opcos:['RAU','RNZ','RSG'], data:'Confidential', rev:'2026-03-28', risk:'A', ctl:'CTL-2199', cert:'Vendor SaaS — supplier assessed', clients:48, note:'Desk and room booking platform resold with configuration and support services.' },
    { code:'OS-252', name:'Business process services — scanning & BPO', cat:'BPO', owner:'J. Lim', stage:'Live', opcos:['RSG','RMY','RPH'], data:'Restricted', rev:'2026-05-30', risk:'R', ctl:'CTL-2255', cert:'In ISO 27001 scope', clients:57, note:'Document capture, indexing and records processing performed at Ricoh sites.' },
    { code:'OS-260', name:'Workflow automation — DocuWare', cat:'Software', owner:'J. Lim', stage:'Live', opcos:['RSG','RTH'], data:'Confidential', rev:'2026-02-19', risk:'A', ctl:'CTL-2012', cert:'Vendor SaaS — supplier assessed', clients:72, note:'Document management and workflow implementation, hosted or on premises.' },
    { code:'OS-271', name:'Data centre & network services', cat:'Infrastructure', owner:'A. Kumar', stage:'Live', opcos:['RAP','RSG','RAU'], data:'Restricted', rev:'2026-06-11', risk:'A', ctl:'CTL-2410', cert:'In ISO 27001 scope', clients:29, note:'Co-location, network build and managed connectivity for enterprise customers.' },
    { code:'OS-280', name:'IT hardware resale & support', cat:'Supply', owner:'J. Lim', stage:'Mature', opcos:['RSG','RHK','RMY','RTH','RPH','RID'], data:'Internal', rev:'2026-01-22', risk:'G', ctl:'CTL-2199', cert:'In ISO 27001 scope', clients:310, note:'Device procurement, staging and warranty support attached to service contracts.' },
    { code:'OS-290', name:'Meeting room & interactive whiteboard solutions', cat:'Workplace', owner:'Y. Chen', stage:'Growth', opcos:['RTW','RKR','RHK'], data:'Internal', rev:'2026-04-30', risk:'G', ctl:'CTL-2199', cert:'In ISO 27001 scope', clients:88, note:'Interactive display supply with installation and managed support.' },
    { code:'OS-295', name:'Sustainability reporting services', cat:'Advisory', owner:'S. Nguyen', stage:'Pilot', opcos:['RAU'], data:'Confidential', rev:'—', risk:'R', ctl:'—', cert:'Not yet in scope', clients:4, note:'Pilot advisory offering; ISMS scope extension and risk assessment not yet completed.' },
  ];
