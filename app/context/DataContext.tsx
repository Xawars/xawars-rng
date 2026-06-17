'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { syncQueue } from '../lib/sync-queue';
import { detectLocalStorageData, migrateToCloud, clearMigratedKeys } from '../lib/migration-service';
import { useAuth } from './AuthContext';
import { upsertMapPerformance } from '../lib/map-performance';
import { upsertMapWinLoss, serializeMapWinLoss, deserializeMapWinLoss } from '../lib/win-loss-logic';
import type { DeploymentRecord, OperatorStatRecord, MapPerformanceRecord, MapWinLossRecord, SitePerformanceRecord } from '../types/database';

/**
 * The full DataContext value exposed to consumers.
 */
export interface DataContextValue {
  // Roulette history
  deploymentHistory: DeploymentRecord[];
  addDeployment: (record: DeploymentRecord) => void;
  deleteDeployment: (id: string) => Promise<void>;
  clearDeployments: () => Promise<void>;

  // Operator stats (stub — implemented in 5.5)
  operatorStats: Record<string, OperatorStatRecord>;
  updateOperatorStat: (operatorId: string, delta: { kills?: number; deaths?: number }) => void;

  // Map performance
  mapPerformanceRecords: Record<string, MapPerformanceRecord>;
  updateMapPerformance: (operatorId: string, mapId: string, delta: { kills?: number; deaths?: number; rounds?: number; roundsWon?: number; roundsLost?: number; matches?: number; matchesWon?: number; matchesLost?: number }) => void;

  // Site performance
  sitePerformanceRecords: Record<string, SitePerformanceRecord>;
  updateSitePerformance: (operatorId: string, mapId: string, siteId: string, delta: { kills?: number; deaths?: number; matches?: number }) => void;

  // Map win/loss
  mapWinLossRecords: Record<string, MapWinLossRecord>;
  updateMapWinLoss: (mapId: string, outcome: 'win' | 'loss') => void;

  // Migration (stub — implemented in 6.2)
  migrationStatus: 'idle' | 'pending' | 'migrating' | 'complete' | 'failed';
  startMigration: () => Promise<void>;
  dismissMigration: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

/**
 * Fetch deployment history from Supabase for the given user.
 * Returns the most recent 50 deployments, ordered by deployed_at desc.
 */
async function fetchDeploymentsFromCloud(userId: string): Promise<DeploymentRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('deployments')
      .select('id, operator_id, operator_name, operator_side, loadout, match_type, platform, target_kills, role, deployed_at')
      .eq('user_id', userId)
      .order('deployed_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return null;

    return data.map((row) => ({
      id: row.id,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      operatorSide: row.operator_side,
      loadout: row.loadout,
      matchType: row.match_type || undefined,
      platform: row.platform || undefined,
      targetKills: row.target_kills,
      role: row.role || undefined,
      deployedAt: row.deployed_at,
    }));
  } catch {
    return null;
  }
}

/**
 * Fetch operator stats from Supabase for the given user.
 */
async function fetchOperatorStatsFromCloud(userId: string): Promise<Record<string, OperatorStatRecord> | null> {
  try {
    const { data, error } = await supabase
      .from('operator_stats')
      .select('operator_id, operator_name, operator_side, kills, deaths, deployments')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return null;

    const statsMap: Record<string, OperatorStatRecord> = {};
    for (const row of data) {
      statsMap[row.operator_id] = {
        operatorId: row.operator_id,
        operatorName: row.operator_name,
        operatorSide: row.operator_side,
        kills: row.kills ?? 0,
        deaths: row.deaths ?? 0,
        deployments: row.deployments ?? 0,
      };
    }
    return statsMap;
  } catch {
    return null;
  }
}

/**
 * Fetch map performance records from Supabase for the given user.
 */
async function fetchMapPerformanceFromCloud(userId: string): Promise<Record<string, MapPerformanceRecord> | null> {
  try {
    const { data, error } = await supabase
      .from('map_performance')
      .select('operator_id, map_id, kills, deaths, rounds, rounds_won, rounds_lost, matches, matches_won, matches_lost')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return null;

    const records: Record<string, MapPerformanceRecord> = {};
    for (const row of data) {
      const key = `${row.operator_id}_${row.map_id}`;
      records[key] = {
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
    return records;
  } catch {
    return null;
  }
}

/**
 * Fetch site performance records from Supabase for the given user.
 */
async function fetchSitePerformanceFromCloud(userId: string): Promise<Record<string, SitePerformanceRecord> | null> {
  try {
    const { data, error } = await supabase
      .from('site_performance')
      .select('operator_id, map_id, site_id, kills, deaths, matches')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return null;

    const records: Record<string, SitePerformanceRecord> = {};
    for (const row of data) {
      const key = `${row.operator_id}_${row.map_id}_${row.site_id}`;
      records[key] = {
        operatorId: row.operator_id,
        mapId: row.map_id,
        siteId: row.site_id,
        kills: row.kills ?? 0,
        deaths: row.deaths ?? 0,
        matches: row.matches ?? 0,
      };
    }
    return records;
  } catch {
    return null;
  }
}

/**
 * Fetch map win/loss records from Supabase for the given user.
 */
async function fetchMapWinLossFromCloud(userId: string): Promise<Record<string, MapWinLossRecord> | null> {
  try {
    const { data, error } = await supabase
      .from('map_win_loss')
      .select('map_id, wins, losses')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return null;

    const records: Record<string, MapWinLossRecord> = {};
    for (const row of data) {
      records[row.map_id] = {
        mapId: row.map_id,
        wins: row.wins ?? 0,
        losses: row.losses ?? 0,
      };
    }
    return records;
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON from localStorage, returning null on failure.
 */
function safeParseLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const MAP_PERFORMANCE_STORAGE_KEY = 'xawars_mapPerformance';

/**
 * Load map performance records from localStorage.
 */
function loadMapPerformanceRecords(): Record<string, MapPerformanceRecord> {
  return safeParseLocalStorage<Record<string, MapPerformanceRecord>>(MAP_PERFORMANCE_STORAGE_KEY) ?? {};
}

/**
 * Save map performance records to localStorage.
 * Handles QuotaExceededError gracefully.
 */
function saveMapPerformanceRecords(records: Record<string, MapPerformanceRecord>): void {
  try {
    localStorage.setItem(MAP_PERFORMANCE_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // QuotaExceededError or other storage issue — log and continue
    console.warn('[XAWARS] Failed to save map performance records to localStorage');
  }
}

const MAP_WIN_LOSS_STORAGE_KEY = 'xawars_mapWinLoss';

/**
 * Load map win/loss records from localStorage.
 * Returns empty object on corrupted/missing data.
 */
function loadMapWinLossRecords(): Record<string, MapWinLossRecord> {
  try {
    const raw = localStorage.getItem(MAP_WIN_LOSS_STORAGE_KEY);
    if (!raw) return {};
    return deserializeMapWinLoss(raw);
  } catch {
    return {};
  }
}

/**
 * Save map win/loss records to localStorage.
 * Handles QuotaExceededError gracefully (logs warning, continues with in-memory state).
 */
function saveMapWinLossRecords(records: Record<string, MapWinLossRecord>): void {
  try {
    localStorage.setItem(MAP_WIN_LOSS_STORAGE_KEY, serializeMapWinLoss(records));
  } catch (e) {
    // QuotaExceededError or other storage issue — log and continue with in-memory state
    console.warn('[XAWARS] Failed to save map win/loss records to localStorage:', e instanceof Error ? e.message : e);
  }
}

const SITE_PERFORMANCE_STORAGE_KEY = 'xawars_sitePerformance';

function loadSitePerformanceRecords(): Record<string, SitePerformanceRecord> {
  return safeParseLocalStorage<Record<string, SitePerformanceRecord>>(SITE_PERFORMANCE_STORAGE_KEY) ?? {};
}

function saveSitePerformanceRecords(records: Record<string, SitePerformanceRecord>): void {
  try {
    localStorage.setItem(SITE_PERFORMANCE_STORAGE_KEY, JSON.stringify(records));
  } catch {
    console.warn('[XAWARS] Failed to save site performance records to localStorage');
  }
}

/**
 * Derive operator stats from localStorage data (xawars_operatorKills, xawars_operatorDeaths, xawars_history).
 */
function deriveStatsFromLocalStorage(): Record<string, OperatorStatRecord> {
  const operatorKills = safeParseLocalStorage<Record<string, number>>('xawars_operatorKills') ?? {};
  const operatorDeaths = safeParseLocalStorage<Record<string, number>>('xawars_operatorDeaths') ?? {};
  const history = safeParseLocalStorage<Array<{ operator: { id: string; name: string; side: string } }>>('xawars_history') ?? [];

  const statsMap: Record<string, OperatorStatRecord> = {};

  // Count deployments from history
  for (const item of history) {
    const id = item.operator.id;
    if (!statsMap[id]) {
      statsMap[id] = {
        operatorId: id,
        operatorName: item.operator.name,
        operatorSide: item.operator.side as 'attacker' | 'defender',
        kills: 0,
        deaths: 0,
        deployments: 0,
      };
    }
    statsMap[id].deployments += 1;
  }

  // Merge kills
  for (const [id, kills] of Object.entries(operatorKills)) {
    if (!statsMap[id]) {
      statsMap[id] = {
        operatorId: id,
        operatorName: id,
        operatorSide: 'attacker',
        kills: 0,
        deaths: 0,
        deployments: 0,
      };
    }
    statsMap[id].kills = kills;
  }

  // Merge deaths
  for (const [id, deaths] of Object.entries(operatorDeaths)) {
    if (statsMap[id]) {
      statsMap[id].deaths = deaths;
    }
  }

  return statsMap;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentRecord[]>([]);
  const [cloudOperatorStats, setCloudOperatorStats] = useState<Record<string, OperatorStatRecord> | null>(null);
  const [localStatsVersion, setLocalStatsVersion] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'pending' | 'migrating' | 'complete' | 'failed'>('idle');
  const [mapPerformanceRecords, setMapPerformanceRecords] = useState<Record<string, MapPerformanceRecord>>({});
  const [sitePerformanceRecords, setSitePerformanceRecords] = useState<Record<string, SitePerformanceRecord>>({});
  const [mapWinLossRecords, setMapWinLossRecords] = useState<Record<string, MapWinLossRecord>>({});

  // Track whether we've already hydrated from cloud for this user session
  const hydratedUserRef = useRef<string | null>(null);

  // When user logs in, hydrate local state
  useEffect(() => {
    if (authLoading) return;
    if (isGuest || !user) return;
    if (hydratedUserRef.current === user.id) return; // Already hydrated for this user

    const hydrate = async () => {
      // Check for localStorage data to migrate on first login
      if (detectLocalStorageData()) {
        setMigrationStatus('pending');
      }

      // Fetch deployment history from cloud
      const cloudDeployments = await fetchDeploymentsFromCloud(user.id);
      if (cloudDeployments) {
        setDeploymentHistory(cloudDeployments);
      }

      // Fetch operator stats from cloud
      const cloudStats = await fetchOperatorStatsFromCloud(user.id);
      if (cloudStats) {
        setCloudOperatorStats(cloudStats);
      }

      // Fetch map performance records from cloud
      const cloudMapPerf = await fetchMapPerformanceFromCloud(user.id);
      if (cloudMapPerf) {
        setMapPerformanceRecords(cloudMapPerf);
      }

      // Fetch site performance records from cloud
      const cloudSitePerf = await fetchSitePerformanceFromCloud(user.id);
      if (cloudSitePerf) {
        setSitePerformanceRecords(cloudSitePerf);
      }

      // Fetch map win/loss records from cloud
      const cloudMapWinLoss = await fetchMapWinLossFromCloud(user.id);
      if (cloudMapWinLoss) {
        setMapWinLossRecords(cloudMapWinLoss);
      }

      hydratedUserRef.current = user.id;
    };

    hydrate();
  }, [user, isGuest, authLoading]);

  // Derive operatorStats: prefer cloud data, fall back to localStorage-derived data
  const operatorStats = useMemo<Record<string, OperatorStatRecord>>(() => {
    // If we have cloud stats, use those
    if (cloudOperatorStats && Object.keys(cloudOperatorStats).length > 0) {
      return cloudOperatorStats;
    }

    // Fall back to deriving from localStorage (covers guests and pre-migration users)
    if (typeof window !== 'undefined') {
      return deriveStatsFromLocalStorage();
    }

    return {};
  // Re-derive when deploymentHistory changes (new deployments affect counts)
  // or when localStatsVersion bumps (kills/deaths changed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudOperatorStats, deploymentHistory, localStatsVersion]);

  // Listen for localStorage changes (e.g., when page.tsx updates operatorKills/operatorDeaths)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'xawars_operatorKills' || e.key === 'xawars_operatorDeaths' || e.key === 'xawars_history') {
        setLocalStatsVersion(v => v + 1);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Load map performance records from localStorage for guest users
  useEffect(() => {
    if (isGuest || !user) {
      const stored = loadMapPerformanceRecords();
      setMapPerformanceRecords(stored);
    }
  }, [isGuest, user]);

  // Load map win/loss records from localStorage for guest users
  useEffect(() => {
    if (isGuest || !user) {
      const stored = loadMapWinLossRecords();
      setMapWinLossRecords(stored);
    }
  }, [isGuest, user]);

  // Load site performance records from localStorage
  useEffect(() => {
    if (isGuest || !user) {
      const stored = loadSitePerformanceRecords();
      setSitePerformanceRecords(stored);
    }
  }, [isGuest, user]);

  // Update map performance: additive upsert with persistence
  const updateMapPerformance = useCallback((operatorId: string, mapId: string, delta: { kills?: number; deaths?: number; rounds?: number; roundsWon?: number; roundsLost?: number; matches?: number; matchesWon?: number; matchesLost?: number }) => {
    setMapPerformanceRecords(prev => {
      const updated = upsertMapPerformance(prev, operatorId, mapId, delta);

      // Persist to localStorage for guests
      if (isGuest || !user) {
        saveMapPerformanceRecords(updated);
      }

      // For authenticated users, enqueue Supabase upsert via syncQueue
      if (user && !isGuest) {
        syncQueue.enqueue({
          table: 'map_performance',
          operation: 'upsert',
          payload: {
            user_id: user.id,
            operator_id: operatorId,
            map_id: mapId,
            kills: delta.kills ?? 0,
            deaths: delta.deaths ?? 0,
            rounds: delta.rounds ?? 0,
            rounds_won: delta.roundsWon ?? 0,
            rounds_lost: delta.roundsLost ?? 0,
            matches: delta.matches ?? 0,
            matches_won: delta.matchesWon ?? 0,
            matches_lost: delta.matchesLost ?? 0,
            updated_at: new Date().toISOString(),
          },
        });
      }

      return updated;
    });
  }, [user, isGuest]);

  // Update site performance: additive upsert with persistence + cloud sync
  const updateSitePerformance = useCallback((operatorId: string, mapId: string, siteId: string, delta: { kills?: number; deaths?: number; matches?: number }) => {
    setSitePerformanceRecords(prev => {
      const key = `${operatorId}_${mapId}_${siteId}`;
      const existing = prev[key] ?? { operatorId, mapId, siteId, kills: 0, deaths: 0, matches: 0 };
      const updated = {
        ...prev,
        [key]: {
          ...existing,
          kills: existing.kills + (delta.kills ?? 0),
          deaths: existing.deaths + (delta.deaths ?? 0),
          matches: existing.matches + (delta.matches ?? 0),
        },
      };

      // Persist to localStorage for guests
      if (isGuest || !user) {
        saveSitePerformanceRecords(updated);
      }

      // For authenticated users, enqueue Supabase upsert
      if (user && !isGuest) {
        syncQueue.enqueue({
          table: 'site_performance',
          operation: 'upsert',
          payload: {
            user_id: user.id,
            operator_id: operatorId,
            map_id: mapId,
            site_id: siteId,
            kills: delta.kills ?? 0,
            deaths: delta.deaths ?? 0,
            matches: delta.matches ?? 0,
            updated_at: new Date().toISOString(),
          },
        });
      }

      return updated;
    });
  }, [user, isGuest]);

  // Update map win/loss: upsert with localStorage persistence
  const updateMapWinLoss = useCallback((mapId: string, outcome: 'win' | 'loss') => {
    setMapWinLossRecords(prev => {
      const updated = upsertMapWinLoss(prev, mapId, outcome);

      // Persist to localStorage for guests
      if (isGuest || !user) {
        saveMapWinLossRecords(updated);
      }

      // For authenticated users, enqueue Supabase upsert via syncQueue
      if (user && !isGuest) {
        syncQueue.enqueue({
          table: 'map_win_loss',
          operation: 'upsert',
          payload: {
            user_id: user.id,
            map_id: mapId,
            wins: outcome === 'win' ? 1 : 0,
            losses: outcome === 'loss' ? 1 : 0,
            updated_at: new Date().toISOString(),
          },
        });
      }

      return updated;
    });
  }, [user, isGuest]);

  // --- Stubs for features implemented in later tasks ---

  const addDeployment = useCallback((record: DeploymentRecord) => {
    // Add to local state immediately (optimistic)
    setDeploymentHistory(prev => [record, ...prev].slice(0, 50));

    // If authenticated, write directly to Supabase
    if (user && !isGuest) {
      const payload = {
        id: record.id,
        user_id: user.id,
        operator_id: record.operatorId,
        operator_name: record.operatorName,
        operator_side: record.operatorSide,
        loadout: record.loadout,
        match_type: record.matchType || null,
        platform: record.platform || null,
        target_kills: record.targetKills,
        role: record.role || null,
        deployed_at: record.deployedAt,
        updated_at: new Date().toISOString(),
      };

      // Write directly (don't rely solely on sync queue)
      supabase.from('deployments').insert(payload).then(({ error }) => {
        if (error) {
          console.error('[XAWARS] Failed to save deployment:', error.message);
          // Fallback: enqueue for retry
          syncQueue.enqueue({
            table: 'deployments',
            operation: 'insert',
            payload,
          });
        }
      });
    }
  }, [user, isGuest]);

  const deleteDeployment = useCallback(async (id: string) => {
    // Remove from local state immediately (optimistic)
    setDeploymentHistory(prev => prev.filter(d => d.id !== id));

    // If authenticated, delete from Supabase
    if (user && !isGuest) {
      const { error } = await supabase
        .from('deployments')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[XAWARS] Failed to delete deployment:', error.message);
      }
    }
  }, [user, isGuest]);

  const clearDeployments = useCallback(async () => {
    // Clear local state
    setDeploymentHistory([]);

    // If authenticated, delete all user's deployments from Supabase
    if (user && !isGuest) {
      const { error } = await supabase
        .from('deployments')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('[XAWARS] Failed to clear deployments:', error.message);
      }
    }
  }, [user, isGuest]);

  const updateOperatorStat = useCallback((_operatorId: string, _delta: { kills?: number; deaths?: number }) => {
    // Bump local stats version to trigger re-derivation from localStorage
    setLocalStatsVersion(v => v + 1);

    // For cloud users, also update cloud stats state
    if (user && !isGuest) {
      setCloudOperatorStats(prev => {
        if (!prev) return prev;
        const existing = prev[_operatorId];
        if (!existing) return prev;
        return {
          ...prev,
          [_operatorId]: {
            ...existing,
            kills: existing.kills + (_delta.kills ?? 0),
            deaths: existing.deaths + (_delta.deaths ?? 0),
          },
        };
      });
    }
  }, [user, isGuest]);

  const startMigration = useCallback(async () => {
    if (!user || isGuest) return;

    setMigrationStatus('migrating');

    try {
      const result = await migrateToCloud(user.id);

      if (result.success) {
        clearMigratedKeys(result.migratedKeys);
        setMigrationStatus('complete');
      } else {
        // Partial or full failure — preserve localStorage
        setMigrationStatus('failed');
      }
    } catch {
      // Unexpected error — preserve localStorage
      setMigrationStatus('failed');
    }
  }, [user, isGuest]);

  const dismissMigration = useCallback(() => {
    setMigrationStatus('idle');
  }, []);

  const value: DataContextValue = {
    deploymentHistory,
    addDeployment,
    deleteDeployment,
    clearDeployments,
    operatorStats,
    updateOperatorStat,
    mapPerformanceRecords,
    updateMapPerformance,
    sitePerformanceRecords,
    updateSitePerformance,
    mapWinLossRecords,
    updateMapWinLoss,
    migrationStatus,
    startMigration,
    dismissMigration,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

/**
 * Hook to access the DataContext.
 * Must be used within a DataProvider.
 */
export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
