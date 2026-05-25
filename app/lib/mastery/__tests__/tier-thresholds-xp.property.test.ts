import fc from 'fast-check';
import {
  TIER_THRESHOLDS,
  computeTier,
  pointsToNextTier,
} from '@/app/lib/mastery/tier-thresholds';
import {
  CANONICAL_MULTIPLIERS,
  canonicalXpReward,
  validateXp,
  validateAdminOverride,
} from '@/app/lib/mastery/xp-invariant';
import type { ChallengeSlot } from '@/app/types/mastery';
import type { ChallengeRow } from '@/app/lib/mastery/xp-invariant';

/**
 * Feature: operator-mastery-mvp, Property 1: Canonical XP Formula invariant
 *
 * Validates: Requirements 16.1, 16.2, 16.5, 16.6, 16.7, 16.10
 *
 * For any Challenge without xp_override, xp_reward equals target_count × multiplier for its slot.
 * For any Challenge with a valid Administrative_Exception, effective XP equals xp_override.
 * For any attempted admin override that fails validation, the validation rejects it.
 * validateXp auto-corrects deviating rows when no valid admin exception exists.
 */
describe('Feature: operator-mastery-mvp, Property 1: Canonical XP Formula invariant', () => {
  // Arbitraries
  const slotArb = fc.constantFrom<ChallengeSlot>('daily', 'weekly', 'mission');
  const targetCountArb = fc.integer({ min: 1, max: 50 });

  /**
   * For any Challenge without xp_override (xp_override is null),
   * xp_reward must equal target_count × multiplier for its slot.
   */
  it('canonicalXpReward equals target_count × multiplier for any slot and target_count', () => {
    fc.assert(
      fc.property(slotArb, targetCountArb, (slot, targetCount) => {
        const expected = targetCount * CANONICAL_MULTIPLIERS[slot];
        const actual = canonicalXpReward(slot, targetCount);
        expect(actual).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * For any Challenge without xp_override, validateXp returns effectiveXpReward
   * equal to the canonical formula and does not flag it as an administrative exception.
   */
  it('validateXp returns canonical XP for challenges without xp_override', () => {
    fc.assert(
      fc.property(slotArb, targetCountArb, (slot, targetCount) => {
        const canonical = targetCount * CANONICAL_MULTIPLIERS[slot];
        const challenge: ChallengeRow = {
          slot,
          targetCount,
          xpReward: canonical,
          xpOverride: null,
          xpOverrideReason: null,
        };

        const outcome = validateXp(challenge);
        expect(outcome.effectiveXpReward).toBe(canonical);
        expect(outcome.isAdministrativeException).toBe(false);
        expect(outcome.needsAutoCorrection).toBe(false);
        expect(outcome.needsOrphanFix).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * For any Challenge with valid Administrative_Exception (both xp_override and
   * xp_override_reason non-null and valid), effective XP equals xp_override.
   */
  it('validateXp returns xp_override as effective XP for valid admin exceptions', () => {
    const validOverrideArb = fc.integer({ min: 0, max: 10000 });
    // Reason: 1..500 non-whitespace chars
    const validReasonArb = fc.string({ minLength: 1, maxLength: 500 }).filter(
      (s) => {
        const nonWs = s.replace(/\s/g, '').length;
        return nonWs >= 1 && nonWs <= 500;
      }
    );

    fc.assert(
      fc.property(
        slotArb,
        targetCountArb,
        validOverrideArb,
        validReasonArb,
        (slot, targetCount, override, reason) => {
          const challenge: ChallengeRow = {
            slot,
            targetCount,
            xpReward: targetCount * CANONICAL_MULTIPLIERS[slot], // canonical value stored
            xpOverride: override,
            xpOverrideReason: reason,
          };

          const outcome = validateXp(challenge);
          expect(outcome.effectiveXpReward).toBe(override);
          expect(outcome.isAdministrativeException).toBe(true);
          expect(outcome.needsAutoCorrection).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * For any attempted admin override that fails validation rules (orphan field,
   * override out of range, reason length out of range), the validation rejects it.
   */
  it('validateAdminOverride rejects orphan override (override present, reason null)', () => {
    const overrideArb = fc.integer({ min: 0, max: 10000 });

    fc.assert(
      fc.property(overrideArb, (override) => {
        const result = validateAdminOverride({
          xp_override: override,
          xp_override_reason: null,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('orphan_override');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('validateAdminOverride rejects orphan reason (reason present, override null)', () => {
    const reasonArb = fc.string({ minLength: 1, maxLength: 100 });

    fc.assert(
      fc.property(reasonArb, (reason) => {
        const result = validateAdminOverride({
          xp_override: null,
          xp_override_reason: reason,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('orphan_reason');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('validateAdminOverride rejects override out of range', () => {
    const outOfRangeArb = fc.oneof(
      fc.integer({ min: -1000, max: -1 }),
      fc.integer({ min: 10001, max: 100000 }),
      fc.double({ min: 0.1, max: 9999.9, noNaN: true }).filter(
        (n) => !Number.isInteger(n)
      )
    );
    const validReasonArb = fc.string({ minLength: 1, maxLength: 100 }).filter(
      (s) => s.replace(/\s/g, '').length >= 1
    );

    fc.assert(
      fc.property(outOfRangeArb, validReasonArb, (override, reason) => {
        const result = validateAdminOverride({
          xp_override: override,
          xp_override_reason: reason,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('override_out_of_range');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('validateAdminOverride rejects reason too short (all whitespace)', () => {
    // Generate strings that are only whitespace
    const whitespaceOnlyArb = fc
      .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 50 })
      .map((chars) => chars.join(''));
    const validOverrideArb = fc.integer({ min: 0, max: 10000 });

    fc.assert(
      fc.property(validOverrideArb, whitespaceOnlyArb, (override, reason) => {
        const result = validateAdminOverride({
          xp_override: override,
          xp_override_reason: reason,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('reason_too_short');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('validateAdminOverride rejects reason too long (>500 non-whitespace chars)', () => {
    // Generate strings with >500 non-whitespace characters
    const longReasonArb = fc
      .string({ minLength: 501, maxLength: 600 })
      .filter((s) => s.replace(/\s/g, '').length > 500);
    const validOverrideArb = fc.integer({ min: 0, max: 10000 });

    fc.assert(
      fc.property(validOverrideArb, longReasonArb, (override, reason) => {
        const result = validateAdminOverride({
          xp_override: override,
          xp_override_reason: reason,
        });
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('reason_too_long');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * validateXp auto-corrects deviating rows when no valid admin exception exists.
   * If xpReward differs from canonical and there's no valid override, needsAutoCorrection is true
   * and correctedRow.xpReward equals the canonical value.
   */
  it('validateXp auto-corrects deviating xpReward when no admin exception', () => {
    fc.assert(
      fc.property(
        slotArb,
        targetCountArb,
        fc.integer({ min: 1, max: 10000 }),
        (slot, targetCount, wrongXp) => {
          const canonical = targetCount * CANONICAL_MULTIPLIERS[slot];
          // Only test when xpReward actually deviates
          fc.pre(wrongXp !== canonical);

          const challenge: ChallengeRow = {
            slot,
            targetCount,
            xpReward: wrongXp,
            xpOverride: null,
            xpOverrideReason: null,
          };

          const outcome = validateXp(challenge);
          expect(outcome.needsAutoCorrection).toBe(true);
          expect(outcome.correctedRow.xpReward).toBe(canonical);
          expect(outcome.effectiveXpReward).toBe(canonical);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * validateXp detects orphan state and clears both override fields.
   */
  it('validateXp fixes orphan state (xpOverride set but xpOverrideReason null)', () => {
    fc.assert(
      fc.property(slotArb, targetCountArb, fc.integer({ min: 0, max: 10000 }), (slot, targetCount, override) => {
        const canonical = targetCount * CANONICAL_MULTIPLIERS[slot];
        const challenge: ChallengeRow = {
          slot,
          targetCount,
          xpReward: canonical,
          xpOverride: override,
          xpOverrideReason: null,
        };

        const outcome = validateXp(challenge);
        expect(outcome.needsOrphanFix).toBe(true);
        expect(outcome.correctedRow.xpOverride).toBeNull();
        expect(outcome.correctedRow.xpOverrideReason).toBeNull();
        expect(outcome.correctedRow.xpReward).toBe(canonical);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Feature: operator-mastery-mvp, Property 12: Mastery_Tier threshold table
 *
 * Validates: Requirements 7.4
 *
 * computeTier returns correct tier for any non-negative integer points:
 * - Bronze for [0, 100)
 * - Silver for [100, 300)
 * - Gold for [300, 600)
 * - Platinum for [600, 1000)
 * - Diamond for [1000, ∞)
 *
 * pointsToNextTier returns correct distance to next tier boundary.
 * Tier thresholds are contiguous (no gaps, no overlaps).
 */
describe('Feature: operator-mastery-mvp, Property 12: Mastery_Tier threshold table', () => {
  /**
   * computeTier returns Bronze for any points in [0, 100).
   */
  it('computeTier returns Bronze for points in [0, 100)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 99 }), (points) => {
        expect(computeTier(points)).toBe('Bronze');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * computeTier returns Silver for any points in [100, 300).
   */
  it('computeTier returns Silver for points in [100, 300)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 299 }), (points) => {
        expect(computeTier(points)).toBe('Silver');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * computeTier returns Gold for any points in [300, 600).
   */
  it('computeTier returns Gold for points in [300, 600)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 300, max: 599 }), (points) => {
        expect(computeTier(points)).toBe('Gold');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * computeTier returns Platinum for any points in [600, 1000).
   */
  it('computeTier returns Platinum for points in [600, 1000)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 600, max: 999 }), (points) => {
        expect(computeTier(points)).toBe('Platinum');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * computeTier returns Diamond for any points >= 1000.
   */
  it('computeTier returns Diamond for points >= 1000', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1000, max: 1000000 }), (points) => {
        expect(computeTier(points)).toBe('Diamond');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * computeTier returns correct tier for any non-negative integer points.
   * This is the unified property that covers all tiers.
   */
  it('computeTier returns correct tier for any non-negative integer', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000000 }), (points) => {
        const tier = computeTier(points);
        if (points < 100) expect(tier).toBe('Bronze');
        else if (points < 300) expect(tier).toBe('Silver');
        else if (points < 600) expect(tier).toBe('Gold');
        else if (points < 1000) expect(tier).toBe('Platinum');
        else expect(tier).toBe('Diamond');
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Negative points are clamped to 0 (Bronze).
   */
  it('computeTier clamps negative points to Bronze', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100000, max: -1 }), (points) => {
        expect(computeTier(points)).toBe('Bronze');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * pointsToNextTier returns correct distance to next tier boundary.
   */
  it('pointsToNextTier returns correct distance to next tier boundary', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000000 }), (points) => {
        const distance = pointsToNextTier(points);

        if (points >= 1000) {
          // Diamond — no next tier
          expect(distance).toBe(0);
        } else if (points < 100) {
          // Bronze → Silver at 100
          expect(distance).toBe(100 - points);
        } else if (points < 300) {
          // Silver → Gold at 300
          expect(distance).toBe(300 - points);
        } else if (points < 600) {
          // Gold → Platinum at 600
          expect(distance).toBe(600 - points);
        } else {
          // Platinum → Diamond at 1000
          expect(distance).toBe(1000 - points);
        }
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Tier thresholds are contiguous — no gaps, no overlaps.
   * Each tier's ceiling equals the next tier's floor.
   */
  it('tier thresholds are contiguous (no gaps, no overlaps)', () => {
    // This is a structural property — we verify it once over the constant data
    for (let i = 0; i < TIER_THRESHOLDS.length - 1; i++) {
      const current = TIER_THRESHOLDS[i];
      const next = TIER_THRESHOLDS[i + 1];
      expect(current.ceiling).toBe(next.floor);
    }
    // First tier starts at 0
    expect(TIER_THRESHOLDS[0].floor).toBe(0);
    // Last tier extends to infinity
    expect(TIER_THRESHOLDS[TIER_THRESHOLDS.length - 1].ceiling).toBe(Infinity);
  });

  /**
   * pointsToNextFromFloor matches the difference between ceiling and floor for non-Diamond tiers.
   */
  it('pointsToNextFromFloor is consistent with floor/ceiling for each tier', () => {
    for (const threshold of TIER_THRESHOLDS) {
      if (threshold.tier === 'Diamond') {
        expect(threshold.pointsToNextFromFloor).toBeNull();
      } else {
        expect(threshold.pointsToNextFromFloor).toBe(
          threshold.ceiling - threshold.floor
        );
      }
    }
  });
});
