import React, { useState } from 'react';
import { BookOpen, Calculator, FileText, Scale, X } from 'lucide-react';
import {
  calculate2026AcaSubsidy,
  FIELD_MANUAL_SECTIONS,
  get2026MagiBenefitTiers,
  getFloridaFpl100,
} from '../data/floridaRegulations';

interface FieldManualModalProps {
  onClose: () => void;
}

type ManualTab = 'ORDER' | 'FPL' | 'COMMISSIONS' | 'STATUTES';

export const FieldManualModal: React.FC<FieldManualModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<ManualTab>('ORDER');
  const [hhSize, setHhSize] = useState<number>(1);
  const [magi, setMagi] = useState<number>(28000);

  const calc = calculate2026AcaSubsidy(hhSize, magi);
  const magiTiers = get2026MagiBenefitTiers(hhSize);

  return (
    <div className="fixed inset-0 z-50 bg-[#090e14]/85 flex items-center justify-center p-2 sm:p-4">
      <div className="snes-frame-paper w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b2838] text-[#f4efe6] px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2 border-b-2 border-[#3c4b5c]">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-[#59c3b4] shrink-0" />
            <h2 className="font-pixel text-xs md:text-sm tracking-wide truncate">
              FLORIDA 2-15 FIELD MANUAL
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

        {/* Navigation Tabs */}
        <div className="bg-[#e6dfd2] px-3 sm:px-5 py-2 flex flex-nowrap sm:flex-wrap items-center gap-2 overflow-x-auto border-b border-[#c8bca8] shrink-0">
          <button
            type="button"
            onClick={() => setTab('ORDER')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'ORDER'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Order of Operations</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('FPL')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'FPL'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>2026 FPL &amp; ACA Calculator</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('COMMISSIONS')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'COMMISSIONS'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <span>Real Commissions &amp; Costs</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('STATUTES')}
            className={`px-3.5 py-2 min-h-[42px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border ${
              tab === 'STATUTES'
                ? 'bg-[#1b2838] text-[#f4efe6] border-[#1b2838]'
                : 'bg-[#f4efe6] text-[#1b2530] border-[#bfb29d] hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>FL Forms &amp; Statutes</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-5 text-sm leading-relaxed">
          {tab === 'ORDER' && (
            <div className="space-y-5">
              <p className="text-[#334155]">
                In Florida, executing disclosures and suitability checks <strong>out of sequence</strong> is one of the fastest ways to fail a DFS or CMS audit. Your agency routes through <strong>PSM Brokerage</strong> (ACA HealthSherpa EDE &amp; Senior SunFire Matrix) and <strong>Gordon Marketing</strong> (Private Health, Life iPipeline &amp; Annuities FireLight):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FIELD_MANUAL_SECTIONS.orderOfOps.map((item) => (
                  <div key={item.line} className="bg-white border border-[#cbbda8] p-4 space-y-2.5">
                    <div>
                      <h3 className="font-bold text-[#1b2530] text-base">{item.line}</h3>
                      <div className="font-mono-tabular text-xs text-[#0d7a6f] font-semibold">
                        {item.statute}
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-xs text-[#2b3744]">
                      {item.steps.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'FPL' && (
            <div className="space-y-5">
              <div className="bg-white border border-[#cbbda8] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-base text-[#1b2530]">
                    Interactive 2026 Florida FPL, MAGI Subsidy &amp; CSR Calculator
                  </h3>
                  <span className="font-mono-tabular text-xs font-semibold text-[#0d7a6f]">
                    IRS Rev. Proc. 2025-25 (§36B)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-[#334155]">
                      Tax Household Size ({hhSize} {hhSize === 1 ? 'person' : 'people'})
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={6}
                      value={hhSize}
                      onChange={(e) => setHhSize(Number(e.target.value))}
                      className="w-full h-9 accent-[#0d7a6f] cursor-pointer"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-[#334155]">
                      Projected 2026 MAGI:{' '}
                      <span className="font-mono-tabular font-bold text-[#0d7a6f]">
                        ${magi.toLocaleString()}
                      </span>
                    </span>
                    <input
                      type="range"
                      min={8000}
                      max={160000}
                      step={500}
                      value={magi}
                      onChange={(e) => setMagi(Number(e.target.value))}
                      className="w-full h-9 accent-[#0d7a6f] cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#e6dfd2] font-mono-tabular">
                  <div>
                    <div className="text-xs text-[#5b6978]">FPL Ratio (100% = ${calc.fpl100.toLocaleString()})</div>
                    <div className="text-base font-bold text-[#0d7a6f]">{calc.fplPercent}% FPL</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5b6978]">Max Expected Contrib</div>
                    <div className="text-base font-bold text-[#1b2530]">
                      ${calc.expectedMonthlyContribution.toLocaleString()}/mo
                      {calc.applicablePct !== null ? ` (${calc.applicablePct.toFixed(2)}%)` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5b6978]">
                      Est. APTC (vs ${calc.sampleSlcspMonthly}/mo SLCSP)
                    </div>
                    <div className="text-base font-bold text-[#0d7a6f]">
                      ${calc.estimatedMonthlyAptc.toLocaleString()}/mo
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#5b6978]">Est. Annual Tax Credit</div>
                    <div className="text-base font-bold text-[#1d4ed8]">
                      ${calc.estimatedAnnualAptc.toLocaleString()}/yr
                    </div>
                  </div>
                </div>

                <div className="bg-[#f4efe6] border border-[#d4c7b4] p-3.5 space-y-1.5 text-xs text-[#1b2530]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Status:</strong> {calc.acaStatus}
                    </span>
                    <span className="font-mono-tabular font-semibold text-[#5b6978]">
                      2026 Employer Affordability Cap (9.96%): ${calc.employerAffordabilityCapMonthly.toLocaleString()}/mo
                    </span>
                  </div>
                  <div>
                    <strong>Silver CSR Benefit Tier ({calc.csrAvLabel}):</strong> {calc.csrBenefitDetails}
                  </div>
                </div>
              </div>

              {/* Actual Subsidies & Benefit Amounts by MAGI for Selected Household */}
              <div className="bg-white border border-[#cbbda8] p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-[#1b2530]">
                    2026 MAGI Subsidy &amp; Silver Benefit Breakdown ({hhSize} {hhSize === 1 ? 'Person' : 'People'} · FL Sample SLCSP ${calc.sampleSlcspMonthly}/mo)
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-xs font-mono-tabular text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#cbbda8] text-[#5b6978]">
                        <th className="py-2 pr-3">FPL Band</th>
                        <th className="py-2 pr-3">2026 MAGI Range</th>
                        <th className="py-2 pr-3">§36B Cap %</th>
                        <th className="py-2 pr-3">Est. APTC Subsidy</th>
                        <th className="py-2">Silver Plan Benefit Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ece5d9]">
                      {magiTiers.map((row) => (
                        <tr key={row.fplBand}>
                          <td className="py-2 pr-3 font-semibold text-[#1b2530]">{row.fplBand}</td>
                          <td className="py-2 pr-3 text-[#334155]">{row.incomeRange}</td>
                          <td className="py-2 pr-3 text-[#9a3412] font-semibold">{row.magiCapPct}</td>
                          <td className="py-2 pr-3 text-[#0d7a6f] font-bold">{row.sampleMonthlyAptc}</td>
                          <td className="py-2 text-[#1b2530] font-sans">{row.silverCsrBenefits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-[#cbbda8] p-4">
                <h4 className="font-bold text-sm mb-2">2026 Florida FPL Reference Thresholds (All Household Sizes)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs font-mono-tabular text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#cbbda8] text-[#5b6978]">
                        <th className="py-2 pr-3">Household</th>
                        <th className="py-2 pr-3">100% FPL (Floor)</th>
                        <th className="py-2 pr-3">150% FPL (94% CSR)</th>
                        <th className="py-2 pr-3">250% FPL (73% CSR)</th>
                        <th className="py-2">400% FPL (2026 Cliff)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ece5d9]">
                      {[1, 2, 3, 4, 5].map((n) => {
                        const base = getFloridaFpl100(n);
                        return (
                          <tr key={n}>
                            <td className="py-2 pr-3 font-semibold">{n} {n === 1 ? 'Person' : 'People'}</td>
                            <td className="py-2 pr-3">${base.toLocaleString()}</td>
                            <td className="py-2 pr-3">${Math.round(base * 1.5).toLocaleString()}</td>
                            <td className="py-2 pr-3">${Math.round(base * 2.5).toLocaleString()}</td>
                            <td className="py-2 font-semibold text-[#9a3412]">${(base * 4).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'COMMISSIONS' && (
            <div className="space-y-4">
              <p className="text-[#334155]">
                Every dollar earned in Sunshine 2-15 reflects real-world Florida carrier compensation models—including PMPM health trails, Life FYC advances (and chargebacks), and carrier-paid Annuity single-premium percentages:
              </p>
              <div className="overflow-x-auto bg-white border border-[#cbbda8]">
                <table className="w-full min-w-[560px] text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e6dfd2] border-b border-[#cbbda8] text-[#1b2530]">
                      <th className="p-3">Product Line</th>
                      <th className="p-3">Typical Client Cost</th>
                      <th className="p-3">Agent Commission</th>
                      <th className="p-3">Payout &amp; Chargeback Mechanics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ece5d9]">
                    {FIELD_MANUAL_SECTIONS.commissions.map((row) => (
                      <tr key={row.product}>
                        <td className="p-3 font-semibold text-[#1b2530]">{row.product}</td>
                        <td className="p-3 font-mono-tabular text-[#334155]">{row.clientCost}</td>
                        <td className="p-3 font-mono-tabular font-semibold text-[#0d7a6f]">{row.agentPay}</td>
                        <td className="p-3 text-[#334155]">{row.payoutTiming}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'STATUTES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                {
                  code: '45 CFR §155.220(j)',
                  title: 'CMS ACA Consumer Consent & Eligibility Review',
                  desc: 'Agents must obtain & retain consumer consent (with NPN, scope, duration, signature) BEFORE accessing HealthCare.gov, plus confirm eligibility accuracy before submission.',
                },
                {
                  code: 'F.S. §627.4554 & DFS-H1-1980',
                  title: 'Florida Annuity Suitability & Best Interest',
                  desc: 'Requires completing Form DFS-H1-1980 BEFORE recommending an annuity, evaluating liquid emergency reserves, senior (65+) suitability, and care/disclosure obligations.',
                },
                {
                  code: 'Form DFS-H1-1981',
                  title: 'Disclosure & Comparison of Annuity Contracts',
                  desc: 'Mandatory whenever replacing or exchanging an existing annuity—compares surrender penalties, fees, caps, and net consumer benefit.',
                },
                {
                  code: 'F.S. §626.99 (21-Day Free Look)',
                  title: 'Florida Annuity Unconditional Refund',
                  desc: 'Florida grants buyers at least 21 days after contract delivery to cancel any annuity unconditionally for a full refund (cash surrender + fees on variable contracts).',
                },
                {
                  code: 'Rule 69O-151 & OIR-B2-312',
                  title: 'Florida Life Insurance Replacement',
                  desc: 'Replacing an existing life policy requires Form OIR-B2-312, insurer notification, anti-twisting comparison, a 30-day free look, and keeping the old policy active until issued.',
                },
                {
                  code: 'F.S. §627.429',
                  title: 'Written HIV Testing Informed Consent',
                  desc: 'Insurers/agents must obtain a separate signed written consent explaining HIV antibody testing and confidentiality prior to drawing blood or oral fluids for underwriting.',
                },
                {
                  code: '42 CFR §422.2264 (48-Hr SOA)',
                  title: 'Medicare Scope of Appointment',
                  desc: 'Personal Medicare Advantage/Part D sales meetings require a signed SOA at least 48 hours before the appointment (walk-ins and final 4 days of enrollment excepted).',
                },
                {
                  code: 'F.S. §626.112 & §624.501',
                  title: '2-15 License & Carrier Appointments',
                  desc: 'An agent must hold an active Florida 2-15 license AND active carrier appointment ($60 biennial state fee per carrier) before soliciting coverage.',
                },
              ].map((s) => (
                <div key={s.code} className="bg-white border border-[#cbbda8] p-3.5 space-y-1">
                  <div className="font-mono-tabular font-bold text-[#0d7a6f]">{s.code}</div>
                  <div className="font-bold text-[#1b2530]">{s.title}</div>
                  <p className="text-[#334155] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
