'use client';

import { X } from 'lucide-react';

interface WinLossPromptProps {
  mapId: string;
  mapName: string;
  onWin: () => void;
  onLoss: () => void;
  onDismiss: () => void;
}

/**
 * A compact prompt with "Won" and "Lost" buttons shown after a kill/death
 * increment is confirmed with a map selected. Allows the user to record
 * the match outcome for the given map.
 */
export function WinLossPrompt({ mapId, mapName, onWin, onLoss, onDismiss }: WinLossPromptProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      role="dialog"
      aria-label={`Record match outcome for ${mapName}`}
    >
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Match result</p>
            <h3 className="text-sm font-bold text-white truncate">{mapName}</h3>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Dismiss win/loss prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Buttons */}
        <div className="p-4 flex gap-3">
          <button
            onClick={onWin}
            aria-label="Record map win"
            className="flex-1 py-3 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20 transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Won
          </button>
          <button
            onClick={onLoss}
            aria-label="Record map loss"
            className="flex-1 py-3 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Lost
          </button>
        </div>
      </div>
    </div>
  );
}
