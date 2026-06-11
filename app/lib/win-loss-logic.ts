import type { MapWinLossRecord } from '../types/database';

/**
 * Increments wins or losses for the specified map by 1.
 * Returns a new records object (does not mutate the input).
 * If the mapId doesn't exist, creates a new entry.
 */
export function upsertMapWinLoss(
  records: Record<string, MapWinLossRecord>,
  mapId: string,
  outcome: 'win' | 'loss'
): Record<string, MapWinLossRecord> {
  const existing = records[mapId] ?? { mapId, wins: 0, losses: 0 };

  const updated: MapWinLossRecord = {
    ...existing,
    wins: existing.wins + (outcome === 'win' ? 1 : 0),
    losses: existing.losses + (outcome === 'loss' ? 1 : 0),
  };

  return {
    ...records,
    [mapId]: updated,
  };
}

/**
 * Computes win rate percentage rounded to the nearest whole number.
 * Returns null when wins + losses === 0.
 */
export function computeWinRate(record: MapWinLossRecord): number | null {
  const total = record.wins + record.losses;
  if (total === 0) {
    return null;
  }
  return Math.round((record.wins / total) * 100);
}

/**
 * Returns true when (wins + losses) < 5, indicating limited data.
 */
export function hasLimitedData(record: MapWinLossRecord): boolean {
  return record.wins + record.losses < 5;
}

/**
 * Returns wins + losses for a record.
 */
export function getTotalOutcomes(record: MapWinLossRecord): number {
  return record.wins + record.losses;
}

/**
 * Merges local and cloud win/loss records additively.
 * For overlapping maps, wins and losses are summed.
 * Non-overlapping maps are included unchanged.
 */
export function mergeMapWinLossRecords(
  local: Record<string, MapWinLossRecord>,
  cloud: Record<string, MapWinLossRecord>
): Record<string, MapWinLossRecord> {
  const merged: Record<string, MapWinLossRecord> = { ...cloud };

  for (const [mapId, localRecord] of Object.entries(local)) {
    const cloudRecord = merged[mapId];
    if (cloudRecord) {
      merged[mapId] = {
        mapId,
        wins: cloudRecord.wins + localRecord.wins,
        losses: cloudRecord.losses + localRecord.losses,
      };
    } else {
      merged[mapId] = { ...localRecord };
    }
  }

  return merged;
}

/**
 * Serializes map win/loss records to a JSON string for localStorage.
 */
export function serializeMapWinLoss(
  records: Record<string, MapWinLossRecord>
): string {
  return JSON.stringify(records);
}

/**
 * Deserializes a JSON string to map win/loss records.
 * Returns an empty object on invalid JSON.
 */
export function deserializeMapWinLoss(
  json: string
): Record<string, MapWinLossRecord> {
  try {
    const parsed = JSON.parse(json);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, MapWinLossRecord>;
  } catch {
    return {};
  }
}
