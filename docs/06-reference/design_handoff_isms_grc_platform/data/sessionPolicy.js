// Extracted verbatim from the prototype's logic class.
// Sample/reference data — replace with real API responses.
export const sessionPolicy = [
    { k:'Authentication', v:'SAML 2.0 single sign-on (Okta) · local passwords disabled' },
    { k:'Multi-factor', v:'Required for all roles; hardware key required for Platform admin' },
    { k:'Session timeout', v:'30 minutes idle · 12 hours absolute' },
    { k:'IP restriction', v:'Corporate network or managed device for administrative roles' },
    { k:'Just-in-time access', v:'Auditor role expires automatically after the approved window' },
    { k:'Break-glass', v:'2 emergency accounts · use raises a P1 alert to the Group CISO' },
  ];
