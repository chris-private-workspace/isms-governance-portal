/**
 * File: apps/web/src/components/icons.tsx
 * Purpose: The mockup's inline SVGs, carried across verbatim.
 * Category: ui
 * Scope: Phase W19
 *
 * Description:
 *   Day-0 measured 145 <svg> across the 30 fragments, with zero <img>, zero
 *   sprite sheets, zero icon fonts and zero url() — every icon is
 *   self-contained. So there is no asset pipeline to build: the path data
 *   moves across as-is.
 *
 *   WHERE THE ABSTRACTION LINE SITS, and why it sits there:
 *   each component owns only the PATH DATA and the viewBox. Size, stroke,
 *   stroke-width and fill stay at the call site, because the same icon is
 *   drawn differently in different places — the shield is 17px/#fff/1.9 in
 *   the brand mark and 18px/currentColor/1.7 in the nav rail. Folding those
 *   into a component default would silently normalise a difference the
 *   mockup makes deliberately.
 *
 *   The only edits are the ones JSX syntax forces: stroke-width ->
 *   strokeWidth, stroke-linecap -> strokeLinecap. No geometry is touched.
 *
 *   strokeLinecap/strokeLinejoin default to "round" here because all but one
 *   call site sets both; the search icon sets only linecap, and for a circle
 *   plus a straight line the join has no rendered effect. Noted rather than
 *   left implicit.
 *
 *   Two icons hardcode fill="var(--nav-bg)" (auditIssues, admin) — that is
 *   the mockup punching a hole in the glyph to fake an overlap against the
 *   nav rail. It is carried across as-is, and it means those two only look
 *   right ON the nav rail. Recorded so nobody reuses them on a light surface
 *   and wonders why there is a dark notch.
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Add Plus/Export/Edit/Save/Minus (Phase W19) — ISMS profiles
 *   - 2026-08-17: Add IconTaxonomy + IconLock (Phase W19) — admin screen
 *   - 2026-08-17: Initial creation (Phase W19) — shell icons
 *
 * Related:
 *   - docs/06-reference/design_handoff_isms_grc_platform/fragments/shell/02-app-shell.html
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

/* --- brand + nav rail (02-app-shell.html:11-70) --- */

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 11.5l2 2 3.5-4" />
  </Svg>
);

export const IconShieldOutline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
  </Svg>
);

export const IconAssistant = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5h16v11H9l-5 4V5z" />
    <path d="M12 8.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
  </Svg>
);

export const IconDashboard = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </Svg>
);

export const IconRisk = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2 20h20L12 3z" />
    <line x1="12" y1="10" x2="12" y2="14.5" />
    <circle cx="12" cy="17.4" r=".7" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconRiskOutline = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2 20h20L12 3z" />
  </Svg>
);

export const IconRiskProgramme = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 015.5 4H10l1.6 2H18.5A1.5 1.5 0 0120 7.5v10a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5v-12z" />
    <path d="M8 12h8M8 15.5h5" />
  </Svg>
);

export const IconPolicies = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
  </Svg>
);

export const IconIssues = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6" y1="3" x2="6" y2="21" />
    <path d="M6 4h11l-2 3 2 3H6z" />
  </Svg>
);

export const IconAssessments = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4V2.8h6V4" />
    <path d="M9 13l2 2 4-4" />
  </Svg>
);

/* fill="var(--nav-bg)" is the mockup's own value — see the header note. */
export const IconAuditIssues = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v16H7z" />
    <path d="M10 9h4M10 13h4" />
    <circle cx="17.5" cy="17.5" r="3.5" fill="var(--nav-bg)" />
    <path d="M16 17.6l1.1 1.1 2.2-2.2" />
  </Svg>
);

export const IconIncidents = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 2.8l8 3.4v5.3c0 4.6-3.3 8.1-8 9.7-4.7-1.6-8-5.1-8-9.7V6.2l8-3.4z" />
    <line x1="12" y1="8.5" x2="12" y2="13" />
    <circle cx="12" cy="15.9" r=".8" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconSuppliers = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5L12 4l9 5.5" />
    <path d="M5 11v8h14v-8" />
    <path d="M9.5 19v-5h5v5" />
  </Svg>
);

export const IconIsmsProfiles = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="9.5" r="5" />
    <path d="M8.5 13.5L7 21l5-2.4L17 21l-1.5-7.5" />
  </Svg>
);

export const IconOsPortfolio = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="17" height="12.5" rx="2" />
    <path d="M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7" />
    <path d="M3.5 12h17" />
  </Svg>
);

/* fill="var(--nav-bg)" is the mockup's own value — see the header note. */
export const IconAdmin = (p: IconProps) => (
  <Svg {...p}>
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="16" x2="20" y2="16" />
    <circle cx="9" cy="8" r="2.2" fill="var(--nav-bg)" />
    <circle cx="15" cy="16" r="2.2" fill="var(--nav-bg)" />
  </Svg>
);

/* --- topbar (02-app-shell.html:79-215) --- */

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);

/* --- screen icons (03-dashboard.html:29,152,165) --- */

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
  </Svg>
);

/**
 * The inner dot is filled, not stroked, and the fragment hardcodes that fill
 * to the same token it strokes with (03-dashboard.html:152). Bound to
 * currentColor instead so one value at the call site drives both — the
 * rendered result is identical and the colour still lives outside the glyph.
 */
export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="8" r=".6" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconGlobe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </Svg>
);

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" />
    <path d="M10 20a2 2 0 004 0" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14a8 8 0 11-9-9 6 6 0 009 9z" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Svg>
);

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z" />
  </Svg>
);

export const IconSwitchRole = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 3l5 5-5 5M21 8H9a5 5 0 00-5 5v4" />
  </Svg>
);

export const IconSignOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
  </Svg>
);

/* --- admin (14-admin.html:279,314) --- */

export const IconTaxonomy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7h18M3 12h18M3 17h12" />
  </Svg>
);

/* --- ISMS profiles (23-apac-isms-profiles.html:22,85,87,92,165) --- */

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Svg>
);

/**
 * NOT IconDownload. Same idea, different geometry — the download arrow starts at
 * y=3 over a 20px baseline, this one at y=4 over a 19px baseline. Substituting
 * one for the other would be the silent re-derivation the port rules forbid.
 */
export const IconExport = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11" />
    <path d="M8 11l4 4 4-4" />
    <path d="M4 19h16" />
  </Svg>
);

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4l10-10-4-4L4 16v4z" />
    <path d="M14 6l4 4" />
  </Svg>
);

export const IconSave = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h11l3 3v13H5z" />
    <path d="M8 4v6h7V4" />
  </Svg>
);

export const IconMinus = (p: IconProps) => (
  <Svg {...p}>
    <line x1="6" y1="12" x2="18" y2="12" />
  </Svg>
);

export const IconLock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 018 0v3" />
  </Svg>
);
