'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { SessionDeltaData } from '../types/database';

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionData: SessionDeltaData;
}

/**
 * Modal displaying session performance deltas when the user ends their session.
 * Shows kills, deaths, K/D ratio, operator breakdown, and best map.
 */
export function SessionSummaryModal({ isOpen, onClose, sessionData }: SessionSummaryModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { kills, deaths, kdRatio, isPerfect, isEmpty, operators, bestMap, mapWinLossSummary } = sessionData;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-label="Session summary"
    >
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-wider">
            Session Summary
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close session summary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isEmpty ? (
            <p className="text-sm text-zinc-400 text-center py-4">
              No matches recorded this session
            </p>
          ) : (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatBlock label="Kills" value={String(kills)} />
                <StatBlock label="Deaths" value={String(deaths)} />
                <StatBlock
                  label="K/D"
                  value={isPerfect ? `${kills} Perfect` : kdRatio !== null ? kdRatio.toFixed(2) : '—'}
                  highlight={isPerfect}
                />
              </div>

              {/* Best Map */}
              {bestMap && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Best Map</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{bestMap.mapName}</span>
                    <span className="text-sm font-bold text-yellow-400">{bestMap.kd.toFixed(2)} K/D</span>
                  </div>
                </div>
              )}

              {/* Map Win/Loss Summary */}
              {mapWinLossSummary && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Map Results</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm tabular-nums">
                      <span className="text-green-400 font-medium">{mapWinLossSummary.wins}W</span>
                      <span className="text-red-400 font-medium">{mapWinLossSummary.losses}L</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Operators */}
              {operators.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Operators</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {operators.map((op) => (
                      <div
                        key={op.operatorId}
                        className="flex items-center justify-between px-3 py-1.5 rounded-md bg-zinc-800/40"
                      >
                        <span className="text-sm text-zinc-200 truncate">{op.operatorName}</span>
                        <div className="flex items-center gap-2 text-xs tabular-nums">
                          <span className="text-green-400">{op.kills}K</span>
                          <span className="text-red-400">{op.deaths}D</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
