import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  computeComparison,
  computeKdRatio,
  computeAvgKills,
  computePickRate,
  TIER_RANK,
  type RivalryOperatorData,
  type RivalryMetric,
  type Advantage,
} from '../comparison-engine';
import type { MasteryTier } from '../../components/mastery/MasteryRow';

// --- Generators ---

const MASTERY_TIERS: MasteryTier[] = ['unplayed', 'recruit', 'operative', 'veteran', 'elite'];

/** Picks uniformly from the 5 mastery tier values */
const arbitraryMasteryTier: fc.Arbitrary<MasteryTier> = fc.constantFrom(...MASTERY_TIERS);

/** Generates valid RivalryOperatorData with constrained random values */
const arbitraryRivalryOperatorData: fc.Arbitrary<RivalryOperatorData> = fc
  .record({
    operatorId: fc.string({ minLength: 1, maxLength: 20 }),
    operatorName: fc.string({ minLength: 1, maxLength: 30 }),
    operatorSide: fc.constantFrom('attacker' as const, 'defender' as const),
    kills: fc.nat({ max: 9999 }),
    deaths: fc.nat({ max: 9999 }),
    deployments: fc.nat({ max: 999 }),
    tier: arbitraryMasteryTier,
  })
  .chain((partial) =>
    // totalDeploymentsAllOperators must be >= operatorDeployments
    fc.nat({ max: 10000 }).map((extra) => ({
      ...partial,
      totalDeploymentsAllOperators: partial.deployments + extra,
    }))
  );

/** Generates two distinct RivalryOperatorData records (different operatorIds) */
const arbitraryDistinctPair: fc.Arbitrary<[RivalryOperatorData, RivalryOperatorData]> = fc
  .tuple(arbitraryRivalryOperatorData, arbitraryRivalryOperatorData)
  .filter(([a, b]) => a.operatorId !== b.operatorId);

/** Generates two records where both have at least 1 deployment */
const arbitraryDistinctPairWithDeployments: fc.Arbitrary<[RivalryOperatorData, RivalryOperatorData]> = fc
  .tuple(arbitraryRivalryOperatorData, arbitraryRivalryOperatorData)
  .filter(([a, b]) => a.operatorId !== b.operatorId && a.deployments > 0 && b.deployments > 0);

// --- Property Tests ---

/**
 * Feature: operator-rivalry, Property 1: Same operator validation
 *
 * When the same operator data (same id, same stats) is passed to both sides,
 * all advantages are 'tie' and the verdict reflects no meaningful difference.
 *
 * **Validates: Requirements 1.4**
 */
describe('Feature: operator-rivalry, Property 1: Same operator validation', () => {
  it('same operator data in both slots produces all ties and even/insufficient verdict', () => {
    fc.assert(
      fc.property(arbitraryRivalryOperatorData, (opData) => {
        const result = computeComparison(opData, opData);

        // All stat cards should be ties since both sides have identical data
        for (const card of result.statCards) {
          expect(card.advantage).toBe('tie');
        }

        // Verdict should be 'even' if deployments > 0, or 'insufficient-data' if deployments === 0
        if (opData.deployments === 0) {
          expect(result.verdict.type).toBe('insufficient-data');
        } else {
          expect(result.verdict.type).toBe('even');
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 2: Complete stat card coverage
 *
 * For any two RivalryOperatorData records, computeComparison always returns
 * exactly 7 StatCardResult entries covering all rivalry metrics.
 *
 * **Validates: Requirements 2.1**
 */
describe('Feature: operator-rivalry, Property 2: Complete stat card coverage', () => {
  it('always returns exactly 7 stat cards covering all rivalry metrics', () => {
    const ALL_METRICS: RivalryMetric[] = [
      'deployments',
      'kills',
      'deaths',
      'kdRatio',
      'avgKills',
      'pickRate',
      'masteryTier',
    ];

    fc.assert(
      fc.property(arbitraryRivalryOperatorData, arbitraryRivalryOperatorData, (left, right) => {
        const result = computeComparison(left, right);

        expect(result.statCards).toHaveLength(7);

        const metrics = result.statCards.map((c) => c.metric);
        for (const metric of ALL_METRICS) {
          expect(metrics).toContain(metric);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 3: Advantage determination correctness
 *
 * For higher-is-better metrics: left > right → 'left', right > left → 'right', equal → 'tie'.
 * For lower-is-better metrics (deaths): left < right → 'left', right < left → 'right', equal → 'tie'.
 * For mastery tier: follows tier ordering.
 *
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
 */
describe('Feature: operator-rivalry, Property 3: Advantage determination correctness', () => {
  it('correctly determines advantage for all metrics', () => {
    fc.assert(
      fc.property(arbitraryRivalryOperatorData, arbitraryRivalryOperatorData, (left, right) => {
        const result = computeComparison(left, right);

        for (const card of result.statCards) {
          if (card.metric === 'deaths') {
            // Lower is better
            if (card.leftValue !== null && card.rightValue !== null) {
              if (card.leftValue < card.rightValue) expect(card.advantage).toBe('left');
              else if (card.rightValue < card.leftValue) expect(card.advantage).toBe('right');
              else expect(card.advantage).toBe('tie');
            }
          } else if (card.metric === 'masteryTier') {
            // Tier comparison using rank
            const leftRank = TIER_RANK[left.tier];
            const rightRank = TIER_RANK[right.tier];
            if (leftRank > rightRank) expect(card.advantage).toBe('left');
            else if (rightRank > leftRank) expect(card.advantage).toBe('right');
            else expect(card.advantage).toBe('tie');
          } else {
            // Higher is better for deployments, kills, kdRatio, avgKills, pickRate
            if (card.leftValue !== null && card.rightValue !== null) {
              if (card.leftValue > card.rightValue) expect(card.advantage).toBe('left');
              else if (card.rightValue > card.leftValue) expect(card.advantage).toBe('right');
              else expect(card.advantage).toBe('tie');
            } else if (card.leftValue === null && card.rightValue === null) {
              expect(card.advantage).toBe('tie');
            } else if (card.leftValue === null) {
              expect(card.advantage).toBe('right');
            } else {
              expect(card.advantage).toBe('left');
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 4: Zero deployments nulls ratio stats
 *
 * When deployments=0, avgKills value is null; pickRate and avgKills display as dash.
 * The requirement states ratio-based stats display dash for zero-deployment operators.
 *
 * **Validates: Requirements 2.7**
 */
describe('Feature: operator-rivalry, Property 4: Zero deployments nulls ratio stats', () => {
  it('null for avgKills when deployments=0, and display shows dash for ratio stats', () => {
    const zeroDeploymentData = arbitraryRivalryOperatorData.map((data) => ({
      ...data,
      deployments: 0,
    }));

    fc.assert(
      fc.property(zeroDeploymentData, arbitraryRivalryOperatorData, (left, right) => {
        const result = computeComparison(left, right);

        const avgKillsCard = result.statCards.find((c) => c.metric === 'avgKills')!;
        const pickRateCard = result.statCards.find((c) => c.metric === 'pickRate')!;
        const kdRatioCard = result.statCards.find((c) => c.metric === 'kdRatio')!;

        // avgKills is null when deployments=0
        expect(avgKillsCard.leftValue).toBeNull();

        // Display should show dash for all ratio stats when deployments=0
        expect(avgKillsCard.leftDisplay).toBe('—');
        expect(pickRateCard.leftDisplay).toBe('—');
        expect(kdRatioCard.leftDisplay).toBe('—');
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 5: Verdict count invariant
 *
 * leftWins + rightWins + ties = statCards.length (when both have deployments)
 *
 * **Validates: Requirements 3.1**
 */
describe('Feature: operator-rivalry, Property 5: Verdict count invariant', () => {
  it('leftWins + rightWins + ties equals total stat cards', () => {
    fc.assert(
      fc.property(arbitraryDistinctPairWithDeployments, ([left, right]) => {
        const result = computeComparison(left, right);

        const leftWins = result.statCards.filter((c) => c.advantage === 'left').length;
        const rightWins = result.statCards.filter((c) => c.advantage === 'right').length;
        const ties = result.statCards.filter((c) => c.advantage === 'tie').length;

        expect(result.verdict.leftWins).toBe(leftWins);
        expect(result.verdict.rightWins).toBe(rightWins);
        expect(leftWins + rightWins + ties).toBe(result.statCards.length);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 6: Verdict classification
 *
 * Correct verdict type based on win counts when both have deployments.
 *
 * **Validates: Requirements 3.2, 3.3**
 */
describe('Feature: operator-rivalry, Property 6: Verdict classification', () => {
  it('correct verdict type based on win counts', () => {
    fc.assert(
      fc.property(arbitraryDistinctPairWithDeployments, ([left, right]) => {
        const result = computeComparison(left, right);

        const { leftWins, rightWins } = result.verdict;

        if (leftWins > rightWins) {
          expect(result.verdict.type).toBe('left-leads');
        } else if (rightWins > leftWins) {
          expect(result.verdict.type).toBe('right-leads');
        } else {
          expect(result.verdict.type).toBe('even');
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 7: Insufficient data verdict
 *
 * When at least one operator has deployments=0, verdict is 'insufficient-data'.
 *
 * **Validates: Requirements 3.4**
 */
describe('Feature: operator-rivalry, Property 7: Insufficient data verdict', () => {
  it("'insufficient-data' when at least one operator has deployments=0", () => {
    const zeroDeploymentData = arbitraryRivalryOperatorData.map((data) => ({
      ...data,
      deployments: 0,
    }));

    fc.assert(
      fc.property(zeroDeploymentData, arbitraryRivalryOperatorData, (left, right) => {
        const result = computeComparison(left, right);

        expect(result.verdict.type).toBe('insufficient-data');
        expect(result.verdict.leftWins).toBe(0);
        expect(result.verdict.rightWins).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 8: K/D ratio computation
 *
 * Correct formula and edge cases for computeKdRatio.
 *
 * **Validates: Requirements 7.2, 7.3**
 */
describe('Feature: operator-rivalry, Property 8: K/D ratio computation', () => {
  it('deaths > 0: result equals Math.round((kills/deaths)*100)/100', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 9999 }),
        fc.integer({ min: 1, max: 9999 }),
        (kills, deaths) => {
          const result = computeKdRatio(kills, deaths);
          const expected = Math.round((kills / deaths) * 100) / 100;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('kills=0 and deaths=0: result is null', () => {
    expect(computeKdRatio(0, 0)).toBeNull();
  });

  it('deaths=0 and kills > 0: result equals kills', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999 }), (kills) => {
        const result = computeKdRatio(kills, 0);
        expect(result).toBe(kills);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 9: Average kills computation
 *
 * Correct formula and null handling for computeAvgKills.
 *
 * **Validates: Requirements 7.4**
 */
describe('Feature: operator-rivalry, Property 9: Average kills computation', () => {
  it('deployments > 0: result equals Math.round((kills/deployments)*10)/10', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 9999 }),
        fc.integer({ min: 1, max: 999 }),
        (kills, deployments) => {
          const result = computeAvgKills(kills, deployments);
          const expected = Math.round((kills / deployments) * 10) / 10;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deployments=0: result is null', () => {
    fc.assert(
      fc.property(fc.nat({ max: 9999 }), (kills) => {
        const result = computeAvgKills(kills, 0);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 10: Pick rate computation
 *
 * Correct formula for computePickRate.
 *
 * **Validates: Requirements 7.5**
 */
describe('Feature: operator-rivalry, Property 10: Pick rate computation', () => {
  it('result equals Math.round((opDeployments/totalDeployments)*1000)/10', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 999 }).chain((opDeploys) =>
          fc.tuple(
            fc.constant(opDeploys),
            fc.integer({ min: Math.max(opDeploys, 1), max: 10000 })
          )
        ),
        ([opDeploys, totalDeploys]) => {
          const result = computePickRate(opDeploys, totalDeploys);
          const expected = Math.round((opDeploys / totalDeploys) * 1000) / 10;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 11: Comparison symmetry
 *
 * Swapped inputs produce mirrored advantages with identical absolute values.
 *
 * **Validates: Requirements 7.6**
 */
describe('Feature: operator-rivalry, Property 11: Comparison symmetry', () => {
  it('swapped inputs produce mirrored advantages', () => {
    fc.assert(
      fc.property(arbitraryRivalryOperatorData, arbitraryRivalryOperatorData, (left, right) => {
        const forward = computeComparison(left, right);
        const reversed = computeComparison(right, left);

        expect(forward.statCards.length).toBe(reversed.statCards.length);

        for (let i = 0; i < forward.statCards.length; i++) {
          const fCard = forward.statCards[i];
          const rCard = reversed.statCards[i];

          // Same metric at same index
          expect(fCard.metric).toBe(rCard.metric);

          // Mirrored advantages
          if (fCard.advantage === 'left') expect(rCard.advantage).toBe('right');
          else if (fCard.advantage === 'right') expect(rCard.advantage).toBe('left');
          else expect(rCard.advantage).toBe('tie');

          // Absolute values are identical (just swapped sides)
          expect(fCard.leftValue).toBe(rCard.rightValue);
          expect(fCard.rightValue).toBe(rCard.leftValue);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-rivalry, Property 12: Well-formed output structure
 *
 * All fields are valid and non-empty for every stat card.
 *
 * **Validates: Requirements 7.1**
 */
describe('Feature: operator-rivalry, Property 12: Well-formed output structure', () => {
  it('all stat card fields are valid and non-empty', () => {
    const VALID_METRICS: RivalryMetric[] = [
      'deployments',
      'kills',
      'deaths',
      'kdRatio',
      'avgKills',
      'pickRate',
      'masteryTier',
    ];
    const VALID_ADVANTAGES: Advantage[] = ['left', 'right', 'tie'];

    fc.assert(
      fc.property(arbitraryRivalryOperatorData, arbitraryRivalryOperatorData, (left, right) => {
        const result = computeComparison(left, right);

        for (const card of result.statCards) {
          // Metric is a valid RivalryMetric
          expect(VALID_METRICS).toContain(card.metric);

          // Label is non-empty
          expect(card.label.length).toBeGreaterThan(0);

          // Display strings are non-empty
          expect(card.leftDisplay.length).toBeGreaterThan(0);
          expect(card.rightDisplay.length).toBeGreaterThan(0);

          // Advantage is valid
          expect(VALID_ADVANTAGES).toContain(card.advantage);
        }

        // Verdict structure is well-formed
        expect(['left-leads', 'right-leads', 'even', 'insufficient-data']).toContain(
          result.verdict.type
        );
        expect(result.verdict.message.length).toBeGreaterThan(0);
        expect(result.verdict.leftWins).toBeGreaterThanOrEqual(0);
        expect(result.verdict.rightWins).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});
