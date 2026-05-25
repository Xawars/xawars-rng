// app/lib/mastery/xp-invariant.ts
// XP Invariant Validator — enforces the Canonical_XP_Formula as a system-wide invariant.
// Implements Requirements 16.1, 16.2, 16.5, 16.6, 16.7, 16.10.

import type { Challenge, ChallengeSlot } from '@/app/types/mastery';

// --- Constants ---

/**
 * Canonical multipliers per challenge slot.
 * xp_reward = target_count × multiplier[slot]
 */
export const CANONICAL_MULTIPLIERS = {
  daily: 10,
  weekly: 15,
  mission: 12,
} as const;

// --- Types ---

/**
 * ChallengeRow is the shape used by the validator. It's compatible with the
 * Challenge interface from mastery.ts — we use a type alias so the validator
 * can work with either the full Challenge or a minimal row from the DB.
 */
export type ChallengeRow = Pick<
  Challenge,
  'slot' | 'targetCount' | 'xpReward' | 'xpOverride' | 'xpOverrideReason'
>;

export interface XpValidationOutcome {
  /** Value to award when challenge completes */
  effectiveXpReward: number;
  /** True if persisted xp_reward != canonical and no admin exception */
  needsAutoCorrection: boolean;
  /** True if exactly one of xp_override / xp_override_reason is non-null */
  needsOrphanFix: boolean;
  /** Both override fields are valid and present */
  isAdministrativeException: boolean;
  /** Row to persist when needsAutoCorrection or needsOrphanFix */
  correctedRow: ChallengeRow;
}

export type AdminOverrideRejection =
  | 'orphan_override'
  | 'orphan_reason'
  | 'override_out_of_range'
  | 'reason_too_short'
  | 'reason_too_long';

// --- Pure Functions ---

/**
 * Compute the canonical XP reward for a given slot and target count.
 * This is the single source of truth for what xp_reward should be.
 */
export function canonicalXpReward(slot: ChallengeSlot, targetCount: number): number {
  return targetCount * CANONICAL_MULTIPLIERS[slot];
}

/**
 * Validate a challenge row against the Canonical_XP_Formula.
 *
 * Determines:
 * - Whether the row is a valid Administrative_Exception (both override fields present and valid)
 * - Whether the row needs auto-correction (xp_reward deviates and no valid exception)
 * - Whether the row has an orphan (exactly one of xp_override/xp_override_reason is non-null)
 *
 * Returns the effective XP reward and a corrected row to persist if needed.
 */
export function validateXp(challenge: ChallengeRow): XpValidationOutcome {
  const canonical = canonicalXpReward(challenge.slot, challenge.targetCount);

  const hasOverride = challenge.xpOverride !== null;
  const hasReason = challenge.xpOverrideReason !== null;

  // Check for orphan state: exactly one of the two fields is non-null
  const needsOrphanFix = hasOverride !== hasReason;

  // A valid Administrative_Exception requires both fields present and valid
  const isAdministrativeException =
    hasOverride &&
    hasReason &&
    isValidOverrideValue(challenge.xpOverride!) &&
    isValidReasonValue(challenge.xpOverrideReason!);

  // Determine effective XP reward
  let effectiveXpReward: number;
  if (isAdministrativeException) {
    effectiveXpReward = challenge.xpOverride!;
  } else {
    effectiveXpReward = canonical;
  }

  // Determine if auto-correction is needed
  const needsAutoCorrection =
    !isAdministrativeException && challenge.xpReward !== canonical;

  // Build the corrected row
  let correctedRow: ChallengeRow;
  if (needsOrphanFix) {
    // Clear both override fields when orphaned
    correctedRow = {
      ...challenge,
      xpReward: canonical,
      xpOverride: null,
      xpOverrideReason: null,
    };
  } else if (needsAutoCorrection) {
    // Fix xp_reward to canonical value
    correctedRow = {
      ...challenge,
      xpReward: canonical,
    };
  } else {
    // No correction needed — return as-is
    correctedRow = { ...challenge };
  }

  return {
    effectiveXpReward,
    needsAutoCorrection,
    needsOrphanFix,
    isAdministrativeException,
    correctedRow,
  };
}

/**
 * Validate an admin/migration write attempt for xp_override fields.
 *
 * Rules:
 * - Both fields must be null together, or both non-null together (no orphans)
 * - xp_override must be an integer in [0, 10000]
 * - xp_override_reason must have 1..500 non-whitespace characters
 */
export function validateAdminOverride(
  next: { xp_override: number | null; xp_override_reason: string | null }
): { ok: true } | { ok: false; reason: AdminOverrideRejection } {
  const hasOverride = next.xp_override !== null;
  const hasReason = next.xp_override_reason !== null;

  // Both null is valid (clearing the override)
  if (!hasOverride && !hasReason) {
    return { ok: true };
  }

  // Orphan checks
  if (hasOverride && !hasReason) {
    return { ok: false, reason: 'orphan_override' };
  }
  if (!hasOverride && hasReason) {
    return { ok: false, reason: 'orphan_reason' };
  }

  // Both are non-null — validate values
  const override = next.xp_override!;
  if (!Number.isInteger(override) || override < 0 || override > 10000) {
    return { ok: false, reason: 'override_out_of_range' };
  }

  const reason = next.xp_override_reason!;
  const nonWhitespaceCount = reason.replace(/\s/g, '').length;
  if (nonWhitespaceCount < 1) {
    return { ok: false, reason: 'reason_too_short' };
  }
  if (nonWhitespaceCount > 500) {
    return { ok: false, reason: 'reason_too_long' };
  }

  return { ok: true };
}

// --- Internal Helpers ---

function isValidOverrideValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 10000;
}

function isValidReasonValue(reason: string): boolean {
  const nonWhitespaceCount = reason.replace(/\s/g, '').length;
  return nonWhitespaceCount >= 1 && nonWhitespaceCount <= 500;
}
