'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { syncQueue } from '../lib/sync-queue';
import { detectLocalStorageData, migrateToCloud, clearMigratedKeys } from '../lib/migration-service';
import { useAuth } from './AuthContext';
import type { DeploymentRecord, OperatorStatRecord } from '../types/database';
import type { SavedContentIdea } from '../hooks/useContentIdeaHistory';
import type { ContentIdea } from '../lib/openai';

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

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isGuest, isLoading: authLoading } = useAuth();
  const [deploymentHistory, setDeploymentHistory] = useState<DeploymentRecord[]>([]);
  const [operatorStats] = useState<Record<string, OperatorStatRecord>>({});
  const [contentIdeas] = useState<SavedContentIdea[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'pending' | 'migrating' | 'complete' | 'failed'>('idle');

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

      hydratedUserRef.current = user.id;
    };

    hydrate();
  }, [user, isGuest, authLoading]);

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
    deploymentHistory,
    addDeployment,
    deleteDeployment,
    clearDeployments,
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
