'use client';

import { useState, useRef, useEffect } from 'react';
import { Map, ChevronDown, X, Pencil } from 'lucide-react';
import { MAPS } from '../data/maps';

interface MapDeploySelectorProps {
  currentMapId: string | null;
  onSelect: (mapId: string | null) => void;
  /** ponytail: locks selector when match is active, shows correction icon instead */
  isLocked?: boolean;
  onCorrect?: (mapId: string) => void;
}

export function MapDeploySelector({ currentMapId, onSelect, isLocked, onCorrect }: MapDeploySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ponytail: correction mode reuses the same dropdown, just routes selection to onCorrect
  const [correcting, setCorrecting] = useState(false);

  const selectedMap = currentMapId ? MAPS.find(m => m.id === currentMapId) : null;
  const filteredMaps = search
    ? MAPS.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : MAPS;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCorrecting(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setCorrecting(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg">
        <Map className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 shrink-0 w-8">Map</span>
        
        {/* ponytail: locked state shows map as static text, normal state keeps the dropdown trigger */}
        {isLocked ? (
          <span className="flex-1 flex items-center gap-1 px-2 py-1.5 rounded-md border bg-blue-500/10 border-blue-500/30 text-blue-400">
            <span className="text-[11px] font-bold truncate">
              {selectedMap ? selectedMap.name : 'None'}
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex-1 flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border transition-all text-left ${
              selectedMap
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-black/40 border-white/5 text-zinc-400 hover:bg-white/5'
            }`}
            aria-label="Map selector"
            aria-expanded={isOpen}
          >
            <span className="text-[11px] font-bold truncate">
              {selectedMap ? selectedMap.name : 'None'}
            </span>
            <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* ponytail: correction pencil icon when locked, clear X when unlocked */}
        {isLocked && onCorrect ? (
          <button
            type="button"
            onClick={() => { setCorrecting(true); setIsOpen(true); }}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors shrink-0"
            title="Correct map"
            aria-label="Correct map selection"
          >
            <Pencil className="w-3 h-3" />
          </button>
        ) : !isLocked && selectedMap ? (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            title="Clear map"
          >
            <X className="w-3 h-3" />
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-1.5 border-b border-zinc-800">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search maps..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          <div className="max-h-40 overflow-y-auto scrollbar-auto-hide p-1">
            {/* ponytail: no "none" option in correction mode — must pick a map */}
            {!search && !correcting && (
              <button
                type="button"
                onClick={() => { onSelect(null); setIsOpen(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  !currentMapId
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                }`}
              >
                No map selected
              </button>
            )}
            {filteredMaps.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  if (correcting && onCorrect) {
                    onCorrect(m.id);
                  } else {
                    onSelect(m.id);
                  }
                  setIsOpen(false);
                  setCorrecting(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                  currentMapId === m.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            ))}
            {filteredMaps.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-zinc-500">No maps found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
