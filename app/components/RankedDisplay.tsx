'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Shield, Crown, Trophy, TrendingUp, Monitor, Gamepad2, RotateCcw, Pencil, Check, X } from 'lucide-react';
import { RankedStats, RankProgress, RankTier, RankDivision } from '../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const TIER_ORDER: RankTier[] = [
  'Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Champion',
];

export const DIVISION_RP_MAX = 100;
export const WIN_RP  = 10;
export const LOSS_RP = 5;

export const DEFAULT_RANK_PROGRESS: RankProgress = {
  tier: 'Copper', division: 1, rp: 0, peakTier: 'Copper', peakDivision: 1,
};

export const DEFAULT_RANKED_STATS: RankedStats = {
  PC:      { ...DEFAULT_RANK_PROGRESS },
  Console: { ...DEFAULT_RANK_PROGRESS },
};

const TIER_CONFIG: Record<RankTier, { color: string; glow: string; bar: string }> = {
  Copper:   { color: '#B87333', glow: '#B8733340', bar: '#B87333' },
  Bronze:   { color: '#CD7F32', glow: '#CD7F3240', bar: '#CD7F32' },
  Silver:   { color: '#C0C0C0', glow: '#C0C0C040', bar: '#C0C0C0' },
  Gold:     { color: '#FFD700', glow: '#FFD70040', bar: '#FFD700' },
  Platinum: { color: '#E8E8E8', glow: '#E8E8E840', bar: '#E8E8E8' },
  Emerald:  { color: '#50C878', glow: '#50C87840', bar: '#50C878' },
  Diamond:  { color: '#B9F2FF', glow: '#B9F2FF40', bar: '#B9F2FF' },
  Champion: { color: '#ff6ec7', glow: '#ff6ec740', bar: ''        },
};

const ROMAN: Record<RankDivision, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' };
const DIVISIONS: RankDivision[] = [1, 2, 3, 4, 5];

// ─── Tier Icon ────────────────────────────────────────────────────────────────

function TierIcon({ tier, size = 20 }: { tier: RankTier; size?: number }) {
  const cfg = TIER_CONFIG[tier];
  if (tier === 'Champion') {
    return <Crown size={size} color="#ff6ec7" style={{ filter: 'drop-shadow(0 0 5px #ff6ec7)' }} />;
  }
  return (
    <Shield size={size} fill={cfg.color} color={cfg.color}
      style={{ filter: `drop-shadow(0 0 4px ${cfg.glow})` }} />
  );
}

function RainbowSpan({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className} style={{
      background: 'linear-gradient(90deg,#f472b6,#a855f7,#60a5fa,#34d399,#fbbf24,#f472b6)',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      animation: 'rainbowShift 3s linear infinite',
    }}>
      {children}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ rp, tier }: { rp: number; tier: RankTier }) {
  const cfg = TIER_CONFIG[tier];
  const isChamp = tier === 'Champion';
  const pct = Math.min((rp / DIVISION_RP_MAX) * 100, 100);

  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: isChamp
            ? 'linear-gradient(90deg,#f472b6,#a855f7,#60a5fa,#34d399,#fbbf24)'
            : cfg.bar,
          boxShadow: `0 0 6px ${cfg.glow}`,
        }}
      />
    </div>
  );
}

// ─── Rank Editor (inline) ─────────────────────────────────────────────────────

interface RankEditorProps {
  progress: RankProgress;
  onApply: (tier: RankTier, division: RankDivision, rp: number) => void;
  onClose: () => void;
}

function RankEditor({ progress, onApply, onClose }: RankEditorProps) {
  const [draftTier, setDraftTier] = useState<RankTier>(progress.tier);
  const [draftDiv,  setDraftDiv]  = useState<RankDivision>(progress.division);
  const [draftRp,   setDraftRp]   = useState<string>(String(progress.rp));
  const isChamp = draftTier === 'Champion';
  const cfg = TIER_CONFIG[draftTier];

  const submit = () => {
    const rp = Math.max(0, Math.min(DIVISION_RP_MAX, Number(draftRp) || 0));
    onApply(draftTier, isChamp ? 1 : draftDiv, rp);
    onClose();
  };

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-black/40 p-2.5 space-y-2.5">
      {/* Tier grid */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Tier</p>
        <div className="grid grid-cols-4 gap-1">
          {TIER_ORDER.map(t => {
            const c = TIER_CONFIG[t];
            const active = draftTier === t;
            return (
              <button key={t} onClick={() => setDraftTier(t)}
                className="py-0.5 rounded text-[10px] font-bold border transition-all"
                style={{
                  borderColor: active ? c.color : 'rgba(255,255,255,0.08)',
                  background:  active ? `${c.color}20`  : 'transparent',
                  color:       active ? c.color : 'rgba(255,255,255,0.3)',
                }}>
                {t === 'Champion' ? '👑' : t.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Division row */}
      {!isChamp && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Division</p>
          <div className="grid grid-cols-5 gap-1">
            {DIVISIONS.map(d => {
              const active = draftDiv === d;
              return (
                <button key={d} onClick={() => setDraftDiv(d)}
                  className="py-0.5 rounded text-[11px] font-black border transition-all"
                  style={{
                    borderColor: active ? cfg.color : 'rgba(255,255,255,0.08)',
                    background:  active ? `${cfg.color}20` : 'transparent',
                    color:       active ? cfg.color : 'rgba(255,255,255,0.3)',
                  }}>
                  {ROMAN[d]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* RP input + actions in one row */}
      <div className="flex gap-1.5 items-center">
        <input
          type="number" min={0} max={DIVISION_RP_MAX} value={draftRp}
          onChange={e => setDraftRp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="RP"
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-white/25 transition-colors min-w-0"
        />
        <button onClick={submit}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all whitespace-nowrap">
          <Check size={10} /> Set
        </button>
        <button onClick={onClose}
          className="p-1 rounded text-white/30 hover:text-white/60 border border-transparent hover:border-white/10 transition-all">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────

interface PlatformCardProps {
  platform: 'PC' | 'Console';
  progress: RankProgress;
  isActive: boolean;
  flashTierUp: boolean;
  onClick: () => void;
  onSetRank: (tier: RankTier, division: RankDivision, rp: number) => void;
}

function PlatformCard({ platform, progress, isActive, flashTierUp, onClick, onSetRank }: PlatformCardProps) {
  const [editing, setEditing] = useState(false);
  const { tier, division, rp, peakTier, peakDivision } = progress;
  const cfg = TIER_CONFIG[tier];
  const isChamp = tier === 'Champion';

  return (
    <div
      className="rounded-xl p-3 transition-all duration-200 cursor-pointer select-none group"
      onClick={() => { if (!editing) onClick(); }}
      style={{
        border: `1px solid ${isActive
          ? (platform === 'PC' ? 'rgba(96,165,250,0.55)' : 'rgba(167,139,250,0.55)')
          : 'rgba(255,255,255,0.07)'}`,
        background: isActive
          ? (platform === 'PC' ? 'rgba(96,165,250,0.06)' : 'rgba(167,139,250,0.06)')
          : 'rgba(255,255,255,0.025)',
        boxShadow: flashTierUp ? `0 0 20px ${cfg.glow}` : 'none',
      }}
    >
      {/* Top row: platform label + edit btn */}
      <div className="flex items-center gap-1.5 mb-2">
        {platform === 'PC'
          ? <Monitor  size={11} className={isActive ? 'text-blue-400'   : 'text-white/25'} />
          : <Gamepad2 size={11} className={isActive ? 'text-purple-400' : 'text-white/25'} />}
        <span className={`text-[10px] font-bold uppercase tracking-widest ${
          isActive ? (platform === 'PC' ? 'text-blue-400' : 'text-purple-400') : 'text-white/25'
        }`}>
          {platform}
        </span>
        {isActive && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-white/30 bg-white/5 px-1 py-0.5 rounded ml-1">
            active
          </span>
        )}

        {/* Edit button — stop propagation so clicking it doesn't switch platform */}
        <button
          className={`ml-auto p-1 rounded transition-all ${
            editing
              ? 'text-white/60 bg-white/10'
              : 'text-white/0 group-hover:text-white/30 hover:!text-white/60 hover:bg-white/5'
          }`}
          onClick={e => { e.stopPropagation(); setEditing(v => !v); }}
          title="Edit rank"
        >
          <Pencil size={9} />
        </button>
      </div>

      {/* Rank name + peak */}
      <div className="flex items-center gap-2 mb-2">
        <TierIcon tier={tier} size={20} />
        <div className="min-w-0">
          <div className="text-sm font-black leading-tight">
            {isChamp
              ? <RainbowSpan>Champion</RainbowSpan>
              : <span style={{ color: cfg.color }}>{tier} {ROMAN[division]}</span>}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/30 mt-0.5">
            <TrendingUp size={8} />
            <span>Peak: {peakTier === 'Champion' ? 'Champion' : `${peakTier} ${ROMAN[peakDivision]}`}</span>
          </div>
        </div>

        {/* RP label right-aligned */}
        <div className="ml-auto text-right">
          <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>{rp}</span>
          <span className="text-[9px] text-white/25 font-mono"> /{DIVISION_RP_MAX}</span>
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar rp={rp} tier={tier} />

      {/* Inline editor */}
      {editing && (
        <div onClick={e => e.stopPropagation()}>
          <RankEditor
            progress={progress}
            onApply={onSetRank}
            onClose={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface RankedDisplayProps {
  rankedStats: RankedStats;
  selectedPlatform: 'PC' | 'Console';
  onWin: () => void;
  onLoss: () => void;
  onPlatformChange: (platform: 'PC' | 'Console') => void;
  onReset: () => void;
  onSetRank: (platform: 'PC' | 'Console', tier: RankTier, division: RankDivision, rp: number) => void;
  onAddRP: (platform: 'PC' | 'Console', delta: number) => void;
}

export function RankedDisplay({
  rankedStats, selectedPlatform,
  onWin, onLoss, onPlatformChange, onReset, onSetRank, onAddRP,
}: RankedDisplayProps) {
  const [flashTierUp, setFlashTierUp] = useState<'PC' | 'Console' | null>(null);
  const [rpInput, setRpInput] = useState('');
  const prevStats = useRef(rankedStats);

  useEffect(() => {
    const prev = prevStats.current;
    (['PC', 'Console'] as const).forEach(p => {
      if (TIER_ORDER.indexOf(rankedStats[p].tier) > TIER_ORDER.indexOf(prev[p].tier)) {
        setFlashTierUp(p);
        setTimeout(() => setFlashTierUp(null), 900);
      }
    });
    prevStats.current = rankedStats;
  }, [rankedStats]);

  const isChampion = rankedStats[selectedPlatform].tier === 'Champion';

  const submitRpInput = () => {
    const n = parseInt(rpInput, 10);
    if (!isNaN(n) && n !== 0) {
      onAddRP(selectedPlatform, n);
      setRpInput('');
    }
  };

  return (
    <>
      <style>{`
        @keyframes rainbowShift { to { background-position: 200% center; } }
      `}</style>

      <div className="flex flex-col gap-2.5 w-60">

        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-white/8">
          <Trophy size={13} className="text-yellow-500/80" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white/50">Ranked</span>
        </div>

        {/* Platform cards — clicking switches active platform */}
        <div className="flex flex-col gap-1.5">
          {(['PC', 'Console'] as const).map(p => (
            <PlatformCard
              key={p}
              platform={p}
              progress={rankedStats[p]}
              isActive={selectedPlatform === p}
              flashTierUp={flashTierUp === p}
              onClick={() => onPlatformChange(p)}
              onSetRank={(tier, div, rp) => onSetRank(p, tier, div, rp)}
            />
          ))}
        </div>

        {/* Win / Loss + RP input — all in a compact block */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2 space-y-2">
          {/* Platform hint */}
          <p className="text-[9px] uppercase tracking-widest text-white/25 font-bold text-center">
            {selectedPlatform === 'PC' ? '🖥' : '🎮'} {selectedPlatform} — active
          </p>

          {/* Win / Loss side by side */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="ranked-win-btn"
              onClick={onWin}
              disabled={isChampion}
              className="flex flex-col items-center py-2.5 rounded-lg border transition-all duration-150 hover:scale-[1.03] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ borderColor: 'rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.07)', color: '#4ade80' }}
            >
              <span className="text-base font-black leading-none">+{WIN_RP}</span>
              <span className="text-[9px] tracking-widest opacity-60 mt-0.5">WIN</span>
            </button>
            <button
              id="ranked-loss-btn"
              onClick={onLoss}
              className="flex flex-col items-center py-2.5 rounded-lg border transition-all duration-150 hover:scale-[1.03] active:scale-95"
              style={{ borderColor: 'rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.07)', color: '#f87171' }}
            >
              <span className="text-base font-black leading-none">−{LOSS_RP}</span>
              <span className="text-[9px] tracking-widest opacity-60 mt-0.5">LOSS</span>
            </button>
          </div>

          {/* Manual RP row */}
          <div className="flex gap-1">
            <input
              type="number"
              value={rpInput}
              onChange={e => setRpInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitRpInput()}
              placeholder="+10 or −5…"
              className="flex-1 bg-white/5 border border-white/8 rounded-md px-2 py-1 text-[11px] font-mono text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors min-w-0"
            />
            <button
              onClick={submitRpInput}
              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/6 hover:bg-white/10 text-white/50 hover:text-white/80 border border-white/8 transition-all"
            >
              +RP
            </button>
          </div>
        </div>

        {/* Reset */}
        <button
          id="ranked-reset-btn"
          onClick={onReset}
          className="flex items-center justify-center gap-1.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white/45 border border-transparent hover:border-white/8 transition-all"
        >
          <RotateCcw size={9} /> Reset Season
        </button>

      </div>
    </>
  );
}
