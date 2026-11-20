import React from 'react';
import { ArrowRight, Award, DollarSign } from 'lucide-react';
import {
  getAgentRank,
  getCalendarInfo,
  getMonthlyPassiveAgencyRevenue,
  getOverheadBreakdown,
} from '../data/floridaRegulations';
import { AgencyState, CompletedSaleRecord } from '../types/game';

interface MonthSummaryModalProps {
  agency: AgencyState;
  monthRecords: CompletedSaleRecord[];
  onOpenCerts: () => void;
  onStartNextMonth: () => void;
}

export const MonthSummaryModal: React.FC<MonthSummaryModalProps> = ({
  agency,
  monthRecords,
  onOpenCerts,
  onStartNextMonth,
}) => {
  const cal = getCalendarInfo(agency.month);
  const nextCal = getCalendarInfo(agency.month + 1);
  const overhead = getOverheadBreakdown(agency);
  const passive = getMonthlyPassiveAgencyRevenue(agency);
  const newUpfront = monthRecords.reduce(
    (s, r) => s + r.upfrontEarned + (r.streakBonus || 0) + (r.marketingBonus || 0),
    0
  );
  const residualsCollected = agency.monthlyResidualIncome;
  const netMonth = newUpfront + residualsCollected + passive.total - overhead.total;
  const rank = getAgentRank(agency.totalGrossCommissions);

  return (
    <div className="fixed inset-0 z-40 bg-[#090e14]/88 flex items-center justify-center p-2 sm:p-4">
      <div className="snes-frame-paper w-full max-w-2xl max-h-[94dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#1b2838] text-[#f4efe6] px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-2 border-b-2 border-[#3c4b5c] shrink-0">
          <div className="min-w-0">
            <h2 className="font-pixel text-xs md:text-sm text-[#e09f3e] truncate">
              {cal.monthName.toUpperCase()} {cal.year} LEDGER
            </h2>
            <div className="text-xs text-[#b8c4d0] mt-1">
              {rank.title} · Compliance {agency.complianceScore}% · Streak {agency.complianceStreak}
            </div>
          </div>
          <DollarSign className="w-6 h-6 text-[#59c3b4] shrink-0" />
        </div>

        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Clients Served This Month */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5b6978] mb-2">
              Appointments Completed This Month
            </h3>
            <div className="bg-white border border-[#cbbda8] divide-y divide-[#ece5d9]">
              {monthRecords.map((rec, i) => {
                const rowTotal =
                  rec.upfrontEarned + (rec.streakBonus || 0) + (rec.marketingBonus || 0);
                return (
                  <div
                    key={`${rec.caseId}-${i}`}
                    className="px-4 py-2.5 flex items-center justify-between text-xs gap-3"
                  >
                    <div>
                      <div className="font-bold text-[#1b2530]">
                        {rec.clientName} ·{' '}
                        <span className="text-[#5b6978] font-normal">{rec.productLine}</span>
                      </div>
                      <div className="text-[#475569]">{rec.chosenProductTitle}</div>
                    </div>
                    <div className="text-right font-mono-tabular shrink-0">
                      <div className="font-bold text-[#0d7a6f]">
                        +${rowTotal.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#5b6978]">
                        Grade {rec.grade}
                        {rec.monthlyResidualAdded > 0 ? ` · +$${rec.monthlyResidualAdded}/mo` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly P&L Breakdown */}
          <div className="bg-white border border-[#cbbda8] p-4 space-y-2 text-xs font-mono-tabular">
            <div className="flex justify-between">
              <span className="text-[#334155]">New Policy Commissions &amp; Bonuses</span>
              <span className="font-semibold text-[#0d7a6f]">+${newUpfront.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#334155]">Active Book Monthly Residuals (ACA/Life/Med)</span>
              <span className="font-semibold text-[#0d7a6f]">
                +${residualsCollected.toLocaleString()}
              </span>
            </div>
            {passive.staffProduction > 0 && (
              <div className="flex justify-between">
                <span className="text-[#334155]">Junior Producer (Marcus) Override Revenue</span>
                <span className="font-semibold text-[#0d7a6f]">
                  +${passive.staffProduction.toLocaleString()}
                </span>
              </div>
            )}
            {passive.marketingTrickle > 0 && (
              <div className="flex justify-between">
                <span className="text-[#334155]">Digital Funnel Inbound Residual Trickle</span>
                <span className="font-semibold text-[#0d7a6f]">
                  +${passive.marketingTrickle.toLocaleString()}
                </span>
              </div>
            )}

            <div className="border-t border-[#ece5d9] my-1 pt-2 space-y-1 text-[#9a3412]">
              <div className="flex justify-between">
                <span>Base Agency Overhead (Rent, E&amp;O, CRM, DFS)</span>
                <span>-${overhead.base.toLocaleString()}</span>
              </div>
              {overhead.certs > 0 && (
                <div className="flex justify-between">
                  <span>Carrier Appointments &amp; Cert Fees</span>
                  <span>-${overhead.certs.toLocaleString()}</span>
                </div>
              )}
              {overhead.renovation > 0 && (
                <div className="flex justify-between">
                  <span>Coastal Suite Lease Upgrade</span>
                  <span>-${overhead.renovation.toLocaleString()}</span>
                </div>
              )}
              {overhead.staff > 0 && (
                <div className="flex justify-between">
                  <span>Agency Staff Payroll</span>
                  <span>-${overhead.staff.toLocaleString()}</span>
                </div>
              )}
              {overhead.marketing > 0 && (
                <div className="flex justify-between">
                  <span>Active Lead Marketing Campaigns</span>
                  <span>-${overhead.marketing.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-[#1b2838] pt-2 flex justify-between text-sm font-bold">
              <span>Net Monthly Agency Profit</span>
              <span className={netMonth >= 0 ? 'text-[#0d7a6f]' : 'text-[#dc2626]'}>
                {netMonth >= 0
                  ? `+$${netMonth.toLocaleString()}`
                  : `-$${Math.abs(netMonth).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenCerts}
              className="snes-btn bg-[#e09f3e] hover:bg-[#eab054] text-[#1b2530] px-4 py-2.5 min-h-[44px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Office, Staff &amp; Certs</span>
            </button>

            <button
              type="button"
              onClick={onStartNextMonth}
              className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-5 py-2.5 min-h-[48px] w-full sm:w-auto text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>
                Advance to {nextCal.monthName} ({nextCal.seasonTag})
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
