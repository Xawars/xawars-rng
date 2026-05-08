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
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-800">
          <Target className="w-5 h-5 text-zinc-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Match Type</p>
          <p className="text-lg font-black uppercase text-white">
            {displayType}
          </p>
        </div>
      </div>
      
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`px-2 py-1 text-xs font-bold uppercase rounded transition-colors ${
            !currentType 
              ? 'bg-zinc-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Any
        </button>
        {MATCH_TYPES.map((mt) => (
          <button
            key={mt}
            type="button"
            onClick={() => onSelect(mt)}
            className={`px-2 py-1 text-xs font-bold uppercase rounded transition-colors ${
              currentType === mt 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {mt === 'Quick Match' ? 'QM' : mt === 'Deathmatch' ? 'DM' : mt}
          </button>
        ))}
        <button
          type="button"
          onClick={handleRoll}
          disabled={isRolling || isRollingParent}
          className={`p-2 rounded-lg transition-colors ${
            isRolling 
              ? 'bg-yellow-500/20' 
              : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
        >
          <Shuffle className={`w-4 h-4 ${isRolling ? 'text-yellow-500 animate-spin' : 'text-zinc-400'}`} />
        </button>
      </div>
    </div>
  );
}