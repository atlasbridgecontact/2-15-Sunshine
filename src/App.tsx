import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Music, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { CLIENT_CASES } from './data/clientCases';
import {
  AGENCY_UPGRADES,
  CERTIFICATIONS,
  getAgentRank,
  getCalendarInfo,
  getMonthlyPassiveAgencyRevenue,
  getOverheadBreakdown,
} from './data/floridaRegulations';
import {
  AgencyState,
  CertificationId,
  ClientCase,
  CompletedSaleRecord,
  GameScreenState,
  MarketingId,
  OfficePhase,
  OfficeUpgradeId,
  StaffId,
} from './types/game';
import { snesAudio } from './utils/sound';
import { TitleScreen } from './components/TitleScreen';
import { PlayableOfficeCanvas } from './components/PlayableOfficeCanvas';
import { DeskWorkflow } from './components/DeskWorkflow';
import { FieldManualModal } from './components/FieldManualModal';
import { AgencyUpgradesModal } from './components/AgencyUpgradesModal';
import { MonthSummaryModal } from './components/MonthSummaryModal';

const STORAGE_KEY = 'sunshine_215_agency_save_v1';

const createInitialAgency = (): AgencyState => ({
  agencyName: 'Sunshine Coast 2-15 Agency',
  agentNpn: '19847210',
  cash: 2500,
  month: 1,
  dayInMonth: 1,
  casesCompletedThisMonth: 0,
  totalCasesCompleted: 0,
  complianceScore: 100,
  complianceStreak: 0,
  reputation: 50,
  monthlyResidualIncome: 0,
  unlockedCerts: ['FFM_ACA', 'LIFE_CARRIERS'],
  officeTier: 1,
  hiredStaff: [],
  activeMarketing: [],
  completedCaseIds: [],
  salesHistory: [],
  totalGrossCommissions: 0,
  totalOverheadPaid: 0,
});

function hydrateAgency(raw: Partial<AgencyState>): AgencyState {
  const base = createInitialAgency();
  return {
    ...base,
    ...raw,
    officeTier: raw.officeTier ?? 1,
    hiredStaff: raw.hiredStaff ?? [],
    activeMarketing: raw.activeMarketing ?? [],
    complianceStreak: raw.complianceStreak ?? 0,
  };
}

function pickNextClient(agency: AgencyState): ClientCase {
  const cal = getCalendarInfo(agency.month);
  const eligible = CLIENT_CASES.filter((c) => {
    const hasCert = agency.unlockedCerts.includes(c.requiresCert);
    if (!hasCert) return false;
    if (c.requiresSeason === 'OEP' && !cal.isOep) return false;
    if (c.requiresSeason === 'AEP' && !cal.isAep) return false;
    return true;
  });

  const unseen = eligible.filter((c) => !agency.completedCaseIds.includes(c.id));
  const pool = unseen.length > 0 ? unseen : eligible;
  const fallbackPool =
    pool.length > 0 ? pool : CLIENT_CASES.filter((c) => c.requiresCert === 'LIFE_CARRIERS');

  const idx = agency.totalCasesCompleted % fallbackPool.length;
  return fallbackPool[idx];
}

export default function App() {
  const [savedAgency, setSavedAgency] = useState<AgencyState | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? hydrateAgency(JSON.parse(raw) as Partial<AgencyState>) : null;
    } catch {
      return null;
    }
  });

  const [screen, setScreen] = useState<GameScreenState>('TITLE');
  const [officePhase, setOfficePhase] = useState<OfficePhase>('ROAMING');
  const [agency, setAgency] = useState<AgencyState>(() => createInitialAgency());
  const [activeClient, setActiveClient] = useState<ClientCase>(() =>
    pickNextClient(createInitialAgency())
  );
  const [monthRecords, setMonthRecords] = useState<CompletedSaleRecord[]>([]);
  const [celebrationData, setCelebrationData] = useState<{
    amount: number;
    label: string;
    isClean: boolean;
  } | null>(null);
  const [pendingNextAgency, setPendingNextAgency] = useState<AgencyState | null>(null);

  const [muted, setMuted] = useState<boolean>(false);
  const [bgmOn, setBgmOn] = useState<boolean>(true);
  const [showManual, setShowManual] = useState<boolean>(false);
  const [showCerts, setShowCerts] = useState<boolean>(false);
  const [gameOverReason, setGameOverReason] = useState<string>('');

  const persistSave = useCallback((next: AgencyState) => {
    setSavedAgency(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      snesAudio.setMuted(next);
      return next;
    });
  }, []);

  const toggleBgm = useCallback(() => {
    setBgmOn((prev) => {
      const next = !prev;
      snesAudio.setBgmEnabled(next);
      return next;
    });
  }, []);

  const handleStartNew = useCallback(() => {
    snesAudio.select();
    if (!muted && bgmOn) snesAudio.startBgmLoop();
    const fresh = createInitialAgency();
    setAgency(fresh);
    setMonthRecords([]);
    setActiveClient(pickNextClient(fresh));
    setOfficePhase('ROAMING');
    setCelebrationData(null);
    setPendingNextAgency(null);
    setGameOverReason('');
    persistSave(fresh);
    setScreen('PLAYING');
  }, [persistSave, muted, bgmOn]);

  const handleContinue = useCallback(() => {
    if (!savedAgency) return;
    snesAudio.select();
    if (!muted && bgmOn) snesAudio.startBgmLoop();
    setAgency(savedAgency);
    setMonthRecords([]);
    setActiveClient(pickNextClient(savedAgency));
    setOfficePhase('ROAMING');
    setCelebrationData(null);
    setPendingNextAgency(null);
    setGameOverReason('');
    setScreen('PLAYING');
  }, [savedAgency, muted, bgmOn]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'Escape') {
        if (showManual) setShowManual(false);
        else if (showCerts) setShowCerts(false);
        else if (screen === 'PLAYING') setScreen('PAUSED');
        else if (screen === 'PAUSED') setScreen('PLAYING');
      } else if (e.key === 'Enter' && screen === 'TITLE' && !showManual) {
        if (savedAgency) handleContinue();
        else handleStartNew();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, showManual, showCerts, savedAgency, toggleMute, handleContinue, handleStartNew]);

  const handleCompleteCase = (record: CompletedSaleRecord, netFinePaid: number) => {
    const stampedRecord: CompletedSaleRecord = {
      ...record,
      timestampMonth: agency.month,
    };

    const totalCashEarned =
      record.upfrontEarned + (record.streakBonus || 0) + (record.marketingBonus || 0);
    const isClean = record.mistakes.length === 0;
    const nextComp = Math.max(0, Math.min(100, agency.complianceScore + record.complianceDelta));
    const nextCash = agency.cash + totalCashEarned - netFinePaid;
    const nextCompletedThisMonth = agency.casesCompletedThisMonth + 1;
    const nextTotalCompleted = agency.totalCasesCompleted + 1;
    const repBonus = isClean ? (agency.officeTier >= 2 ? 8 : 6) : -4;

    const nextAgency: AgencyState = {
      ...agency,
      cash: nextCash,
      complianceScore: nextComp,
      complianceStreak: isClean ? agency.complianceStreak + 1 : 0,
      reputation: Math.max(0, Math.min(100, agency.reputation + repBonus)),
      monthlyResidualIncome: agency.monthlyResidualIncome + record.monthlyResidualAdded,
      casesCompletedThisMonth: nextCompletedThisMonth,
      totalCasesCompleted: nextTotalCompleted,
      completedCaseIds: agency.completedCaseIds.includes(record.caseId)
        ? agency.completedCaseIds
        : [...agency.completedCaseIds, record.caseId],
      salesHistory: [stampedRecord, ...agency.salesHistory],
      totalGrossCommissions: agency.totalGrossCommissions + totalCashEarned,
    };

    const nextMonthRecords = [...monthRecords, stampedRecord];
    setAgency(nextAgency);
    setMonthRecords(nextMonthRecords);
    setPendingNextAgency(nextAgency);
    persistSave(nextAgency);

    const stampLabel = !isClean
      ? 'CITATION LOGGED'
      : totalCashEarned > 0
      ? 'POLICY BOUND!'
      : 'ETHICAL PASS!';

    setCelebrationData({
      amount: totalCashEarned,
      label: stampLabel,
      isClean,
    });
    setOfficePhase('CELEBRATING');
  };

  const handleFinishCelebration = useCallback(() => {
    if (officePhase !== 'CELEBRATING') return;
    const current = pendingNextAgency || agency;
    setCelebrationData(null);
    setPendingNextAgency(null);

    if (current.complianceScore <= 0) {
      snesAudio.warning();
      setGameOverReason(
        'The Florida Department of Financial Services (DFS) suspended your 2-15 license after your Compliance Score fell to 0%.'
      );
      setScreen('GAME_OVER');
      return;
    }

    if (current.casesCompletedThisMonth >= 3) {
      setOfficePhase('ROAMING');
      setScreen('MONTH_END');
    } else {
      setActiveClient(pickNextClient(current));
      setOfficePhase('ROAMING');
    }
  }, [officePhase, pendingNextAgency, agency]);

  const handleStartNextMonth = () => {
    snesAudio.cashRegister();
    const overhead = getOverheadBreakdown(agency).total;
    const passive = getMonthlyPassiveAgencyRevenue(agency).total;
    const nextCash = agency.cash + agency.monthlyResidualIncome + passive - overhead;

    const nextAgency: AgencyState = {
      ...agency,
      cash: nextCash,
      month: agency.month + 1,
      casesCompletedThisMonth: 0,
      totalOverheadPaid: agency.totalOverheadPaid + overhead,
    };

    setAgency(nextAgency);
    setMonthRecords([]);
    persistSave(nextAgency);

    if (nextCash < -1000) {
      snesAudio.warning();
      setGameOverReason(
        'Your startup agency ran out of working capital after monthly overhead exceeded cash reserves.'
      );
      setScreen('GAME_OVER');
      return;
    }

    setActiveClient(pickNextClient(nextAgency));
    setOfficePhase('ROAMING');
    setScreen('PLAYING');
  };

  const handleBuyCert = (certId: CertificationId) => {
    const cert = CERTIFICATIONS.find((c) => c.id === certId);
    if (!cert) return;
    if (agency.unlockedCerts.includes(certId) || agency.cash < cert.cost) return;

    snesAudio.fanfare();
    const nextAgency: AgencyState = {
      ...agency,
      cash: agency.cash - cert.cost,
      unlockedCerts: [...agency.unlockedCerts, certId],
      complianceScore:
        certId === 'EO_INCREASE'
          ? Math.min(100, agency.complianceScore + 10)
          : agency.complianceScore,
    };
    setAgency(nextAgency);
    persistSave(nextAgency);
  };

  const handleBuyUpgrade = (upgradeId: StaffId | MarketingId | OfficeUpgradeId) => {
    const upg = AGENCY_UPGRADES.find((u) => u.id === upgradeId);
    if (!upg || agency.cash < upg.oneTimeCost) return;

    snesAudio.fanfare();
    let nextAgency: AgencyState = {
      ...agency,
      cash: agency.cash - upg.oneTimeCost,
    };

    if (upg.id === 'COASTAL_RENOVATION') {
      if (agency.officeTier >= 2) return;
      nextAgency = { ...nextAgency, officeTier: 2 };
    } else if (upg.category === 'STAFF') {
      const sid = upg.id as StaffId;
      if (agency.hiredStaff.includes(sid)) return;
      nextAgency = { ...nextAgency, hiredStaff: [...agency.hiredStaff, sid] };
    } else if (upg.category === 'MARKETING') {
      const mid = upg.id as MarketingId;
      if (agency.activeMarketing.includes(mid)) return;
      nextAgency = { ...nextAgency, activeMarketing: [...agency.activeMarketing, mid] };
    }

    setAgency(nextAgency);
    persistSave(nextAgency);
  };

  const cal = useMemo(() => getCalendarInfo(agency.month), [agency.month]);
  const rank = useMemo(
    () => getAgentRank(agency.totalGrossCommissions),
    [agency.totalGrossCommissions]
  );
  const hasEoShield = agency.unlockedCerts.includes('EO_INCREASE');
  const hasComplianceCsr = agency.hiredStaff.includes('COMPLIANCE_CSR');

  if (screen === 'TITLE') {
    return (
      <>
        <TitleScreen
          savedAgency={savedAgency}
          muted={muted}
          onToggleMute={toggleMute}
          onStartNew={handleStartNew}
          onContinue={handleContinue}
          onOpenManual={() => {
            snesAudio.select();
            setShowManual(true);
          }}
        />
        {showManual && <FieldManualModal onClose={() => setShowManual(false)} />}
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] w-full bg-[#131c26] flex flex-col overflow-x-hidden lg:overflow-hidden select-none">
      {/* Compact Top Game HUD */}
      <header className="bg-[#1b2838] border-b-2 border-[#d9cbb8] px-3 sm:px-4 py-2 shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 lg:gap-3">
        {/* Row 1 on Mobile: Title/Month + Compact Utility Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="font-pixel text-xs text-[#e09f3e] whitespace-nowrap shrink-0">
              SUNSHINE 2-15
            </div>
            <div className="font-mono-tabular text-xs text-[#d9cbb8] truncate">
              {cal.monthName.slice(0, 3)} {cal.year} ·{' '}
              <span className="text-[#59c3b4] font-semibold">{cal.seasonTag}</span> ·{' '}
              {Math.min(3, agency.casesCompletedThisMonth + 1)}/3
            </div>
          </div>

          {/* Mobile Compact Icon Controls (hidden lg+, visible <lg in row 1 to keep header super slim) */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                snesAudio.select();
                setShowCerts(true);
              }}
              className="snes-btn bg-[#e09f3e] text-[#1b2530] min-h-[40px] px-2.5 py-1.5 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              aria-label="Agency Growth and Certifications"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Growth</span>
            </button>
            <button
              type="button"
              onClick={() => {
                snesAudio.select();
                setShowManual(true);
              }}
              className="snes-btn bg-[#25364a] text-[#f4efe6] min-h-[40px] px-2.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
              aria-label="Open 2-15 Field Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#59c3b4]" />
              <span>Manual</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="snes-btn bg-[#25364a] text-[#f4efe6] min-h-[40px] min-w-[40px] inline-flex items-center justify-center cursor-pointer"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5 text-[#e09f3e]" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#59c3b4]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setScreen('PAUSED')}
              className="snes-btn bg-[#25364a] text-[#f4efe6] min-h-[40px] min-w-[40px] inline-flex items-center justify-center cursor-pointer"
              aria-label="Pause game"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metrics Cluster (Compact single-line 4-stat grid on mobile, inline flex on desktop) */}
        <div className="grid grid-cols-4 lg:flex lg:flex-wrap items-center gap-2 lg:gap-5 text-xs font-mono-tabular pt-1 border-t border-[#2d3e52] lg:border-t-0 lg:pt-0">
          <div className="truncate">
            <span className="text-[#94a3b8]">Cash </span>
            <strong className={agency.cash >= 0 ? 'text-[#59c3b4]' : 'text-[#f87171]'}>
              ${agency.cash.toLocaleString()}
            </strong>
          </div>
          <div className="truncate">
            <span className="text-[#94a3b8]">Res </span>
            <strong className="text-[#e09f3e]">+${agency.monthlyResidualIncome}</strong>
          </div>
          <div className="truncate">
            <span className="text-[#94a3b8]">Comp </span>
            <strong
              className={
                agency.complianceScore >= 80
                  ? 'text-[#59c3b4]'
                  : agency.complianceScore >= 50
                  ? 'text-[#e09f3e]'
                  : 'text-[#f87171]'
              }
            >
              {agency.complianceScore}%
            </strong>
          </div>
          <div className="truncate text-right lg:text-left">
            <span className="text-[#94a3b8]">Strk </span>
            <strong className={agency.complianceStreak >= 2 ? 'text-[#e09f3e]' : 'text-[#cbd5e1]'}>
              {agency.complianceStreak}x{agency.complianceStreak >= 2 ? ' (+10%)' : ''}
            </strong>
          </div>
          <div className="hidden xl:block text-[#cbd5e1]">{rank.title}</div>
        </div>

        {/* Desktop Utility Controls */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              snesAudio.select();
              setShowCerts(true);
            }}
            className="snes-btn bg-[#e09f3e] hover:bg-[#eab054] text-[#1b2530] px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Growth &amp; Certs</span>
          </button>
          <button
            type="button"
            onClick={() => {
              snesAudio.select();
              setShowManual(true);
            }}
            className="snes-btn bg-[#25364a] hover:bg-[#2f455e] text-[#f4efe6] px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#59c3b4]" />
            <span>Field Manual</span>
          </button>
          <button
            type="button"
            onClick={toggleBgm}
            className="snes-btn bg-[#25364a] text-[#f4efe6] px-2.5 py-1.5 text-xs inline-flex items-center gap-1 cursor-pointer"
            aria-label={bgmOn ? 'Pause BGM music' : 'Play BGM music'}
          >
            <Music className={`w-3.5 h-3.5 ${bgmOn && !muted ? 'text-[#59c3b4]' : 'text-[#64748b]'}`} />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="snes-btn bg-[#25364a] text-[#f4efe6] px-2.5 py-1.5 text-xs inline-flex items-center cursor-pointer"
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? (
              <VolumeX className="w-3.5 h-3.5 text-[#e09f3e]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#59c3b4]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setScreen('PAUSED')}
            className="snes-btn bg-[#25364a] text-[#f4efe6] px-2.5 py-1.5 text-xs inline-flex items-center cursor-pointer"
            aria-label="Pause game"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Playfield: Walk-Around Office Floor OR Seated Consultation Desk */}
      <main className="flex-1 p-2.5 sm:p-4 lg:overflow-hidden min-h-0">
        {officePhase === 'AT_DESK' ? (
          <DeskWorkflow
            key={`${activeClient.id}-${agency.totalCasesCompleted}`}
            clientCase={activeClient}
            hasEoShield={hasEoShield}
            hasComplianceCsr={hasComplianceCsr}
            activeMarketing={agency.activeMarketing}
            complianceStreak={agency.complianceStreak}
            onCompleteCase={handleCompleteCase}
          />
        ) : (
          <PlayableOfficeCanvas
            client={activeClient}
            officeTier={agency.officeTier}
            hiredStaff={agency.hiredStaff}
            officePhase={officePhase}
            celebrationData={celebrationData}
            onStartConsultation={() => setOfficePhase('AT_DESK')}
            onFinishCelebration={handleFinishCelebration}
            onOpenManual={() => {
              snesAudio.select();
              setShowManual(true);
            }}
            onOpenUpgrades={() => {
              snesAudio.select();
              setShowCerts(true);
            }}
          />
        )}
      </main>

      {/* Modals */}
      {showManual && <FieldManualModal onClose={() => setShowManual(false)} />}
      {showCerts && (
        <AgencyUpgradesModal
          agency={agency}
          onBuyCert={handleBuyCert}
          onBuyUpgrade={handleBuyUpgrade}
          onClose={() => setShowCerts(false)}
        />
      )}

      {screen === 'MONTH_END' && (
        <MonthSummaryModal
          agency={agency}
          monthRecords={monthRecords}
          onOpenCerts={() => setShowCerts(true)}
          onStartNextMonth={handleStartNextMonth}
        />
      )}

      {screen === 'PAUSED' && (
        <div className="fixed inset-0 z-50 bg-[#090e14]/85 flex items-center justify-center p-3 sm:p-4">
          <div className="snes-frame p-5 sm:p-6 w-full max-w-md space-y-5 text-center">
            <h2 className="font-pixel text-sm text-[#e09f3e]">AGENCY PAUSED</h2>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Your progress is automatically saved after every appointment. NPN #{agency.agentNpn} ·{' '}
              {rank.title}.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setScreen('PLAYING')}
                className="snes-btn bg-[#0d7a6f] text-[#f4efe6] py-3 min-h-[44px] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Resume Desk</span>
              </button>
              <button
                type="button"
                onClick={toggleBgm}
                className="snes-btn bg-[#25364a] text-[#f4efe6] py-3 min-h-[44px] text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Music className={`w-4 h-4 ${bgmOn && !muted ? 'text-[#59c3b4]' : 'text-[#94a3b8]'}`} />
                <span>16-Bit Music: {bgmOn && !muted ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  snesAudio.stopBgmLoop();
                  setScreen('TITLE');
                }}
                className="snes-btn bg-[#25364a] text-[#f4efe6] py-3 min-h-[44px] text-xs font-semibold cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 bg-[#090e14]/90 flex items-center justify-center p-3 sm:p-4">
          <div className="snes-frame p-5 sm:p-6 w-full max-w-lg space-y-4 text-center">
            <h2 className="font-pixel text-sm text-[#f87171]">AGENCY CLOSED</h2>
            <p className="text-sm text-[#f4efe6]">{gameOverReason}</p>
            <div className="bg-[#0f1722] border border-[#3c4b5c] p-3.5 sm:p-4 grid grid-cols-3 gap-2 sm:gap-3 text-xs font-mono-tabular">
              <div>
                <div className="text-[#94a3b8]">Months Active</div>
                <div className="font-bold text-[#f4efe6]">{agency.month}</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Clients Served</div>
                <div className="font-bold text-[#f4efe6]">{agency.totalCasesCompleted}</div>
              </div>
              <div>
                <div className="text-[#94a3b8]">Gross Earned</div>
                <div className="font-bold text-[#59c3b4]">
                  ${agency.totalGrossCommissions.toLocaleString()}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartNew}
              className="snes-btn bg-[#0d7a6f] text-[#f4efe6] px-6 py-3 min-h-[48px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start Fresh Agency</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
