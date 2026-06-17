/**
 * Migration Service
 *
 * Detects existing localStorage data from the pre-auth app and migrates it
 * to Supabase cloud storage for authenticated users.
 *
 * localStorage keys handled:
 * - xawars_history: HistoryItem[] (deployment history)
 * - xawars_operatorKills: Record<string, number> (per-operator kills)
 * - xawars_operatorDeaths: Record<string, number> (per-operator deaths)
 * - xawars_kills: number (total kills — informational, derived from operator kills)
 * - xawars_deaths: number (total deaths — informational, derived from operator deaths)
 * - xawars_mapPerformance: Record<string, MapPerformanceRecord> (map performance)
 * - xawars_mapWinLoss: Record<string, MapWinLossRecord> (map win/loss)
 */

import { supabase } from './supabase';
import { mergeMapPerformanceRecords } from './map-performance';
import { mergeMapWinLossRecords, deserializeMapWinLoss } from './win-loss-logic';
import type { MapPerformanceRecord, MapWinLossRecord } from '../types/database';

/**
 * Known localStorage keys that contain migratable app data.
 */
export const MIGRATABLE_KEYS = [
  'xawars_history',
  'xawars_operatorKills',
  'xawars_operatorDeaths',
  'xawars_kills',
  'xawars_deaths',
  'xawars_mapPerformance',
  'xawars_mapWinLoss',
] as const;

export type MigratableKey = (typeof MIGRATABLE_KEYS)[number];

/**
 * Result of a migration attempt.
 */
export interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
}

/**
 * Detects whether any known app localStorage keys contain data.
 * Returns true if at least one migratable key has a non-empty value.
 */
export function detectLocalStorageData(): boolean {
  if (typeof window === 'undefined') return false;

  for (const key of MIGRATABLE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null && value !== '' && value !== 'null' && value !== '[]' && value !== '{}' && value !== '0') {
        return true;
      }
    } catch {
      // localStorage not available
      continue;
    }
  }

  return false;
}

/**
 * Safely parses a localStorage value as JSON.
 * Returns null if the key doesn't exist or parsing fails.
 */
function safeParseLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * HistoryItem shape as stored in localStorage (from HistoryList component).
 */
interface LocalHistoryItem {
  id: number;
  operator: {
    id: string;
    name: string;
    side: 'attacker' | 'defender';
    [key: string]: unknown;
  };
  loadout: {
    primary: string;
    secondary: string;
    gadget: string;
  };
  matchType?: string;
  platform?: string;
  targetKills?: number;
  role?: string;
}

/**
 * Migrates deployment history to Supabase.
 */
async function migrateDeploymentHistory(userId: string): Promise<{ success: boolean; error?: string }> {
  const history = safeParseLocalStorage<LocalHistoryItem[]>('xawars_history');
  if (!history || history.length === 0) {
    return { success: true }; // Nothing to migrate
  }

  // Transform HistoryItem[] to deployment records for Supabase
  // Limit to 100 most recent (by id, which is a timestamp)
  const sorted = [...history].sort((a, b) => b.id - a.id).slice(0, 100);

  const rows = sorted.map((item) => ({
    user_id: userId,
    operator_id: item.operator.id,
    operator_name: item.operator.name,
    operator_side: item.operator.side,
    loadout: item.loadout,
    match_type: item.matchType || null,
    platform: item.platform || null,
    target_kills: item.targetKills ?? 0,
    role: item.role || null,
    deployed_at: new Date(item.id).toISOString(),
  }));

  const { error } = await supabase.from('deployments').insert(rows);

  if (error) {
    return { success: false, error: `Deployment history migration failed: ${error.message}` };
  }

  return { success: true };
}

/**
 * Migrates operator stats (kills, deaths, deployments) to Supabase.
 * Combines data from xawars_operatorKills, xawars_operatorDeaths, and xawars_history.
 */
async function migrateOperatorStats(userId: string): Promise<{ success: boolean; error?: string }> {
  const operatorKills = safeParseLocalStorage<Record<string, number>>('xawars_operatorKills');
  const operatorDeaths = safeParseLocalStorage<Record<string, number>>('xawars_operatorDeaths');
  const history = safeParseLocalStorage<LocalHistoryItem[]>('xawars_history');

  // If no operator-level data exists, nothing to migrate
  if (!operatorKills && !operatorDeaths) {
    return { success: true };
  }

  // Build a map of operator stats from all sources
  const operatorMap = new Map<string, {
    operatorId: string;
    operatorName: string;
    operatorSide: 'attacker' | 'defender';
    kills: number;
    deaths: number;
    deployments: number;
  }>();

  // Count deployments from history
  if (history) {
    for (const item of history) {
      const id = item.operator.id;
      if (!operatorMap.has(id)) {
        operatorMap.set(id, {
          operatorId: id,
          operatorName: item.operator.name,
          operatorSide: item.operator.side,
          kills: 0,
          deaths: 0,
          deployments: 0,
        });
      }
      operatorMap.get(id)!.deployments += 1;
    }
  }

  // Apply kills
  if (operatorKills) {
    for (const [id, kills] of Object.entries(operatorKills)) {
      if (operatorMap.has(id)) {
        operatorMap.get(id)!.kills = kills;
      } else {
        // Operator has kills but no history entry — create a minimal record
        operatorMap.set(id, {
          operatorId: id,
          operatorName: id, // Best effort — name not available without history
          operatorSide: 'attacker', // Default — not determinable without history
          kills,
          deaths: 0,
          deployments: 0,
        });
      }
    }
  }

  // Apply deaths
  if (operatorDeaths) {
    for (const [id, deaths] of Object.entries(operatorDeaths)) {
      if (operatorMap.has(id)) {
        operatorMap.get(id)!.deaths = deaths;
      } else {
        operatorMap.set(id, {
          operatorId: id,
          operatorName: id,
          operatorSide: 'attacker',
          kills: 0,
          deaths,
          deployments: 0,
        });
      }
    }
  }

  if (operatorMap.size === 0) return { success: true };

  const rows = Array.from(operatorMap.values()).map((stat) => ({
    user_id: userId,
    operator_id: stat.operatorId,
    operator_name: stat.operatorName,
    operator_side: stat.operatorSide,
    kills: stat.kills,
    deaths: stat.deaths,
    deployments: stat.deployments,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('operator_stats').upsert(rows, {
    onConflict: 'user_id,operator_id',
  });

  if (error) {
    return { success: false, error: `Operator stats migration failed: ${error.message}` };
  }

  return { success: true };
}

/**
 * Migrates map performance records to Supabase.
 * Reads localStorage records, merges with existing cloud records additively,
 * and upserts the merged results.
 */
async function migrateMapPerformance(userId: string): Promise<{ success: boolean; error?: string }> {
  const localRecords = safeParseLocalStorage<Record<string, MapPerformanceRecord>>('xawars_mapPerformance');
  if (!localRecords || Object.keys(localRecords).length === 0) {
    return { success: true }; // Nothing to migrate
  }

  // Fetch existing cloud records for this user
  const { data: cloudData, error: fetchError } = await supabase
    .from('map_performance')
    .select('operator_id, map_id, kills, deaths, rounds, rounds_won, rounds_lost, matches, matches_won, matches_lost')
    .eq('user_id', userId);

  if (fetchError) {
    return { success: false, error: `Map performance fetch failed: ${fetchError.message}` };
  }

  // Build cloud records map
  const cloudRecords: Record<string, MapPerformanceRecord> = {};
  if (cloudData) {
    for (const row of cloudData) {
      const key = `${row.operator_id}_${row.map_id}`;
      cloudRecords[key] = {
        operatorId: row.operator_id,
        mapId: row.map_id,
        kills: row.kills ?? 0,
        deaths: row.deaths ?? 0,
        rounds: row.rounds ?? 0,
        roundsWon: row.rounds_won ?? 0,
        roundsLost: row.rounds_lost ?? 0,
        matches: row.matches ?? 0,
        matchesWon: row.matches_won ?? 0,
        matchesLost: row.matches_lost ?? 0,
      };
    }
  }

  // Merge local + cloud using additive merge
  const merged = mergeMapPerformanceRecords(localRecords, cloudRecords);

  // Upsert merged records to Supabase
  const rows = Object.values(merged).map((rec) => ({
    user_id: userId,
    operator_id: rec.operatorId,
    map_id: rec.mapId,
    kills: rec.kills,
    deaths: rec.deaths,
    rounds: rec.rounds,
    rounds_won: rec.roundsWon,
    rounds_lost: rec.roundsLost,
    matches: rec.matches,
    matches_won: rec.matchesWon,
    matches_lost: rec.matchesLost,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('map_performance')
    .upsert(rows, { onConflict: 'user_id,operator_id,map_id' });

  if (upsertError) {
    return { success: false, error: `Map performance migration failed: ${upsertError.message}` };
  }

  return { success: true };
}

/**
 * Migrates map win/loss records to Supabase.
 * Reads localStorage records, merges with existing cloud records additively
 * (summing wins and losses), and upserts the merged results.
 */
async function migrateMapWinLoss(userId: string): Promise<{ success: boolean; error?: string }> {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('xawars_mapWinLoss') : null;
  if (!raw) {
    return { success: true }; // Nothing to migrate
  }

  const localRecords = deserializeMapWinLoss(raw);
  if (Object.keys(localRecords).length === 0) {
    return { success: true }; // Empty or invalid data
  }

  // Fetch existing cloud records for this user
  const { data: cloudData, error: fetchError } = await supabase
    .from('map_win_loss')
    .select('map_id, wins, losses')
    .eq('user_id', userId);

  if (fetchError) {
    return { success: false, error: `Map win/loss fetch failed: ${fetchError.message}` };
  }

  // Build cloud records map
  const cloudRecords: Record<string, MapWinLossRecord> = {};
  if (cloudData) {
    for (const row of cloudData) {
      cloudRecords[row.map_id] = {
        mapId: row.map_id,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
      };
    }
  }

  // Merge local + cloud using additive merge (sums wins and losses)
  const merged = mergeMapWinLossRecords(localRecords, cloudRecords);

  // Upsert merged records to Supabase using additive SQL pattern
  const rows = Object.values(merged).map((rec) => ({
    user_id: userId,
    map_id: rec.mapId,
    wins: rec.wins,
    losses: rec.losses,
    updated_at: new Date().toISOString(),
  }));

  // Use raw SQL-style upsert: ON CONFLICT sum wins/losses
  // Since the merge already computed the final sums, we use a replace strategy here
  const { error: upsertError } = await supabase
    .from('map_win_loss')
    .upsert(rows, { onConflict: 'user_id,map_id' });

  if (upsertError) {
    return { success: false, error: `Map win/loss migration failed: ${upsertError.message}` };
  }

  return { success: true };
}

/**
 * Migrates all detected localStorage data to Supabase for the given user.
 *
 * For each data category:
 * 1. Reads and parses the localStorage data
 * 2. Transforms to the Supabase table format
 * 3. Inserts into Supabase
 * 4. Tracks which keys were successfully migrated
 *
 * On failure, localStorage is preserved and errors are reported.
 */
export async function migrateToCloud(userId: string): Promise<MigrationResult> {
  const migratedKeys: string[] = [];
  const errors: string[] = [];

  // Migrate deployment history
  const deploymentResult = await migrateDeploymentHistory(userId);
  if (deploymentResult.success) {
    if (safeParseLocalStorage('xawars_history') !== null) {
      migratedKeys.push('xawars_history');
    }
  } else if (deploymentResult.error) {
    errors.push(deploymentResult.error);
  }

  // Migrate operator stats (kills + deaths combined)
  const operatorResult = await migrateOperatorStats(userId);
  if (operatorResult.success) {
    if (safeParseLocalStorage('xawars_operatorKills') !== null) {
      migratedKeys.push('xawars_operatorKills');
    }
    if (safeParseLocalStorage('xawars_operatorDeaths') !== null) {
      migratedKeys.push('xawars_operatorDeaths');
    }
    if (safeParseLocalStorage('xawars_kills') !== null) {
      migratedKeys.push('xawars_kills');
    }
    if (safeParseLocalStorage('xawars_deaths') !== null) {
      migratedKeys.push('xawars_deaths');
    }
  } else if (operatorResult.error) {
    errors.push(operatorResult.error);
  }

  // Migrate map performance
  const mapPerfResult = await migrateMapPerformance(userId);
  if (mapPerfResult.success) {
    if (safeParseLocalStorage('xawars_mapPerformance') !== null) {
      migratedKeys.push('xawars_mapPerformance');
    }
  } else if (mapPerfResult.error) {
    errors.push(mapPerfResult.error);
  }

  // Migrate map win/loss
  const mapWinLossResult = await migrateMapWinLoss(userId);
  if (mapWinLossResult.success) {
    if (safeParseLocalStorage('xawars_mapWinLoss') !== null) {
      migratedKeys.push('xawars_mapWinLoss');
    }
  } else if (mapWinLossResult.error) {
    errors.push(mapWinLossResult.error);
  }

  return {
    success: errors.length === 0,
    migratedKeys,
    errors,
  };
}

/**
 * Clears the specified localStorage keys after successful migration.
 * Only removes keys that were confirmed as successfully migrated.
 */
export function clearMigratedKeys(keys: string[]): void {
  if (typeof window === 'undefined') return;

  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail — key may already be removed or storage unavailable
    }
  }
}
