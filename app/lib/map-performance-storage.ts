import type { MapPerformanceRecord } from '../types/database';

/** localStorage key for map performance data. */
const STORAGE_KEY = 'xawars_mapPerformance';

/**
 * Reads map performance records from localStorage.
 * Returns an empty object on any failure (missing key, corrupted JSON, etc.).
 */
export function loadMapPerformanceRecords(): Record<string, MapPerformanceRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MapPerformanceRecord>;
  } catch {
    return {};
  }
}

/**
 * Writes map performance records to localStorage.
 * Catches QuotaExceededError gracefully — logs a warning and continues
 * so that in-memory state remains intact even if persistence fails.
 */
export function saveMapPerformanceRecords(
  records: Record<string, MapPerformanceRecord>
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    ) {
      console.warn('[XAWARS] Map performance storage quota exceeded');
    } else {
      // Re-throw unexpected errors
      throw error;
    }
  }
}
