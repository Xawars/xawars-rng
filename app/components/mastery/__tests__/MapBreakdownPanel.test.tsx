import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MapBreakdownPanel } from '../MapBreakdownPanel';
import type { MapPerformanceRecord } from '../../../types/database';

vi.mock('../../../context/DataContext', () => ({
  useData: () => ({
    mapWinLossRecords: {},
  }),
}));

describe('MapBreakdownPanel', () => {
  /**
   * Validates: Requirements 4.2
   * Below-threshold entry shows "X/3" label and "Need more data" text
   */
  it('shows "X/3" label for below-threshold entries', () => {
    const records: Record<string, MapPerformanceRecord> = {
      ash_bank: {
        operatorId: 'ash',
        mapId: 'bank',
        kills: 2,
        deaths: 1,
        matches: 2,
      },
    };

    render(<MapBreakdownPanel operatorId="ash" records={records} />);

    expect(screen.getByText(/2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/Need more data/)).toBeInTheDocument();
  });

  /**
   * Validates: Requirements 4.4
   * Zero-match records are excluded from the display
   */
  it('excludes zero-match records from display', () => {
    const records: Record<string, MapPerformanceRecord> = {
      ash_bank: {
        operatorId: 'ash',
        mapId: 'bank',
        kills: 0,
        deaths: 0,
        matches: 0,
      },
      ash_border: {
        operatorId: 'ash',
        mapId: 'border',
        kills: 5,
        deaths: 2,
        matches: 4,
      },
    };

    render(<MapBreakdownPanel operatorId="ash" records={records} />);

    expect(screen.queryByText('Bank')).not.toBeInTheDocument();
    expect(screen.getByText('Border')).toBeInTheDocument();
  });

  /**
   * Validates: Requirements 5.4
   * Empty state shown when operator has no map data
   */
  it('shows empty state when operator has no map data', () => {
    render(<MapBreakdownPanel operatorId="ash" records={{}} />);

    expect(screen.getByText(/No map data yet/)).toBeInTheDocument();
  });

  /**
   * Validates: Requirements 5.5
   * Best map is highlighted with distinct style (border-yellow-500)
   */
  it('highlights the best map with a distinct style', () => {
    const records: Record<string, MapPerformanceRecord> = {
      ash_bank: {
        operatorId: 'ash',
        mapId: 'bank',
        kills: 15,
        deaths: 3,
        matches: 5,
      },
      ash_border: {
        operatorId: 'ash',
        mapId: 'border',
        kills: 6,
        deaths: 3,
        matches: 4,
      },
    };

    render(<MapBreakdownPanel operatorId="ash" records={records} />);

    // Bank has K/D 5.0 (best), Border has K/D 2.0
    const bankEntry = screen.getByText('Bank').closest('[class*="border-"]');
    const borderEntry = screen.getByText('Border').closest('[class*="border-"]');

    expect(bankEntry?.className).toContain('border-yellow-500');
    expect(borderEntry?.className).not.toContain('border-yellow-500');
  });
});
