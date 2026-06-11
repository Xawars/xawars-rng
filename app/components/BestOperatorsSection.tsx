'use client';

import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { getBestOperators } from '../lib/map-performance';
import { operators } from '../data/operators';
import type { MapPerformanceRecord } from '../types/database';

interface BestOperatorsSectionProps {
  mapId: string;
  side: 'attacker' | 'defender';
  records: Record<string, MapPerformanceRecord>;
}

export function BestOperatorsSection({ mapId, side, records }: BestOperatorsSectionProps) {
  const operatorLookup = useMemo(() => {
    const lookup: Record<string, { name: string; side: 'attacker' | 'defender' }> = {};
    for (const op of operators) {
      lookup[op.id] = { name: op.name, side: op.side };
    }
    return lookup;
  }, []);

  const bestOperators = getBestOperators(mapId, side, records, operatorLookup);

  if (bestOperators.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-zinc-700/50">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Your Top Operators
        </h3>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
          <Trophy className="w-4 h-4 text-zinc-500 shrink-0" />
          <p className="text-xs text-zinc-500">
            Play more map-tagged matches to see your top operators here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-700/50">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
        Your Top Operators
      </h3>
      <div className="space-y-1.5">
        {bestOperators.map((entry) => (
          <div
            key={entry.operatorId}
            className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-700/30 bg-zinc-800/50"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-200 truncate">
                {entry.operatorName}
              </p>
              <p className="text-[10px] text-zinc-500">
                {entry.matches} {entry.matches === 1 ? 'match' : 'matches'}
              </p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className={`text-sm font-black ${
                entry.kd >= 1 ? 'text-green-400' : 'text-red-400'
              }`}>
                {entry.kd.toFixed(2)}
              </p>
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider">K/D</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
