'use client';

import { Monitor, Gamepad2 } from 'lucide-react';
import { Platform } from '../data/types';

interface PlatformSelectorProps {
  currentPlatform: Platform | null;
  onSelect: (platform: Platform | null) => void;
}

export function PlatformSelector({ currentPlatform, onSelect }: PlatformSelectorProps) {
  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 shadow-inner">
            <Monitor className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Platform</p>
            <div className="flex items-center gap-2">
              {currentPlatform === 'PC' && (
                <span className="flex items-center gap-1.5 text-lg font-black uppercase tracking-wide text-blue-400 leading-none">
                  <Monitor className="w-4 h-4" /> PC
                </span>
              )}
              {currentPlatform === 'Console' && (
                <span className="flex items-center gap-1.5 text-lg font-black uppercase tracking-wide text-purple-400 leading-none">
                  <Gamepad2 className="w-4 h-4" /> Console
                </span>
              )}
              {!currentPlatform && (
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
            !currentPlatform 
              ? 'bg-zinc-700 text-white shadow-md' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Any
        </button>
        <button
          onClick={() => onSelect('PC')}
          className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-2 transition-all ${
            currentPlatform === 'PC' 
              ? 'bg-blue-500/20 text-blue-400 shadow-md border border-blue-500/30' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" /> PC
        </button>
        <button
          onClick={() => onSelect('Console')}
          className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md flex items-center justify-center gap-2 transition-all ${
            currentPlatform === 'Console' 
              ? 'bg-purple-500/20 text-purple-400 shadow-md border border-purple-500/30' 
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" /> Console
        </button>
      </div>
    </div>
  );
}