'use client';

import { Swords, ShieldHalf } from 'lucide-react';
import { Side } from '../data/types';

interface SideSelectorProps {
  currentSide: Side | null;
  onSelect: (side: Side | null) => void;
}

export function SideSelector({ currentSide, onSelect }: SideSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Side</span>
      <div className="flex gap-1 p-0.5 bg-black/40 rounded-md border border-white/5">
        <button
          onClick={() => onSelect(null)}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
            !currentSide
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Any
        </button>
        <button
          onClick={() => onSelect('attacker')}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all ${
            currentSide === 'attacker'
              ? 'bg-orange-500/20 text-orange-400 shadow-sm border border-orange-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Swords className="w-3 h-3" /> ATK
        </button>
        <button
          onClick={() => onSelect('defender')}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all ${
            currentSide === 'defender'
              ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <ShieldHalf className="w-3 h-3" /> DEF
        </button>
      </div>
    </div>
  );
}
