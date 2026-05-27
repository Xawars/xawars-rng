// app/lib/mastery/mastery-engine.ts
// Pure functions for the Mastery_Engine: awarding Mastery_Points,
// detecting tier crossings, and re-exporting tier utilities.
// Implements Requirements 7.1, 7.2, 7.3, 7.4, 7.5.

import type { MasteryEvent, MasteryTier, OperatorMastery } from '@/app/types/mastery';
import { computeTier, pointsToNextTier } from './tier-thresholds';

// Re-export tier utilities so consumers can import from a single module.
export { computeTier, pointsToNextTier };

/**
 * Compute the Mastery_Points awarded for a single event.
 *
 * - match_result_win:       10 points (Requirement 7.1)
 * - match_result_survived:   5 points (Requirement 7.2)
 * - kill_target_complete:   15 points (Requirement 7.3)
 * - challenge_completed:     N points (the challenge's mastery_point_reward)
 */
export function pointsFor(event: MasteryEvent): number {
  switch (event.kind) {
    case 'match_result_win':
      return 10;
    case 'match_result_survived':
      return 5;
    case 'kill_target_complete':
      return 15;
    case 'challenge_completed':
      return event.reward;
  }
}

/**
 * Apply a Mastery_Points award to an operator's mastery state.
 *
 * Returns the next OperatorMastery state and indicates whether a tier
 * crossing occurred. Points are always additive (Requirement 7.5:
 * Mastery_Points only ever increase).
 *
 * If `points` is <= 0, the state is returned unchanged with no tier crossing.
 */
export function applyAward(
  state: OperatorMastery,
  points: number
): { next: OperatorMastery; tierCrossed: MasteryTier | null } {
  // Requirement 7.5: points only ever increase — ignore non-positive awards.
  if (points <= 0) {
    return { next: state, tierCrossed: null };
  }

  const previousTier = computeTier(state.masteryPoints);
  const newPoints = state.masteryPoints + points;
  const newTier = computeTier(newPoints);

  const next: OperatorMastery = {
    ...state,
    masteryPoints: newPoints,
    currentTier: newTier,
  };

  const tierCrossed = newTier !== previousTier ? newTier : null;

  return { next, tierCrossed };
}
