import { supabase } from './supabase';

const STORAGE_KEY = 'sync_queue';
const MAX_RETRIES = 3;

/**
 * A single queued operation waiting to be synced to Supabase.
 */
export interface QueuedOperation {
  id: string;
  table: string;
  operation: 'upsert' | 'insert' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

/**
 * The SyncQueue interface for offline-resilient data persistence.
 */
export interface SyncQueue {
  enqueue: (op: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>) => void;
  drain: () => Promise<void>;
  pending: QueuedOperation[];
  isOnline: boolean;
}

/**
 * Generate a simple unique ID for queued operations.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Load the queue from localStorage.
 */
function loadQueue(): QueuedOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedOperation[];
  } catch {
    return [];
  }
}

/**
 * Persist the queue to localStorage.
 */
function saveQueue(queue: QueuedOperation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage quota exceeded or unavailable — silently fail
  }
}

/**
 * Conflict error codes that indicate a write conflict.
 * - '23505': PostgreSQL unique constraint violation
 * - '409': HTTP conflict status
 */
const CONFLICT_CODES = ['23505', '409'];

/**
 * Determines if a Supabase error represents a conflict.
 */
function isConflictError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code && CONFLICT_CODES.includes(error.code)) return true;
  if (error.message && error.message.toLowerCase().includes('conflict')) return true;
  return false;
}

/**
 * Result of a conflict resolution comparison.
 */
export interface ConflictResolutionResult {
  winner: 'local' | 'remote';
  localTimestamp: number;
  remoteTimestamp: number;
}

/**
 * Resolves a conflict between a local queued operation and the existing remote record.
 * Compares timestamps and returns which one should persist.
 *
 * @param localTimestamp - The timestamp of the queued operation (ms since epoch)
 * @param remoteTimestamp - The timestamp of the existing remote record (ms since epoch)
 * @returns The resolution result indicating which write wins
 */
export function resolveConflict(
  localTimestamp: number,
  remoteTimestamp: number
): ConflictResolutionResult {
  // The more recent timestamp wins. If equal, local wins (optimistic local-first).
  const winner = localTimestamp >= remoteTimestamp ? 'local' : 'remote';
  return { winner, localTimestamp, remoteTimestamp };
}

/**
 * Fetches the `updated_at` timestamp of an existing record from Supabase.
 * Returns the timestamp in ms since epoch, or null if the record cannot be found.
 */
async function fetchRemoteTimestamp(
  table: string,
  payload: Record<string, unknown>
): Promise<number | null> {
  try {
    const id = payload.id as string | undefined;
    let query = supabase.from(table).select('updated_at');

    if (id) {
      query = query.eq('id', id);
    } else {
      // Use unique constraint fields to identify the record
      // Common patterns: user_id + operator_id, user_id + platform, etc.
      for (const [key, value] of Object.entries(payload)) {
        if (key === 'updated_at' || value === undefined || value === null) continue;
        if (typeof value === 'string' || typeof value === 'number') {
          query = query.eq(key, value);
        }
      }
    }

    const { data, error } = await query.limit(1).single();
    if (error || !data) return null;

    const updatedAt = (data as Record<string, unknown>).updated_at;
    if (!updatedAt) return null;

    return new Date(updatedAt as string).getTime();
  } catch {
    return null;
  }
}

/**
 * Forces a write by using upsert to overwrite the existing record.
 * This is used when the local operation wins a conflict.
 */
async function forceWrite(op: QueuedOperation): Promise<boolean> {
  try {
    const result = await supabase.from(op.table).upsert(op.payload, { onConflict: 'id' });
    return !result?.error;
  } catch {
    return false;
  }
}

/**
 * Execute a single queued operation against Supabase.
 * Returns true on success, false on failure.
 * Handles conflict resolution using timestamp comparison.
 */
async function executeOperation(op: QueuedOperation): Promise<boolean> {
  try {
    let result;

    switch (op.operation) {
      case 'upsert':
        result = await supabase.from(op.table).upsert(op.payload);
        break;
      case 'insert':
        result = await supabase.from(op.table).insert(op.payload);
        break;
      case 'delete': {
        const { id, ...filters } = op.payload;
        if (id) {
          result = await supabase.from(op.table).delete().eq('id', id as string);
        } else {
          // If no id, use all payload fields as filters
          let query = supabase.from(op.table).delete();
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value as string);
          }
          result = await query;
        }
        break;
      }
    }

    // If no error, operation succeeded
    if (!result?.error) return true;

    // Check if the error is a conflict
    if (isConflictError(result.error)) {
      return await handleConflict(op);
    }

    // Non-conflict error
    return false;
  } catch {
    return false;
  }
}

/**
 * Handles a conflict by comparing timestamps and deciding whether to
 * force the local write or discard it.
 */
async function handleConflict(op: QueuedOperation): Promise<boolean> {
  // Fetch the remote record's timestamp
  const remoteTimestamp = await fetchRemoteTimestamp(op.table, op.payload);

  // If we can't determine the remote timestamp, treat as failure to retry later
  if (remoteTimestamp === null) return false;

  const resolution = resolveConflict(op.timestamp, remoteTimestamp);

  if (resolution.winner === 'local') {
    // Local operation is newer — force the write
    return await forceWrite(op);
  } else {
    // Remote record is newer — discard the queued operation (treat as success)
    return true;
  }
}

/**
 * Creates and returns a SyncQueue instance.
 * Manages offline queue persistence and automatic draining on reconnect.
 */
export function createSyncQueue(): SyncQueue {
  let queue: QueuedOperation[] = loadQueue();
  let online = typeof window !== 'undefined' ? navigator.onLine : true;
  let draining = false;

  const syncQueue: SyncQueue = {
    get pending() {
      return queue;
    },

    get isOnline() {
      return online;
    },

    enqueue(op) {
      const operation: QueuedOperation = {
        ...op,
        id: generateId(),
        timestamp: Date.now(),
        retryCount: 0,
      };
      queue.push(operation);
      saveQueue(queue);

      // If online, attempt to drain immediately
      if (online) {
        syncQueue.drain();
      }
    },

    async drain() {
      if (draining || !online || queue.length === 0) return;
      draining = true;

      try {
        // Process in FIFO order
        while (queue.length > 0 && online) {
          const op = queue[0];
          const success = await executeOperation(op);

          if (success) {
            // Remove the successfully processed operation
            queue.shift();
            saveQueue(queue);
          } else {
            // Increment retry count
            op.retryCount += 1;

            if (op.retryCount >= MAX_RETRIES) {
              // Drop the operation after max retries
              queue.shift();
              saveQueue(queue);
            } else {
              // Save updated retry count and stop draining
              saveQueue(queue);
              break;
            }
          }
        }
      } finally {
        draining = false;
      }
    },
  };

  // Set up online/offline event listeners in browser environment
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      online = true;
      syncQueue.drain();
    });

    window.addEventListener('offline', () => {
      online = false;
    });
  }

  return syncQueue;
}

/**
 * Singleton SyncQueue instance for use throughout the app.
 */
export const syncQueue: SyncQueue = createSyncQueue();
