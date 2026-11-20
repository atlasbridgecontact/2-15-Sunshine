import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Headphones,
  Laptop,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  UserCheck,
} from 'lucide-react';
import {
  ClientCase,
  ClientFactSheet,
  CompletedSaleRecord,
  MarketingId,
  QuoteProductOption,
  WorkflowStage,
} from '../types/game';
import { getPlatformStack } from '../data/floridaRegulations';
import { SnesOfficeCanvas } from './SnesOfficeCanvas';
import { snesAudio } from '../utils/sound';

interface DeskWorkflowProps {
  clientCase: ClientCase;
  hasEoShield: boolean;
  hasComplianceCsr: boolean;
  activeMarketing: MarketingId[];
  complianceStreak: number;
  onCompleteCase: (record: CompletedSaleRecord, netFinePaid: number) => void;
}

const STAGE_LABELS: { key: WorkflowStage; num: string; label: string }[] = [
  { key: 'INTAKE', num: '01', label: 'Fact-Finding' },
  { key: 'COMPLIANCE_GATE', num: '02', label: 'Compliance Gate' },
  { key: 'CALCULATE_QUOTE', num: '03', label: 'Math & Quote' },
  { key: 'APPLICATION_FORMS', num: '04', label: 'e-App & Forms' },
  { key: 'SETTLEMENT', num: '05', label: 'Settlement' },
];

export const DeskWorkflow: React.FC<DeskWorkflowProps> = ({
  clientCase,
  hasEoShield,
  hasComplianceCsr,
  activeMarketing,
  complianceStreak,
  onCompleteCase,
}) => {
  const platform = useMemo(() => getPlatformStack(clientCase.productLine), [clientCase.productLine]);

  const [stage, setStage] = useState<WorkflowStage>('INTAKE');
  const [askedIds, setAskedIds] = useState<string[]>([]);
  const [facts, setFacts] = useState<ClientFactSheet>({
    age: clientCase.age,
    county: clientCase.county,
  });
  const [dialogue, setDialogue] = useState<string>(clientCase.openingGreeting);
  const [mood, setMood] = useState<'neutral' | 'happy' | 'worried' | 'shocked'>('neutral');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [showFmoSupport, setShowFmoSupport] = useState<boolean>(false);
  const [mobileFactsOpen, setMobileFactsOpen] = useState<boolean>(false);

  // Stage 2: Compliance Gate state
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [auditAlert, setAuditAlert] = useState<string | null>(null);

  // Stage 3: Quoting state
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedFundingId, setSelectedFundingId] = useState<string | null>(null);

  // Stage 4: Forms + Portal Validation state
  const [checkedFormIds, setCheckedFormIds] = useState<string[]>([]);
  const [portalValidated, setPortalValidated] = useState<boolean>(false);
  const [csrUsed, setCsrUsed] = useState<boolean>(false);
  const [csrHint, setCsrHint] = useState<string | null>(null);

  // Running audit tracking
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [complianceDelta, setComplianceDelta] = useState<number>(0);
  const [finesIncurred, setFinesIncurred] = useState<number>(0);
  const [finalRecord, setFinalRecord] = useState<CompletedSaleRecord | null>(null);

  const shuffledDiscoveryQuestions = useMemo(() => {
    const arr = [...clientCase.discoveryQuestions];
    if (arr.length >= 4) {
      return [arr[1], arr[3], arr[0], arr[2], ...arr.slice(4)];
    }
    if (arr.length === 3) {
      return [arr[1], arr[2], arr[0]];
    }
    if (arr.length === 2) {
      return [arr[1], arr[0]];
    }
    return arr;
  }, [clientCase]);

  const requiredDiscoveryQuestions = useMemo(
    () =>
      clientCase.discoveryQuestions
        .filter((q) => q.orderIndex > 0)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [clientCase]
  );

  const shuffledComplianceSteps = useMemo(() => {
    const arr = [...clientCase.complianceSteps];
    if (arr.length >= 3) {
      return [arr[1], arr[arr.length - 1], arr[0], ...arr.slice(2, arr.length - 1)];
    }
    return arr;
  }, [clientCase]);

  const requiredComplianceSteps = useMemo(
    () =>
      clientCase.complianceSteps
        .filter((s) => s.orderIndex > 0)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [clientCase]
  );

  const fineMultiplier = hasEoShield ? 0.65 : 1;

  const recordPenalty = (reason: string, compLoss: number, baseFine: number) => {
    const actualFine = Math.round(baseFine * fineMultiplier);
    snesAudio.warning();
    setMood('shocked');
    setAuditAlert(`${reason} (-${compLoss}% Compliance · -$${actualFine} Audit Fine)`);
    setMistakes((prev) => (prev.includes(reason) ? prev : [...prev, reason]));
    setComplianceDelta((prev) => prev - compLoss);
    setFinesIncurred((prev) => prev + actualFine);
  };

  const handleAskQuestion = (qId: string) => {
    const q = clientCase.discoveryQuestions.find((item) => item.id === qId);
    if (!q || askedIds.includes(qId)) return;

    if (q.isDecoy || q.orderIndex < 0) {
      recordPenalty(
        `Premature intake question (${q.label}): ${q.sequenceHint || 'Complete foundational intake facts before pitching.'}`,
        4,
        75
      );
      setDialogue(q.answerText);
      return;
    }

    const expectedNext = requiredDiscoveryQuestions[askedIds.length];
    if (!expectedNext || q.orderIndex !== expectedNext.orderIndex) {
      recordPenalty(
        `Out-of-order fact-finding! Expected "${expectedNext?.label}" before "${q.label}".`,
        2,
        35
      );
      setDialogue(
        `Hold on — establish "${expectedNext?.label}" first. ${expectedNext?.sequenceHint || ''}`
      );
      return;
    }

    snesAudio.blip();
    setAgentSpeaking(true);
    setTimeout(() => setAgentSpeaking(false), 380);
    setAskedIds((prev) => [...prev, qId]);
    setFacts((prev) => ({ ...prev, ...q.revealedFacts }));
    setDialogue(q.answerText);
    setMood('happy');
    setAuditAlert(null);
  };

  const handleAdvanceToCompliance = () => {
    const missedCount = requiredDiscoveryQuestions.length - askedIds.length;
    if (missedCount > 0) {
      recordPenalty(
        `Complete all ${requiredDiscoveryQuestions.length} sequenced fact-finding questions before opening the compliance gate.`,
        4,
        75
      );
      return;
    }
    snesAudio.select();
    setAuditAlert(null);
    setStage('COMPLIANCE_GATE');
    setMood('neutral');
    setDialogue(
      `Inside ${platform.softwareName}, execute the mandatory regulatory steps in exact legal order before quoting.`
    );
  };

  const handleComplianceStepClick = (stepId: string) => {
    const step = clientCase.complianceSteps.find((s) => s.id === stepId);
    if (!step || completedStepIds.includes(stepId)) return;

    if (step.isDecoy || step.orderIndex < 0) {
      recordPenalty(`Invalid regulatory step (${step.label}): ${step.explanation}`, 8, 200);
      return;
    }

    const expectedNext = requiredComplianceSteps[completedStepIds.length];
    if (!expectedNext || step.id !== expectedNext.id) {
      recordPenalty(
        `Out-of-order compliance action! Expected "${expectedNext?.label}" (${expectedNext?.statuteRef}) before "${step.label}".`,
        6,
        150
      );
      return;
    }

    snesAudio.stamp();
    const nextDone = [...completedStepIds, step.id];
    setCompletedStepIds(nextDone);
    setAuditAlert(null);
    setMood('happy');
    setDialogue(`Verified (${step.statuteRef}): ${step.explanation}`);
  };

  const handleProceedToQuote = () => {
    snesAudio.pageTurn();
    setAuditAlert(null);
    setMood('neutral');
    setStage('CALCULATE_QUOTE');
    setDialogue(
      `Compare options inside ${platform.quoteToolLabel} and choose the most suitable, compliant plan.`
    );
  };

  const selectedQuote: QuoteProductOption | undefined = clientCase.quoteOptions.find(
    (q) => q.id === selectedQuoteId
  );

  const handleSelectQuote = (q: QuoteProductOption) => {
    snesAudio.select();
    setSelectedQuoteId(q.id);
    setSelectedFundingId(null);
    setAuditAlert(null);
  };

  const handleLockQuote = () => {
    if (!selectedQuote) return;

    if (!selectedQuote.isCompliant) {
      recordPenalty(selectedQuote.violationReason || 'Selected non-compliant product.', 14, 350);
      setDialogue(
        'Hold on! That option violates Florida / CMS regulations. Review the warning and choose a compliant product.'
      );
      return;
    }

    if (selectedQuote.fundingOptions && selectedQuote.fundingOptions.length > 0) {
      const chosenFund = selectedQuote.fundingOptions.find((f) => f.id === selectedFundingId);
      if (!chosenFund) {
        setAuditAlert('Select the funding/transfer method before opening the e-App packet.');
        snesAudio.blip();
        return;
      }
      if (!chosenFund.isOptimal) {
        recordPenalty(chosenFund.feedback, 10, 250);
        setDialogue(chosenFund.feedback);
        return;
      }
    }

    if (selectedQuote.preferenceMatch === 'MISMATCH') {
      recordPenalty(
        `Client Preference Mismatch (${selectedQuote.title}): ${
          selectedQuote.preferenceNote ||
          selectedQuote.violationReason ||
          'Does not satisfy the client’s stated goals or budget.'
        }`,
        6,
        90
      );
      setDialogue(
        `Hold on! ${
          selectedQuote.preferenceNote ||
          selectedQuote.violationReason ||
          'Review the Client Preference Scorecard and pick the option that matches their priorities.'
        }`
      );
      return;
    }

    if (
      selectedQuote.preferenceMatch === 'PARTIAL' ||
      (!selectedQuote.isRecommended && selectedQuote.violationReason)
    ) {
      recordPenalty(
        selectedQuote.preferenceNote ||
          selectedQuote.violationReason ||
          'Suboptimal match against client preference profile.',
        4,
        60
      );
    } else {
      snesAudio.select();
      setAuditAlert(null);
    }

    setPortalValidated(false);
    setStage('APPLICATION_FORMS');
    setMood('neutral');
    setDialogue(
      `Attach ONLY the mandatory Florida DFS / CMS documents inside ${platform.softwareName}, run validation, and e-Sign.`
    );
  };

  const handleToggleForm = (formId: string) => {
    snesAudio.blip();
    setPortalValidated(false);
    setCheckedFormIds((prev) =>
      prev.includes(formId) ? prev.filter((id) => id !== formId) : [...prev, formId]
    );
  };

  const handleCsrPreCheck = () => {
    if (!hasComplianceCsr || csrUsed) return;
    snesAudio.select();
    setCsrUsed(true);
    const missing = clientCase.legalForms.filter((f) => f.required && !checkedFormIds.includes(f.id));
    const decoys = clientCase.legalForms.filter((f) => !f.required && checkedFormIds.includes(f.id));

    if (missing.length === 0 && decoys.length === 0) {
      setCsrHint('CSR Elena: Packet looks spotless! All mandatory forms attached and zero decoys.');
    } else {
      const notes: string[] = [];
      if (missing.length > 0) {
        notes.push(`Missing required: ${missing.map((m) => m.code).join(', ')}`);
      }
      if (decoys.length > 0) {
        notes.push(`Remove inapplicable decoy: ${decoys.map((d) => d.code).join(', ')}`);
      }
      setCsrHint(`CSR Elena Pre-Check: ${notes.join(' · ')}`);
    }
  };

  const handleRunPortalValidation = () => {
    snesAudio.stamp();
    setPortalValidated(true);
  };

  const handleSubmitForms = () => {
    if (!selectedQuote) return;

    const missingRequired = clientCase.legalForms.filter(
      (f) => f.required && !checkedFormIds.includes(f.id)
    );
    const extraDecoys = clientCase.legalForms.filter(
      (f) => !f.required && checkedFormIds.includes(f.id)
    );

    let stepCompLoss = 0;
    let stepFine = 0;
    const newMistakes: string[] = [];

    if (!portalValidated) {
      stepCompLoss += 3;
      stepFine += Math.round(50 * fineMultiplier);
      newMistakes.push(`Submitted without running ${platform.softwareName} pre-signature IGO validation lock.`);
    }

    missingRequired.forEach((f) => {
      stepCompLoss += 5;
      stepFine += Math.round(75 * fineMultiplier);
      newMistakes.push(`Missing mandatory form ${f.code} (${f.title}).`);
    });

    extraDecoys.forEach((f) => {
      stepCompLoss += 3;
      stepFine += Math.round(40 * fineMultiplier);
      newMistakes.push(`Attached inapplicable form ${f.code}: ${f.decoyReason}`);
    });

    const totalMistakes = [...mistakes, ...newMistakes];
    let finalCompDelta = complianceDelta - stepCompLoss;
    const totalFines = finesIncurred + stepFine;

    const isClean = totalMistakes.length === 0;
    if (isClean) {
      finalCompDelta += selectedQuote.category === 'REFERRAL_OR_DECLINE' ? 6 : 2;
      snesAudio.fanfare();
    } else {
      snesAudio.stamp();
    }

    let streakBonus = 0;
    if (isClean && complianceStreak >= 2 && selectedQuote.estimatedUpfrontCash > 0) {
      streakBonus = Math.round(selectedQuote.estimatedUpfrontCash * 0.1);
    }

    let marketingBonus = 0;
    if (selectedQuote.estimatedUpfrontCash > 0) {
      if (
        activeMarketing.includes('COMMUNITY_SEMINARS') &&
        (clientCase.productLine === 'ANNUITY' ||
          clientCase.productLine === 'LIFE' ||
          clientCase.productLine === 'MEDICARE')
      ) {
        marketingBonus += Math.round(selectedQuote.estimatedUpfrontCash * 0.12);
      }
      if (
        isClean &&
        activeMarketing.includes('DIGITAL_FUNNEL') &&
        (clientCase.productLine === 'ACA' || clientCase.productLine === 'LIFE')
      ) {
        marketingBonus += 150;
      }
    }

    let grade: CompletedSaleRecord['grade'] = 'A+';
    if (isClean) grade = 'A+';
    else if (finalCompDelta >= -5) grade = 'A';
    else if (finalCompDelta >= -12) grade = 'B';
    else if (finalCompDelta >= -20) grade = 'C';
    else grade = 'CITATION';

    const record: CompletedSaleRecord = {
      caseId: clientCase.id,
      clientName: clientCase.name,
      productLine: clientCase.productLine,
      chosenProductTitle: selectedQuote.title,
      upfrontEarned: selectedQuote.estimatedUpfrontCash,
      streakBonus,
      marketingBonus,
      monthlyResidualAdded: selectedQuote.estimatedMonthlyResidual,
      complianceDelta: finalCompDelta,
      grade,
      mistakes: totalMistakes,
      timestampMonth: 0,
    };

    setMistakes(totalMistakes);
    setComplianceDelta(finalCompDelta);
    setFinesIncurred(totalFines);
    setFinalRecord(record);
    setMood(isClean ? 'happy' : 'worried');
    setDialogue(
      isClean
        ? 'Thank you! Everything was explained clearly, signed cleanly in the portal, and I feel completely confident.'
        : 'Wait—it looks like there were a few compliance or NIGO errors flagged during review.'
    );
    setStage('SETTLEMENT');
  };

  const allDiscoveryDone = askedIds.length === requiredDiscoveryQuestions.length;
  const nextDiscoveryStep = requiredDiscoveryQuestions[askedIds.length];
  const allComplianceDone = completedStepIds.length === requiredComplianceSteps.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:h-full min-h-0">
      {/* LEFT STAGE: 16-bit Pixel Desk + RPG Dialog + Client Fact Sheet */}
      <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
        <div className="snes-frame relative overflow-hidden">
          <div className="aspect-[400/170] w-full bg-[#111b24] relative">
            <SnesOfficeCanvas
              mode="DESK"
              client={clientCase}
              clientMood={mood}
              agentSpeaking={agentSpeaking}
            />
            <div className="absolute inset-0 crt-scanlines" />
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
              <div className="bg-[#0f1722]/95 border border-[#d9cbb8] px-2.5 py-1 text-xs font-mono-tabular font-semibold text-[#f4efe6] truncate">
                {clientCase.name} · Age {clientCase.age} · {clientCase.productLine}
              </div>
              <div className="bg-[#0f1722]/95 border border-[#59c3b4] px-2 py-1 text-xs font-mono-tabular font-semibold text-[#59c3b4] shrink-0">
                {clientCase.difficulty}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex bg-[#102538] border-t-2 border-[#d9cbb8] px-4 py-3.5 min-h-[86px] items-start gap-3">
            <MessageSquare className="w-4 h-4 text-[#e09f3e] shrink-0 mt-1" />
            <p className="text-sm text-[#f4efe6] leading-relaxed">{dialogue}</p>
          </div>
        </div>

        <div className="snes-frame-paper p-3.5 sm:p-4 lg:flex-1 lg:overflow-y-auto space-y-3">
          <button
            type="button"
            onClick={() => setMobileFactsOpen((prev) => !prev)}
            className="lg:hidden w-full min-h-[44px] flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div>
              <div className="font-bold text-sm tracking-wide text-[#1b2530]">
                CLIENT FACT SHEET · {askedIds.length}/{requiredDiscoveryQuestions.length} FACTS
              </div>
              <div className="text-xs text-[#5b6978] font-mono-tabular">
                {clientCase.county} · Tap to {mobileFactsOpen ? 'hide' : 'view details'}
              </div>
            </div>
            {mobileFactsOpen ? (
              <ChevronUp className="w-5 h-5 text-[#1b2530] shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#1b2530] shrink-0" />
            )}
          </button>

          <div className="hidden lg:flex items-center justify-between border-b border-[#cbbda8] pb-2">
            <h3 className="font-bold text-sm tracking-wide text-[#1b2530]">CLIENT FACT SHEET</h3>
            <span className="font-mono-tabular text-xs font-semibold text-[#5b6978]">
              {clientCase.county}
            </span>
          </div>

          <div className={`${mobileFactsOpen ? 'block pt-2 border-t border-[#cbbda8] lg:pt-0 lg:border-t-0' : 'hidden lg:block'} space-y-3`}>
            <p className="text-xs text-[#334155] leading-relaxed">
              {clientCase.clientSituationSummary}
            </p>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs pt-1">
            <div>
              <div className="text-xs text-[#5b6978]">Age / Status</div>
              <div className="font-mono-tabular font-semibold text-[#1b2530]">
                {facts.age ?? '—'} yrs {facts.taxFilingStatus ? `· ${facts.taxFilingStatus}` : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#5b6978]">Household / Dependents</div>
              <div className="font-mono-tabular font-semibold text-[#1b2530]">
                {facts.householdSize !== undefined
                  ? `${facts.householdSize} person(s)`
                  : facts.dependentsCount !== undefined
                  ? `${facts.dependentsCount} dependents`
                  : 'Ask client'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#5b6978]">Income / MAGI</div>
              <div className="font-mono-tabular font-semibold text-[#0d7a6f]">
                {facts.magiIncome !== undefined
                  ? `$${facts.magiIncome.toLocaleString()}/yr`
                  : facts.annualIncomeNeed !== undefined
                  ? `$${facts.annualIncomeNeed.toLocaleString()}/yr`
                  : 'Ask client'}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#5b6978]">Liquid Reserve / Net</div>
              <div className="font-mono-tabular font-semibold text-[#1b2530]">
                {facts.liquidNetWorth !== undefined
                  ? `$${facts.liquidNetWorth.toLocaleString()}`
                  : facts.debtAndMortgage !== undefined
                  ? `Debt $${facts.debtAndMortgage.toLocaleString()}`
                  : '—'}
              </div>
            </div>
            {facts.healthStatus && (
              <div className="col-span-2">
                <div className="text-xs text-[#5b6978]">Health &amp; Tobacco</div>
                <div className="font-semibold text-[#1b2530]">{facts.healthStatus}</div>
              </div>
            )}
            {facts.qualifyingLifeEvent && (
              <div className="col-span-2">
                <div className="text-xs text-[#5b6978]">Enrollment Window / Event</div>
                <div className="font-semibold text-[#0d7a6f]">{facts.qualifyingLifeEvent}</div>
              </div>
            )}
            {facts.employerCoverageOffer && (
              <div className="col-span-2">
                <div className="text-xs text-[#5b6978]">Employer / Other Coverage</div>
                <div className="font-semibold text-[#1b2530]">{facts.employerCoverageOffer}</div>
              </div>
            )}
            {facts.existingPolicies && (
              <div className="col-span-2">
                <div className="text-xs text-[#5b6978]">Existing Policies</div>
                <div className="font-semibold text-[#9a3412]">{facts.existingPolicies}</div>
              </div>
            )}
            {facts.fundsSource && (
              <div className="col-span-2">
                <div className="text-xs text-[#5b6978]">Source of Funds &amp; Horizon</div>
                <div className="font-semibold text-[#1b2530]">
                  {facts.fundsSource}
                  {facts.timeHorizonYears ? ` · ${facts.timeHorizonYears} yr horizon` : ''}
                </div>
              </div>
            )}
            {facts.travelAndDoctorsNote && (
              <div className="col-span-2">
                <div className="text-xs text-[#5b6978]">Providers, Rx &amp; Medicare Parts</div>
                <div className="font-semibold text-[#1b2530]">
                  {facts.medicarePartsAB ? 'Parts A & B Active · ' : ''}
                  {facts.travelAndDoctorsNote}
                </div>
              </div>
            )}
          </div>

          {allDiscoveryDone && clientCase.clientPreferences && (
            <div className="pt-2.5 border-t border-[#cbbda8] space-y-1 text-xs">
              <div className="font-mono-tabular font-bold text-[#0d7a6f]">
                CLIENT PREFERENCE SUMMARY
              </div>
              <div className="text-[#1b2530]">
                <strong>Goal:</strong> {clientCase.clientPreferences.primaryGoal}
              </div>
              <div className="text-[#475569] font-mono-tabular">
                Budget: {clientCase.clientPreferences.budgetTarget}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* RIGHT WORKSPACE: Branded Software Portal & FMO Support */}
      <div className="lg:col-span-7 snes-frame-paper flex flex-col min-h-0 lg:overflow-hidden">
        {/* Software Portal + Assigned FMO Top Banner */}
        <div
          style={{ backgroundColor: platform.accentHex }}
          className="text-white px-3.5 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#1b2838]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Laptop className="w-4 h-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold leading-tight truncate">{platform.softwareName}</div>
              <div className="text-xs opacity-90 truncate">{platform.fmoPortal}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              snesAudio.select();
              setShowFmoSupport((prev) => !prev);
            }}
            className="bg-[#0f1722]/90 hover:bg-[#0f1722] text-[#f4efe6] border border-[#f4efe6] px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer w-full sm:w-auto"
          >
            <Headphones className="w-3.5 h-3.5 text-[#e09f3e]" />
            <span>{platform.fmoName} Case Support</span>
          </button>
        </div>

        {/* Collapsible FMO Support Desk Drawer */}
        {showFmoSupport && (
          <div className="bg-[#fffbeb] border-b border-[#d97706] px-3.5 sm:px-4 py-3 text-xs text-[#1b2530] space-y-1">
            <div className="font-bold text-[#92400e]">{platform.fmoSupportTitle}</div>
            <p className="leading-relaxed">{platform.fmoSupportSummary}</p>
          </div>
        )}

        {/* Stage Progress Bar */}
        <div className="bg-[#1b2838] text-[#f4efe6] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto border-b-2 border-[#3c4b5c]">
          {STAGE_LABELS.map((s) => {
            const active = stage === s.key;
            const currentIdx = STAGE_LABELS.findIndex((x) => x.key === stage);
            const itemIdx = STAGE_LABELS.findIndex((x) => x.key === s.key);
            const done = itemIdx < currentIdx;

            return (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0 px-2.5 py-1 ${
                  active
                    ? 'bg-[#0d7a6f] text-[#f4efe6] font-bold'
                    : done
                    ? 'text-[#59c3b4] font-semibold'
                    : 'text-[#94a3b8]'
                }`}
              >
                <span className="font-mono-tabular">{s.num}.</span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Mobile Live Client Dialogue Strip (keeps client replies visible while interacting below) */}
        <div className="lg:hidden bg-[#102538] text-[#f4efe6] px-3.5 py-2.5 border-b border-[#3c4b5c] flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-[#e09f3e] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm leading-relaxed">{dialogue}</p>
        </div>

        {auditAlert && (
          <div className="bg-[#991b1b] text-white px-3.5 sm:px-4 py-2.5 text-xs flex items-start gap-2 border-b border-[#7f1d1d]">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#fde047]" />
            <div>
              <strong>AUDIT WARNING:</strong> {auditAlert}
            </div>
          </div>
        )}

        <div className="p-3.5 sm:p-5 flex-1 lg:overflow-y-auto space-y-4">
          {stage === 'INTAKE' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono-tabular font-semibold text-[#0d7a6f]">
                  {platform.intakeToolLabel}
                </div>
                <h2 className="font-bold text-base text-[#1b2530] mt-0.5">
                  Step 1: Sequenced Intake &amp; Fact-Finding
                </h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Select the proper diagnostic questions in order inside {platform.softwareName} and avoid premature traps ({askedIds.length}/{requiredDiscoveryQuestions.length} completed).
                </p>
              </div>

              <div
                className={`p-3.5 border text-xs space-y-1 ${
                  allDiscoveryDone
                    ? 'bg-[#ecfdf5] border-[#0d7a6f] text-[#065f46]'
                    : 'bg-[#102538] border-[#59c3b4] text-[#f4efe6]'
                }`}
              >
                <div className="font-mono-tabular font-bold flex items-center gap-2">
                  {allDiscoveryDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        DISCOVERY OBJECTIVE COMPLETE · ALL {requiredDiscoveryQuestions.length} FACTS VERIFIED
                      </span>
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 shrink-0 text-[#e09f3e]" />
                      <span className="text-[#59c3b4]">
                        CURRENT OBJECTIVE ({askedIds.length + 1} OF {requiredDiscoveryQuestions.length})
                      </span>
                    </>
                  )}
                </div>
                <p className="leading-relaxed">
                  {allDiscoveryDone
                    ? 'Intake sequence passed cleanly. Client preferences and suitability baseline are now unlocked for the Compliance Gate.'
                    : nextDiscoveryStep?.sequenceHint ||
                      `Ask step ${askedIds.length + 1} of ${requiredDiscoveryQuestions.length} in proper diagnostic order.`}
                </p>
              </div>

              <div className="space-y-2.5">
                {shuffledDiscoveryQuestions.map((q) => {
                  const doneIdx = askedIds.indexOf(q.id);
                  const asked = doneIdx !== -1;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      disabled={asked}
                      onClick={() => handleAskQuestion(q.id)}
                      className={`w-full text-left p-3.5 border transition-colors flex items-start justify-between gap-3 ${
                        asked
                          ? 'bg-[#e6f4f1] border-[#0d7a6f] text-[#1b2530] cursor-default'
                          : 'bg-white border-[#cbbda8] hover:border-[#0d7a6f] text-[#1b2530] cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-bold">{q.label}</div>
                        <div className="text-xs text-[#334155]">“{q.questionText}”</div>
                      </div>
                      <span className="font-mono-tabular text-xs font-bold shrink-0 text-[#0d7a6f]">
                        {asked ? `STEP ${doneIdx + 1} OK` : 'ASK'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#d9cbb8]">
                <span className="text-xs font-mono-tabular text-[#475569]">
                  {allDiscoveryDone
                    ? 'Sequenced discovery verified.'
                    : `Next required: Discovery Step ${askedIds.length + 1} of ${requiredDiscoveryQuestions.length}`}
                </span>
                <button
                  type="button"
                  disabled={!allDiscoveryDone}
                  onClick={handleAdvanceToCompliance}
                  className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-5 py-2.5 min-h-[44px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Proceed to Compliance Gate</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {stage === 'COMPLIANCE_GATE' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-mono-tabular font-semibold text-[#0d7a6f]">
                  {platform.complianceToolLabel}
                </div>
                <h2 className="font-bold text-base text-[#1b2530] mt-0.5">
                  Step 2: Mandatory Florida / CMS Order of Operations
                </h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Click the required pre-quote compliance actions in exact legal sequence ({completedStepIds.length}/{requiredComplianceSteps.length} completed).
                </p>
              </div>

              <div className="space-y-2.5">
                {shuffledComplianceSteps.map((step) => {
                  const doneIdx = completedStepIds.indexOf(step.id);
                  const isDone = doneIdx !== -1;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      disabled={isDone}
                      onClick={() => handleComplianceStepClick(step.id)}
                      className={`w-full text-left p-3.5 border transition-colors flex items-start justify-between gap-3 ${
                        isDone
                          ? 'bg-[#e6f4f1] border-[#0d7a6f] cursor-default'
                          : 'bg-white border-[#cbbda8] hover:border-[#1b2838] cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#1b2530]">{step.label}</span>
                          <span className="font-mono-tabular text-xs text-[#0d7a6f] font-semibold">
                            {step.statuteRef}
                          </span>
                        </div>
                        <div className="text-xs text-[#334155]">{step.sublabel}</div>
                      </div>
                      <span className="font-mono-tabular text-xs font-bold shrink-0 text-[#0d7a6f]">
                        {isDone ? `STEP ${doneIdx + 1} OK` : 'EXECUTE'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#d9cbb8]">
                <span className="text-xs font-mono-tabular text-[#475569]">
                  {allComplianceDone
                    ? 'All pre-quote regulatory gates cleared.'
                    : `Next required: Step ${completedStepIds.length + 1} of ${requiredComplianceSteps.length}`}
                </span>
                <button
                  type="button"
                  disabled={!allComplianceDone}
                  onClick={handleProceedToQuote}
                  className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-5 py-2.5 min-h-[44px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Launch {platform.softwareName} Quoter</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {stage === 'CALCULATE_QUOTE' && (
            <div className="space-y-4">
              {clientCase.fplData && (
                <div className="bg-[#1b2838] text-[#f4efe6] p-4 border border-[#3c4b5c] space-y-2">
                  <div className="text-xs font-mono-tabular font-bold text-[#59c3b4]">
                    HEALTHSHERPA 2026 FPL &amp; APTC WORKSHEET
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-tabular">
                    <div>
                      <div className="text-[#94a3b8]">MAGI / 100% FPL</div>
                      <div className="font-bold text-sm">
                        ${clientCase.fplData.magi.toLocaleString()} / $
                        {clientCase.fplData.fpl100.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8]">FPL Ratio</div>
                      <div className="font-bold text-sm text-[#e09f3e]">
                        {clientCase.fplData.fplPercent}% FPL
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8]">Est. APTC Subsidy</div>
                      <div className="font-bold text-sm text-[#59c3b4]">
                        ${clientCase.fplData.estimatedAptcMonthly}/mo
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8]">CSR Tier</div>
                      <div className="font-bold text-sm">{clientCase.fplData.csrTier}</div>
                    </div>
                  </div>
                </div>
              )}

              {clientCase.dimeData && (
                <div className="bg-[#1b2838] text-[#f4efe6] p-4 border border-[#3c4b5c] space-y-2">
                  <div className="text-xs font-mono-tabular font-bold text-[#59c3b4]">
                    IPIPELINE DIME NEEDS ANALYSIS WORKSHEET
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono-tabular">
                    <div>
                      <div className="text-[#94a3b8]">Debt</div>
                      <div className="font-bold text-sm">
                        ${clientCase.dimeData.debt.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8]">Income Repl.</div>
                      <div className="font-bold text-sm">
                        ${clientCase.dimeData.incomeReplacement.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8]">Mortgage</div>
                      <div className="font-bold text-sm">
                        ${clientCase.dimeData.mortgage.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#94a3b8]">Education</div>
                      <div className="font-bold text-sm">
                        ${clientCase.dimeData.education.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#e09f3e]">Total Need</div>
                      <div className="font-bold text-sm text-[#e09f3e]">
                        ${clientCase.dimeData.totalNeed.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {clientCase.clientPreferences && (
                <div className="bg-[#102538] text-[#f4efe6] p-4 border border-[#59c3b4] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono-tabular font-bold text-[#59c3b4] flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-[#e09f3e]" />
                      <span>CLIENT PREFERENCE SCORECARD · MATCH BEST FIT</span>
                    </div>
                    <span className="text-xs font-mono-tabular text-[#cbd5e1]">
                      {clientCase.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#0f1722]/70 border border-[#334155] p-2.5">
                      <div className="text-[#94a3b8] font-mono-tabular">Primary Goal</div>
                      <div className="font-semibold text-[#f4efe6] mt-0.5">
                        {clientCase.clientPreferences.primaryGoal}
                      </div>
                    </div>
                    <div className="bg-[#0f1722]/70 border border-[#334155] p-2.5">
                      <div className="text-[#94a3b8] font-mono-tabular">Budget Target</div>
                      <div className="font-semibold text-[#e09f3e] mt-0.5">
                        {clientCase.clientPreferences.budgetTarget}
                      </div>
                    </div>
                    <div className="bg-[#0f1722]/70 border border-[#334155] p-2.5">
                      <div className="text-[#94a3b8] font-mono-tabular">Benefit Priority</div>
                      <div className="font-semibold text-[#f4efe6] mt-0.5">
                        {clientCase.clientPreferences.benefitPriority}
                      </div>
                    </div>
                    <div className="bg-[#0f1722]/70 border border-[#334155] p-2.5">
                      <div className="text-[#94a3b8] font-mono-tabular">Horizon / Network</div>
                      <div className="font-semibold text-[#59c3b4] mt-0.5">
                        {clientCase.clientPreferences.horizonOrNetwork}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-mono-tabular font-semibold text-[#0d7a6f]">
                  {platform.quoteToolLabel}
                </div>
                <h2 className="font-bold text-base text-[#1b2530] mt-0.5">
                  Step 3: Match Client Preferences &amp; Select Product
                </h2>
                <p className="text-xs text-[#475569]">
                  Evaluate each plan’s cost, deductible/surrender terms, and benefits directly against the Client Preference Scorecard—not agent commission size.
                </p>
              </div>

              <div className="space-y-2.5">
                {clientCase.quoteOptions.map((q) => {
                  const selected = selectedQuoteId === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleSelectQuote(q)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectQuote(q);
                        }
                      }}
                      className={`p-4 border cursor-pointer transition-colors space-y-2 ${
                        selected
                          ? 'bg-[#e6f4f1] border-[#0d7a6f] ring-1 ring-[#0d7a6f]'
                          : 'bg-white border-[#cbbda8] hover:border-[#1b2838]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[#1b2530]">{q.title}</div>
                          <div className="text-xs text-[#475569]">{q.carrier}</div>
                        </div>
                        <div className="text-right font-mono-tabular">
                          <div className="font-bold text-sm text-[#1b2530]">
                            {q.singlePremium
                              ? `$${q.singlePremium.toLocaleString()} Single Prem`
                              : q.monthlyPremium > 0
                              ? `$${q.monthlyPremium}/mo`
                              : '$0/mo Net'}
                          </div>
                          <div className="text-xs font-semibold text-[#0d7a6f]">
                            Agent: {q.commissionRateLabel}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-tabular bg-[#f8f5ef] p-2.5 border border-[#e6dfd2]">
                        <div>{q.deductibleOrSurrender}</div>
                        <div>{q.moopOrRate}</div>
                      </div>

                      <p className="text-xs text-[#334155] leading-relaxed">{q.prosCons}</p>
                    </div>
                  );
                })}
              </div>

              {selectedQuote?.fundingOptions && (
                <div className="bg-[#fffbeb] border border-[#d97706] p-3.5 space-y-2">
                  <div className="text-xs font-bold text-[#92400e]">
                    FireLight Required: Select Funds Transfer / Tax Method
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedQuote.fundingOptions.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          snesAudio.blip();
                          setSelectedFundingId(f.id);
                          setAuditAlert(null);
                        }}
                        className={`p-2.5 text-left text-xs border cursor-pointer ${
                          selectedFundingId === f.id
                            ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838] font-semibold'
                            : 'bg-white text-[#1b2530] border-[#d9cbb8]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedQuote && clientCase.clientPreferences && (
                <div className="bg-[#f8f5ef] border border-[#1b2838] p-3.5 text-xs space-y-1.5">
                  <div className="font-mono-tabular font-bold text-[#1b2530]">
                    SCORECARD COMPARISON: {selectedQuote.title}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#334155]">
                    <div>
                      <span className="text-[#5b6978]">Selected Cost:</span>{' '}
                      <strong className="font-mono-tabular text-[#1b2530]">
                        {selectedQuote.singlePremium
                          ? `$${selectedQuote.singlePremium.toLocaleString()} Single Prem`
                          : `$${selectedQuote.monthlyPremium}/mo`}
                      </strong>{' '}
                      <span className="text-[#5b6978]">
                        (Target: {clientCase.clientPreferences.budgetTarget})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5b6978]">Selected Structure:</span>{' '}
                      <strong className="font-mono-tabular text-[#1b2530]">
                        {selectedQuote.deductibleOrSurrender}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-[#d9cbb8]">
                <button
                  type="button"
                  disabled={!selectedQuote}
                  onClick={handleLockQuote}
                  className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-5 py-2.5 min-h-[44px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Open {platform.softwareName} e-App</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {stage === 'APPLICATION_FORMS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono-tabular font-semibold text-[#0d7a6f]">
                    {platform.softwareName} · {platform.fmoName}
                  </div>
                  <h2 className="font-bold text-base text-[#1b2530] mt-0.5">
                    Step 4: Legal Forms, Validation Lock &amp; Submission
                  </h2>
                  <p className="text-xs text-[#475569]">
                    Check every required form for this transaction, run portal validation, and submit.
                  </p>
                </div>

                {hasComplianceCsr && (
                  <button
                    type="button"
                    disabled={csrUsed}
                    onClick={handleCsrPreCheck}
                    className="snes-btn bg-[#10383a] text-[#59c3b4] px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{csrUsed ? 'CSR Audit Done' : 'CSR Elena Pre-Check'}</span>
                  </button>
                )}
              </div>

              {csrHint && (
                <div className="bg-[#e6f4f1] border border-[#0d7a6f] p-3 text-xs text-[#065f46] font-semibold">
                  {csrHint}
                </div>
              )}

              <div className="space-y-2">
                {clientCase.legalForms.map((form) => {
                  const checked = checkedFormIds.includes(form.id);
                  return (
                    <button
                      key={form.id}
                      type="button"
                      onClick={() => handleToggleForm(form.id)}
                      className={`w-full text-left p-3.5 border flex items-start gap-3 cursor-pointer ${
                        checked
                          ? 'bg-[#e6f4f1] border-[#0d7a6f]'
                          : 'bg-white border-[#cbbda8] hover:border-[#1b2838]'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-[#0d7a6f] shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-[#5b6978] shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular text-xs font-bold text-[#0d7a6f]">
                            {form.code}
                          </span>
                          <span className="font-bold text-sm text-[#1b2530]">{form.title}</span>
                          <span className="font-mono-tabular text-xs text-[#5b6978]">
                            · {form.statute}
                          </span>
                        </div>
                        <p className="text-xs text-[#334155]">{form.summary}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Interactive Software Validation Lock Step */}
              <div className="bg-[#f8f5ef] border border-[#cbbda8] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[#1b2530]">
                  <strong>Portal Status:</strong>{' '}
                  {portalValidated ? (
                    <span className="text-[#0d7a6f] font-bold">
                      In Good Order (IGO) · Ready for Signature
                    </span>
                  ) : (
                    <span className="text-[#9a3412] font-semibold">
                      Validation Lock Required before Submission
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={portalValidated}
                  onClick={handleRunPortalValidation}
                  className="snes-btn bg-[#1b2838] text-[#59c3b4] px-3.5 py-2 min-h-[44px] w-full sm:w-auto text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  {portalValidated ? 'IGO Validated' : 'Run Portal IGO Check'}
                </button>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#d9cbb8]">
                <span className="text-xs font-mono-tabular text-[#475569]">
                  Selected: {checkedFormIds.length} document(s)
                </span>
                <button
                  type="button"
                  onClick={handleSubmitForms}
                  className="snes-btn bg-[#e09f3e] hover:bg-[#eab054] text-[#1b2530] px-5 py-2.5 min-h-[44px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>{platform.submitActionLabel}</span>
                </button>
              </div>
            </div>
          )}

          {stage === 'SETTLEMENT' && finalRecord && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#1b2838] pb-3">
                <div>
                  <div className="text-xs font-mono-tabular font-bold text-[#0d7a6f]">
                    {platform.softwareName} · {platform.fmoName}
                  </div>
                  <h2 className="font-bold text-base text-[#1b2530] mt-0.5">
                    {finalRecord.chosenProductTitle}
                  </h2>
                </div>
                <div className="text-right font-mono-tabular">
                  <div className="text-xs text-[#5b6978]">AUDIT GRADE</div>
                  <div
                    className={`font-pixel text-base ${
                      finalRecord.grade === 'A+' || finalRecord.grade === 'A'
                        ? 'text-[#0d7a6f]'
                        : 'text-[#dc2626]'
                    }`}
                  >
                    {finalRecord.grade}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-[#cbbda8] p-4 font-mono-tabular text-xs">
                <div>
                  <div className="text-[#5b6978]">Base Commission</div>
                  <div className="text-base font-bold text-[#0d7a6f]">
                    +${finalRecord.upfrontEarned.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[#5b6978]">Streak / Lead Bonus</div>
                  <div className="text-base font-bold text-[#d97706]">
                    +$
                    {(
                      (finalRecord.streakBonus || 0) + (finalRecord.marketingBonus || 0)
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[#5b6978]">Monthly Residual</div>
                  <div className="text-base font-bold text-[#1b2530]">
                    +${finalRecord.monthlyResidualAdded}/mo
                  </div>
                </div>
                <div>
                  <div className="text-[#5b6978]">Fines / Compliance</div>
                  <div
                    className={`text-base font-bold ${
                      finalRecord.complianceDelta >= 0 ? 'text-[#0d7a6f]' : 'text-[#dc2626]'
                    }`}
                  >
                    {finesIncurred > 0 ? `-$${finesIncurred} · ` : ''}
                    {finalRecord.complianceDelta >= 0
                      ? `+${finalRecord.complianceDelta}%`
                      : `${finalRecord.complianceDelta}%`}
                  </div>
                </div>
              </div>

              {selectedQuote && selectedQuote.preferenceMatch && (
                <div
                  className={`p-3.5 border text-xs space-y-1 ${
                    selectedQuote.preferenceMatch === 'IDEAL'
                      ? 'bg-[#ecfdf5] border-[#0d7a6f] text-[#065f46]'
                      : 'bg-[#fffbeb] border-[#d97706] text-[#92400e]'
                  }`}
                >
                  <div className="font-mono-tabular font-bold">
                    CLIENT PREFERENCE FIT:{' '}
                    {selectedQuote.preferenceMatch === 'IDEAL'
                      ? 'IDEAL MATCH'
                      : selectedQuote.preferenceMatch === 'PARTIAL'
                      ? 'PARTIAL MATCH'
                      : 'PREFERENCE MISMATCH'}
                  </div>
                  {selectedQuote.preferenceNote && <p>{selectedQuote.preferenceNote}</p>}
                </div>
              )}

              {selectedQuote && selectedQuote.chargebackRiskMonths > 0 && (
                <div className="text-xs text-[#334155] bg-[#fffbeb] border border-[#f59e0b] p-3">
                  <strong>Chargeback Window:</strong> {selectedQuote.chargebackRiskMonths} months. If the client cancels or lapses during the advance period, the carrier claws back unearned advance commission.
                </div>
              )}

              {finalRecord.mistakes.length > 0 ? (
                <div className="bg-[#fef2f2] border border-[#dc2626] p-3.5 space-y-1.5 text-xs text-[#7f1d1d]">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Compliance Audit Findings:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {finalRecord.mistakes.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-[#ecfdf5] border border-[#0d7a6f] p-3 text-xs text-[#065f46] flex items-center gap-2 font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Zero Compliance Errors! Clean audit pass via {platform.softwareName} &amp;{' '}
                    {platform.fmoName}.
                  </span>
                </div>
              )}

              <div className="bg-[#1b2838] text-[#f4efe6] p-4 space-y-2 text-xs">
                <div className="font-mono-tabular font-bold text-[#e09f3e]">
                  REAL-WORLD FLORIDA TAKEAWAY &amp; MATH
                </div>
                <p className="leading-relaxed text-[#e2e8f0] text-sm">{clientCase.idealTakeaway}</p>
                <p className="font-mono-tabular text-[#59c3b4] pt-2 border-t border-[#334155]">
                  {clientCase.realWorldMathNote}
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onCompleteCase(finalRecord, finesIncurred)}
                  className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-6 py-3 min-h-[48px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Collect &amp; Celebrate at Desk</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
