'use client';

import { useMemo } from 'react';
import { Map } from 'lucide-react';
import { getMapBreakdown } from '../../lib/map-performance';
import { computeWinRate, hasLimitedData, getTotalOutcomes } from '../../lib/win-loss-logic';
import { useData } from '../../context/DataContext';
import { MAPS } from '../../data/maps';
import type { MapPerformanceRecord } from '../../types/database';

interface MapBreakdownPanelProps {
  operatorId: string;
  records: Record<string, MapPerformanceRecord>;
}

export function MapBreakdownPanel({ operatorId, records }: MapBreakdownPanelProps) {
  const { mapWinLossRecords } = useData();

  const mapLookup = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const map of MAPS) {
      lookup[map.id] = map.name;
    }
    return lookup;
  }, []);

  const breakdown = getMapBreakdown(operatorId, records, mapLookup);

  if (breakdown.length === 0) {
    return (
      <div className="px-5 py-4 border-t border-white/5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Map Performance
        </h3>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
          <Map className="w-4 h-4 text-zinc-500 shrink-0" />
          <p className="text-xs text-zinc-500">
            No map data yet — tag a map during gameplay to track performance
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 border-t border-white/5">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
        Map Performance
      </h3>
      <div className="space-y-1.5">
        {breakdown.map((entry) => {
          const winLossRecord = mapWinLossRecords[entry.mapId];
          const totalOutcomes = winLossRecord ? getTotalOutcomes(winLossRecord) : 0;
          const winRate = winLossRecord ? computeWinRate(winLossRecord) : null;
          const limitedData = winLossRecord ? hasLimitedData(winLossRecord) : false;

          return (
            <div
              key={entry.mapId}
              className={`flex items-center justify-between p-2.5 rounded-lg border ${
                entry.isBest
                  ? 'border-yellow-500 bg-yellow-500/10'
                  : 'border-zinc-700/30 bg-zinc-800/50'
              }`}
            >
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${entry.isBest ? 'text-yellow-200' : 'text-zinc-200'}`}>
                  {entry.mapName}
                </p>
                {entry.meetsThreshold ? (
                  <p className="text-[10px] text-zinc-500">
                    {entry.kills}K / {entry.deaths}D &middot; {entry.matches} matches
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500">
                    {entry.matches}/3 matches &middot; Need more data
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                {totalOutcomes > 0 && winRate !== null && (
                  <div className="text-right">
                    <p className={`text-xs font-bold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                      {winRate}%
                    </p>
                    {limitedData && (
                      <p className="text-[9px] text-zinc-600">
                        {totalOutcomes} matches
                      </p>
                    )}
                  </div>
                )}
                <div className="text-right">
                  {entry.meetsThreshold ? (
                    <p className={`text-sm font-black ${
                      entry.kd !== null && entry.kd >= 1 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {entry.kd !== null ? entry.kd.toFixed(2) : '—'}
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">
                      Pending
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
