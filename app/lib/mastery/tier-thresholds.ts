// app/lib/mastery/tier-thresholds.ts
// Pure functions for computing Mastery_Tier from Mastery_Points.
// Implements Requirement 7.4 and Property 12.

import type { MasteryTier } from '@/app/types/mastery';

/**
 * Tier threshold entry. Each tier spans [floor, ceiling).
 * Diamond has no ceiling (Infinity).
 */
export interface TierThreshold {
  tier: MasteryTier;
  floor: number;
  ceiling: number; // Infinity for Diamond
  pointsToNextFromFloor: number | null; // null for Diamond (no next tier)
}

export const TIER_THRESHOLDS: readonly TierThreshold[] = [
  { tier: 'Bronze', floor: 0, ceiling: 100, pointsToNextFromFloor: 100 },
  { tier: 'Silver', floor: 100, ceiling: 300, pointsToNextFromFloor: 200 },
  { tier: 'Gold', floor: 300, ceiling: 600, pointsToNextFromFloor: 300 },
  { tier: 'Platinum', floor: 600, ceiling: 1000, pointsToNextFromFloor: 400 },
  { tier: 'Diamond', floor: 1000, ceiling: Infinity, pointsToNextFromFloor: null },
] as const;

/**
 * Compute the Mastery_Tier for a given number of Mastery_Points.
 *
 * - Bronze:   [0, 100)
 * - Silver:   [100, 300)
 * - Gold:     [300, 600)
 * - Platinum: [600, 1000)
 * - Diamond:  [1000, ∞)
 *
 * Points must be non-negative. Negative values are clamped to 0.
 */
export function computeTier(points: number): MasteryTier {
  const clamped = Math.max(0, points);
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (clamped >= TIER_THRESHOLDS[i].floor) {
      return TIER_THRESHOLDS[i].tier;
    }
  }
  // Fallback (should never reach here given clamped >= 0)
  return 'Bronze';
}

/**
 * Compute the number of Mastery_Points needed to reach the next tier.
 * Returns 0 if the player is already at Diamond (max tier).
 *
 * For example:
 * - points = 50  → next tier is Silver at 100 → returns 50
 * - points = 100 → next tier is Gold at 300  → returns 200
 * - points = 1000 → already Diamond           → returns 0
 */
export function pointsToNextTier(points: number): number {
  const clamped = Math.max(0, points);
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (clamped < TIER_THRESHOLDS[i].ceiling) {
      // Current tier is TIER_THRESHOLDS[i]
      const nextThreshold = TIER_THRESHOLDS[i + 1];
      if (!nextThreshold) {
        // Already at Diamond (last tier)
        return 0;
      }
      return nextThreshold.floor - clamped;
    }
  }
  // Diamond (points >= 1000)
  return 0;
}
