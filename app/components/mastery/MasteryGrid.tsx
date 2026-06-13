'use client';

import { useState, useMemo } from 'react';
import { Search, Shield, Swords } from 'lucide-react';
import { operators } from '../../data/operators';
import { MasteryRow } from './MasteryRow';
import { MasteryDetailModal, MasteryOperatorData } from './MasteryDetailModal';
import type { MasteryTier } from './MasteryTile';
import type { Operator } from '../../data/types';
import type { HistoryItem } from '../HistoryList';

interface MasteryGridProps {
  history: HistoryItem[];
  operatorKills: Record<string, number>;
  operatorDeaths: Record<string, number>;
}

type SideFilter = 'all' | 'attacker' | 'defender';

/**
 * Compute mastery tier from deployments and KD.
 */
function computeTier(deployments: number, kd: number | null): MasteryTier {
  if (deployments === 0) return 'unplayed';
  if (deployments >= 25 && kd !== null && kd >= 1.0) return 'elite';
  if (deployments >= 10) return 'veteran';
  if (deployments >= 3) return 'operative';
  return 'recruit';
}

export function MasteryGrid({ history, operatorKills, operatorDeaths }: MasteryGridProps) {
  const [search, setSearch] = useState('');
  const [sideFilter, setSideFilter] = useState<SideFilter>('all');
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

  // Build stats from history
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

    // Merge kill/death data
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

  // Filter and sort operators
  const filteredOperators = useMemo(() => {
    let filtered = [...operators];

    if (sideFilter !== 'all') {
      filtered = filtered.filter(op => op.side === sideFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(op => op.name.toLowerCase().includes(q));
    }

    // Sort: played operators first, then by K/D high to low
    filtered.sort((a, b) => {
      const aStats = operatorDataMap.get(a.id);
      const bStats = operatorDataMap.get(b.id);
      const aDeploys = aStats?.deployments ?? 0;
      const bDeploys = bStats?.deployments ?? 0;
      const aKills = aStats?.kills ?? 0;
      const bKills = bStats?.kills ?? 0;
      const aDeaths = aStats?.deaths ?? 0;
      const bDeaths = bStats?.deaths ?? 0;

      // Played operators always come before unplayed
      const aPlayed = aDeploys > 0 || aKills > 0 || aDeaths > 0;
      const bPlayed = bDeploys > 0 || bKills > 0 || bDeaths > 0;
      if (aPlayed && !bPlayed) return -1;
      if (!aPlayed && bPlayed) return 1;

      // Both unplayed — alphabetical
      if (!aPlayed && !bPlayed) return a.name.localeCompare(b.name);

      // Both played — sort by K/D descending (high to low)
      const aKd = aDeaths > 0 ? aKills / aDeaths : (aKills > 0 ? aKills : 0);
      const bKd = bDeaths > 0 ? bKills / bDeaths : (bKills > 0 ? bKills : 0);

      if (aKd !== bKd) return bKd - aKd;

      // Tie-break: more kills first
      if (aKills !== bKills) return bKills - aKills;

      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [sideFilter, search, operatorDataMap]);

  // Total deployments across all operators (for pick rate)
  const totalDeployments = useMemo(() => {
    return history.length;
  }, [history]);

  // Build modal data for selected operator
  const selectedData: MasteryOperatorData | null = useMemo(() => {
    if (!selectedOperator) return null;

    const stats = operatorDataMap.get(selectedOperator.id);
    const kills = stats?.kills ?? 0;
    const deaths = stats?.deaths ?? 0;
    const deployments = stats?.deployments ?? 0;
    const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : (kills > 0 ? kills : null);
    const tier = computeTier(deployments, kd);
    const avgKills = deployments > 0 ? Math.round((kills / deployments) * 10) / 10 : null;
    const pickRate = totalDeployments > 0 ? (deployments / totalDeployments) * 100 : 0;

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
      avgKills,
      pickRate,
      lastPlayed: stats?.lastPlayed ?? null,
      xp: xpInCurrentTier,
      xpToNextTier: xpToNext,
    };
  }, [selectedOperator, operatorDataMap, totalDeployments]);

  const playedCount = useMemo(() => {
    return operators.filter(op => (operatorDataMap.get(op.id)?.deployments ?? 0) > 0).length;
  }, [operatorDataMap]);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 mb-4">
          <h2 className="text-base font-black uppercase tracking-wider text-yellow-500">
            Operator Mastery
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {playedCount} / {operators.length} operators deployed
          </p>
        </div>

        {/* Search */}
        <div className="shrink-0 relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search operators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
          />
        </div>

        {/* Side Filter */}
        <div className="shrink-0 flex gap-1.5 mb-3">
          <FilterButton active={sideFilter === 'all'} onClick={() => setSideFilter('all')}>
            All
          </FilterButton>
          <FilterButton active={sideFilter === 'attacker'} onClick={() => setSideFilter('attacker')}>
            <Swords className="w-3.5 h-3.5" /> ATK
          </FilterButton>
          <FilterButton active={sideFilter === 'defender'} onClick={() => setSideFilter('defender')}>
            <Shield className="w-3.5 h-3.5" /> DEF
          </FilterButton>
        </div>

        {/* Column headers */}
        <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 mb-1">
          <span className="w-10 shrink-0" />
          <span className="flex-1 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Operator</span>
          <span className="shrink-0 w-12 text-[10px] text-zinc-600 font-bold uppercase tracking-wider text-center">Tier</span>
          <span className="shrink-0 w-12 text-[10px] text-zinc-600 font-bold uppercase tracking-wider text-right">K/D</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-auto-hide space-y-1.5 pb-2">
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

        {/* Tier Legend */}
        <div className="shrink-0 mt-3 pt-3 border-t border-zinc-800">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-2">Mastery Tiers</p>
          <div className="grid grid-cols-5 gap-2">
            <LegendItem color="bg-zinc-600" label="New" />
            <LegendItem color="bg-zinc-400" label="Recruit" />
            <LegendItem color="bg-amber-600" label="Operative" />
            <LegendItem color="bg-slate-300" label="Veteran" />
            <LegendItem color="bg-yellow-500" label="Elite" />
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <MasteryDetailModal data={selectedData} onClose={() => setSelectedOperator(null)} />
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
        active
          ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
          : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[9px] text-zinc-500 font-medium">{label}</span>
    </div>
  );
}
