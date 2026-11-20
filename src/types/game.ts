export type ProductLine = 'ACA' | 'LIFE' | 'ANNUITY' | 'MEDICARE';

export type GameScreenState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'MONTH_END' | 'GAME_OVER';

export type OfficePhase = 'ROAMING' | 'AT_DESK' | 'CELEBRATING';

export type WorkflowStage =
  | 'INTAKE'
  | 'COMPLIANCE_GATE'
  | 'CALCULATE_QUOTE'
  | 'APPLICATION_FORMS'
  | 'SETTLEMENT';

export type CertificationId =
  | 'FFM_ACA'
  | 'LIFE_CARRIERS'
  | 'ANNUITY_CARRIERS'
  | 'AHIP_MEDICARE'
  | 'SERIES_6_63'
  | 'EO_INCREASE';

export type StaffId = 'COMPLIANCE_CSR' | 'JUNIOR_PRODUCER';
export type MarketingId = 'COMMUNITY_SEMINARS' | 'DIGITAL_FUNNEL';
export type OfficeUpgradeId = 'COASTAL_RENOVATION';

export interface CertificationDef {
  id: CertificationId;
  name: string;
  shortName: string;
  applicableFmo: string;
  cost: number;
  monthlyFeeDelta: number;
  requiredRank: number;
  description: string;
  unlocksText: string;
  realWorldNote: string;
}

export interface AgencyUpgradeDef {
  id: StaffId | MarketingId | OfficeUpgradeId;
  category: 'OFFICE' | 'STAFF' | 'MARKETING';
  name: string;
  shortName: string;
  applicableFmo: string;
  oneTimeCost: number;
  monthlyCost: number;
  monthlyRevenueEstimate: number;
  requiredRank: number;
  description: string;
  gameplayBenefit: string;
}

export interface DiscoveryQuestion {
  id: string;
  label: string;
  questionText: string;
  answerText: string;
  orderIndex: number;
  isDecoy?: boolean;
  sequenceHint?: string;
  revealedFacts: Partial<ClientFactSheet>;
}

export interface ClientFactSheet {
  age?: number;
  county?: string;
  householdSize?: number;
  magiIncome?: number;
  taxFilingStatus?: string;
  employerCoverageOffer?: string;
  qualifyingLifeEvent?: string;
  medicaidOrKidCareEligible?: boolean;
  healthStatus?: string;
  tobaccoUse?: boolean;
  existingPolicies?: string;
  debtAndMortgage?: number;
  annualIncomeNeed?: number;
  dependentsCount?: number;
  liquidNetWorth?: number;
  emergencyReserveMonths?: number;
  timeHorizonYears?: number;
  riskTolerance?: string;
  fundsSource?: string;
  medicarePartsAB?: boolean;
  travelAndDoctorsNote?: string;
}

export interface ClientPreferenceProfile {
  primaryGoal: string;
  budgetTarget: string;
  benefitPriority: string;
  horizonOrNetwork: string;
}

export interface ComplianceStepOption {
  id: string;
  label: string;
  sublabel: string;
  statuteRef: string;
  orderIndex: number;
  explanation: string;
  isDecoy?: boolean;
}

export interface QuoteProductOption {
  id: string;
  title: string;
  carrier: string;
  category: ProductLine | 'REFERRAL_OR_DECLINE';
  monthlyPremium: number;
  singlePremium?: number;
  annualizedPremium: number;
  targetPremium?: number;
  deductibleOrSurrender: string;
  moopOrRate: string;
  commissionModel: 'PMPM' | 'FYC_ADVANCE' | 'SINGLE_PREMIUM' | 'MEDICARE_CMS' | 'NO_SALE';
  commissionRateLabel: string;
  estimatedUpfrontCash: number;
  estimatedMonthlyResidual: number;
  chargebackRiskMonths: number;
  isRecommended: boolean;
  isCompliant: boolean;
  preferenceMatch?: 'IDEAL' | 'PARTIAL' | 'MISMATCH';
  preferenceNote?: string;
  violationReason?: string;
  prosCons: string;
  fundingOptions?: {
    id: string;
    label: string;
    isOptimal: boolean;
    feedback: string;
  }[];
}

export interface LegalFormOption {
  id: string;
  code: string;
  title: string;
  statute: string;
  required: boolean;
  decoyReason?: string;
  summary: string;
}

export type ClientSpriteArchetype =
  | 'GIG_WORKER'
  | 'FAMILY_PARENT'
  | 'SENIOR_WOMAN'
  | 'SENIOR_MAN'
  | 'BUSINESS_OWNER'
  | 'RETIREE_COUPLE'
  | 'YOUNG_ADULT';

export interface ClientCase {
  id: string;
  name: string;
  age: number;
  county: string;
  productLine: ProductLine;
  requiresCert: CertificationId;
  requiresSeason?: 'OEP' | 'AEP' | 'ANY';
  sprite: ClientSpriteArchetype;
  shirtColor: string;
  hairColor: string;
  skinTone: string;
  hasGlasses?: boolean;
  openingGreeting: string;
  clientSituationSummary: string;
  difficulty: 'Standard' | 'Intermediate' | 'Advanced';
  clientPreferences?: ClientPreferenceProfile;
  discoveryQuestions: DiscoveryQuestion[];
  complianceSteps: ComplianceStepOption[];
  quoteOptions: QuoteProductOption[];
  legalForms: LegalFormOption[];
  idealTakeaway: string;
  realWorldMathNote: string;
  fplData?: {
    householdSize: number;
    magi: number;
    fpl100: number;
    fplPercent: number;
    slcspMonthly: number;
    expectedContributionMonthly: number;
    estimatedAptcMonthly: number;
    csrTier: 'None' | '94% AV (100-150% FPL)' | '87% AV (150-200% FPL)' | '73% AV (200-250% FPL)' | 'Medicaid Gap (<100% FPL)';
  };
  dimeData?: {
    debt: number;
    incomeReplacement: number;
    mortgage: number;
    education: number;
    totalNeed: number;
  };
}

export interface CompletedSaleRecord {
  caseId: string;
  clientName: string;
  productLine: ProductLine;
  chosenProductTitle: string;
  upfrontEarned: number;
  streakBonus?: number;
  marketingBonus?: number;
  monthlyResidualAdded: number;
  complianceDelta: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'CITATION';
  mistakes: string[];
  timestampMonth: number;
}

export interface AgencyState {
  agencyName: string;
  agentNpn: string;
  cash: number;
  month: number;
  dayInMonth: number;
  casesCompletedThisMonth: number;
  totalCasesCompleted: number;
  complianceScore: number;
  complianceStreak: number;
  reputation: number;
  monthlyResidualIncome: number;
  unlockedCerts: CertificationId[];
  officeTier: 1 | 2;
  hiredStaff: StaffId[];
  activeMarketing: MarketingId[];
  completedCaseIds: string[];
  salesHistory: CompletedSaleRecord[];
  totalGrossCommissions: number;
  totalOverheadPaid: number;
}
