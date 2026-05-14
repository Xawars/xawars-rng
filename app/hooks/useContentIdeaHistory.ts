import { useState, useCallback, useEffect, useRef } from 'react';
import { ContentIdea } from '../lib/ai-client';
import { usePersistedState } from './usePersistedState';

/**
 * Maximum number of content ideas stored in history.
 * When capacity is reached, the oldest entry is evicted.
 */
export const MAX_HISTORY_SIZE = 50;

/**
 * A content idea that has been saved to history with a unique identifier and timestamp.
 */
export interface SavedContentIdea extends ContentIdea {
  /** UUID v4 identifier for the saved entry */
  id: string;
  /** ISO 8601 UTC timestamp of when the idea was saved */
  savedAt: string;
}

/**
 * Return type for the useContentIdeaHistory hook.
 */
export interface UseContentIdeaHistoryReturn {
  /** All saved content ideas, ordered newest-first */
  entries: SavedContentIdea[];
  /** Add a new content idea to history. Returns success status and optional error. */
  addEntry: (idea: ContentIdea) => { success: boolean; error?: string };
  /** Delete a single entry by its ID */
  deleteEntry: (id: string) => void;
  /** Clear all entries from history (caller should confirm with user first) */
  clearAll: () => void;
  /** Current storage error message, or null if no error */
  storageError: string | null;
}

/**
 * Generates a unique identifier.
 * Uses crypto.randomUUID() when available, with a fallback for environments
 * where it is not supported.
 */
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to fallback
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Validates that a value has the expected shape of a SavedContentIdea.
 * Returns true if the value is an object with all required fields of correct types.
 */
export function isValidSavedContentIdea(value: unknown): value is SavedContentIdea {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.savedAt === 'string' &&
    typeof obj.contentIdea === 'string' &&
    typeof obj.storyHook === 'string' &&
    typeof obj.missionDirective === 'string' &&
    Array.isArray(obj.titleVariations) &&
    obj.titleVariations.length === 3 &&
    obj.titleVariations.every((v: unknown) => typeof v === 'string') &&
    Array.isArray(obj.thumbnailPrompts) &&
    obj.thumbnailPrompts.length === 3 &&
    obj.thumbnailPrompts.every((v: unknown) => typeof v === 'string')
  );
}

/**
 * Validates an array of entries, returning only those with valid shape.
 * If the input is not an array, returns an empty array.
 */
export function validateEntries(data: unknown): SavedContentIdea[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isValidSavedContentIdea);
}

/**
 * Hook that manages a persisted history of content ideas.
 * Wraps usePersistedState with domain-specific logic for adding, deleting,
 * and clearing entries, with a 50-entry capacity cap.
 */
export function useContentIdeaHistory(): UseContentIdeaHistoryReturn {
  const [entries, setEntries] = usePersistedState<SavedContentIdea[]>('content-idea-history', []);
  const [storageError, setStorageError] = useState<string | null>(null);
  const hasPerformedLoadCheck = useRef(false);

  // Load-time validation and truncation: runs after hydration from localStorage
  useEffect(() => {
    // Skip if we've already performed the load check or entries are empty (not yet hydrated)
    if (hasPerformedLoadCheck.current) return;
    // Only perform the check when entries are non-empty (hydrated from localStorage)
    // or if entries is empty, we still mark as checked since there's nothing to truncate
    if (entries.length === 0) return;

    hasPerformedLoadCheck.current = true;

    try {
      // Validate entries shape - filter out any corrupted entries
      const validEntries = validateEntries(entries);

      // If validation removed entries (corrupted data), reset to valid subset
      if (validEntries.length !== entries.length) {
        console.error('Content idea history contained corrupted entries, resetting to valid subset.');
        setEntries(validEntries.length > 0 ? validEntries : []);
        return;
      }

      // Truncate to MAX_HISTORY_SIZE if stored entries exceed the limit
      if (validEntries.length > MAX_HISTORY_SIZE) {
        const sorted = [...validEntries].sort(
          (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        const truncated = sorted.slice(0, MAX_HISTORY_SIZE);
        setEntries(truncated);
      }
    } catch (error) {
      // If anything goes wrong during validation/truncation, reset to empty
      console.error('Error during history load validation:', error);
      setStorageError('Failed to load history from storage.');
      setEntries([]);
    }
  }, [entries, setEntries]);

  const addEntry = useCallback((idea: ContentIdea): { success: boolean; error?: string } => {
    try {
      const newEntry: SavedContentIdea = {
        ...idea,
        id: generateId(),
        savedAt: new Date().toISOString(),
      };

      setEntries((prev) => {
        const updated = [newEntry, ...prev];
        // Enforce capacity: if over MAX_HISTORY_SIZE, remove the last (oldest) entry
        if (updated.length > MAX_HISTORY_SIZE) {
          return updated.slice(0, MAX_HISTORY_SIZE);
        }
        return updated;
      });

      setStorageError(null);
      return { success: true };
    } catch (error) {
      const message = 'Idea saved to session but could not be persisted. It may be lost on page refresh.';
      setStorageError(message);
      return { success: false, error: message };
    }
  }, [setEntries]);

  const deleteEntry = useCallback((id: string): void => {
    try {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setStorageError(null);
    } catch (error) {
      setStorageError('Failed to delete entry from storage.');
    }
  }, [setEntries]);

  const clearAll = useCallback((): void => {
    try {
      setEntries([]);
      setStorageError(null);
    } catch (error) {
      setStorageError('Failed to clear history from storage.');
    }
  }, [setEntries]);

  return {
    entries,
    addEntry,
    deleteEntry,
    clearAll,
    storageError,
  };
}
