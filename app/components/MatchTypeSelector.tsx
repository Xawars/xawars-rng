'use client';

import { useState, useEffect } from 'react';
import { Target, Shuffle } from 'lucide-react';
import { Button } from './ui/Button';
import { MatchType } from '../data/types';
import { MATCH_TYPES, getRandomMatchType } from '../data/operators';

interface MatchTypeSelectorProps {
  currentType: MatchType | null;
  onRoll: (type: MatchType) => void;
  isRollingParent?: boolean;
}

export function MatchTypeSelector({ currentType, onRoll, isRollingParent }: MatchTypeSelectorProps) {
  const [displayType, setDisplayType] = useState<string>(currentType || 'ANY TYPE');
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!isRolling) {
      setDisplayType(currentType || 'ANY TYPE');
    }
  }, [currentType, isRolling]);

  const handleRoll = () => {
    if (isRolling || isRollingParent) return;
    
    setIsRolling(true);
    let rolls = 0;
    const maxRolls = 15;
    
    // Play a ticking sound here if we wanted
    
    const interval = setInterval(() => {
      setDisplayType(MATCH_TYPES[Math.floor(Math.random() * MATCH_TYPES.length)]);
      rolls++;
      if (rolls >= maxRolls) {
        clearInterval(interval);
        const finalType = getRandomMatchType();
        setDisplayType(finalType);
        onRoll(finalType);
        setIsRolling(false);
      }
    }, 50);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg relative overflow-hidden group">
      {/* Background glow when rolling */}
      {isRolling && (
        <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />
      )}
      
      <div className="flex items-center gap-3 relative z-10">
        <div className={`p-2 rounded-lg transition-colors ${isRolling ? 'bg-yellow-500/20' : 'bg-zinc-800'}`}>
          <Target className={`w-5 h-5 transition-colors ${isRolling ? 'text-yellow-500' : 'text-zinc-400 group-hover:text-yellow-500'}`} />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Match Type</p>
          <div className="h-6 overflow-hidden relative">
            <p 
              className={`text-lg font-black uppercase tracking-tight transition-all duration-75 ${
                isRolling 
                  ? 'text-yellow-500 blur-[0.5px] translate-y-0.5' 
                  : 'text-white translate-y-0'
              }`}
            >
              {displayType}
            </p>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleRoll} 
        disabled={isRolling || isRollingParent}
        variant="ghost"
        size="sm"
        icon={Shuffle}
        className={`relative z-10 border border-zinc-700/50 hover:border-yellow-500/50 transition-all ${
          isRolling ? 'scale-95 opacity-50' : 'hover:bg-yellow-500/10'
        }`}
      >
        Roll
      </Button>
    </div>
  );
}
