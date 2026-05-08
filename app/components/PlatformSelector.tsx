'use client';

import { Monitor, Gamepad2 } from 'lucide-react';
import { Platform } from '../data/types';

interface PlatformSelectorProps {
  currentPlatform: Platform | null;
  onSelect: (platform: Platform | null) => void;
}

export function PlatformSelector({ currentPlatform, onSelect }: PlatformSelectorProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-zinc-800">
          <Monitor className="w-5 h-5 text-zinc-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Platform</p>
          <div className="flex items-center gap-2">
            {currentPlatform === 'PC' && (
              <span className="flex items-center gap-1 text-sm font-bold text-blue-400">
                <Monitor className="w-4 h-4" /> PC
              </span>
            )}
            {currentPlatform === 'Console' && (
              <span className="flex items-center gap-1 text-sm font-bold text-purple-400">
                <Gamepad2 className="w-4 h-4" /> Console
              </span>
            )}
            {!currentPlatform && (
              <span className="text-sm font-bold text-zinc-500 uppercase">-</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-1">
        <button
          onClick={() => onSelect(null)}
          className={`px-2 py-1 text-xs font-bold uppercase rounded transition-colors ${
            !currentPlatform 
              ? 'bg-zinc-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Any
        </button>
        <button
          onClick={() => onSelect('PC')}
          className={`px-2 py-1 text-xs font-bold uppercase rounded flex items-center gap-1 transition-colors ${
            currentPlatform === 'PC' 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <Monitor className="w-3 h-3" />
        </button>
        <button
          onClick={() => onSelect('Console')}
          className={`px-2 py-1 text-xs font-bold uppercase rounded flex items-center gap-1 transition-colors ${
            currentPlatform === 'Console' 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <Gamepad2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}