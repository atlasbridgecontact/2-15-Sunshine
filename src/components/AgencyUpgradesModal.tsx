import React, { useState } from 'react';
import { Award, Building2, Check, Lock, Megaphone, Users, X } from 'lucide-react';
import { AGENCY_UPGRADES, CERTIFICATIONS, getAgentRank } from '../data/floridaRegulations';
import {
  AgencyState,
  CertificationId,
  MarketingId,
  OfficeUpgradeId,
  StaffId,
} from '../types/game';

interface AgencyUpgradesModalProps {
  agency: AgencyState;
  onBuyCert: (certId: CertificationId) => void;
  onBuyUpgrade: (upgradeId: StaffId | MarketingId | OfficeUpgradeId) => void;
  onClose: () => void;
}

type HubTab = 'CERTS' | 'OFFICE_STAFF' | 'MARKETING';

export const AgencyUpgradesModal: React.FC<AgencyUpgradesModalProps> = ({
  agency,
  onBuyCert,
  onBuyUpgrade,
  onClose,
}) => {
  const [tab, setTab] = useState<HubTab>('CERTS');
  const rank = getAgentRank(agency.totalGrossCommissions);

  const isUpgradeOwned = (id: StaffId | MarketingId | OfficeUpgradeId): boolean => {
    if (id === 'COASTAL_RENOVATION') return agency.officeTier >= 2;
    if (id === 'COMPLIANCE_CSR' || id === 'JUNIOR_PRODUCER') {
      return agency.hiredStaff.includes(id);
    }
    return agency.activeMarketing.includes(id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090e14]/85 flex items-center justify-center p-2 sm:p-4">
      <div className="snes-frame-paper w-full max-w-3xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-[#1b2838] text-[#f4efe6] px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2 border-b-2 border-[#3c4b5c]">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-5 h-5 text-[#e09f3e] shrink-0" />
            <h2 className="font-pixel text-xs md:text-sm tracking-wide truncate">
              AGENCY GROWTH &amp; CERTS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="snes-btn bg-[#25364a] text-[#f4efe6] px-3 py-2 min-h-[44px] sm:min-h-0 sm:py-1.5 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>

        <div className="bg-[#e6dfd2] px-3.5 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular border-b border-[#c8bca8] shrink-0">
          <span>
            Cash: <strong className="text-[#0d7a6f]">${agency.cash.toLocaleString()}</strong>
          </span>
          <span>
            Rank {rank.level}: <strong>{rank.title}</strong>
          </span>
        </div>

        {/* Category Tabs */}
        <div className="bg-[#efe9dd] px-3.5 sm:px-5 py-2 flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto border-b border-[#c8bca8] shrink-0">
          <button
            type="button"
            onClick={() => setTab('CERTS')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'CERTS'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Licenses &amp; Certs</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('OFFICE_STAFF')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'OFFICE_STAFF'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Office &amp; Staff</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('MARKETING')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'MARKETING'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Lead Marketing</span>
          </button>
        </div>

        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3">
          {tab === 'CERTS' &&
            CERTIFICATIONS.map((cert) => {
              const unlocked = agency.unlockedCerts.includes(cert.id);
              const rankMet = rank.level >= cert.requiredRank;
              const canAfford = agency.cash >= cert.cost;

              return (
                <div
                  key={cert.id}
                  className={`bg-white border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    unlocked ? 'border-[#0d7a6f]' : 'border-[#cbbda8]'
                  }`}
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-[#1b2530]">{cert.name}</h3>
                      <span className="font-mono-tabular text-xs font-semibold text-[#1d4ed8]">
                        · FMO: {cert.applicableFmo}
                      </span>
                      {cert.monthlyFeeDelta > 0 && (
                        <span className="font-mono-tabular text-xs text-[#5b6978]">
                          · +${cert.monthlyFeeDelta}/mo overhead
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#334155]">{cert.description}</p>
                    <div className="text-xs font-semibold text-[#0d7a6f]">{cert.unlocksText}</div>
                    <div className="text-xs text-[#475569]">{cert.realWorldNote}</div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-end justify-between gap-2">
                    {unlocked ? (
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold text-[#0d7a6f]">
                        <Check className="w-4 h-4" />
                        <span>ACTIVE</span>
                      </span>
                    ) : !rankMet ? (
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#9a3412]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Needs Rank {cert.requiredRank} ($5,500+ Gross)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyCert(cert.id)}
                        className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-4 py-2 min-h-[44px] w-full sm:w-auto text-xs font-semibold font-mono-tabular whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Unlock · ${cert.cost.toLocaleString()}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

          {tab !== 'CERTS' &&
            AGENCY_UPGRADES.filter((u) =>
              tab === 'OFFICE_STAFF'
                ? u.category === 'OFFICE' || u.category === 'STAFF'
                : u.category === 'MARKETING'
            ).map((upg) => {
              const owned = isUpgradeOwned(upg.id);
              const rankMet = rank.level >= upg.requiredRank;
              const canAfford = agency.cash >= upg.oneTimeCost;

              return (
                <div
                  key={upg.id}
                  className={`bg-white border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    owned ? 'border-[#0d7a6f]' : 'border-[#cbbda8]'
                  }`}
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {upg.category === 'OFFICE' ? (
                        <Building2 className="w-4 h-4 text-[#0d7a6f]" />
                      ) : upg.category === 'STAFF' ? (
                        <Users className="w-4 h-4 text-[#e09f3e]" />
                      ) : (
                        <Megaphone className="w-4 h-4 text-[#0d7a6f]" />
                      )}
                      <h3 className="font-bold text-sm text-[#1b2530]">{upg.name}</h3>
                      <span className="font-mono-tabular text-xs text-[#9a3412]">
                        +${upg.monthlyCost}/mo cost
                      </span>
                    </div>
                    <div className="font-mono-tabular text-xs font-semibold text-[#1d4ed8]">
                      Applicable FMO: {upg.applicableFmo}
                    </div>
                    <p className="text-xs text-[#334155]">{upg.description}</p>
                    <div className="text-xs font-semibold text-[#0d7a6f]">
                      {upg.gameplayBenefit}
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-end justify-between gap-2">
                    {owned ? (
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold text-[#0d7a6f]">
                        <Check className="w-4 h-4" />
                        <span>ACTIVE</span>
                      </span>
                    ) : !rankMet ? (
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#9a3412]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Needs Rank {upg.requiredRank} ($5,500+ Gross)</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyUpgrade(upg.id)}
                        className="snes-btn bg-[#e09f3e] hover:bg-[#eab054] text-[#1b2530] px-4 py-2 min-h-[44px] w-full sm:w-auto text-xs font-bold font-mono-tabular whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Invest · ${upg.oneTimeCost.toLocaleString()}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
