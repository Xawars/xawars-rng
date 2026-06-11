'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Plus, Minus } from 'lucide-react';
import { getActiveMaps } from '../lib/map-performance';
import { MAPS } from '../data/maps';

interface MapPickerModalProps {
  isOpen: boolean;
  onConfirm: (mapId: string, amount: number) => void;
  onSkip: () => void;
  onClose: () => void;
  type: 'kill' | 'death';
}

/**
 * A three-step modal: 1) Pick a map, 2) Pick a site, 3) Enter how many kills/deaths.
 */
export function MapPickerModal({ isOpen, onConfirm, onSkip, onClose, type }: MapPickerModalProps) {
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [amount, setAmount] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMaps = getActiveMaps(MAPS);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedMapId(null);
      setSelectedSite(null);
      setAmount(1);
    }
  }, [isOpen]);

  // Focus the number input when a site is selected
  useEffect(() => {
    if (selectedSite && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [selectedSite]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedSite) {
          setSelectedSite(null);
        } else if (selectedMapId) {
          setSelectedMapId(null);
        } else {
          onClose();
        }
      }
      if (e.key === 'Enter' && selectedMapId && selectedSite && amount > 0) {
        onConfirm(selectedMapId, amount);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedMapId, selectedSite, amount, onClose, onConfirm]);

  if (!isOpen || activeMaps.length === 0) return null;

  const label = type === 'kill' ? 'kills' : 'deaths';
  const accentBg = type === 'kill' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500';
  const selectedMap = activeMaps.find(m => m.id === selectedMapId);

  // Step 3: Amount input
  if (selectedMapId && selectedSite) {
    const siteName = selectedMap?.sites.find(s => s.id === selectedSite)?.name ?? selectedSite;

    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl w-full max-w-xs overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{selectedMap?.name}</p>
              <h3 className="text-sm font-bold text-white truncate">{siteName}</h3>
            </div>
            <button
              onClick={() => setSelectedSite(null)}
              className="text-[10px] font-medium text-zinc-500 hover:text-white transition-colors shrink-0 ml-2"
            >
              ← Back
            </button>
          </div>

          {/* Amount selector */}
          <div className="p-5 flex flex-col items-center gap-4">
            <p className="text-xs text-zinc-400">How many {label}?</p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAmount(a => Math.max(1, a - 1))}
                className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                ref={inputRef}
                type="number"
                min={1}
                max={99}
                value={amount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 99) setAmount(val);
                }}
                className="w-16 h-12 text-center text-2xl font-black text-white bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-yellow-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                onClick={() => setAmount(a => Math.min(99, a + 1))}
                className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => onConfirm(selectedMapId, amount)}
              disabled={amount < 1}
              className={`w-full py-3 rounded-lg text-sm font-bold text-white ${accentBg} transition-colors active:scale-[0.98] disabled:opacity-50`}
            >
              Add {amount} {amount === 1 ? (type === 'kill' ? 'kill' : 'death') : label}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Site selection
  if (selectedMapId && selectedMap && selectedMap.sites.length > 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-bold text-white">{selectedMap.name} — Pick site</h3>
            </div>
            <button
              onClick={() => setSelectedMapId(null)}
              className="text-[10px] font-medium text-zinc-500 hover:text-white transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Site list */}
          <div className="p-3 flex flex-col gap-2">
            {selectedMap.sites.map((site) => (
              <button
                key={site.id}
                onClick={() => setSelectedSite(site.id)}
                className="px-4 py-3 rounded-lg border border-zinc-700/50 bg-zinc-800/80 text-sm font-medium text-zinc-200 text-left hover:border-zinc-500 hover:bg-zinc-700/80 hover:text-white transition-all duration-150 active:scale-95"
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Map selection
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-bold text-white">
              Select map for {label}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map grid */}
        <div className="p-3 grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
          {activeMaps.map((map) => (
            <button
              key={map.id}
              onClick={() => setSelectedMapId(map.id)}
              className="px-3 py-2.5 rounded-lg border border-zinc-700/50 bg-zinc-800/80 text-sm font-medium text-zinc-200 text-left hover:border-zinc-500 hover:bg-zinc-700/80 hover:text-white transition-all duration-150 active:scale-95"
            >
              {map.name}
            </button>
          ))}
        </div>

        {/* Skip button */}
        <div className="px-4 py-3 border-t border-white/5">
          <button
            onClick={onSkip}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Skip — no map attribution
          </button>
        </div>
      </div>
    </div>
  );
}
