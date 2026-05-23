'use client';

import { useState, useMemo } from 'react';
import { X, Search, Swords, ShieldHalf } from 'lucide-react';
import { Operator, Side } from '../data/types';
import { operators, attackers, defenders } from '../data/operators';
import * as r6operators from 'r6operators';

interface OperatorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (operator: Operator) => void;
  currentSide: Side | null;
}

export function OperatorPickerModal({ isOpen, onClose, onSelect, currentSide }: OperatorPickerModalProps) {
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<Side | null>(currentSide);

  // Reset search when modal opens
  const filteredOperators = useMemo(() => {
    let pool: Operator[];
    if (sideFilter === 'attacker') pool = attackers;
    else if (sideFilter === 'defender') pool = defenders;
    else pool = operators;

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      pool = pool.filter(op => op.name.toLowerCase().includes(query));
    }

    return pool;
  }, [sideFilter, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">Choose Operator</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search + Side Filter */}
        <div className="shrink-0 p-3 border-b border-zinc-800 flex flex-col gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search operators..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
              autoFocus
            />
          </div>

          {/* Side filter tabs */}
          <div className="flex gap-1 p-0.5 bg-black/40 rounded-md border border-white/5">
            <button
              onClick={() => setSideFilter(null)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                !sideFilter
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              All ({operators.length})
            </button>
            <button
              onClick={() => setSideFilter('attacker')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all ${
                sideFilter === 'attacker'
                  ? 'bg-orange-500/20 text-orange-400 shadow-sm border border-orange-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Swords className="w-3 h-3" /> ATK ({attackers.length})
            </button>
            <button
              onClick={() => setSideFilter('defender')}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1 transition-all ${
                sideFilter === 'defender'
                  ? 'bg-blue-500/20 text-blue-400 shadow-sm border border-blue-500/30'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <ShieldHalf className="w-3 h-3" /> DEF ({defenders.length})
            </button>
          </div>
        </div>

        {/* Operator Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredOperators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <p className="text-sm">No operators found</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {filteredOperators.map((op) => {
                const opIconData = (r6operators as any)[op.id];
                const iconSvg = opIconData?.toSVG({
                  class: "w-full h-full",
                  width: "100%",
                  height: "100%"
                });

                return (
                  <button
                    key={op.id}
                    onClick={() => {
                      onSelect(op);
                      setSearch('');
                    }}
                    className={`group flex flex-col items-center gap-1 p-2 rounded-lg border transition-all hover:scale-105 active:scale-95 ${
                      op.side === 'attacker'
                        ? 'border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10'
                        : 'border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10'
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {iconSvg ? (
                        <div
                          className="w-full h-full flex items-center justify-center [&_svg]:w-full [&_svg]:h-full"
                          dangerouslySetInnerHTML={{ __html: iconSvg }}
                        />
                      ) : op.id === 'snake' ? (
                        <img src="/ops/snake_logo.png" alt={op.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white/70 ${op.side === 'attacker' ? 'bg-orange-500/30' : 'bg-blue-500/30'}`}>
                          {op.name[0]}
                        </div>
                      )}
                    </div>
                    {/* Name */}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors text-center leading-tight">
                      {op.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 border-t border-zinc-800 text-center">
          <p className="text-[10px] text-zinc-500">
            Tap an operator to deploy with a random loadout
          </p>
        </div>
      </div>
    </div>
  );
}
