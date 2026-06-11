import type {
  StreakState,
  SessionSnapshot,
  SessionDeltaData,
  SessionBestMap,
  SessionMapWinLossSummary,
  MapWinLossRecord,
  MapPerformanceRecord,
} from '../types/database';

/**
 * Returns the initial streak state: count 0, not on a hot streak.
 */
export function initialStreakState(): StreakState {
  return { count: 0, isHotStreak: false };
}

/**
 * Applies a streak action to the current state and returns the new state.
 *
 * State machine:
 * - 'kill': count + 1
 * - 'death': count resets to 0
 * - 'decrement': count - 1, floored at 0
 *
 * isHotStreak is derived: count >= 3.
 */
export function applyStreakAction(
  state: StreakState,
  action: 'kill' | 'death' | 'decrement'
): StreakState {
  let newCount: number;

  switch (action) {
    case 'kill':
      newCount = state.count + 1;
      break;
    case 'death':
      newCount = 0;
      break;
    case 'decrement':
      newCount = Math.max(0, state.count - 1);
      break;
  }

  return {
    count: newCount,
    isHotStreak: newCount >= 3,
  };
}

/**
 * Captures the current state as a session snapshot for later delta computation.
 */
export function captureSnapshot(
  totalKills: number,
  totalDeaths: number,
  operatorKills: Record<string, number>,
  operatorDeaths: Record<string, number>,
  mapWinLoss: Record<string, MapWinLossRecord>
): SessionSnapshot {
  // Build operatorStats from kills and deaths records
  const operatorIds = new Set([
    ...Object.keys(operatorKills),
    ...Object.keys(operatorDeaths),
  ]);

  const operatorStats: Record<string, { kills: number; deaths: number }> = {};
  for (const id of operatorIds) {
    operatorStats[id] = {
      kills: operatorKills[id] ?? 0,
      deaths: operatorDeaths[id] ?? 0,
    };
  }

  // Build mapWinLoss snapshot
  const mapWinLossSnapshot: Record<string, { wins: number; losses: number }> = {};
  for (const [mapId, record] of Object.entries(mapWinLoss)) {
    mapWinLossSnapshot[mapId] = {
      wins: record.wins,
      losses: record.losses,
    };
  }

  return {
    totalKills,
    totalDeaths,
    operatorStats,
    mapWinLoss: mapWinLossSnapshot,
  };
}

/**
 * Computes session deltas between a snapshot and the current state.
 *
 * - kills/deaths: current minus snapshot
 * - kdRatio: kills/deaths to 2 decimal places; null when both 0
 * - isPerfect: kills > 0 and deaths = 0
 * - isEmpty: kills = 0 and deaths = 0
 * - operators: sorted by kills desc then name asc
 * - bestMap: computed via findBestSessionMap (null if no map data)
 */
export function computeSessionDeltas(
  snapshot: SessionSnapshot,
  currentKills: number,
  currentDeaths: number,
  currentOperatorKills: Record<string, number>,
  currentOperatorDeaths: Record<string, number>,
  currentMapWinLoss: Record<string, MapWinLossRecord>,
  operatorNames: Record<string, string>
): SessionDeltaData {
  const kills = currentKills - snapshot.totalKills;
  const deaths = currentDeaths - snapshot.totalDeaths;

  // K/D ratio logic
  let kdRatio: number | null;
  const isPerfect = kills > 0 && deaths === 0;
  const isEmpty = kills === 0 && deaths === 0;

  if (isEmpty) {
    kdRatio = null;
  } else if (deaths === 0) {
    // isPerfect case — kills > 0, deaths = 0
    kdRatio = kills;
  } else {
    kdRatio = Math.round((kills / deaths) * 100) / 100;
  }

  // Compute per-operator deltas
  const operatorIds = new Set([
    ...Object.keys(currentOperatorKills),
    ...Object.keys(currentOperatorDeaths),
  ]);

  const operators: SessionDeltaData['operators'] = [];
  for (const id of operatorIds) {
    const currentK = currentOperatorKills[id] ?? 0;
    const currentD = currentOperatorDeaths[id] ?? 0;
    const snapshotK = snapshot.operatorStats[id]?.kills ?? 0;
    const snapshotD = snapshot.operatorStats[id]?.deaths ?? 0;

    const opKills = currentK - snapshotK;
    const opDeaths = currentD - snapshotD;

    // Only include operators that had activity during the session
    if (opKills > 0 || opDeaths > 0) {
      operators.push({
        operatorId: id,
        operatorName: operatorNames[id] ?? id,
        kills: opKills,
        deaths: opDeaths,
      });
    }
  }

  // Sort operators: kills desc, then name asc
  operators.sort((a, b) => {
    if (a.kills !== b.kills) return b.kills - a.kills;
    return a.operatorName.localeCompare(b.operatorName);
  });

  // Compute best map — we need map performance data, but this function works with
  // win/loss records. For the best map, we use the win/loss deltas as a proxy.
  // However, per the design, bestMap uses MapPerformanceRecord data.
  // Since computeSessionDeltas doesn't receive MapPerformanceRecord data directly,
  // bestMap is set to null here. Callers should use findBestSessionMap separately
  // when MapPerformanceRecord data is available.
  const bestMap: SessionBestMap | null = null;

  // Compute map win/loss summary from snapshot delta comparison
  let totalSessionWins = 0;
  let totalSessionLosses = 0;

  // Sum up all current map wins/losses and subtract snapshot values
  const allMapIds = new Set([
    ...Object.keys(currentMapWinLoss),
    ...Object.keys(snapshot.mapWinLoss),
  ]);

  for (const mapId of allMapIds) {
    const currentRecord = currentMapWinLoss[mapId];
    const snapshotRecord = snapshot.mapWinLoss[mapId];
    const currentWins = currentRecord?.wins ?? 0;
    const currentLosses = currentRecord?.losses ?? 0;
    const snapshotWins = snapshotRecord?.wins ?? 0;
    const snapshotLosses = snapshotRecord?.losses ?? 0;

    totalSessionWins += currentWins - snapshotWins;
    totalSessionLosses += currentLosses - snapshotLosses;
  }

  const mapWinLossSummary: SessionMapWinLossSummary | null =
    totalSessionWins > 0 || totalSessionLosses > 0
      ? { wins: totalSessionWins, losses: totalSessionLosses }
      : null;

  return {
    kills,
    deaths,
    kdRatio,
    isPerfect,
    isEmpty,
    operators,
    bestMap,
    mapWinLossSummary,
  };
}

/**
 * Finds the best-performing map during a session based on K/D ratio.
 *
 * Computes per-map session K/D from MapPerformanceRecord deltas (current - snapshot).
 * Aggregates across all operators for each map.
 *
 * Returns the map with the highest session K/D ratio.
 * Ties are broken by higher total session kills.
 * Returns null if no map has kills or deaths during the session.
 */
export function findBestSessionMap(
  snapshotMapWinLoss: Record<string, { wins: number; losses: number }>,
  currentMapPerformance: Record<string, MapPerformanceRecord>,
  snapshotMapPerformance: Record<string, MapPerformanceRecord>,
  mapNames: Record<string, string>
): SessionBestMap | null {
  // Aggregate kills and deaths per mapId across all operators
  // by computing delta between current and snapshot MapPerformanceRecords
  const mapAggregates: Record<string, { kills: number; deaths: number }> = {};

  // Process current map performance records
  for (const [key, record] of Object.entries(currentMapPerformance)) {
    const snapshotRecord = snapshotMapPerformance[key];
    const snapshotKills = snapshotRecord?.kills ?? 0;
    const snapshotDeaths = snapshotRecord?.deaths ?? 0;

    const deltaKills = record.kills - snapshotKills;
    const deltaDeaths = record.deaths - snapshotDeaths;

    if (deltaKills > 0 || deltaDeaths > 0) {
      if (!mapAggregates[record.mapId]) {
        mapAggregates[record.mapId] = { kills: 0, deaths: 0 };
      }
      mapAggregates[record.mapId].kills += deltaKills;
      mapAggregates[record.mapId].deaths += deltaDeaths;
    }
  }

  // Find best map by K/D ratio
  let bestMap: SessionBestMap | null = null;
  let bestKD = -1;
  let bestKills = -1;

  for (const [mapId, agg] of Object.entries(mapAggregates)) {
    // Skip maps with no activity
    if (agg.kills === 0 && agg.deaths === 0) continue;

    // Compute K/D
    let kd: number;
    if (agg.deaths === 0) {
      // kills > 0, deaths = 0 — use kills as the K/D value
      kd = agg.kills;
    } else {
      kd = agg.kills / agg.deaths;
    }

    const roundedKD = Math.round(kd * 100) / 100;

    // Compare: highest K/D wins, ties broken by higher total kills
    if (
      roundedKD > bestKD ||
      (roundedKD === bestKD && agg.kills > bestKills)
    ) {
      bestKD = roundedKD;
      bestKills = agg.kills;
      bestMap = {
        mapId,
        mapName: mapNames[mapId] ?? mapId,
        kd: roundedKD,
      };
    }
  }

  return bestMap;
}
