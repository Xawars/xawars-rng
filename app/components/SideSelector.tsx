'use client';

import { Swords, ShieldHalf } from 'lucide-react';
import { Side } from '../data/types';

interface SideSelectorProps {
  currentSide: Side | null;
  onSelect: (side: Side | null) => void;
}

export function SideSelector({ currentSide, onSelect }: SideSelectorProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 shadow-inner">
            <Swords className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Side</p>
            <div className="flex items-center gap-2">
              {currentSide === 'attacker' && (
                <span className="flex items-center gap-1.5 text-lg font-black uppercase tracking-wide text-orange-400 leading-none">
                  <Swords className="w-4 h-4" /> Attacker
                </span>
              )}
              {currentSide === 'defender' && (
                <span className="flex items-center gap-1.5 text-lg font-black uppercase tracking-wide text-blue-400 leading-none">
                  <ShieldHalf className="w-4 h-4" /> Defender
                </span>
              )}
              {!currentSide && (
                <span className="text-lg font-black uppercase tracking-wide text-white leading-none">ANY</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
        <button
          onClick={() => onSelect(null)}
          className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            !currentSide
              ? 'bg-zinc-700 text-white shadow-md'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Any
        </button>
        <button
          onClick={() => onSelect('attacker')}
          className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all ${
            currentSide === 'attacker'
              ? 'bg-orange-500/20 text-orange-400 shadow-md border border-orange-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Swords className="w-3.5 h-3.5" /> ATK
        </button>
        <button
          onClick={() => onSelect('defender')}
          className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-1.5 transition-all ${
            currentSide === 'defender'
              ? 'bg-blue-500/20 text-blue-400 shadow-md border border-blue-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <ShieldHalf className="w-3.5 h-3.5" /> DEF
        </button>
      </div>
    </div>
  );
}
