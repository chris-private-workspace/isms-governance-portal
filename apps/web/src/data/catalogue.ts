/**
 * File: apps/web/src/data/catalogue.ts
 * Purpose: Sample approved catalogue entries mapped to their governing risk and control.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `catalogue`, 19 rows,
 *   covering code, name, biz, cat, risk, and ctl — the approved product/service list
 *   linked to its governing risk and control.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/catalogue.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const catalogue = [
    { code:'OP-101', name:'A3 colour MFP — IM C series', biz:'OP', cat:'Hardware',        risk:'RSK-1042', ctl:'CTL-2201' },
    { code:'OP-104', name:'A4 MFP & desktop printers',   biz:'OP', cat:'Hardware',        risk:'RSK-1042', ctl:'CTL-2201' },
    { code:'OP-118', name:'Production print — Pro C series', biz:'OP', cat:'Hardware',    risk:'RSK-1200', ctl:'CTL-2140' },
    { code:'OP-122', name:'Wide-format & industrial print', biz:'OP', cat:'Hardware',     risk:'RSK-1200', ctl:'CTL-2140' },
    { code:'OP-140', name:'Consumables & spare parts supply', biz:'OP', cat:'Supply',     risk:'RSK-1120', ctl:'CTL-2199' },
    { code:'OP-155', name:'Managed Print Services (MPS)', biz:'OP', cat:'Service',        risk:'RSK-1120', ctl:'CTL-2140' },
    { code:'OP-160', name:'@Remote fleet management',    biz:'OP', cat:'Service',         risk:'RSK-0987', ctl:'CTL-2255' },
    { code:'OP-171', name:'Streamline NX print security', biz:'OP', cat:'Software',       risk:'RSK-0512', ctl:'CTL-2150' },
    { code:'OP-180', name:'Device-as-a-Service (DaaS)',  biz:'OP', cat:'Service',         risk:'RSK-1120', ctl:'CTL-2199' },
    { code:'OS-201', name:'Managed IT Services',         biz:'OS', cat:'Service',         risk:'RSK-1200', ctl:'CTL-2300' },
    { code:'OS-210', name:'Cloud workspace & Azure landing zone', biz:'OS', cat:'Cloud',  risk:'RSK-0987', ctl:'CTL-2255' },
    { code:'OS-220', name:'Cyber security services — SOC & VA', biz:'OS', cat:'Security', risk:'RSK-1042', ctl:'CTL-2201' },
    { code:'OS-231', name:'Communication services — UCC / Teams Rooms', biz:'OS', cat:'Service', risk:'RSK-1155', ctl:'CTL-2199' },
    { code:'OS-240', name:'RICOH Spaces — digital workplace', biz:'OS', cat:'Software',   risk:'RSK-1155', ctl:'CTL-2199' },
    { code:'OS-252', name:'Business process services — scanning & BPO', biz:'OS', cat:'Service', risk:'RSK-0987', ctl:'CTL-2255' },
    { code:'OS-260', name:'Workflow automation — DocuWare',  biz:'OS', cat:'Software',    risk:'RSK-0640', ctl:'CTL-2012' },
    { code:'OS-271', name:'Data centre & network services',  biz:'OS', cat:'Service',     risk:'RSK-1310', ctl:'CTL-2410' },
    { code:'OS-280', name:'IT hardware resale & support',    biz:'OS', cat:'Supply',      risk:'RSK-1120', ctl:'CTL-2199' },
    { code:'OS-290', name:'Meeting room & interactive whiteboard solutions', biz:'OS', cat:'Hardware', risk:'RSK-1155', ctl:'CTL-2199' },
  ];
