'use client';

import { useState, useEffect } from 'react';
import { Target, Shuffle } from 'lucide-react';
import { MatchType } from '../data/types';
import { MATCH_TYPES, getRandomMatchType } from '../data/operators';

interface MatchTypeSelectorProps {
  currentType: MatchType | null;
  onSelect: (type: MatchType | null) => void;
  isRollingParent?: boolean;
}

export function MatchTypeSelector({ currentType, onSelect, isRollingParent }: MatchTypeSelectorProps) {
  const [displayType, setDisplayType] = useState<string>(currentType || 'ANY');
  const [isRolling, setIsRolling] = useState(false);

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
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 shadow-inner">
            <Target className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Match Type</p>
            <p className="text-lg font-black uppercase tracking-wide text-white leading-none">
              {displayType}
            </p>
          </div>
        </div>
        
        <button
          type="button"
          onClick={handleRoll}
          disabled={isRolling || isRollingParent}
          className={`p-2.5 rounded-lg border transition-all ${
            isRolling 
              ? 'bg-yellow-500/20 border-yellow-500/30' 
              : 'bg-zinc-800/80 border-zinc-700/50 hover:bg-zinc-700 hover:border-zinc-600'
          }`}
          title="Randomize Match Type"
        >
          <Shuffle className={`w-4 h-4 ${isRolling ? 'text-yellow-500 animate-spin' : 'text-zinc-400'}`} />
        </button>
      </div>
      
      <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
            !currentType 
              ? 'bg-zinc-700 text-white shadow-md' 
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
            className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
              currentType === mt 
                ? 'bg-yellow-500/20 text-yellow-500 shadow-md border border-yellow-500/30' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {mt === 'Quick Match' ? 'QM' : mt === 'Deathmatch' ? 'DM' : mt}
          </button>
        ))}
      </div>
    </div>
  );
}