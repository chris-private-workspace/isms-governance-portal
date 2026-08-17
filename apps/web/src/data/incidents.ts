/**
 * File: apps/web/src/data/incidents.ts
 * Purpose: Sample security incident records spanning severity, timeline, and status.
 * Category: ui / demo fixture
 * Scope: Phase W19
 *
 * Description:
 *   Verbatim copy of the handoff file of the same name. Exports `incidents`, 8 rows,
 *   covering ref, title, opco, bu, type, sev, timestamps, status, owner, ticket,
 *   location, clause, impact, desc, and next.
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
 *   - docs/06-reference/design_handoff_isms_grc_platform/data/incidents.js
 */

// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const incidents = [
    { ref:'INC-2026-0148', title:'Ransomware detected on Shah Alam branch file server', opco:'RMY', bu:'Service Operations', type:'Malware / Ransomware', sev:'S1', occurred:'2026-07-27 03:12', discovered:'2026-07-27 06:40', reported:'2026-07-27', status:'Investigation', owner:'R. Abdullah', ticket:'SD-88214', location:'Shah Alam office — server room', close:'—', clause:'A.5.24, A.5.26, A.8.7', impact:'File share unavailable to 84 users; 1.2 TB encrypted. No customer data confirmed exfiltrated at this stage.', desc:'EDR flagged mass file-rename activity on FS-MY-02 at 03:12. Host isolated at 06:52. Initial vector suspected to be an exposed RDP service on a legacy jump host.', next:'Twice-daily update due 18:00 SGT' },
    { ref:'INC-2026-0147', title:'Customer PII emailed to incorrect external recipient', opco:'RHK', bu:'Sales — Commercial', type:'Information leakage', sev:'S2', occurred:'2026-07-24 11:05', discovered:'2026-07-24 11:40', reported:'2026-07-24', status:'Root cause analysis', owner:'C. Ng', ticket:'SD-88190', location:'Kowloon Bay office', close:'—', clause:'A.5.34, A.6.3', impact:'Contact details and service addresses of 46 customers disclosed to one external party. Recipient confirmed deletion in writing.', desc:'A quotation workbook containing an unfiltered customer tab was attached to an external email. Detected by the sender 35 minutes later and reported to the OpCo ISO.', next:'Daily update due 17:00 HKT' },
    { ref:'INC-2026-0146', title:'Unencrypted USB drive lost in transit by field engineer', opco:'RTH', bu:'Field Service', type:'Lost / stolen device or media', sev:'S2', occurred:'2026-07-21 14:20', discovered:'2026-07-22 09:00', reported:'2026-07-22', status:'Corrective action', owner:'P. Srisai', ticket:'SD-88155', location:'Bangkok — customer site transit', close:'—', clause:'A.7.10, A.8.12', impact:'Device configuration files and 3 customer site diagrams potentially exposed. No credentials stored on media.', desc:'Engineer used personal USB media to move firmware files between customer sites, contrary to the removable media standard. Media not recovered.', next:'Daily update due 16:00 ICT' },
    { ref:'INC-2026-0145', title:'Phishing campaign — 3 sets of credentials harvested', opco:'RAPO', bu:'Supply Chain', type:'Phishing / social engineering', sev:'S2', occurred:'2026-07-09 08:30', discovered:'2026-07-09 09:15', reported:'2026-07-09', status:'Closed', owner:'W. Cheung', ticket:'SD-87990', location:'Hong Kong — One Kowloon', close:'2026-07-18', clause:'A.6.3, A.5.17', impact:'3 accounts compromised, no mailbox rules created, no data accessed. MFA blocked all sign-in attempts from outside APAC.', desc:'Credential-harvesting page impersonating the supplier portal. 41 recipients, 3 submissions. Passwords reset within 25 minutes of detection.', next:'Closed — PIR filed' },
    { ref:'INC-2026-0144', title:'Returned MFP hard disk shipped without secure data wipe', opco:'RSG', bu:'Logistics', type:'Improper disposal / handling', sev:'S1', occurred:'2026-07-16 10:00', discovered:'2026-07-18 15:30', reported:'2026-07-18', status:'Notified', owner:'J. Lim', ticket:'SD-88101', location:'Singapore — refurbishment centre', close:'—', clause:'A.7.14, A.8.10', impact:'Two devices from a government customer returned to the refurbishment pool with disks intact. Potential exposure of scanned document cache.', desc:'The wipe certificate step in the reverse-logistics workflow was skipped for a batch of 12 devices. Devices quarantined; forensic verification in progress.', next:'Twice-daily update due 18:00 SGT' },
    { ref:'INC-2026-0143', title:'Repeated unauthorised sign-in attempts on Azure console', opco:'RAP', bu:'Regional IT', type:'Unauthorised access attempt', sev:'S3', occurred:'2026-07-11 22:40', discovered:'2026-07-11 22:41', reported:'2026-07-12', status:'Closed', owner:'A. Kumar', ticket:'SD-88033', location:'Cloud — APAC tenant', close:'2026-07-15', clause:'A.8.5, A.8.16', impact:'No successful authentication. Source IPs blocked at conditional-access layer.', desc:'214 failed sign-in attempts against three administrator accounts over 40 minutes. Conditional access and MFA prevented access.', next:'Closed' },
    { ref:'INC-2026-0142', title:'Tailgating into secured equipment room by contractor', opco:'RAU', bu:'Facilities', type:'Physical security breach', sev:'S3', occurred:'2026-07-08 13:05', discovered:'2026-07-08 13:30', reported:'2026-07-09', status:'Investigation', owner:'S. Nguyen', ticket:'SD-87975', location:'North Ryde — Level 2', close:'—', clause:'A.7.2, A.7.4', impact:'No equipment removed or altered. CCTV review complete.', desc:'A maintenance contractor followed an employee through the access-controlled door without badging in. Access card log shows no entry record.', next:'Update every 2 days' },
    { ref:'INC-2026-0141', title:'NOC supplier engineer accessed firewall logs without a ticket', opco:'RAPO', bu:'Regional IT', type:'Third-party / supplier', sev:'S3', occurred:'2026-06-30 02:15', discovered:'2026-07-02 10:00', reported:'2026-07-02', status:'Closed', owner:'W. Cheung', ticket:'SD-87902', location:'Remote — NOC', close:'2026-07-10', clause:'A.5.22, A.8.15', impact:'Read-only access to firewall logs. No configuration change made.', desc:'Access outside the agreed change window and without a corresponding service ticket, contrary to the external party agreement. Supplier issued a written explanation.', next:'Closed' },
  ];
