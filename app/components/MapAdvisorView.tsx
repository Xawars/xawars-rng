'use client';

import { useState } from 'react';
import { MAPS, MapData } from '../data/maps';
import { useData } from '../context/DataContext';
import { computeWinRate, getTotalOutcomes } from '../lib/win-loss-logic';

export function MapAdvisorView() {
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const { mapWinLossRecords } = useData();

  if (selectedMap) {
    const record = mapWinLossRecords[selectedMap.id];
    const winRate = record ? computeWinRate(record) : null;
    const total = record ? getTotalOutcomes(record) : 0;

    return (
      <div className="flex-1 overflow-y-auto scrollbar-auto-hide p-4">
        <button
          onClick={() => setSelectedMap(null)}
          className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          ← All Maps
        </button>

        {/* Map Header */}
        <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 mb-4">
          {/* Placeholder image area */}
          <div className="h-40 bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            {selectedMap.image ? (
              <img src={selectedMap.image} alt={selectedMap.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-zinc-600 text-sm font-medium">Map image placeholder</span>
            )}
          </div>
          <div className="p-4">
            <h2 className="text-xl font-black uppercase tracking-tight text-white">{selectedMap.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-zinc-500">{selectedMap.sites.length} bomb sites</p>
              {record && total > 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className={`text-xs font-bold ${winRate !== null && winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {winRate !== null ? `${Math.round(winRate)}% WR` : '—'}
                  </span>
                  <span className="text-[10px] text-zinc-500">{record.wins}W {record.losses}L</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sites List */}
        <div className="grid gap-2">
          {selectedMap.sites.map((site) => (
            <div
              key={site.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500/80 bg-yellow-500/10 px-2 py-0.5 rounded shrink-0">
                {site.floor}
              </span>
              <span className="text-sm font-semibold text-zinc-200">{site.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-auto-hide p-4">
      <h2 className="text-lg font-black uppercase tracking-tight text-white mb-4">Maps</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MAPS.map((map) => {
          const record = mapWinLossRecords[map.id];
          const winRate = record ? computeWinRate(record) : null;
          const total = record ? getTotalOutcomes(record) : 0;
          return (
            <button
              key={map.id}
              onClick={() => setSelectedMap(map)}
              className="text-left rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all overflow-hidden group"
            >
              {/* Placeholder image */}
              <div className="h-24 bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                {map.image ? (
                  <img src={map.image} alt={map.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-zinc-700 text-xs font-medium group-hover:text-zinc-500 transition-colors">
                    {map.name}
                  </span>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{map.name}</p>
                  <p className="text-[10px] text-zinc-500">{map.sites.length} sites</p>
                </div>
                {total > 0 && winRate !== null && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${winRate >= 50 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {Math.round(winRate)}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
