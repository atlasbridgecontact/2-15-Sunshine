import { AgencyState, AgencyUpgradeDef, CertificationDef } from '../types/game';

/**
 * 2025/2026 Federal Poverty Level (FPL) guidelines for the 48 contiguous states (incl. Florida).
 * Base 1-person household: $15,650 + $5,500 per additional member.
 */
export function getFloridaFpl100(householdSize: number): number {
  const size = Math.max(1, Math.floor(householdSize));
  return 15650 + (size - 1) * 5500;
}

export function getCalendarInfo(monthIndex: number): {
  monthName: string;
  year: number;
  seasonTag: 'OEP & AEP Active' | 'OEP Active' | 'SEP / Life & Annuity Season' | 'AEP Active';
  isOep: boolean;
  isAep: boolean;
} {
  const months = [
    'November',
    'December',
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
  ];
  const zeroIdx = (monthIndex - 1) % 12;
  const yearOffset = Math.floor((monthIndex - 1 + 10) / 12);
  const monthName = months[zeroIdx];
  const year = 2026 + yearOffset;

  const isOep = monthName === 'November' || monthName === 'December' || monthName === 'January';
  const isAep = monthName === 'November' || monthName === 'December' || monthName === 'October';

  let seasonTag: 'OEP & AEP Active' | 'OEP Active' | 'SEP / Life & Annuity Season' | 'AEP Active' =
    'SEP / Life & Annuity Season';
  if (isOep && isAep) seasonTag = 'OEP & AEP Active';
  else if (isOep) seasonTag = 'OEP Active';
  else if (isAep) seasonTag = 'AEP Active';

  return { monthName, year, seasonTag, isOep, isAep };
}

/**
 * Exact 2026 IRS Rev. Proc. 2025-25 Section 36B Applicable Percentage calculation
 * plus Florida non-expansion gap (<100% FPL) and 2026 restored 400% FPL cliff.
 */
export function get2026ApplicablePct(fplPercent: number): number | null {
  if (fplPercent < 100 || fplPercent > 400) return null;
  if (fplPercent < 133) return 2.1;
  if (fplPercent < 150) {
    return Number((3.14 + ((fplPercent - 133) / 17) * (4.19 - 3.14)).toFixed(2));
  }
  if (fplPercent < 200) {
    return Number((4.19 + ((fplPercent - 150) / 50) * (6.6 - 4.19)).toFixed(2));
  }
  if (fplPercent < 250) {
    return Number((6.6 + ((fplPercent - 200) / 50) * (8.44 - 6.6)).toFixed(2));
  }
  if (fplPercent < 300) {
    return Number((8.44 + ((fplPercent - 250) / 50) * (9.96 - 8.44)).toFixed(2));
  }
  return 9.96;
}

export function getSampleFlSlcspMonthly(householdSize: number): number {
  const size = Math.max(1, Math.floor(householdSize));
  if (size === 1) return 485;
  if (size === 2) return 970;
  return 970 + (size - 2) * 320;
}

export interface Aca2026CalculationResult {
  fpl100: number;
  fpl400: number;
  fplPercent: number;
  applicablePct: number | null;
  expectedMonthlyContribution: number;
  sampleSlcspMonthly: number;
  estimatedMonthlyAptc: number;
  estimatedAnnualAptc: number;
  employerAffordabilityCapMonthly: number;
  acaStatus: string;
  csrAvLabel: string;
  csrBenefitDetails: string;
}

export function calculate2026AcaSubsidy(householdSize: number, magi: number): Aca2026CalculationResult {
  const fpl100 = getFloridaFpl100(householdSize);
  const fpl400 = fpl100 * 4;
  const fplPercent = Math.round((magi / fpl100) * 100);
  const applicablePct = get2026ApplicablePct(fplPercent);
  const sampleSlcspMonthly = getSampleFlSlcspMonthly(householdSize);
  const employerAffordabilityCapMonthly = Math.round((magi * 0.0996) / 12);

  if (fplPercent < 100) {
    return {
      fpl100,
      fpl400,
      fplPercent,
      applicablePct: null,
      expectedMonthlyContribution: sampleSlcspMonthly,
      sampleSlcspMonthly,
      estimatedMonthlyAptc: 0,
      estimatedAnnualAptc: 0,
      employerAffordabilityCapMonthly,
      acaStatus: 'Florida Coverage Gap (<100% FPL = $0 APTC)',
      csrAvLabel: 'No Subsidy / No CSR (Medicaid Gap)',
      csrBenefitDetails:
        'Florida did not expand Medicaid. Non-disabled adults under 100% FPL receive $0 APTC and pay full SLCSP (~$' +
        sampleSlcspMonthly +
        '/mo) or seek FQHC sliding-fee care.',
    };
  }

  if (fplPercent > 400 || applicablePct === null) {
    return {
      fpl100,
      fpl400,
      fplPercent,
      applicablePct: null,
      expectedMonthlyContribution: sampleSlcspMonthly,
      sampleSlcspMonthly,
      estimatedMonthlyAptc: 0,
      estimatedAnnualAptc: 0,
      employerAffordabilityCapMonthly,
      acaStatus: '2026 Subsidy Cliff (>400% FPL = $0 APTC)',
      csrAvLabel: 'Full Price (0% APTC · No CSR)',
      csrBenefitDetails:
        'Enhanced IRA subsidies expired Jan 1, 2026. Above 400% FPL ($' +
        fpl400.toLocaleString() +
        '), APTC drops to $0—evaluate HSA/Traditional IRA contributions to lower MAGI.',
    };
  }

  const expectedMonthlyContribution = Math.round((magi * (applicablePct / 100)) / 12);
  const estimatedMonthlyAptc = Math.max(0, sampleSlcspMonthly - expectedMonthlyContribution);
  const estimatedAnnualAptc = estimatedMonthlyAptc * 12;

  let csrAvLabel = 'Standard 70% AV Silver (No Extra CSR)';
  let csrBenefitDetails =
    'Standard Silver (~$4,800–$5,900 deductible · ~$8,900 Max OOP). Compare Bronze/Silver/Gold tradeoffs.';

  if (fplPercent <= 150) {
    csrAvLabel = '94% AV Platinum-Level Silver CSR';
    csrBenefitDetails =
      'Deepest Silver CSR: ~$0–$500 deductible, ~$1,200–$1,800 Max OOP, ~$0–$10 PCP/generic Rx copays. Always pick Silver!';
  } else if (fplPercent <= 200) {
    csrAvLabel = '87% AV Gold-Level Silver CSR';
    csrBenefitDetails =
      'Strong Silver CSR: ~$750–$1,500 deductible, ~$2,900–$3,400 Max OOP, ~$15–$25 PCP copays. Beats Gold at lower cost.';
  } else if (fplPercent <= 250) {
    csrAvLabel = '73% AV Enhanced Silver CSR';
    csrBenefitDetails =
      'Moderate Silver CSR: ~$2,800–$3,800 deductible, ~$6,500–$7,350 Max OOP. Worth comparing against Bronze/Gold.';
  }

  return {
    fpl100,
    fpl400,
    fplPercent,
    applicablePct,
    expectedMonthlyContribution,
    sampleSlcspMonthly,
    estimatedMonthlyAptc,
    estimatedAnnualAptc,
    employerAffordabilityCapMonthly,
    acaStatus: `APTC Eligible (${fplPercent}% FPL · ${applicablePct.toFixed(2)}% Cap)`,
    csrAvLabel,
    csrBenefitDetails,
  };
}

export interface MagiBenefitTierRow {
  fplBand: string;
  incomeRange: string;
  magiCapPct: string;
  sampleMonthlyAptc: string;
  silverCsrBenefits: string;
}

export function get2026MagiBenefitTiers(householdSize: number): MagiBenefitTierRow[] {
  const base = getFloridaFpl100(householdSize);
  const slcsp = getSampleFlSlcspMonthly(householdSize);
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const aptcAt = (fplPct: number) => {
    const magi = base * (fplPct / 100);
    const pct = get2026ApplicablePct(fplPct);
    if (pct === null) return 0;
    const contrib = Math.round((magi * (pct / 100)) / 12);
    return Math.max(0, slcsp - contrib);
  };

  return [
    {
      fplBand: '< 100% FPL',
      incomeRange: `Under ${fmt(base)}`,
      magiCapPct: 'Ineligible (FL Gap)',
      sampleMonthlyAptc: '$0/mo ($0/yr)',
      silverCsrBenefits: 'No APTC / No CSR (FL non-expansion Medicaid gap)',
    },
    {
      fplBand: '100% – 133% FPL',
      incomeRange: `${fmt(base)} – ${fmt(base * 1.33 - 1)}`,
      magiCapPct: '2.10% of MAGI',
      sampleMonthlyAptc: `~${fmt(aptcAt(115))}/mo (${fmt(aptcAt(115) * 12)}/yr)`,
      silverCsrBenefits: '94% AV Silver CSR (~$0–$500 ded · ~$1,500 MOOP)',
    },
    {
      fplBand: '133% – 150% FPL',
      incomeRange: `${fmt(base * 1.33)} – ${fmt(base * 1.5)}`,
      magiCapPct: '3.14% – 4.19%',
      sampleMonthlyAptc: `~${fmt(aptcAt(140))}/mo (${fmt(aptcAt(140) * 12)}/yr)`,
      silverCsrBenefits: '94% AV Silver CSR (~$0–$500 ded · ~$1,500 MOOP)',
    },
    {
      fplBand: '150% – 200% FPL',
      incomeRange: `${fmt(base * 1.5 + 1)} – ${fmt(base * 2.0)}`,
      magiCapPct: '4.19% – 6.60%',
      sampleMonthlyAptc: `~${fmt(aptcAt(175))}/mo (${fmt(aptcAt(175) * 12)}/yr)`,
      silverCsrBenefits: '87% AV Silver CSR (~$1,100 ded · ~$3,100 MOOP)',
    },
    {
      fplBand: '200% – 250% FPL',
      incomeRange: `${fmt(base * 2.0 + 1)} – ${fmt(base * 2.5)}`,
      magiCapPct: '6.60% – 8.44%',
      sampleMonthlyAptc: `~${fmt(aptcAt(225))}/mo (${fmt(aptcAt(225) * 12)}/yr)`,
      silverCsrBenefits: '73% AV Silver CSR (~$3,100 ded · ~$6,900 MOOP)',
    },
    {
      fplBand: '250% – 300% FPL',
      incomeRange: `${fmt(base * 2.5 + 1)} – ${fmt(base * 3.0)}`,
      magiCapPct: '8.44% – 9.96%',
      sampleMonthlyAptc: `~${fmt(aptcAt(275))}/mo (${fmt(aptcAt(275) * 12)}/yr)`,
      silverCsrBenefits: 'Standard 70% AV Silver (APTC only · ~$5,000 ded)',
    },
    {
      fplBand: '300% – 400% FPL',
      incomeRange: `${fmt(base * 3.0 + 1)} – ${fmt(base * 4.0)}`,
      magiCapPct: '9.96% Cap',
      sampleMonthlyAptc: `~${fmt(aptcAt(350))}/mo (${fmt(aptcAt(350) * 12)}/yr)`,
      silverCsrBenefits: 'Standard 70% AV Silver (APTC up to SLCSP minus 9.96%)',
    },
    {
      fplBand: '> 400% FPL',
      incomeRange: `Over ${fmt(base * 4.0)}`,
      magiCapPct: '2026 Subsidy Cliff',
      sampleMonthlyAptc: '$0/mo ($0/yr)',
      silverCsrBenefits: 'Unsubsidized (Use HSA / IRA to lower MAGI if close)',
    },
  ];
}

export interface PlatformToolMeta {
  fmoName: 'PSM Brokerage' | 'Gordon Marketing';
  fmoPortal: string;
  softwareName: string;
  softwareSubtitle: string;
  accentHex: string;
  intakeToolLabel: string;
  complianceToolLabel: string;
  quoteToolLabel: string;
  submitActionLabel: string;
  fmoSupportTitle: string;
  fmoSupportSummary: string;
}

export function getPlatformStack(productLine: 'ACA' | 'LIFE' | 'ANNUITY' | 'MEDICARE'): PlatformToolMeta {
  switch (productLine) {
    case 'ACA':
      return {
        fmoName: 'PSM Brokerage',
        fmoPortal: 'PSM Brokerage ACA Desk · HealthSherpa EDE',
        softwareName: 'HealthSherpa EDE',
        softwareSubtitle: 'CMS Enhanced Direct Enrollment · ACA Marketplace',
        accentHex: '#0d7a6f',
        intakeToolLabel: 'HealthSherpa Client Profile & SMS/Email Consent',
        complianceToolLabel: 'HealthSherpa EDE Consent & 2026 FPL Audit',
        quoteToolLabel: 'HealthSherpa Plan Shopper (APTC & CSR Matrix)',
        submitActionLabel: 'Sync HealthSherpa EDE & Submit to CMS',
        fmoSupportTitle: 'PSM Brokerage ACA Case Support',
        fmoSupportSummary:
          'Verify 45 CFR §155.220 consent first, watch Florida’s <100% FPL non-expansion gap, apply IRS Rev. Proc. 2025-25 400% FPL cliff rules, and match Silver CSR plans to client budget & Rx needs.',
      };
    case 'MEDICARE':
      return {
        fmoName: 'PSM Brokerage',
        fmoPortal: 'PSM Brokerage Senior Desk · SunFire Matrix',
        softwareName: 'SunFire Matrix',
        softwareSubtitle: 'Medicare Advantage & Part D Quoting + e-SOA',
        accentHex: '#0f766e',
        intakeToolLabel: 'SunFire Medicare Beneficiary & Rx Intake',
        complianceToolLabel: 'SunFire AHIP · 48-Hr e-SOA & Formulary Gate',
        quoteToolLabel: 'SunFire MA-PD vs. Medigap Plan Comparison',
        submitActionLabel: 'Lock SunFire e-SOA & Submit CMS Enrollment',
        fmoSupportTitle: 'PSM Brokerage Senior / Medicare Desk',
        fmoSupportSummary:
          'Precision Senior Marketing (PSM) supports your Medicare stack: confirm AHIP + Parts A & B, respect the 48-hour Scope of Appointment (SOA), and verify Dr. & Rx formulary inside SunFire.',
      };
    case 'LIFE':
      return {
        fmoName: 'Gordon Marketing',
        fmoPortal: 'Gordon Marketing Life Desk · iPipeline Suite',
        softwareName: 'iPipeline (XRAE + iGO e-App)',
        softwareSubtitle: 'Field Underwriting & Electronic Life Application',
        accentHex: '#1d4ed8',
        intakeToolLabel: 'XRAE Field Underwriting & DIME Fact-Finder',
        complianceToolLabel: 'XRAE Risk Check · Rule 69O-151 · F.S. §627.429',
        quoteToolLabel: 'iPipeline Life Quoter (Target vs. Excess FYC)',
        submitActionLabel: 'Run iGO Validation Lock & e-Sign App',
        fmoSupportTitle: 'Gordon Marketing Life Case Design',
        fmoSupportSummary:
          'Run XRAE before quoting so health/tobacco risk classes are accurate. Match Term vs. Permanent vs. Max-Funded IUL to client budget & goals, and attach OIR-B2-312 or F.S. §627.429 HIV Consent when triggered.',
      };
    case 'ANNUITY':
      return {
        fmoName: 'Gordon Marketing',
        fmoPortal: 'Gordon Marketing Annuity Desk · Hexure FireLight',
        softwareName: 'Hexure FireLight e-App',
        softwareSubtitle: 'Annuity Suitability, Illustrations & DTCC Submission',
        accentHex: '#b45309',
        intakeToolLabel: 'FireLight Suitability Profile & Asset Discovery',
        complianceToolLabel: 'FireLight DFS-H1-1980 / 1981 & Tax-Free Transfer Gate',
        quoteToolLabel: 'FireLight Annuity Comparison & Funding Selector',
        submitActionLabel: 'Run FireLight IGO Check & Submit via DTCC',
        fmoSupportTitle: 'Gordon Marketing Annuity Suitability Desk',
        fmoSupportSummary:
          'F.S. §627.4554 requires DFS-H1-1980 BEFORE recommending any annuity. Keep 65+ emergency liquidity intact, match surrender term to client horizon, use 1035/Direct Rollover, and disclose Florida’s 21-day free look.',
      };
  }
}

export const CERTIFICATIONS: CertificationDef[] = [
  {
    id: 'FFM_ACA',
    name: 'CMS FFM ACA Certification',
    shortName: 'FFM ACA Cert',
    applicableFmo: 'PSM Brokerage',
    cost: 0,
    monthlyFeeDelta: 0,
    requiredRank: 1,
    description:
      'Mandatory annual CMS Federally-Facilitated Marketplace certification & HealthSherpa EDE linkage through PSM Brokerage.',
    unlocksText: 'Included at launch · Unlocks HealthSherpa ACA Marketplace clients',
    realWorldNote:
      '45 CFR §155.220 requires FFM registration, annual CMS training, and documented consumer consent before accessing any consumer Marketplace record.',
  },
  {
    id: 'AHIP_MEDICARE',
    name: 'AHIP Medicare & Senior Carrier Certs',
    shortName: 'AHIP Medicare',
    applicableFmo: 'PSM Brokerage',
    cost: 375,
    monthlyFeeDelta: 20,
    requiredRank: 1,
    description:
      'Annual AHIP Medicare + Fraud, Waste & Abuse exam plus PSM Brokerage senior carrier appointments inside SunFire Matrix.',
    unlocksText: 'Unlocks 65+ SunFire Medicare Advantage ($626 initial) & Medigap Plan G clients',
    realWorldNote:
      'CMS requires annual AHIP certification, carrier certification, and a 48-hour Scope of Appointment (SOA) prior to personal Medicare marketing meetings.',
  },
  {
    id: 'LIFE_CARRIERS',
    name: 'Florida Life & Private Health Carrier Appointments',
    shortName: 'Life Carriers',
    applicableFmo: 'Gordon Marketing',
    cost: 0,
    monthlyFeeDelta: 15,
    requiredRank: 1,
    description:
      'State of Florida DFS insurer appointments via Gordon Marketing for Term, Final Expense, and IUL inside iPipeline (XRAE + iGO).',
    unlocksText: 'Included at launch · Unlocks iPipeline Term, Whole Life & IUL sales',
    realWorldNote:
      'Florida DFS charges $60 per carrier appointment biennially (F.S. §624.501). You must hold an active appointment before soliciting for a carrier.',
  },
  {
    id: 'ANNUITY_CARRIERS',
    name: 'Annuity Appointments + Best Interest Cert',
    shortName: 'Annuity Cert',
    applicableFmo: 'Gordon Marketing',
    cost: 450,
    monthlyFeeDelta: 25,
    requiredRank: 1,
    description:
      'Completes NAIC/Florida 4-hour Annuity Suitability course plus Gordon Marketing carrier contracts inside Hexure FireLight for MYGAs and FIAs.',
    unlocksText: 'Unlocks $100k–$300k FireLight Annuity clients ($2,500–$12,600+ commissions)',
    realWorldNote:
      'F.S. §627.4554 mandates a 4-hour annuity suitability course plus product-specific carrier training BEFORE recommending any annuity in Florida.',
  },
  {
    id: 'SERIES_6_63',
    name: 'FINRA Series 6 & 63 + FL Variable Annuity',
    shortName: 'Series 6/63 VA',
    applicableFmo: 'Gordon Marketing (BD Partner)',
    cost: 1400,
    monthlyFeeDelta: 95,
    requiredRank: 2,
    description:
      'Broker-dealer registration & securities exams required alongside your 2-15 license to submit Variable Annuities in FireLight.',
    unlocksText: 'Unlocks High-Net-Worth Variable Annuity clients',
    realWorldNote:
      'Although a Florida 2-15 license covers Variable Annuities at the state level, federal/FINRA law prohibits selling variable contracts without Series 6/7 + 63/66.',
  },
  {
    id: 'EO_INCREASE',
    name: 'E&O Policy Boost ($2M Aggregate + Cyber Liability)',
    shortName: '$2M E&O Shield',
    applicableFmo: 'PSM Brokerage & Gordon Marketing',
    cost: 600,
    monthlyFeeDelta: 65,
    requiredRank: 1,
    description:
      'Upgrades Errors & Omissions coverage from $1M to $2M with CMS data-breach cyber coverage. Accepted by all PSM Brokerage & Gordon Marketing carriers.',
    unlocksText: '+10% Compliance Buffer & reduces fine severity by 35%',
    realWorldNote:
      'Most FMOs and A+ carriers mandate at least $1M/$1M E&O insurance before issuing your writing number.',
  },
];

export const AGENCY_UPGRADES: AgencyUpgradeDef[] = [
  {
    id: 'COASTAL_RENOVATION',
    category: 'OFFICE',
    name: 'Executive Coastal Suite Renovation',
    shortName: 'Coastal Suite',
    applicableFmo: 'Agency-Wide (PSM Brokerage & Gordon Marketing)',
    oneTimeCost: 1400,
    monthlyCost: 120,
    monthlyRevenueEstimate: 0,
    requiredRank: 1,
    description:
      'Transforms your startup office into a polished Florida coastal advisory suite with oak hardwood, palm decor, oceanfront window, and dual monitors.',
    gameplayBenefit: 'Upgrades live pixel office visuals & adds +8% reputation referral bonus on clean closes',
  },
  {
    id: 'COMPLIANCE_CSR',
    category: 'STAFF',
    name: 'Hire Licensed Compliance CSR (Elena)',
    shortName: 'Compliance CSR',
    applicableFmo: 'PSM Brokerage & Gordon Marketing Audits',
    oneTimeCost: 750,
    monthlyCost: 420,
    monthlyRevenueEstimate: 0,
    requiredRank: 1,
    description:
      'Adds a dedicated Florida 4-40/2-15 Compliance & Service Representative to your office floor who pre-audits your legal packets.',
    gameplayBenefit: 'Visibly works at Desk #2 & runs a free Pre-Stamp Form Check once per appointment to catch missing/decoy forms',
  },
  {
    id: 'JUNIOR_PRODUCER',
    category: 'STAFF',
    name: 'Hire Junior 2-15 Producer (Marcus)',
    shortName: 'Junior Producer',
    applicableFmo: 'PSM Brokerage (ACA/Senior) & Gordon Marketing (Life)',
    oneTimeCost: 1100,
    monthlyCost: 550,
    monthlyRevenueEstimate: 880,
    requiredRank: 2,
    description:
      'Recruits an apprentice 2-15 agent at Desk #3 writing ACA Marketplace, Senior & Simplified Term policies under your agency override.',
    gameplayBenefit: 'Visibly works at Desk #3 & generates +$880/mo gross override ($330/mo net profit after $550 base)',
  },
  {
    id: 'COMMUNITY_SEMINARS',
    category: 'MARKETING',
    name: 'Florida Retirement & Annuity Dinner Seminars',
    shortName: 'Retirement Seminars',
    applicableFmo: 'Gordon Marketing (Life/Annuity) & PSM Brokerage (Senior)',
    oneTimeCost: 600,
    monthlyCost: 350,
    monthlyRevenueEstimate: 650,
    requiredRank: 1,
    description:
      'Runs targeted local retirement workshops in Tampa/Sarasota/The Villages attracting pre-retirees with maturing CDs and 401(k) rollovers.',
    gameplayBenefit: '+12% Referral Commission Bonus on all Life, Annuity & Medicare closes',
  },
  {
    id: 'DIGITAL_FUNNEL',
    category: 'MARKETING',
    name: 'Florida ACA & Family Term Digital Funnel',
    shortName: 'Digital Lead Funnel',
    applicableFmo: 'PSM Brokerage (ACA) & Gordon Marketing (Life)',
    oneTimeCost: 500,
    monthlyCost: 280,
    monthlyRevenueEstimate: 420,
    requiredRank: 1,
    description:
      'Always-on Florida search & social funnel bringing high-intent ACA SEP and family protection inquiries into your agency.',
    gameplayBenefit: '+$150 Marketing Lead Bonus on clean ACA/Term closes & +$180/mo inbound residual trickle',
  },
];

export const BASE_MONTHLY_OVERHEAD = {
  officeRent: 650,
  eoBaseInsurance: 115,
  crmAndQuotingTools: 95,
  flDfsAppointmentReserve: 40,
};

export function getOverheadBreakdown(agency: Pick<AgencyState, 'unlockedCerts' | 'officeTier' | 'hiredStaff' | 'activeMarketing'>): {
  base: number;
  certs: number;
  renovation: number;
  staff: number;
  marketing: number;
  total: number;
} {
  const base =
    BASE_MONTHLY_OVERHEAD.officeRent +
    BASE_MONTHLY_OVERHEAD.eoBaseInsurance +
    BASE_MONTHLY_OVERHEAD.crmAndQuotingTools +
    BASE_MONTHLY_OVERHEAD.flDfsAppointmentReserve;
  const certs = CERTIFICATIONS.filter((c) => agency.unlockedCerts.includes(c.id)).reduce(
    (sum, c) => sum + c.monthlyFeeDelta,
    0
  );
  const renovation = agency.officeTier >= 2 ? 120 : 0;
  const staff = AGENCY_UPGRADES.filter(
    (u) => u.category === 'STAFF' && agency.hiredStaff.includes(u.id as AgencyState['hiredStaff'][number])
  ).reduce((sum, u) => sum + u.monthlyCost, 0);
  const marketing = AGENCY_UPGRADES.filter(
    (u) => u.category === 'MARKETING' && agency.activeMarketing.includes(u.id as AgencyState['activeMarketing'][number])
  ).reduce((sum, u) => sum + u.monthlyCost, 0);

  return {
    base,
    certs,
    renovation,
    staff,
    marketing,
    total: base + certs + renovation + staff + marketing,
  };
}

export function getTotalMonthlyOverhead(
  unlockedCerts: string[],
  officeTier: 1 | 2 = 1,
  hiredStaff: AgencyState['hiredStaff'] = [],
  activeMarketing: AgencyState['activeMarketing'] = []
): number {
  return getOverheadBreakdown({
    unlockedCerts: unlockedCerts as AgencyState['unlockedCerts'],
    officeTier,
    hiredStaff,
    activeMarketing,
  }).total;
}

export function getMonthlyPassiveAgencyRevenue(agency: Pick<AgencyState, 'hiredStaff' | 'activeMarketing'>): {
  staffProduction: number;
  marketingTrickle: number;
  total: number;
} {
  const staffProduction = agency.hiredStaff.includes('JUNIOR_PRODUCER') ? 880 : 0;
  const marketingTrickle = agency.activeMarketing.includes('DIGITAL_FUNNEL') ? 180 : 0;
  return {
    staffProduction,
    marketingTrickle,
    total: staffProduction + marketingTrickle,
  };
}

export function getAgentRank(totalCommissions: number): {
  level: number;
  title: string;
  nextThreshold: number | null;
} {
  if (totalCommissions >= 40000) {
    return { level: 4, title: 'Managing General Agent (MGA)', nextThreshold: null };
  }
  if (totalCommissions >= 18000) {
    return { level: 3, title: 'Senior 2-15 Broker', nextThreshold: 40000 };
  }
  if (totalCommissions >= 5500) {
    return { level: 2, title: 'Independent Agency Producer', nextThreshold: 18000 };
  }
  return { level: 1, title: 'Licensed Startup Agent', nextThreshold: 5500 };
}

export const FIELD_MANUAL_SECTIONS = {
  orderOfOps: [
    {
      line: 'ACA Marketplace (HealthCare.gov / FFM)',
      statute: '45 CFR §155.220 & 2026 FPL Rules',
      steps: [
        '1. Obtain documented Consumer Consent BEFORE accessing Marketplace records (log Agent NPN, scope, duration, signature).',
        '2. Verify Enrollment Period: OEP (Nov 1 – Jan 15) or qualifying SEP event within 60 days.',
        '3. Calculate Household MAGI vs. FPL: Florida did NOT expand Medicaid (<100% FPL falls in coverage gap). In 2026, the 400% FPL Subsidy Cliff returned ($62,600 single / $128,600 family of 4 = $0 APTC above 400% FPL!).',
        '4. Check Silver CSR eligibility (100–250% FPL) and Employer Coverage Affordability (~9.02% MAGI) before claiming APTC.',
        '5. Compare Bronze / Silver / Gold plans, verify PCP & Rx formulary, obtain Eligibility Review Attestation, and submit.',
      ],
    },
    {
      line: 'Life Insurance (Term / Whole Life / IUL)',
      statute: 'F.S. §626.99, §627.429 & Rule 69O-151',
      steps: [
        '1. Conduct DIME Needs Analysis (Debt, Income, Mortgage, Education) & verify affordable monthly budget.',
        '2. Check for Existing Policies: If replacing, complete Form OIR-B2-312 (Notice Regarding Replacement) & side-by-side comparison.',
        '3. Select product & underwriting risk class (Preferred Plus, Standard, Tobacco, Simplified Issue).',
        '4. Collect mandatory consents: Buyer’s Guide, HIPAA/MIB Authorization, HIV Informed Consent (F.S. §627.429 if lab/oral fluid), and Illustration Certification (for IUL).',
        '5. Deliver policy with Delivery Receipt & notify of Florida Free Look (14 days standard, 30 days on replacement).',
      ],
    },
    {
      line: 'Annuities (MYGA / FIA / Variable)',
      statute: 'F.S. §627.4554 & §626.99',
      steps: [
        '1. Complete Form DFS-H1-1980 (Suitability & Consumer Profile) BEFORE recommending any annuity.',
        '2. Verify Liquid Emergency Reserve (never lock away a client’s essential liquid cash) & Senior Protection (age 65+ heightened review).',
        '3. If replacing an existing annuity, complete Form DFS-H1-1981 (Disclosure & Comparison) and confirm net benefit outweighs surrender penalty.',
        '4. Set tax-preserving funding: 1035 Exchange (NQ annuity) or Direct Trustee-to-Trustee Rollover (IRA/401k) — never taxable cash-out.',
        '5. Deliver Annuity Buyer’s Guide, Contract Summary (Surrender Schedule, MVA, Caps), and Florida 21-Day Unconditional Refund Notice.',
      ],
    },
    {
      line: 'Medicare (Advantage MA-PD & Medigap)',
      statute: 'CMS 42 CFR §422.2264 & F.S. §627.674',
      steps: [
        '1. Confirm active AHIP Certification & Medicare Parts A + B entitlement.',
        '2. Obtain Scope of Appointment (SOA) at least 48 hours prior to planned personal marketing appointment (unless walk-in or final 4 days of enrollment).',
        '3. Compare Medigap (e.g. Plan G + Part D: higher monthly premium, nationwide doctors, low OOP) vs. MA-PD ($0 premium, network HMO/PPO, MOOP cap).',
        '4. Verify provider networks, Part D drug formulary tiers, and submit compliant enrollment with Summary of Benefits.',
      ],
    },
  ],
  commissions: [
    {
      product: 'ACA On-Exchange (Florida)',
      clientCost: '$0 – $480/mo net after APTC (varies by age, county, MAGI)',
      agentPay: '$20 – $26 PMPM (Per Member Per Month) residual',
      payoutTiming: 'As-earned monthly (no advance); stops immediately on cancellation',
    },
    {
      product: '20-Year Term Life',
      clientCost: '$25 – $140/mo depending on age, face amount & tobacco',
      agentPay: '75% – 85% of Year-1 Annualized Premium (FYC) + 2–3% renewals',
      payoutTiming: '75% (9-month) advance on issue; chargeback if cancelled < 9 mos',
    },
    {
      product: 'Whole Life / Final Expense',
      clientCost: '$45 – $130/mo for $10k–$25k permanent coverage',
      agentPay: '90% – 105% FYC + 3–5% renewals',
      payoutTiming: '75% advance on issue; simplified issue underwriting',
    },
    {
      product: 'Indexed Universal Life (IUL)',
      clientCost: '$250 – $1,200+/mo structured near MEC limit',
      agentPay: '85% – 95% of Target Premium (only 2–4% on excess premium)',
      payoutTiming: '75%–100% of Target advance; requires Illustration Certification',
    },
    {
      product: 'MYGA (5-Year Fixed Annuity)',
      clientCost: '$0 deducted from principal (100% goes to work)',
      agentPay: '2.25% – 2.75% of Single Premium paid by carrier',
      payoutTiming: 'Paid on policy issue & funds receipt; 21-day FL free look',
    },
    {
      product: 'FIA (10-Year Fixed Indexed Annuity)',
      clientCost: '$0 deducted from principal (optional rider fee 0.9–1.2% if elected)',
      agentPay: '5.5% – 6.5% of Single Premium paid by carrier',
      payoutTiming: 'Paid on issue; heightened FL 65+ suitability & 21-day free look',
    },
    {
      product: 'Medicare Advantage (MA-PD)',
      clientCost: '$0 – $45/mo (plus standard Part B premium)',
      agentPay: '~$626 Initial Year / ~$313 Annual Renewal (CMS max fair market)',
      payoutTiming: 'Paid on Jan 1 / effective date; chargeback if disenroll < 90 days',
    },
  ],
};
