'use client';

import { OperatorIcon } from '../OperatorIcon';
import type { Operator } from '../../data/types';

export type MasteryTier = 'unplayed' | 'recruit' | 'operative' | 'veteran' | 'elite';

interface MasteryRowProps {
  operator: Operator;
  tier: MasteryTier;
  deployments: number;
  kd: number | null;
  onClick: (operator: Operator) => void;
}

const tierLabels: Record<MasteryTier, string> = {
  unplayed: '\u2014',
  recruit: 'RCT',
  operative: 'OPR',
  veteran: 'VET',
  elite: 'ELT',
};

const tierBadgeStyles: Record<MasteryTier, string> = {
  unplayed: 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50',
  recruit: 'bg-zinc-800 text-zinc-300 border-zinc-600/50',
  operative: 'bg-amber-950/50 text-amber-500 border-amber-700/50',
  veteran: 'bg-slate-900/50 text-slate-200 border-slate-400/50',
  elite: 'bg-yellow-950/50 text-yellow-500 border-yellow-600/50',
};

const tierIconRing: Record<MasteryTier, string> = {
  unplayed: 'border-zinc-700/50',
  recruit: 'border-zinc-500',
  operative: 'border-amber-700',
  veteran: 'border-slate-300',
  elite: 'border-yellow-500',
};

export function MasteryRow({ operator, tier, deployments, kd, onClick }: MasteryRowProps) {
  const isUnplayed = tier === 'unplayed';
  const kdColor = kd !== null && kd >= 1 ? 'text-green-400' : kd !== null ? 'text-red-400' : 'text-zinc-600';

  return (
    <button
      onClick={() => onClick(operator)}
      className={`
        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-150
        hover:bg-zinc-800 hover:border-zinc-600/50 group text-left
        ${isUnplayed
          ? 'bg-zinc-900/30 border-zinc-800/50 opacity-50 hover:opacity-80'
          : 'bg-zinc-900/50 border-zinc-800/50'
        }
      `}
    >
      {/* Icon */}
      <div className={`w-8 h-8 shrink-0 rounded-md border-2 flex items-center justify-center ${tierIconRing[tier]} ${
        operator.side === 'attacker' ? 'bg-orange-900/20' : 'bg-blue-900/20'
      }`}>
        <OperatorIcon
          id={operator.id}
          className={`w-5 h-5 ${isUnplayed ? 'grayscale opacity-50' : ''}`}
        >
          <span className="text-[9px] font-bold text-zinc-500">{operator.name[0]}</span>
        </OperatorIcon>
      </div>

      {/* Name + side */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold uppercase tracking-wide truncate ${isUnplayed ? 'text-zinc-500' : 'text-zinc-200'}`}>
          {operator.name}
        </p>
        <p className={`text-[9px] font-medium uppercase tracking-wider ${
          operator.side === 'attacker' ? 'text-orange-500/60' : 'text-blue-500/60'
        }`}>
          {operator.side === 'attacker' ? 'ATK' : 'DEF'}
          {deployments > 0 && <span className="text-zinc-600 ml-1">· {deployments}×</span>}
        </p>
      </div>

      {/* Tier badge */}
      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${tierBadgeStyles[tier]}`}>
        {tierLabels[tier]}
      </span>

      {/* K/D */}
      <span className={`shrink-0 text-xs font-black w-10 text-right tabular-nums ${kdColor}`}>
        {kd !== null ? kd.toFixed(2) : '\u2014'}
      </span>
    </button>
  );
}
