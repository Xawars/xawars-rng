import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OperatorCardModal } from '../OperatorCardModal';
import type { HistoryItem, MatchEntry } from '../HistoryList';

// ponytail: mock heavy dependencies to isolate timeline rendering
vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x" />,
  Download: () => <span data-testid="icon-download" />,
}));
vi.mock('../OperatorDisplay', () => ({
  OperatorDisplay: () => <div data-testid="operator-display" />,
}));

const baseItem: HistoryItem = {
  id: 1,
  operator: { id: 'ash', name: 'Ash', side: 'attacker', icon: '', primaries: ['R4-C'], secondaries: ['P226 MK 25'], gadgets: ['Breach Charge'], roles: [] },
  loadout: { primary: 'R4-C', secondary: 'P226 MK 25', gadget: 'Breach Charge' },
  deploymentId: 'dep-1',
  schemaVersion: 2,
  matches: [],
};

const defaultProps = {
  operatorKills: { 'dep-1': 10 },
  operatorDeaths: { 'dep-1': 3 },
  onClose: vi.fn(),
};

describe('OperatorCardModal timeline', () => {
  /**
   * Validates: Requirements 7.1
   * Match-grouped display renders map names as headers
   */
  it('renders map name as header for matches with mapId', () => {
    const matches: MatchEntry[] = [
      {
        id: 'm1',
        mapId: 'bank',
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T01:00:00Z',
        rounds: [
          { siteId: 'cctv-lockers', kills: 3, deaths: 1, outcome: 'win' },
          { siteId: 'tellers-archives', kills: 2, deaths: 2, outcome: 'loss' },
        ],
      },
      {
        id: 'm2',
        mapId: 'border',
        startedAt: '2024-01-01T02:00:00Z',
        endedAt: '2024-01-01T03:00:00Z',
        rounds: [
          { siteId: null, kills: 4, deaths: 0, outcome: 'win' },
        ],
      },
    ];

    render(<OperatorCardModal item={{ ...baseItem, matches }} {...defaultProps} />);

    // Map headers rendered
    expect(screen.getByText('Bank')).toBeInTheDocument();
    expect(screen.getByText('Border')).toBeInTheDocument();

    // Rounds rendered within matches
    expect(screen.getAllByText('W')).toHaveLength(2);
    expect(screen.getAllByText('L')).toHaveLength(1);
  });

  /**
   * Validates: Requirements 7.3
   * Legacy match (mapId: null) shows per-round _legacyMapId inline
   */
  it('renders per-round map name inline for legacy matches', () => {
    const matches: MatchEntry[] = [
      {
        id: 'legacy-1',
        mapId: null,
        startedAt: '2023-06-01T00:00:00Z',
        endedAt: '2023-06-01T01:00:00Z',
        rounds: [
          { siteId: null, kills: 5, deaths: 1, outcome: 'win', _legacyMapId: 'bank' } as any,
          { siteId: null, kills: 1, deaths: 3, outcome: 'loss', _legacyMapId: 'border' } as any,
        ],
      },
    ];

    render(<OperatorCardModal item={{ ...baseItem, matches }} {...defaultProps} />);

    // No map header (mapId is null)
    // Per-round map names shown inline within round rows
    expect(screen.getByText(/Bank/)).toBeInTheDocument();
    expect(screen.getByText(/Border/)).toBeInTheDocument();
  });
});
