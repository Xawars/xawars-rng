'use client';

import { Crosshair, Shuffle } from 'lucide-react';

interface KillTargetSelectorProps {
  value: number | null; // null = random
  onSelect: (value: number | null) => void;
}

const PRESETS = [3, 5, 7, 10, 15, 20];

export function KillTargetSelector({ value, onSelect }: KillTargetSelectorProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
      <Crosshair className="w-3.5 h-3.5 text-green-500 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 shrink-0 w-10">Kills</span>
      <div className="flex gap-1 flex-1 p-0.5 bg-black/40 rounded-md border border-white/5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-0.5 ${
            value === null
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
          title="Random (1-20)"
        >
          <Shuffle className="w-3 h-3" />
        </button>
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
              value === n
                ? 'bg-green-500/20 text-green-400 shadow-sm border border-green-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
