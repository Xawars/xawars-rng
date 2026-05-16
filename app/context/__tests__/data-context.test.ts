import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase module
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

// Mock sync-queue module
const mockEnqueue = vi.fn();
vi.mock('../../lib/sync-queue', () => ({
  syncQueue: {
    enqueue: (...args: unknown[]) => mockEnqueue(...args),
    drain: vi.fn(),
    pending: [],
    isOnline: true,
  },
}));

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('DataContext - Ranked Stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides default ranked stats when no data exists', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.rankedStats.PC.tier).toBe('Copper');
    expect(result.current.rankedStats.PC.division).toBe(5);
    expect(result.current.rankedStats.PC.rp).toBe(0);
    expect(result.current.rankedStats.Console.tier).toBe('Copper');
    expect(result.current.rankedStats.Console.division).toBe(5);
  });

  it('loads ranked stats from localStorage on mount', async () => {
    const savedStats = {
      PC: { tier: 'Gold', division: 2, rp: 150, peakTier: 'Platinum', peakDivision: 4 },
      Console: { tier: 'Silver', division: 3, rp: 80, peakTier: 'Gold', peakDivision: 1 },
    };
    localStorageMock.setItem('xawars_ranked_stats', JSON.stringify(savedStats));

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.rankedStats.PC.tier).toBe('Gold');
    expect(result.current.rankedStats.PC.division).toBe(2);
    expect(result.current.rankedStats.PC.rp).toBe(150);
    expect(result.current.rankedStats.Console.tier).toBe('Silver');
  });

  it('updateRankedStats updates only the specified platform', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateRankedStats('PC', { tier: 'Diamond', division: 1, rp: 200 });
    });

    expect(result.current.rankedStats.PC.tier).toBe('Diamond');
    expect(result.current.rankedStats.PC.division).toBe(1);
    expect(result.current.rankedStats.PC.rp).toBe(200);
    // Console should remain unchanged
    expect(result.current.rankedStats.Console.tier).toBe('Copper');
    expect(result.current.rankedStats.Console.division).toBe(5);
  });

  it('updateRankedStats persists to localStorage', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateRankedStats('Console', { tier: 'Gold', division: 3 });
    });

    const stored = JSON.parse(localStorageMock.setItem.mock.calls.at(-1)?.[1] ?? '{}');
    expect(stored.Console.tier).toBe('Gold');
    expect(stored.Console.division).toBe(3);
  });

  it('updateRankedStats does NOT enqueue sync when guest', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    act(() => {
      result.current.updateRankedStats('PC', { tier: 'Silver', division: 2 });
    });

    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('updateRankedStats enqueues sync when authenticated', async () => {
    // Set up authenticated session
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });

    // Mock the Supabase ranked_stats fetch (no existing data)
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    act(() => {
      result.current.updateRankedStats('PC', { tier: 'Platinum', division: 4, rp: 100 });
    });

    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'ranked_stats',
        operation: 'upsert',
        payload: expect.objectContaining({
          user_id: 'user-123',
          platform: 'PC',
          tier: 'Platinum',
          division: 4,
          rp: 100,
        }),
      })
    );
  });

  it('fetches ranked stats from Supabase on login and hydrates state', async () => {
    // Set up authenticated session
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-456', email: 'test@example.com', user_metadata: {}, created_at: '2024-01-01T00:00:00Z' },
          access_token: 'token',
          refresh_token: 'refresh',
          expires_at: 9999999999,
        },
      },
    });

    // Mock Supabase returning cloud data
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({
          data: [
            { platform: 'PC', tier: 'Diamond', division: 1, rp: 300, peak_tier: 'Diamond', peak_division: 1 },
            { platform: 'Console', tier: 'Gold', division: 2, rp: 120, peak_tier: 'Platinum', peak_division: 5 },
          ],
          error: null,
        }),
      }),
    });

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.rankedStats.PC.tier).toBe('Diamond');
    expect(result.current.rankedStats.PC.division).toBe(1);
    expect(result.current.rankedStats.PC.rp).toBe(300);
    expect(result.current.rankedStats.Console.tier).toBe('Gold');
    expect(result.current.rankedStats.Console.division).toBe(2);
    expect(result.current.rankedStats.Console.rp).toBe(120);
    expect(result.current.rankedStats.Console.peakTier).toBe('Platinum');
    expect(result.current.rankedStats.Console.peakDivision).toBe(5);
  });

  it('useData throws when used outside DataProvider', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useData } = await import('../DataContext');

    expect(() => {
      renderHook(() => useData());
    }).toThrow('useData must be used within a DataProvider');
  });

  it('partial update preserves existing fields', async () => {
    const savedStats = {
      PC: { tier: 'Gold', division: 2, rp: 150, peakTier: 'Platinum', peakDivision: 4 },
      Console: { tier: 'Silver', division: 3, rp: 80, peakTier: 'Gold', peakDivision: 1 },
    };
    localStorageMock.setItem('xawars_ranked_stats', JSON.stringify(savedStats));

    const { renderHook, act } = await import('@testing-library/react');
    const React = await import('react');
    const { AuthProvider } = await import('../AuthContext');
    const { DataProvider, useData } = await import('../DataContext');

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null,
        React.createElement(DataProvider, null, children)
      );

    const { result } = renderHook(() => useData(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Only update rp, other fields should remain
    act(() => {
      result.current.updateRankedStats('PC', { rp: 200 });
    });

    expect(result.current.rankedStats.PC.tier).toBe('Gold');
    expect(result.current.rankedStats.PC.division).toBe(2);
    expect(result.current.rankedStats.PC.rp).toBe(200);
    expect(result.current.rankedStats.PC.peakTier).toBe('Platinum');
    expect(result.current.rankedStats.PC.peakDivision).toBe(4);
  });
});
