import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeWinRate, hasLimitedData, getTotalOutcomes } from '../../lib/win-loss-logic';
import type { MapPerformanceRecord, MapWinLossRecord } from '../../types/database';

/**
 * Unit tests for win rate display logic.
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

// ---- Pure function tests ----

describe('computeWinRate — focused examples', () => {
  it('returns 50 for equal wins and losses', () => {
    expect(computeWinRate({ mapId: 'bank', wins: 5, losses: 5 })).toBe(50);
  });

  it('returns null when total outcomes = 0 (win rate hidden)', () => {
    expect(computeWinRate({ mapId: 'bank', wins: 0, losses: 0 })).toBeNull();
  });

  it('rounds to nearest whole number (67% for 2 wins, 1 loss)', () => {
    // 2 / 3 = 0.6667 → 67
    expect(computeWinRate({ mapId: 'bank', wins: 2, losses: 1 })).toBe(67);
  });

  it('returns 100 for all wins', () => {
    expect(computeWinRate({ mapId: 'border', wins: 7, losses: 0 })).toBe(100);
  });

  it('returns 0 for all losses', () => {
    expect(computeWinRate({ mapId: 'border', wins: 0, losses: 4 })).toBe(0);
  });

  it('rounds 1/3 down to 33', () => {
    // 1 / 3 = 0.3333 → 33
    expect(computeWinRate({ mapId: 'clubhouse', wins: 1, losses: 2 })).toBe(33);
  });
});

describe('hasLimitedData — threshold boundary', () => {
  it('returns true when outcomes = 4 (below threshold)', () => {
    expect(hasLimitedData({ mapId: 'bank', wins: 2, losses: 2 })).toBe(true);
  });

  it('returns false when outcomes = 5 (at threshold)', () => {
    expect(hasLimitedData({ mapId: 'bank', wins: 3, losses: 2 })).toBe(false);
  });

  it('returns true when outcomes = 1', () => {
    expect(hasLimitedData({ mapId: 'bank', wins: 1, losses: 0 })).toBe(true);
  });

  it('returns false when outcomes > 5', () => {
    expect(hasLimitedData({ mapId: 'bank', wins: 10, losses: 5 })).toBe(false);
  });
});

describe('getTotalOutcomes', () => {
  it('returns sum of wins and losses', () => {
    expect(getTotalOutcomes({ mapId: 'bank', wins: 3, losses: 4 })).toBe(7);
  });

  it('returns 0 for empty record', () => {
    expect(getTotalOutcomes({ mapId: 'bank', wins: 0, losses: 0 })).toBe(0);
  });
});

// ---- Component integration tests: MapBreakdownPanel with win rate ----

let mockWinLossRecords: Record<string, MapWinLossRecord> = {};

vi.mock('../../context/DataContext', () => ({
  useData: () => ({
    mapWinLossRecords: mockWinLossRecords,
  }),
}));

describe('MapBreakdownPanel — win rate display integration', () => {
  beforeEach(() => {
    mockWinLossRecords = {};
  });

  // Use a single map record to avoid duplication issues
  const singleMapRecords: Record<string, MapPerformanceRecord> = {
    ash_bank: {
      operatorId: 'ash',
      mapId: 'bank',
      kills: 10,
      deaths: 5,
      matches: 4,
    },
  };

  const multiMapRecords: Record<string, MapPerformanceRecord> = {
    ash_bank: {
      operatorId: 'ash',
      mapId: 'bank',
      kills: 10,
      deaths: 5,
      matches: 4,
    },
    ash_border: {
      operatorId: 'ash',
      mapId: 'border',
      kills: 8,
      deaths: 4,
      matches: 3,
    },
  };

  it('displays win rate when outcomes ≥ 1', async () => {
    mockWinLossRecords = {
      bank: { mapId: 'bank', wins: 3, losses: 2 },
    };

    const { MapBreakdownPanel } = await import('../mastery/MapBreakdownPanel');
    render(<MapBreakdownPanel operatorId="ash" records={singleMapRecords} />);

    // 3 / 5 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('does NOT display win rate when outcomes = 0', async () => {
    mockWinLossRecords = {
      bank: { mapId: 'bank', wins: 0, losses: 0 },
    };

    const { MapBreakdownPanel } = await import('../mastery/MapBreakdownPanel');
    render(<MapBreakdownPanel operatorId="ash" records={singleMapRecords} />);

    // No percentage should appear since outcomes = 0
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
  });

  it('shows limited data label when outcomes < 5', async () => {
    mockWinLossRecords = {
      bank: { mapId: 'bank', wins: 2, losses: 1 },
    };

    const { MapBreakdownPanel } = await import('../mastery/MapBreakdownPanel');
    render(<MapBreakdownPanel operatorId="ash" records={singleMapRecords} />);

    // Limited data: 3 outcomes < 5, should display "3 matches" in the win rate section
    // The text "3 matches" may be rendered in a separate element from the performance stats
    const limitedLabels = screen.getAllByText(/3 matches/);
    expect(limitedLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('displays win rate alongside existing K/D metrics', async () => {
    mockWinLossRecords = {
      border: { mapId: 'border', wins: 4, losses: 1 },
    };

    const { MapBreakdownPanel } = await import('../mastery/MapBreakdownPanel');
    render(<MapBreakdownPanel operatorId="ash" records={multiMapRecords} />);

    // Border meets threshold (3 matches) so K/D is shown: 8/4 = 2.00
    // Win rate = 4/5 = 80%
    expect(screen.getByText('80%')).toBeInTheDocument();
    // K/D value exists alongside the win rate
    const kdElements = screen.getAllByText('2.00');
    expect(kdElements.length).toBeGreaterThanOrEqual(1);
  });

  it('rounds percentage to nearest whole number in component', async () => {
    mockWinLossRecords = {
      bank: { mapId: 'bank', wins: 2, losses: 1 },
    };

    const { MapBreakdownPanel } = await import('../mastery/MapBreakdownPanel');
    render(<MapBreakdownPanel operatorId="ash" records={singleMapRecords} />);

    // 2 / 3 = 66.67% → 67%
    expect(screen.getByText('67%')).toBeInTheDocument();
  });
});
