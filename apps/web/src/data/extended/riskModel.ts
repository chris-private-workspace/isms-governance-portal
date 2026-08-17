/**
 * File: apps/web/src/data/extended/riskModel.ts
 * Purpose: The 5-point likelihood scale and the five impact dimensions.
 * Category: ui / demo fixture (extended)
 * Scope: Phase W19
 *
 * Description:
 *   NOT part of `apps/web/src/data/` proper — see extended/roles.ts for why the
 *   split exists. Every file here states where its content came from.
 *
 *   PROVENANCE — transcribed, not invented:
 *     design/ISMS Governance Platform.dc.html:4601-4607  (rp.likelihood)
 *     design/ISMS Governance Platform.dc.html:4608-4614  (rp.impacts)
 *
 *   THIS IS THE SCORING MODEL THE CHARTER FIXES, not a design flourish.
 *   Confirmed parameter #7: Likelihood(1-5) x MAX(FIN, BOP, LRY, REP, SIS),
 *   giving 1-25, with 16 the treatment threshold. IMPACTS below is that MAX's
 *   five arguments, one column each, and LIKELIHOOD is its other factor. The
 *   fragment shows all five dimensions scored independently, so per parameter
 *   #11 it is authoritative here and the design's own single-impact simplification
 *   elsewhere does not apply.
 *
 *   WHAT IS NOT HERE, deliberately: no banding. The prototype carried its own at
 *   >=15 / >=8 (dc.html:3883-3884), which is NOT the charter's 16. Storing a band
 *   beside the model would be storing the disagreement. The screen calls
 *   riskBand() from lib/posture.ts, whose 16 is the charter's.
 *
 *   The descriptive text is the procedure's, carried across character for
 *   character and not routed through the dictionaries — same reasoning as
 *   extended/riskProgramme.ts: this is a controlled document, not UI copy.
 *
 * Key Components:
 *   - LIKELIHOOD: the five likelihood levels, 5 down to 1
 *   - IMPACTS: the five severity levels x five impact dimensions
 *   - maxImpact / riskScore: the charter's arithmetic, in one place
 *
 * Created: 2026-08-17 (Phase W19)
 * Last Modified: 2026-08-17
 *
 * Modification History (newest-first):
 *   - 2026-08-17: Initial creation (Phase W19) — risk programme port
 *
 * Related:
 *   - apps/web/src/lib/posture.ts — riskBand(), which owns the 16 boundary
 */

export type LikelihoodLevel = {
  /** 1-5. */
  s: number;
  cat: string;
  desc: string;
  /** Probability band, as the procedure states it. */
  p: string;
};

/** dc.html:4601-4607, verbatim, highest first as the design orders them. */
export const LIKELIHOOD: LikelihoodLevel[] = [
  {
    s: 5,
    cat: 'Almost certain',
    desc: 'An event is expected to occur in most circumstances',
    p: '>1 in 10',
  },
  { s: 4, cat: 'Likely', desc: 'An event will probably occur', p: '1 in 10 – 100' },
  {
    s: 3,
    cat: 'Possible',
    desc: 'An event might occur at some time in the future',
    p: '1 in 100 – 1,000',
  },
  { s: 2, cat: 'Unlikely', desc: 'An event could occur but is doubtful', p: '1 in 1,000 – 10,000' },
  {
    s: 1,
    cat: 'Rare',
    desc: 'An event may occur but only in exceptional circumstances',
    p: '1 in 10,000 – 100,000',
  },
];

export type ImpactLevel = {
  /** 1-5. */
  s: number;
  cat: string;
  /**
   * The 5x5 matrix's column head. Same vocabulary as `cat`, shortened by the
   * designer to fit the axis — 19-risk-programme.html:91-95, verbatim.
   * It lives on the row so the axis cannot drift out of step with the table
   * beneath it, which is what a parallel array of five strings would allow.
   */
  abbr: string;
  /** Financial. */
  fin: string;
  /** Business operations. */
  bop: string;
  /** Legal & regulatory. */
  lry: string;
  /** Reputation. */
  rep: string;
  /** Sensitive information / life safety. */
  sis: string;
};

/** dc.html:4608-4614, verbatim, highest first as the design orders them. */
export const IMPACTS: ImpactLevel[] = [
  {
    s: 5,
    cat: 'Catastrophic',
    abbr: 'Catas.',
    fin: '>25% of budget or >$5M',
    bop: 'Business operations severely affected',
    lry: 'Significant non-compliance leading to company closure',
    rep: 'Commission of inquiry or adverse national media',
    sis: 'Disclosure of multiple highly confidential records; loss of multiple lives',
  },
  {
    s: 4,
    cat: 'Major',
    abbr: 'Major',
    fin: '>10% of budget or <$5M',
    bop: 'Trends show service is degraded',
    lry: 'Material non-compliance leading to prosecution of individuals',
    rep: 'Intense public, political and media scrutiny',
    sis: 'Disclosure of individual highly confidential records; loss of life',
  },
  {
    s: 3,
    cat: 'Moderate',
    abbr: 'Mod.',
    fin: '>5% of budget or <$500K',
    bop: 'Inconvenient but not client-threatening',
    lry: 'Non-compliance leading to regulatory inquiry',
    rep: 'Scrutiny by external committees or inquest',
    sis: 'Disclosure of multiple confidential records; serious injuries',
  },
  {
    s: 2,
    cat: 'Minor',
    abbr: 'Minor',
    fin: '2.5% of budget or <$50K',
    bop: 'Services do not fully meet needs',
    lry: 'Technical breach leading to financial penalty',
    rep: 'Scrutiny by internal committees or internal audit',
    sis: 'Disclosure of individual confidential company records; minor injuries',
  },
  {
    s: 1,
    cat: 'Insignificant',
    abbr: 'Insig.',
    fin: '1% of budget or <$5K',
    bop: 'Minor delay without impact on schedule',
    lry: 'No legal or regulatory obligation',
    rep: 'Internal review',
    sis: 'Minimal internal disclosure of public data',
  },
];

/**
 * The five impact dimensions, in the order every scored row stores them.
 *
 * Written down because the Risk Management Report rows are ARRAYS — reading
 * position 3 as 'legal & regulatory' is otherwise something the reader has to
 * know rather than something the code says.
 */
export const IMPACT_DIMENSIONS = ['FIN', 'BOP', 'LRY', 'REP', 'SIS'] as const;

/** Confirmed parameter #7 — the MAX, not the sum and not an average. */
export function maxImpact(impacts: readonly number[]): number {
  return Math.max(...impacts);
}

/** Likelihood x MAX(impacts). 1-25 by construction. */
export function riskScore(likelihood: number, impacts: readonly number[]): number {
  return likelihood * maxImpact(impacts);
}
