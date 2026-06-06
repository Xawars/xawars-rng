'use client';

import { OperatorIcon } from '../OperatorIcon';
import type { Operator } from '../../data/types';

export type MasteryTier = 'unplayed' | 'recruit' | 'operative' | 'veteran' | 'elite';

interface MasteryTileProps {
  operator: Operator;
  tier: MasteryTier;
  deployments: number;
  onClick: (operator: Operator) => void;
}

const tierStyles: Record<MasteryTier, { ring: string; glow: string; bg: string }> = {
  unplayed: {
    ring: 'border-zinc-700/50',
    glow: '',
    bg: 'bg-zinc-800/30',
  },
  recruit: {
    ring: 'border-zinc-500',
    glow: '',
    bg: 'bg-zinc-800/60',
  },
  operative: {
    ring: 'border-amber-700',
    glow: 'shadow-[0_0_6px_rgba(180,83,9,0.3)]',
    bg: 'bg-zinc-800/80',
  },
  veteran: {
    ring: 'border-slate-300',
    glow: 'shadow-[0_0_8px_rgba(203,213,225,0.3)]',
    bg: 'bg-zinc-800',
  },
  elite: {
    ring: 'border-yellow-500',
    glow: 'shadow-[0_0_10px_rgba(234,179,8,0.4)]',
    bg: 'bg-zinc-800',
  },
};

export function MasteryTile({ operator, tier, deployments, onClick }: MasteryTileProps) {
  const style = tierStyles[tier];
  const isUnplayed = tier === 'unplayed';

  return (
    <button
      onClick={() => onClick(operator)}
      className={`
        relative group w-10 h-10 rounded-md border-2 flex items-center justify-center
        transition-all duration-200 hover:scale-110 hover:z-10
        ${style.ring} ${style.glow} ${style.bg}
        ${isUnplayed ? 'opacity-40 hover:opacity-70' : 'hover:brightness-125'}
      `}
      title={`${operator.name} — ${tier === 'unplayed' ? 'Not played' : `${tier} (${deployments} deploys)`}`}
    >
      <OperatorIcon
        id={operator.id}
        className={`w-6 h-6 ${isUnplayed ? 'grayscale' : ''}`}
      >
        <span className="text-[10px] font-bold text-zinc-400">
          {operator.name[0]}
        </span>
      </OperatorIcon>

      {/* Tier dot indicator */}
      {tier !== 'unplayed' && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-900 ${
          tier === 'recruit' ? 'bg-zinc-400' :
          tier === 'operative' ? 'bg-amber-600' :
          tier === 'veteran' ? 'bg-slate-300' :
          'bg-yellow-500'
        }`} />
      )}
    </button>
  );
}
