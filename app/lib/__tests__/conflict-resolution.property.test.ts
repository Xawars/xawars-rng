import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock supabase before importing sync-queue
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  },
}));

import { resolveConflict } from '../sync-queue';

/**
 * Property 14: Conflict Resolution by Timestamp
 *
 * For any two conflicting operations on the same record, the operation with the
 * more recent timestamp SHALL be the one that persists, regardless of the order
 * in which they are processed.
 *
 * **Validates: Requirements 15.3**
 */
describe('Property 14: Conflict Resolution by Timestamp', () => {
  it('when localTimestamp > remoteTimestamp, winner is local', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0 }),
        fc.integer({ min: 0 }),
        (base, offset) => {
          // Ensure local > remote by adding a positive offset
          const remoteTimestamp = base;
          const localTimestamp = base + offset + 1; // always strictly greater

          const result = resolveConflict(localTimestamp, remoteTimestamp);

          expect(result.winner).toBe('local');
          expect(result.localTimestamp).toBe(localTimestamp);
          expect(result.remoteTimestamp).toBe(remoteTimestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when localTimestamp < remoteTimestamp, winner is remote', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0 }),
        fc.integer({ min: 0 }),
        (base, offset) => {
          // Ensure remote > local by adding a positive offset
          const localTimestamp = base;
          const remoteTimestamp = base + offset + 1; // always strictly greater

          const result = resolveConflict(localTimestamp, remoteTimestamp);

          expect(result.winner).toBe('remote');
          expect(result.localTimestamp).toBe(localTimestamp);
          expect(result.remoteTimestamp).toBe(remoteTimestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('when timestamps are equal, winner is local (optimistic local-first)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0 }),
        (timestamp) => {
          const result = resolveConflict(timestamp, timestamp);

          expect(result.winner).toBe('local');
          expect(result.localTimestamp).toBe(timestamp);
          expect(result.remoteTimestamp).toBe(timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('the winner always has the more recent (or equal) timestamp', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0 }),
        fc.integer({ min: 0 }),
        (localTimestamp, remoteTimestamp) => {
          const result = resolveConflict(localTimestamp, remoteTimestamp);

          if (result.winner === 'local') {
            // Local wins means local timestamp >= remote timestamp
            expect(localTimestamp).toBeGreaterThanOrEqual(remoteTimestamp);
          } else {
            // Remote wins means remote timestamp > local timestamp
            expect(remoteTimestamp).toBeGreaterThan(localTimestamp);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
