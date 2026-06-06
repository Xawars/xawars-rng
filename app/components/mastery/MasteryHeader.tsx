'use client';

import { useState, useMemo } from 'react';
import { Info, Search } from 'lucide-react';
import { MasteryTiersModal } from './MasteryTiersModal';
import { MasteryRow, MasteryTier } from './MasteryRow';
import { MasteryDetailModal, MasteryOperatorData } from './MasteryDetailModal';
import { operators } from '../../data/operators';
import type { Operator } from '../../data/types';
import type { HistoryItem } from '../HistoryList';

interface MasteryHeaderProps {
  history: HistoryItem[];
  operatorKills: Record<string, number>;
  operatorDeaths: Record<string, number>;
}

function computeTier(deployments: number, kd: number | null): MasteryTier {
  if (deployments === 0) return 'unplayed';
  if (deployments >= 25 && kd !== null && kd >= 1.0) return 'elite';
  if (deployments >= 10) return 'veteran';
  if (deployments >= 3) return 'operative';
  return 'recruit';
}

export function MasteryHeader({ history, operatorKills, operatorDeaths }: MasteryHeaderProps) {
  const [isTiersModalOpen, setIsTiersModalOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [search, setSearch] = useState('');

  // Build per-operator stats from history
  const operatorDataMap = useMemo(() => {
    const map = new Map<string, {
      deployments: number;
      kills: number;
      deaths: number;
      lastPlayed: string | null;
    }>();

    for (const item of history) {
      const id = item.operator.id;
      if (!map.has(id)) {
        map.set(id, { deployments: 0, kills: 0, deaths: 0, lastPlayed: null });
      }
      const entry = map.get(id)!;
      entry.deployments += 1;
      if (!entry.lastPlayed) {
        entry.lastPlayed = new Date(item.id).toISOString();
      }
    }

    for (const [id, kills] of Object.entries(operatorKills)) {
      if (!map.has(id)) {
        map.set(id, { deployments: 0, kills: 0, deaths: 0, lastPlayed: null });
      }
      map.get(id)!.kills = kills;
    }
    for (const [id, deaths] of Object.entries(operatorDeaths)) {
      if (map.has(id)) {
        map.get(id)!.deaths = deaths;
      }
    }

    return map;
  }, [history, operatorKills, operatorDeaths]);

  // Filter + sort operators
  const filteredOperators = useMemo(() => {
    let filtered = [...operators];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(op => op.name.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const aDeploys = operatorDataMap.get(a.id)?.deployments ?? 0;
      const bDeploys = operatorDataMap.get(b.id)?.deployments ?? 0;
      if (aDeploys > 0 && bDeploys === 0) return -1;
      if (aDeploys === 0 && bDeploys > 0) return 1;
      if (aDeploys !== bDeploys) return bDeploys - aDeploys;
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [search, operatorDataMap]);

  // Detail modal data
  const selectedData: MasteryOperatorData | null = useMemo(() => {
    if (!selectedOperator) return null;

    const stats = operatorDataMap.get(selectedOperator.id);
    const kills = stats?.kills ?? 0;
    const deaths = stats?.deaths ?? 0;
    const deployments = stats?.deployments ?? 0;
    const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : (kills > 0 ? kills : null);
    const tier = computeTier(deployments, kd);

    const xpPerDeploy = 50;
    const xpPerKill = 10;
    const totalXp = (deployments * xpPerDeploy) + (kills * xpPerKill);
    const tierThresholds: Record<MasteryTier, number> = {
      unplayed: 50,
      recruit: 300,
      operative: 800,
      veteran: 2000,
      elite: 2000,
    };
    const xpToNext = tierThresholds[tier];
    const xpInCurrentTier = tier === 'elite' ? totalXp : totalXp % xpToNext;

    return {
      operator: selectedOperator,
      tier,
      kills,
      deaths,
      kd,
      deployments,
      objectivesCompleted: Math.floor(deployments * 0.4),
      lastPlayed: stats?.lastPlayed ?? null,
      xp: xpInCurrentTier,
      xpToNextTier: xpToNext,
    };
  }, [selectedOperator, operatorDataMap]);

  const deployedCount = useMemo(() => {
    return operators.filter(op => (operatorDataMap.get(op.id)?.deployments ?? 0) > 0).length;
  }, [operatorDataMap]);

  return (
    <>
      <div className="flex flex-col h-full w-full">
        {/* Top: Title + Counter + info button */}
        <div className="shrink-0 mb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-yellow-500 mb-1">
            Operator Mastery
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              <span className="text-zinc-200 font-bold">{deployedCount}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-500">{operators.length}</span>
              {' '}operators deployed
            </span>
            <button
              onClick={() => setIsTiersModalOpen(true)}
              className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-yellow-500 transition-colors"
              title="How mastery tiers work"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-zinc-800/80 border border-zinc-700/50 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>

        {/* Operator List */}
        <div className="flex-1 overflow-y-auto scrollbar-auto-hide space-y-1">
          {filteredOperators.map(op => {
            const stats = operatorDataMap.get(op.id);
            const deployments = stats?.deployments ?? 0;
            const kills = stats?.kills ?? 0;
            const deaths = stats?.deaths ?? 0;
            const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : (kills > 0 ? kills : null);
            const tier = computeTier(deployments, kd);

            return (
              <MasteryRow
                key={op.id}
                operator={op}
                tier={tier}
                deployments={deployments}
                kd={kd}
                onClick={setSelectedOperator}
              />
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <MasteryTiersModal isOpen={isTiersModalOpen} onClose={() => setIsTiersModalOpen(false)} />
      <MasteryDetailModal data={selectedData} onClose={() => setSelectedOperator(null)} />
    </>
  );
}
