import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import type { QueuedOperation } from '../sync-queue';

/**
 * Property 13: Sync Queue Operation Preservation
 *
 * For any sequence of data operations enqueued while offline, when the network
 * is restored and the queue drains, every enqueued operation SHALL have been
 * sent exactly once and in the order it was enqueued.
 *
 * Validates: Requirements 15.1, 15.2
 */

// Track all operations sent to Supabase during drain
let sentOperations: Array<{ table: string; operation: string; payload: Record<string, unknown> }> = [];

// Mock supabase to always succeed and record what was sent
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      upsert: vi.fn((payload: Record<string, unknown>) => {
        sentOperations.push({ table, operation: 'upsert', payload });
        return Promise.resolve({ error: null });
      }),
      insert: vi.fn((payload: Record<string, unknown>) => {
        sentOperations.push({ table, operation: 'insert', payload });
        return Promise.resolve({ error: null });
      }),
      delete: vi.fn(() => ({
        eq: vi.fn((_field: string, _value: string) => {
          sentOperations.push({ table, operation: 'delete', payload: {} });
          return Promise.resolve({ error: null });
        }),
      })),
    })),
  },
}));

describe('Feature: auth-persistence-gamification, Property 13: Sync Queue Operation Preservation', () => {
  let createSyncQueue: typeof import('../sync-queue').createSyncQueue;
  let mockStorage: Record<string, string>;

  beforeEach(async () => {
    vi.resetModules();
    sentOperations = [];

    // Mock localStorage
    mockStorage = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockStorage[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          mockStorage = {};
        }),
      },
      writable: true,
      configurable: true,
    });

    // Start offline so enqueue doesn't trigger drain
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });

    // Mock window event listeners (no-op)
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {});

    // Re-import to get fresh module with mocks
    const mod = await import('../sync-queue');
    createSyncQueue = mod.createSyncQueue;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Arbitrary for generating operation types (excluding delete for simpler payload tracking)
  const operationTypeArb = fc.constantFrom('upsert' as const, 'insert' as const);

  // Arbitrary for generating table names
  const tableNameArb = fc.constantFrom(
    'ranked_stats',
    'deployments',
    'operator_stats',
    'content_ideas',
    'gamification',
    'achievements'
  );

  // Arbitrary for generating payloads with identifiable content
  const payloadArb = fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    value: fc.integer({ min: 0, max: 10000 }),
  });

  // Arbitrary for a single operation input
  const operationInputArb = fc.record({
    table: tableNameArb,
    operation: operationTypeArb,
    payload: payloadArb,
  });

  // Arbitrary for a sequence of operations (1 to 20 operations)
  const operationSequenceArb = fc.array(operationInputArb, { minLength: 1, maxLength: 20 });

  it('every enqueued operation is sent exactly once in FIFO order when drained', () => {
    fc.assert(
      fc.property(operationSequenceArb, (operations) => {
        // Reset shared state for this iteration
        sentOperations = [];
        mockStorage = {};

        // Create queue in offline mode (navigator.onLine is already false)
        const queue = createSyncQueue();

        // Enqueue all operations while offline
        for (const op of operations) {
          queue.enqueue({
            table: op.table,
            operation: op.operation,
            payload: op.payload as unknown as Record<string, unknown>,
          });
        }

        // Verify all operations are queued
        expect(queue.pending).toHaveLength(operations.length);

        // Verify FIFO ordering in the pending queue
        for (let i = 0; i < operations.length; i++) {
          expect(queue.pending[i].table).toBe(operations[i].table);
          expect(queue.pending[i].operation).toBe(operations[i].operation);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('draining sends all operations exactly once in FIFO order', async () => {
    // This test uses a single representative sequence per run to avoid async issues
    // with fast-check. We generate the sequence, then test the drain behavior.
    const sequences = fc.sample(operationSequenceArb, 100);

    for (const operations of sequences) {
      // Reset shared state for this iteration
      sentOperations = [];
      mockStorage = {};

      // Create queue offline
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const offlineQueue = createSyncQueue();

      // Enqueue all operations while offline
      for (const op of operations) {
        offlineQueue.enqueue({
          table: op.table,
          operation: op.operation,
          payload: op.payload as unknown as Record<string, unknown>,
        });
      }

      // Now go online and create a new queue that loads from localStorage
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onlineQueue = createSyncQueue();

      // Drain the queue
      await onlineQueue.drain();

      // Verify: each operation was sent exactly once
      expect(sentOperations).toHaveLength(operations.length);

      // Verify: operations were sent in FIFO order (same order as enqueued)
      for (let i = 0; i < operations.length; i++) {
        expect(sentOperations[i].table).toBe(operations[i].table);
        expect(sentOperations[i].operation).toBe(operations[i].operation);
      }

      // Verify: queue is now empty after drain
      expect(onlineQueue.pending).toHaveLength(0);
    }
  });

  it('no operation is sent more than once after multiple drain calls', async () => {
    const sequences = fc.sample(operationSequenceArb, 100);

    for (const operations of sequences) {
      // Reset shared state for this iteration
      sentOperations = [];
      mockStorage = {};

      // Create queue offline
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const offlineQueue = createSyncQueue();

      for (const op of operations) {
        offlineQueue.enqueue({
          table: op.table,
          operation: op.operation,
          payload: op.payload as unknown as Record<string, unknown>,
        });
      }

      // Go online and drain
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onlineQueue = createSyncQueue();
      await onlineQueue.drain();

      const countAfterFirstDrain = sentOperations.length;

      // Calling drain again should not send any more operations
      await onlineQueue.drain();
      expect(sentOperations.length).toBe(countAfterFirstDrain);

      // Total sent should equal total enqueued (exactly once)
      expect(countAfterFirstDrain).toBe(operations.length);
    }
  });
});
