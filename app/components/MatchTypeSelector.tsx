'use client';

import { useState, useEffect } from 'react';
import { Shuffle } from 'lucide-react';
import { MatchType } from '../data/types';
import { MATCH_TYPES, getRandomMatchType } from '../data/operators';

interface MatchTypeSelectorProps {
  currentType: MatchType | null;
  onSelect: (type: MatchType | null) => void;
  isRollingParent?: boolean;
}

export function MatchTypeSelector({ currentType, onSelect, isRollingParent }: MatchTypeSelectorProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [displayType, setDisplayType] = useState<string>(currentType || 'ANY');

  useEffect(() => {
    if (!isRolling) {
      setDisplayType(currentType || 'ANY');
    }
  }, [currentType, isRolling]);

  const handleRoll = () => {
    if (isRolling || isRollingParent) return;
    setIsRolling(true);
    let rolls = 0;
    const maxRolls = 15;
    const interval = setInterval(() => {
      setDisplayType(MATCH_TYPES[Math.floor(Math.random() * MATCH_TYPES.length)]);
      rolls++;
      if (rolls >= maxRolls) {
        clearInterval(interval);
        const finalType = getRandomMatchType();
        setDisplayType(finalType);
        onSelect(finalType);
        setIsRolling(false);
      }
    }, 50);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 shrink-0 w-14">Match</span>
      <div className="flex gap-1 flex-1 p-0.5 bg-black/40 rounded-md border border-white/5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
            !currentType
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Any
        </button>
        {MATCH_TYPES.map((mt) => (
          <button
            key={mt}
            type="button"
            onClick={() => onSelect(mt)}
            className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
              currentType === mt
                ? 'bg-yellow-500/20 text-yellow-500 shadow-sm border border-yellow-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {mt === 'Quick Match' ? 'QM' : mt === 'Deathmatch' ? 'DM' : mt === 'Unranked' ? 'UN' : mt}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleRoll}
        disabled={isRolling || isRollingParent}
        className={`p-1.5 rounded-md border transition-all shrink-0 ${
          isRolling
            ? 'bg-yellow-500/20 border-yellow-500/30'
            : 'bg-zinc-800/80 border-zinc-700/50 hover:bg-zinc-700'
        }`}
        title="Randomize"
      >
        <Shuffle className={`w-3.5 h-3.5 ${isRolling ? 'text-yellow-500 animate-spin' : 'text-zinc-400'}`} />
      </button>
    </div>
  );
}
