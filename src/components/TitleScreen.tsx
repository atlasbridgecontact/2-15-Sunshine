import React from 'react';
import { BookOpen, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { SnesOfficeCanvas } from './SnesOfficeCanvas';
import { AgencyState } from '../types/game';
import { getCalendarInfo } from '../data/floridaRegulations';

interface TitleScreenProps {
  savedAgency: AgencyState | null;
  muted: boolean;
  onToggleMute: () => void;
  onStartNew: () => void;
  onContinue: () => void;
  onOpenManual: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  savedAgency,
  muted,
  onToggleMute,
  onStartNew,
  onContinue,
  onOpenManual,
}) => {
  const cal = savedAgency ? getCalendarInfo(savedAgency.month) : null;

  return (
    <div className="relative w-full min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#131c26] flex flex-col justify-between gap-6 select-none">
      {/* Live 16-bit Pixel Coastal Agency Backdrop */}
      <div className="fixed inset-0 pointer-events-none">
        <SnesOfficeCanvas mode="TITLE" />
        <div className="absolute inset-0 bg-gradient-to-b sm:bg-gradient-to-r from-[#0e1722]/92 via-[#0e1722]/80 to-[#0e1722]/45" />
        <div className="absolute inset-0 crt-scanlines" />
      </div>

      {/* Top minimal audio control */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
        <span className="font-mono-tabular text-xs text-[#d9cbb8] tracking-wide leading-snug">
          FLORIDA 2-15 SIMULATOR
          <span className="hidden sm:inline"> · HEALTH · LIFE · ANNUITIES</span>
        </span>
        <button
          type="button"
          onClick={onToggleMute}
          className="snes-btn bg-[#1b2838] text-[#f4efe6] px-3 py-2 min-h-[44px] text-xs font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-[#e09f3e]" /> : <Volume2 className="w-4 h-4 text-[#59c3b4]" />}
          <span>{muted ? 'Audio Off' : '16-Bit SFX'}</span>
        </button>
      </div>

      {/* Main Title Lockup over calm left negative space */}
      <div className="relative z-10 max-w-2xl px-4 sm:px-6 md:px-14 my-auto py-2">
        {/* Bespoke inline SVG Title Lockup */}
        <svg
          viewBox="0 0 560 132"
          className="w-full max-w-xl mb-4 sm:mb-5 drop-shadow-[0_4px_0_rgba(9,14,20,0.95)]"
          role="img"
          aria-label="Sunshine 2-15"
        >
          <rect x="4" y="8" width="552" height="116" fill="#1b2838" stroke="#d9cbb8" strokeWidth="4" />
          <rect x="10" y="14" width="540" height="104" fill="none" stroke="#0d7a6f" strokeWidth="2" />
          {/* Florida Sun Emblem */}
          <rect x="26" y="28" width="64" height="64" fill="#10383a" stroke="#e09f3e" strokeWidth="3" />
          <rect x="40" y="42" width="36" height="36" fill="#e09f3e" />
          <rect x="48" y="50" width="20" height="20" fill="#fce9a8" />
          <rect x="26" y="76" width="64" height="16" fill="#0d7a6f" />
          {/* Pixel Title Typography */}
          <text
            x="110"
            y="62"
            fill="#f4efe6"
            fontFamily="'Press Start 2P', monospace"
            fontSize="26"
            letterSpacing="2"
          >
            SUNSHINE 2-15
          </text>
          <text
            x="112"
            y="92"
            fill="#59c3b4"
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="14"
            fontWeight="700"
            letterSpacing="1"
          >
            FLORIDA HEALTH · LIFE · ANNUITY DESK
          </text>
        </svg>

        <p className="text-[#e7dfd3] text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mb-5 sm:mb-7">
          Launch your independent Florida 2-15 agency. Interview clients, pass strict DFS &amp; CMS compliance gates in legal order, calculate real 2026 FPL subsidies, DIME life needs, and annuity suitability, and grow your book of recurring commissions.
        </p>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          {savedAgency ? (
            <>
              <button
                type="button"
                onClick={onContinue}
                className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-6 py-3 min-h-[48px] text-sm font-semibold inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Continue Agency</span>
              </button>
              <button
                type="button"
                onClick={onStartNew}
                className="snes-btn bg-[#25364a] hover:bg-[#2f455e] text-[#f4efe6] px-5 py-3 min-h-[48px] text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Startup</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="snes-btn bg-[#0d7a6f] hover:bg-[#109386] text-[#f4efe6] px-7 py-3 min-h-[48px] text-sm font-semibold inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start Agency</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenManual}
            className="snes-btn bg-[#f4efe6] hover:bg-[#ffffff] text-[#1b2530] px-5 py-3 min-h-[48px] text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#0d7a6f]" />
            <span>2-15 Field Manual</span>
          </button>
        </div>

        {savedAgency && cal && (
          <div className="mt-4 text-xs font-mono-tabular text-[#d9cbb8] leading-relaxed">
            Saved Career: {cal.monthName} {cal.year} · Cash ${savedAgency.cash.toLocaleString()} · Compliance {savedAgency.complianceScore}% · {savedAgency.totalCasesCompleted} Clients Served
          </div>
        )}
      </div>

      {/* Single flat control-hint line */}
      <div className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-[#b8c4d0]">
        <span className="hidden md:inline">
          WASD / Arrows Move · Space / Click Greet · Enter Start · M Mute · Esc Pause
        </span>
        <span className="md:hidden">
          Touch D-Pad or Tap Floor to Walk · Tap Buttons to Greet &amp; Quote
        </span>
        <span>Up-to-Date 2026 FPL · F.S. §627.4554 · 45 CFR §155.220</span>
      </div>
    </div>
  );
};
