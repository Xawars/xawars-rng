'use client';

import { Monitor, Gamepad2 } from 'lucide-react';
import { Platform } from '../data/types';

interface PlatformSelectorProps {
  currentPlatform: Platform | null;
  onSelect: (platform: Platform | null) => void;
}

export function PlatformSelector({ currentPlatform, onSelect }: PlatformSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Platform</span>
      <div className="flex gap-1 p-0.5 bg-black/40 rounded-md border border-white/5">
        <button
          onClick={() => onSelect(null)}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
            !currentPlatform
              ? 'bg-zinc-700 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
          }`}
        >
          Any
        </button>
        <button
          onClick={() => onSelect('PC')}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all ${
            currentPlatform === 'PC'
              ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Monitor className="w-3 h-3" /> PC
        </button>
        <button
          onClick={() => onSelect('Console')}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all ${
            currentPlatform === 'Console'
              ? 'bg-purple-500/20 text-purple-400 shadow-sm border border-purple-500/30'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          <Gamepad2 className="w-3 h-3" /> CON
        </button>
      </div>
    </div>
  );
}
