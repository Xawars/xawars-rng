import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import type { RankProgress, RankedStats, RankTier, RankDivision } from '../../data/types';

/**
 * Pure function that replicates the updateRankedStats logic from DataContext.
 * In the actual context: { ...prev, [platform]: { ...prev[platform], ...stats } }
 */
function applyRankedStatsUpdate(
  prev: RankedStats,
  platform: 'PC' | 'Console',
  stats: Partial<RankProgress>
): RankedStats {
  return {
    ...prev,
    [platform]: {
      ...prev[platform],
      ...stats,
    },
  };
}

// Arbitraries for generating valid rank data
const RANK_TIERS: RankTier[] = ['Copper', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Champion'];

const arbRankTier = fc.constantFrom<RankTier>(...RANK_TIERS);
const arbRankDivision = fc.constantFrom<RankDivision>(1, 2, 3, 4, 5);

const arbRankProgress: fc.Arbitrary<RankProgress> = fc.record({
  tier: arbRankTier,
  division: arbRankDivision,
  rp: fc.nat({ max: 5000 }),
  peakTier: arbRankTier,
  peakDivision: arbRankDivision,
});

const arbRankedStats: fc.Arbitrary<RankedStats> = fc.record({
  PC: arbRankProgress,
  Console: arbRankProgress,
});

const arbPlatform = fc.constantFrom<'PC' | 'Console'>('PC', 'Console');

const arbPartialRankProgress: fc.Arbitrary<Partial<RankProgress>> = fc.record(
  {
    tier: arbRankTier,
    division: arbRankDivision,
    rp: fc.nat({ max: 5000 }),
    peakTier: arbRankTier,
    peakDivision: arbRankDivision,
  },
  { requiredKeys: [] }
);

describe('Feature: auth-persistence-gamification, Property 3: Platform Independence for Rank Stats', () => {
  it('updating one platform does not affect the other platform\'s rank data', () => {
    /**
     * Validates: Requirements 6.4
     *
     * Property 3: For any rank update applied to one platform (PC or Console),
     * the other platform's rank data (tier, division, RP, peak) SHALL remain unchanged.
     */
    fc.assert(
      fc.property(
        arbRankedStats,
        arbPlatform,
        arbPartialRankProgress,
        (initialStats, platformToUpdate, statsUpdate) => {
          const otherPlatform: 'PC' | 'Console' = platformToUpdate === 'PC' ? 'Console' : 'PC';

          const updatedStats = applyRankedStatsUpdate(initialStats, platformToUpdate, statsUpdate);

          // The other platform's data must remain exactly the same
          expect(updatedStats[otherPlatform]).toEqual(initialStats[otherPlatform]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
