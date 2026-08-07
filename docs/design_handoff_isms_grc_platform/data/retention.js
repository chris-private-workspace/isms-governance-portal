// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const retention = [
    { cls:'Security incident records', keep:'3 years after closure', basis:'ISO 27001 A.5.28 · Group records policy', hold:'2 under legal hold', disp:'Reviewed annually' },
    { cls:'Risk Management Report & SoA', keep:'3 years per version', basis:'RM procedure §12', hold:'—', disp:'Superseded versions archived' },
    { cls:'ISMS profile versions', keep:'3 years per version', basis:'Controlled document register', hold:'—', disp:'Archived, not deleted' },
    { cls:'Audit issues & evidence', keep:'6 years', basis:'Certification body requirement', hold:'1 under legal hold', disp:'Manual approval to dispose' },
    { cls:'External party assessments', keep:'Contract term + 2 years', basis:'A.5.19–A.5.22', hold:'—', disp:'Reviewed at contract exit' },
    { cls:'Platform audit log', keep:'7 years', basis:'Append-only · SHA-256 chained', hold:'—', disp:'Immutable — no disposal' },
  ];
