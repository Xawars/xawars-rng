'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { syncQueue } from '../lib/sync-queue';
import { detectLocalStorageData, migrateToCloud, clearMigratedKeys } from '../lib/migration-service';
import { useAuth } from './AuthContext';
import type { RankProgress, RankedStats } from '../data/types';
import type { DeploymentRecord, OperatorStatRecord } from '../types/database';
import type { SavedContentIdea } from '../hooks/useContentIdeaHistory';
import type { ContentIdea } from '../lib/openai';

// localStorage keys
const RANKED_STATS_KEY = 'xawars_ranked_stats';

/**
 * Default rank progress for a fresh platform.
 */
const DEFAULT_RANK_PROGRESS: RankProgress = {
  tier: 'Copper',
  division: 5,
  rp: 0,
  peakTier: 'Copper',
  peakDivision: 5,
};

/**
 * Default ranked stats for both platforms.
 */
const DEFAULT_RANKED_STATS: RankedStats = {
  PC: { ...DEFAULT_RANK_PROGRESS },
  Console: { ...DEFAULT_RANK_PROGRESS },
};

/**
 * The full DataContext value exposed to consumers.
 */
export interface DataContextValue {
  // Rank progression
  rankedStats: RankedStats;
  updateRankedStats: (platform: 'PC' | 'Console', stats: Partial<RankProgress>) => void;

  // Roulette history (stub — implemented in 5.3)
  deploymentHistory: DeploymentRecord[];
  addDeployment: (record: DeploymentRecord) => void;

  // Operator stats (stub — implemented in 5.5)
  operatorStats: Record<string, OperatorStatRecord>;
  updateOperatorStat: (operatorId: string, delta: { kills?: number; deaths?: number }) => void;

  // Content ideas (stub — implemented in 5.7)
  contentIdeas: SavedContentIdea[];
  addContentIdea: (idea: ContentIdea) => void;
  deleteContentIdea: (id: string) => void;

  // Migration (stub — implemented in 6.2)
  migrationStatus: 'idle' | 'pending' | 'migrating' | 'complete' | 'failed';
  startMigration: () => Promise<void>;
  dismissMigration: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

/**
 * Load ranked stats from localStorage.
 */
function loadLocalRankedStats(): RankedStats {
  if (typeof window === 'undefined') return DEFAULT_RANKED_STATS;
  try {
    const raw = localStorage.getItem(RANKED_STATS_KEY);
    if (!raw) return DEFAULT_RANKED_STATS;
    const parsed = JSON.parse(raw) as RankedStats;
    // Validate structure
    if (parsed.PC && parsed.Console) return parsed;
    return DEFAULT_RANKED_STATS;
  } catch {
    return DEFAULT_RANKED_STATS;
  }
}

/**
 * Save ranked stats to localStorage.
 */
function saveLocalRankedStats(stats: RankedStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RANKED_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage quota exceeded — silently fail
  }
}

/**
 * Fetch ranked stats from Supabase for the given user.
 */
async function fetchRankedStatsFromCloud(userId: string): Promise<RankedStats | null> {
  try {
    const { data, error } = await supabase
      .from('ranked_stats')
      .select('platform, tier, division, rp, peak_tier, peak_division')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return null;

    const stats: RankedStats = { ...DEFAULT_RANKED_STATS };

    for (const row of data) {
      const platform = row.platform as 'PC' | 'Console';
      if (platform === 'PC' || platform === 'Console') {
        stats[platform] = {
          tier: row.tier,
          division: row.division,
          rp: row.rp,
          peakTier: row.peak_tier,
          peakDivision: row.peak_division,
        };
      }
    }

    return stats;
  } catch {
    return null;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const [rankedStats, setRankedStats] = useState<RankedStats>(DEFAULT_RANKED_STATS);
  const [deploymentHistory] = useState<DeploymentRecord[]>([]);
  const [operatorStats] = useState<Record<string, OperatorStatRecord>>({});
  const [contentIdeas] = useState<SavedContentIdea[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'pending' | 'migrating' | 'complete' | 'failed'>('idle');

  // Track whether we've already hydrated from cloud for this user session
  const hydratedUserRef = useRef<string | null>(null);

  // Load local ranked stats on mount
  useEffect(() => {
    const local = loadLocalRankedStats();
    setRankedStats(local);
  }, []);

  // When user logs in, fetch ranked stats from Supabase and hydrate local state
  useEffect(() => {
    if (authLoading) return;
    if (isGuest || !user) return;
    if (hydratedUserRef.current === user.id) return; // Already hydrated for this user

    const hydrate = async () => {
      // Check for localStorage data to migrate on first login
      if (detectLocalStorageData()) {
        setMigrationStatus('pending');
      }

      const cloudStats = await fetchRankedStatsFromCloud(user.id);
      if (cloudStats) {
        setRankedStats(cloudStats);
        saveLocalRankedStats(cloudStats);
        hydratedUserRef.current = user.id;
      } else {
        // No cloud data yet — keep local state, mark as hydrated
        hydratedUserRef.current = user.id;
      }
    };

    hydrate();
  }, [user, isGuest, authLoading]);

  /**
   * Update ranked stats for a specific platform.
   * Writes locally first, then enqueues sync to cloud if authenticated.
   */
  const updateRankedStats = useCallback((platform: 'PC' | 'Console', stats: Partial<RankProgress>) => {
    setRankedStats((prev) => {
      const updated: RankedStats = {
        ...prev,
        [platform]: {
          ...prev[platform],
          ...stats,
        },
      };

      // Persist locally
      saveLocalRankedStats(updated);

      // If authenticated, enqueue cloud sync
      if (user && !isGuest) {
        syncQueue.enqueue({
          table: 'ranked_stats',
          operation: 'upsert',
          payload: {
            user_id: user.id,
            platform,
            tier: updated[platform].tier,
            division: updated[platform].division,
            rp: updated[platform].rp,
            peak_tier: updated[platform].peakTier,
            peak_division: updated[platform].peakDivision,
            updated_at: new Date().toISOString(),
          },
        });
      }

      return updated;
    });
  }, [user, isGuest]);

  // --- Stubs for features implemented in later tasks ---

  const addDeployment = useCallback((_record: DeploymentRecord) => {
    // Stub — will be implemented in task 5.3
  }, []);

  const updateOperatorStat = useCallback((_operatorId: string, _delta: { kills?: number; deaths?: number }) => {
    // Stub — will be implemented in task 5.5
  }, []);

  const addContentIdea = useCallback((_idea: ContentIdea) => {
    // Stub — will be implemented in task 5.7
  }, []);

  const deleteContentIdea = useCallback((_id: string) => {
    // Stub — will be implemented in task 5.7
  }, []);

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
    rankedStats,
    updateRankedStats,
    deploymentHistory,
    addDeployment,
    operatorStats,
    updateOperatorStat,
    contentIdeas,
    addContentIdea,
    deleteContentIdea,
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
