import { HistoryItem } from '../components/HistoryList';

export interface OperatorStats {
  id: string;
  name: string;
  side: 'attacker' | 'defender';
  totalKills: number;
  totalDeaths: number;
  kd: number | null;
  objectiveKills: number;
  objectiveTarget: number;
  objectiveProgress: number;
  deployments: number;
  lastUsed: number;
}

export type SortMode = 'recent' | 'kd' | 'kills' | 'alpha';

export function useOperatorStats(
  history: HistoryItem[],
  operatorKills: Record<string, number>,
  operatorDeaths: Record<string, number>
): OperatorStats[] {
  const opMap = new Map<string, OperatorStats>();

  for (const item of history) {
    const id = item.operator.id;
    if (!opMap.has(id)) {
      opMap.set(id, {
        id,
        name: item.operator.name,
        side: item.operator.side,
        totalKills: 0,
        totalDeaths: 0,
        kd: null,
        objectiveKills: 0,
        objectiveTarget: 0,
        objectiveProgress: 0,
        deployments: 0,
        lastUsed: item.id,
      });
    }
    const stat = opMap.get(id)!;
    stat.deployments += 1;
    if (item.id > stat.lastUsed) stat.lastUsed = item.id;
  }

  for (const [id, kills] of Object.entries(operatorKills)) {
    if (opMap.has(id)) {
      opMap.get(id)!.totalKills += kills;
    }
  }

  for (const [id, deaths] of Object.entries(operatorDeaths)) {
    if (opMap.has(id)) {
      opMap.get(id)!.totalDeaths += deaths;
    }
  }

  const stats = Array.from(opMap.values());

  for (const stat of stats) {
    stat.kd = stat.totalDeaths > 0
      ? Math.round((stat.totalKills / stat.totalDeaths) * 100) / 100
      : null;

    stat.objectiveKills = stat.totalKills;
    stat.objectiveTarget = stat.deployments > 0
      ? Math.round(stat.objectiveKills / (stat.deployments * 0.5))
      : 0;
    stat.objectiveProgress = stat.objectiveTarget > 0
      ? Math.min((stat.objectiveKills / stat.objectiveTarget) * 100, 100)
      : 0;
  }

  return stats;
}

export function sortStats(stats: OperatorStats[], mode: SortMode): OperatorStats[] {
  const sorted = [...stats];
  switch (mode) {
    case 'recent':
      return sorted.sort((a, b) => b.lastUsed - a.lastUsed);
    case 'kd':
      return sorted.sort((a, b) => (b.kd ?? -1) - (a.kd ?? -1));
    case 'kills':
      return sorted.sort((a, b) => b.totalKills - a.totalKills);
    case 'alpha':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}