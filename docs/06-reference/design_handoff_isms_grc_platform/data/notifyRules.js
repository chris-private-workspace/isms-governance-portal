// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const notifyRules = [
    { ev:'S1 incident submitted', to:'Group CISO, Regional ISO, OpCo president, Regional MD', ch:'Email + Teams + SMS', sla:'Immediate', on:true },
    { ev:'S2 incident submitted', to:'Regional ISO, OpCo ISO, BU head', ch:'Email + Teams', sla:'Immediate', on:true },
    { ev:'Audit issue overdue', to:'Issue owner, OpCo ISO, Internal Audit', ch:'Email', sla:'Daily digest', on:true },
    { ev:'Major audit finding raised', to:'Regional ISO, OpCo president', ch:'Email + Teams', sla:'Within 4 hours', on:true },
    { ev:'ISMS profile saved as new version', to:'Regional ISO', ch:'Email', sla:'Daily digest', on:true },
    { ev:'Supplier re-assessment due in 30 days', to:'Assessment owner, Procurement', ch:'Email', sla:'Weekly digest', on:true },
    { ev:'Control test overdue', to:'Control owner, Regional ISO', ch:'Email', sla:'Weekly digest', on:true },
    { ev:'Certificate expiring in 90 days', to:'OpCo ISO, Regional ISO', ch:'Email', sla:'Monthly', on:false },
  ];
