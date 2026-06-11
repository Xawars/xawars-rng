import type {
  MapPerformanceRecord,
  MapDisplayStats,
  MapBreakdownEntry,
  BestOperatorEntry,
} from '../types/database';
import type { MapData } from '../data/maps';

/** Minimum matches required before displaying computed stats. */
const INSIGHT_THRESHOLD = 3;

/**
 * Computes the K/D ratio with division-by-zero handling.
 * - deaths=0 and kills>0 → returns kills
 * - kills=0 and deaths=0 → returns null
 * - otherwise → kills / deaths
 */
function computeKD(kills: number, deaths: number): number | null {
  if (deaths === 0) {
    return kills > 0 ? kills : null;
  }
  return kills / deaths;
}

/**
 * Builds the composite key for a map performance record.
 */
function compositeKey(operatorId: string, mapId: string): string {
  return `${operatorId}_${mapId}`;
}

/**
 * Additive upsert of kills/deaths/matches for a composite key.
 * Returns a new record map (does not mutate the input).
 */
export function upsertMapPerformance(
  records: Record<string, MapPerformanceRecord>,
  operatorId: string,
  mapId: string,
  delta: { kills?: number; deaths?: number; matches?: number }
): Record<string, MapPerformanceRecord> {
  const key = compositeKey(operatorId, mapId);
  const existing = records[key] ?? {
    operatorId,
    mapId,
    kills: 0,
    deaths: 0,
    matches: 0,
  };

  const updated: MapPerformanceRecord = {
    ...existing,
    kills: existing.kills + (delta.kills ?? 0),
    deaths: existing.deaths + (delta.deaths ?? 0),
    matches: existing.matches + (delta.matches ?? 0),
  };

  return {
    ...records,
    [key]: updated,
  };
}

/**
 * Computes display stats for a single record.
 * Returns null if the record has fewer than 3 matches (insight threshold).
 */
export function computeMapStats(
  record: MapPerformanceRecord,
  mapName: string
): MapDisplayStats | null {
  if (record.matches < INSIGHT_THRESHOLD) {
    return null;
  }

  const kd = computeKD(record.kills, record.deaths);

  // If both kills and deaths are 0 (kd is null), K/D displays as 0
  // The MapDisplayStats.kd is always a number since we're past threshold
  const kdValue = kd ?? 0;

  return {
    mapId: record.mapId,
    mapName,
    kills: record.kills,
    deaths: record.deaths,
    matches: record.matches,
    kd: Math.round(kdValue * 100) / 100,
    avgKills: Math.round((record.kills / record.matches) * 100) / 100,
  };
}

/**
 * Returns the sorted map breakdown for an operator.
 * - Excludes entries with 0 matches
 * - Sorted by K/D descending; ties broken by matches descending
 * - Capped at 10 entries
 * - Marks whether each entry meets the insight threshold
 * - Marks the best entry (highest K/D among those meeting threshold)
 */
export function getMapBreakdown(
  operatorId: string,
  records: Record<string, MapPerformanceRecord>,
  mapLookup: Record<string, string>
): MapBreakdownEntry[] {
  // Collect records for this operator with matches > 0
  const entries: MapBreakdownEntry[] = [];

  for (const [, record] of Object.entries(records)) {
    if (record.operatorId !== operatorId || record.matches === 0) {
      continue;
    }

    const mapName = mapLookup[record.mapId] ?? record.mapId;
    const meetsThreshold = record.matches >= INSIGHT_THRESHOLD;
    const kd = meetsThreshold ? computeKD(record.kills, record.deaths) : null;
    const avgKills = meetsThreshold
      ? Math.round((record.kills / record.matches) * 100) / 100
      : null;

    entries.push({
      mapId: record.mapId,
      mapName,
      kills: record.kills,
      deaths: record.deaths,
      matches: record.matches,
      kd: kd !== null ? Math.round(kd * 100) / 100 : null,
      avgKills,
      meetsThreshold,
      isBest: false, // will be set below
    });
  }

  // Sort: K/D descending (threshold-meeting entries first by K/D, then non-threshold by matches)
  // Ties broken by matches descending
  entries.sort((a, b) => {
    // Both have K/D values — sort by K/D desc
    if (a.kd !== null && b.kd !== null) {
      if (a.kd !== b.kd) return b.kd - a.kd;
      return b.matches - a.matches;
    }
    // Entry with K/D comes before entry without
    if (a.kd !== null) return -1;
    if (b.kd !== null) return 1;
    // Neither has K/D — sort by matches desc
    return b.matches - a.matches;
  });

  // Cap at 10
  const capped = entries.slice(0, 10);

  // Mark the best entry (first one that meets threshold with a non-null K/D)
  const bestIndex = capped.findIndex((e) => e.meetsThreshold && e.kd !== null);
  if (bestIndex >= 0) {
    capped[bestIndex] = { ...capped[bestIndex], isBest: true };
  }

  return capped;
}

/**
 * Returns the top operators for a given map and side.
 * - Filters by map and side
 * - Only includes operators meeting the insight threshold (≥3 matches)
 * - Sorted by K/D descending; ties broken by matches descending
 * - Capped at 5 entries
 */
export function getBestOperators(
  mapId: string,
  side: 'attacker' | 'defender',
  records: Record<string, MapPerformanceRecord>,
  operatorLookup: Record<string, { name: string; side: 'attacker' | 'defender' }>
): BestOperatorEntry[] {
  const qualifying: BestOperatorEntry[] = [];

  for (const [, record] of Object.entries(records)) {
    if (record.mapId !== mapId || record.matches < INSIGHT_THRESHOLD) {
      continue;
    }

    const operator = operatorLookup[record.operatorId];
    if (!operator || operator.side !== side) {
      continue;
    }

    const kd = computeKD(record.kills, record.deaths);
    // If kd is null (0 kills, 0 deaths), treat as 0 for display
    const kdValue = kd ?? 0;

    qualifying.push({
      operatorId: record.operatorId,
      operatorName: operator.name,
      kd: Math.round(kdValue * 100) / 100,
      matches: record.matches,
    });
  }

  // Sort by K/D descending, ties by matches descending
  qualifying.sort((a, b) => {
    if (a.kd !== b.kd) return b.kd - a.kd;
    return b.matches - a.matches;
  });

  return qualifying.slice(0, 5);
}

/**
 * Merges two sets of map performance records additively.
 * For overlapping keys, kills/deaths/matches are summed.
 * Non-overlapping records are included unchanged.
 */
export function mergeMapPerformanceRecords(
  local: Record<string, MapPerformanceRecord>,
  cloud: Record<string, MapPerformanceRecord>
): Record<string, MapPerformanceRecord> {
  const merged: Record<string, MapPerformanceRecord> = { ...cloud };

  for (const [key, localRecord] of Object.entries(local)) {
    const cloudRecord = merged[key];
    if (cloudRecord) {
      merged[key] = {
        operatorId: cloudRecord.operatorId,
        mapId: cloudRecord.mapId,
        kills: cloudRecord.kills + localRecord.kills,
        deaths: cloudRecord.deaths + localRecord.deaths,
        matches: cloudRecord.matches + localRecord.matches,
      };
    } else {
      merged[key] = { ...localRecord };
    }
  }

  return merged;
}

/**
 * Filters the map pool to only active maps, sorted alphabetically by name.
 * MapData entries without an explicit `active` field default to true for backward compatibility.
 */
export function getActiveMaps(maps: MapData[]): MapData[] {
  return maps
    .filter((m) => m.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));
}
