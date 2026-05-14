import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from '../usePersistedState';

/**
 * Property 2: API key persistence round-trip
 *
 * For any valid API key string (starts with "sk-", length >= 20), persisting it via
 * `usePersistedState` with key "xawars_openai_api_key" and then reading it back from
 * localStorage yields the identical string.
 *
 * Validates: Requirements 2.5, 8.4
 */
describe('Feature: ai-content-generator, Property 2: API key persistence round-trip', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockStorage[key] ?? null;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Generator for valid API keys: starts with "sk-" and total length >= 20
  const validApiKeyArb = fc
    .string({ minLength: 17, maxLength: 200 })
    .map((s) => 'sk-' + s)
    .filter((key) => key.length >= 20);

  it('any valid API key persisted via usePersistedState reads back identically from localStorage', () => {
    fc.assert(
      fc.property(validApiKeyArb, (apiKey) => {
        // Reset storage for each iteration
        mockStorage = {};

        // Render the hook and set the API key
        const { result, unmount } = renderHook(() =>
          usePersistedState<string>('xawars_openai_api_key', '')
        );

        // Set the API key value
        act(() => {
          result.current[1](apiKey);
        });

        // After state update, the hook should have written to localStorage
        // Verify the value in localStorage matches the original key exactly
        const storedValue = JSON.parse(mockStorage['xawars_openai_api_key']);
        expect(storedValue).toBe(apiKey);

        // Verify the hook's current state also matches
        expect(result.current[0]).toBe(apiKey);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('a valid API key stored in localStorage is read back identically on hook mount', () => {
    fc.assert(
      fc.property(validApiKeyArb, (apiKey) => {
        // Pre-populate localStorage with the API key
        mockStorage = { 'xawars_openai_api_key': JSON.stringify(apiKey) };

        // Render the hook - it should read the value from localStorage
        const { result, unmount } = renderHook(() =>
          usePersistedState<string>('xawars_openai_api_key', '')
        );

        // After hydration, the hook state should match the stored value
        expect(result.current[0]).toBe(apiKey);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('write then read round-trip: persisted key survives hook remount', () => {
    fc.assert(
      fc.property(validApiKeyArb, (apiKey) => {
        // Reset storage
        mockStorage = {};

        // First mount: write the key
        const { result: writeResult, unmount: unmountWrite } = renderHook(() =>
          usePersistedState<string>('xawars_openai_api_key', '')
        );

        act(() => {
          writeResult.current[1](apiKey);
        });

        unmountWrite();

        // Second mount: read the key back
        const { result: readResult, unmount: unmountRead } = renderHook(() =>
          usePersistedState<string>('xawars_openai_api_key', '')
        );

        // The value read back should be identical to what was written
        expect(readResult.current[0]).toBe(apiKey);

        unmountRead();
      }),
      { numRuns: 100 }
    );
  });
});
