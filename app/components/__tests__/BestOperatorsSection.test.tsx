import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BestOperatorsSection } from '../BestOperatorsSection';
import type { MapPerformanceRecord } from '../../types/database';

/**
 * Helper to build a record keyed by `{operatorId}_{mapId}`.
 */
function buildRecords(
  entries: { operatorId: string; mapId: string; kills: number; deaths: number; matches: number }[]
): Record<string, MapPerformanceRecord> {
  const records: Record<string, MapPerformanceRecord> = {};
  for (const entry of entries) {
    const key = `${entry.operatorId}_${entry.mapId}`;
    records[key] = entry;
  }
  return records;
}

describe('BestOperatorsSection', () => {
  /**
   * Validates: Requirements 6.3
   */
  describe('empty state shown when no qualifying operator-map data', () => {
    it('shows empty state when records have fewer than 3 matches', () => {
      const records = buildRecords([
        { operatorId: 'ash', mapId: 'bank', kills: 5, deaths: 2, matches: 2 },
        { operatorId: 'thermite', mapId: 'bank', kills: 3, deaths: 1, matches: 1 },
      ]);

      render(
        <BestOperatorsSection mapId="bank" side="attacker" records={records} />
      );

      expect(
        screen.getByText('Play more map-tagged matches to see your top operators here')
      ).toBeInTheDocument();
    });

    it('shows empty state when records exist but for a different map', () => {
      const records = buildRecords([
        { operatorId: 'ash', mapId: 'border', kills: 10, deaths: 3, matches: 5 },
      ]);

      render(
        <BestOperatorsSection mapId="bank" side="attacker" records={records} />
      );

      expect(
        screen.getByText('Play more map-tagged matches to see your top operators here')
      ).toBeInTheDocument();
    });

    it('shows empty state when records exist but for the wrong side', () => {
      const records = buildRecords([
        { operatorId: 'mute', mapId: 'bank', kills: 10, deaths: 3, matches: 5 },
      ]);

      render(
        <BestOperatorsSection mapId="bank" side="attacker" records={records} />
      );

      expect(
        screen.getByText('Play more map-tagged matches to see your top operators here')
      ).toBeInTheDocument();
    });
  });

  /**
   * Validates: Requirements 6.5
   */
  describe('section positioned below community recommendations (renders as distinct section)', () => {
    it('renders "Your Top Operators" heading with qualifying data', () => {
      const records = buildRecords([
        { operatorId: 'ash', mapId: 'bank', kills: 12, deaths: 4, matches: 4 },
      ]);

      render(
        <BestOperatorsSection mapId="bank" side="attacker" records={records} />
      );

      expect(screen.getByText('Your Top Operators')).toBeInTheDocument();
    });

    it('displays operator name and K/D value', () => {
      const records = buildRecords([
        { operatorId: 'ash', mapId: 'bank', kills: 12, deaths: 4, matches: 4 },
      ]);

      render(
        <BestOperatorsSection mapId="bank" side="attacker" records={records} />
      );

      expect(screen.getByText('Ash')).toBeInTheDocument();
      expect(screen.getByText('3.00')).toBeInTheDocument();
    });
  });

  /**
   * Validates: Requirements 6.6
   */
  describe('section updates when side changes', () => {
    it('shows attacker operators on attacker side and defender operators on defender side', () => {
      const records = buildRecords([
        { operatorId: 'ash', mapId: 'bank', kills: 15, deaths: 5, matches: 5 },
        { operatorId: 'mute', mapId: 'bank', kills: 10, deaths: 3, matches: 4 },
      ]);

      const { rerender } = render(
        <BestOperatorsSection mapId="bank" side="attacker" records={records} />
      );

      // Attacker side should show Ash
      expect(screen.getByText('Ash')).toBeInTheDocument();
      expect(screen.queryByText('Mute')).not.toBeInTheDocument();

      // Re-render with defender side
      rerender(
        <BestOperatorsSection mapId="bank" side="defender" records={records} />
      );

      // Defender side should show Mute, not Ash
      expect(screen.getByText('Mute')).toBeInTheDocument();
      expect(screen.queryByText('Ash')).not.toBeInTheDocument();
    });
  });
});
