'use client';

import { useState, useEffect } from 'react';
import { Target, Shuffle, Monitor, Gamepad2 } from 'lucide-react';
import { Button } from './ui/Button';
import { MatchType, Platform } from '../data/types';
import { MATCH_TYPES, getRandomMatchType, getRandomPlatform } from '../data/operators';

interface MatchTypeSelectorProps {
  currentType: MatchType | null;
  currentPlatform: Platform | null;
  onRoll: (type: MatchType) => void;
  onPlatformRoll: (platform: Platform) => void;
  isRollingParent?: boolean;
}

export function MatchTypeSelector({ currentType, currentPlatform, onRoll, onPlatformRoll, isRollingParent }: MatchTypeSelectorProps) {
  const [displayType, setDisplayType] = useState<string>(currentType || 'ANY TYPE');
  const [displayPlatform, setDisplayPlatform] = useState<string>(currentPlatform || '');
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!isRolling) {
      setDisplayType(currentType || 'ANY TYPE');
      setDisplayPlatform(currentPlatform || '');
    }
  }, [currentType, currentPlatform, isRolling]);

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
        onRoll(finalType);
        
        // If Ranked, also roll platform
        if (finalType === 'Ranked') {
          const finalPlatform = getRandomPlatform();
          setDisplayPlatform(finalPlatform);
          onPlatformRoll(finalPlatform);
        } else {
          setDisplayPlatform('');
          onPlatformRoll('' as Platform);
        }
        
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
          <div className="h-6 overflow-hidden relative flex items-center gap-2">
            <p 
              className={`text-lg font-black uppercase tracking-tight transition-all duration-75 ${
                isRolling 
                  ? 'text-yellow-500 blur-[0.5px] translate-y-0.5' 
                  : 'text-white translate-y-0'
              }`}
            >
              {displayType}
            </p>
            {displayPlatform && (
              <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                displayPlatform === 'PC' 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' 
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/50'
              }`}>
                {displayPlatform === 'PC' ? (
                  <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> PC</span>
                ) : (
                  <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> CON</span>
                )}
              </span>
            )}
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
