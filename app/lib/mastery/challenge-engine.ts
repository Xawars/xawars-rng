// app/lib/mastery/challenge-engine.ts
// Challenge_Engine — generates randomized challenges combining a Role, Objective,
// Restriction, and Operator_Scope. Implements constraint-relaxation retry logic.
// Implements Requirements 1.1–1.8, 16.2, 16.8.

import type { Operator } from '@/app/data/types';
import { operators } from '@/app/data/operators';
import type {
  Challenge,
  ChallengeSlot,
  Eligibility,
  Objective,
  OperatorScope,
  Restriction,
  RestrictionKind,
} from '@/app/types/mastery';
import type { DeploymentRecord } from '@/app/types/database';
import { canonicalXpReward } from './xp-invariant';

// --- ID Generation ---

/**
 * Generate a unique identifier.
 * Uses crypto.randomUUID() when available, with a fallback.
 */
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to fallback
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Constants ---

const OBJECTIVES: Objective[] = [
  'complete_deployments',
  'win_rounds',
  'survive_rounds',
  'get_kills',
];

const RESTRICTION_KINDS: RestrictionKind[] = [
  'gadget_only',
  'playstyle',
  'loadout_limit',
];

/** All unique roles across the operator catalog. */
const ALL_ROLES: string[] = Array.from(
  new Set(operators.flatMap((op) => op.roles))
);

/** All unique gadgets across the operator catalog. */
const ALL_GADGETS: string[] = Array.from(
  new Set(operators.flatMap((op) => op.gadgets))
);

/** All unique weapons (primaries + secondaries) across the operator catalog. */
const ALL_WEAPONS: string[] = Array.from(
  new Set(operators.flatMap((op) => [...op.primaries, ...op.secondaries]))
);

/** Maximum retry attempts for constraint relaxation. */
const MAX_RETRIES = 5;

/** Maximum number of operators in a random_pool. */
const MAX_POOL_SIZE = 5;

/** Mastery point reward multiplier (target_count × 5). */
const MASTERY_POINT_MULTIPLIER = 5;

// --- Generation Result ---

export interface GenerationResult {
  challenge: Challenge | null;
  error: string | null;
}

// --- Internal Types ---

interface GenerationConstraints {
  slot: ChallengeSlot;
  role: string | null;
  objective: Objective;
  restriction: Restriction | null;
  operatorScope: OperatorScope;
  targetCount: number;
}

// --- Utility Helpers ---

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleAndTake<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get the end of the current local calendar day as an ISO string.
 */
function endOfDay(date: Date): string {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

/**
 * Get the date 7 days from the given date as an ISO string.
 */
function endOfWeek(date: Date): string {
  const end = new Date(date);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

// --- Operator Pool Filtering ---

/**
 * Filter operators by role. Returns all operators if role is null.
 */
function filterByRole(pool: Operator[], role: string | null): Operator[] {
  if (role === null) return pool;
  return pool.filter((op) => op.roles.includes(role));
}

/**
 * Filter operators that have a specific gadget.
 */
function filterByGadget(pool: Operator[], gadget: string): Operator[] {
  return pool.filter((op) => op.gadgets.includes(gadget));
}

/**
 * Filter operators that have a specific weapon (primary or secondary).
 */
function filterByWeapon(pool: Operator[], weapon: string): Operator[] {
  return pool.filter(
    (op) => op.primaries.includes(weapon) || op.secondaries.includes(weapon)
  );
}

/**
 * Apply restriction filtering to an operator pool.
 * For 'playstyle' restrictions, the restriction value is a role string,
 * so we filter by that role.
 * For 'gadget_only', we filter by gadget.
 * For 'loadout_limit', we filter by weapon.
 */
function filterByRestriction(
  pool: Operator[],
  restriction: Restriction | null
): Operator[] {
  if (restriction === null) return pool;
  switch (restriction.kind) {
    case 'gadget_only':
      return filterByGadget(pool, restriction.value);
    case 'playstyle':
      return filterByRole(pool, restriction.value);
    case 'loadout_limit':
      return filterByWeapon(pool, restriction.value);
    default:
      return pool;
  }
}

/**
 * Get the effective operator pool after applying role and restriction constraints.
 * Returns the filtered list of operators that satisfy all constraints.
 */
function getEffectivePool(
  role: string | null,
  restriction: Restriction | null
): Operator[] {
  let pool = [...operators];
  pool = filterByRole(pool, role);
  pool = filterByRestriction(pool, restriction);
  return pool;
}

// --- Restriction Generation ---

/**
 * Generate a random restriction. Returns null ~30% of the time to allow
 * restriction-free challenges.
 */
function generateRestriction(
  pool: Operator[],
  _role: string | null
): Restriction | null {
  // ~30% chance of no restriction
  if (Math.random() < 0.3) return null;

  const kind = randomElement(RESTRICTION_KINDS);

  switch (kind) {
    case 'gadget_only': {
      // Find gadgets common to ALL operators in the pool
      const commonGadgets = findCommonGadgets(pool);
      if (commonGadgets.length === 0) return null;
      return { kind: 'gadget_only', value: randomElement(commonGadgets) };
    }
    case 'playstyle': {
      // Pick a role that at least one operator in the pool has
      const availableRoles = Array.from(
        new Set(pool.flatMap((op) => op.roles))
      );
      if (availableRoles.length === 0) return null;
      return { kind: 'playstyle', value: randomElement(availableRoles) };
    }
    case 'loadout_limit': {
      // Pick a weapon that at least one operator in the pool has
      const availableWeapons = Array.from(
        new Set(
          pool.flatMap((op) => [...op.primaries, ...op.secondaries])
        )
      );
      if (availableWeapons.length === 0) return null;
      return { kind: 'loadout_limit', value: randomElement(availableWeapons) };
    }
    default:
      return null;
  }
}

/**
 * Find gadgets that are common to ALL operators in the given pool.
 * Used for gadget_only restrictions to ensure every operator in the pool
 * can satisfy the restriction.
 */
function findCommonGadgets(pool: Operator[]): string[] {
  if (pool.length === 0) return [];
  // Start with the first operator's gadgets and intersect with the rest
  let common = new Set(pool[0].gadgets);
  for (let i = 1; i < pool.length; i++) {
    const opGadgets = new Set(pool[i].gadgets);
    common = new Set([...common].filter((g) => opGadgets.has(g)));
  }
  return Array.from(common);
}

// --- Operator Scope & Pool Selection ---

/**
 * Choose an operator scope for the challenge.
 * For missions, scope is always 'specific_operator'.
 * For daily/weekly, randomly choose between 'any' and 'random_pool'.
 */
function chooseOperatorScope(slot: ChallengeSlot): OperatorScope {
  if (slot === 'mission') return 'specific_operator';
  // ~40% any, ~60% random_pool for daily/weekly
  return Math.random() < 0.4 ? 'any' : 'random_pool';
}

/**
 * Select the operator pool based on scope and the effective pool of valid operators.
 */
function selectOperatorPool(
  scope: OperatorScope,
  effectivePool: Operator[],
  specificOperatorId?: string
): string[] {
  switch (scope) {
    case 'any':
      return [];
    case 'random_pool': {
      const poolSize = randomInt(1, Math.min(MAX_POOL_SIZE, effectivePool.length));
      const selected = shuffleAndTake(effectivePool, poolSize);
      return selected.map((op) => op.id);
    }
    case 'specific_operator':
      return specificOperatorId ? [specificOperatorId] : [];
    default:
      return [];
  }
}

// --- Constraint Relaxation ---

/**
 * Attempt to generate a valid challenge with constraint relaxation.
 * On each retry:
 *   1. First attempt: full constraints
 *   2. Drop restriction
 *   3. Drop role (keep restriction dropped)
 *
 * Returns the constraints that produce a non-empty operator pool, or null.
 */
function relaxConstraints(
  constraints: GenerationConstraints
): GenerationConstraints | null {
  // Attempt 1: full constraints
  let pool = getEffectivePool(constraints.role, constraints.restriction);
  if (pool.length > 0) return constraints;

  // Attempt 2: drop restriction
  const withoutRestriction: GenerationConstraints = {
    ...constraints,
    restriction: null,
  };
  pool = getEffectivePool(withoutRestriction.role, null);
  if (pool.length > 0) return withoutRestriction;

  // Attempt 3: drop role (restriction already dropped)
  const withoutRoleAndRestriction: GenerationConstraints = {
    ...constraints,
    role: null,
    restriction: null,
  };
  pool = getEffectivePool(null, null);
  if (pool.length > 0) return withoutRoleAndRestriction;

  return null;
}

// --- Core Generation Logic ---

/**
 * Generate a single challenge with the given slot and target count range.
 * Implements constraint-relaxation retry (up to MAX_RETRIES attempts).
 *
 * For gadget_only restrictions, the gadget is validated against every operator
 * in the final pool to ensure all operators can satisfy the restriction.
 *
 * Generated challenges always have xpOverride and xpOverrideReason as null.
 * (Requirement 16.2, 16.8)
 */
function generateChallenge(
  userId: string,
  slot: ChallengeSlot,
  targetCountMin: number,
  targetCountMax: number,
  expiresAt: string | null,
  specificOperatorId?: string
): GenerationResult {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Pick random parameters
    const objective = randomElement(OBJECTIVES);
    const targetCount = randomInt(targetCountMin, targetCountMax);
    const role = slot === 'mission' ? null : (Math.random() < 0.5 ? randomElement(ALL_ROLES) : null);
    const operatorScope = specificOperatorId
      ? 'specific_operator' as OperatorScope
      : chooseOperatorScope(slot);

    // Build initial pool based on role
    let basePool = filterByRole([...operators], role);

    // For specific_operator, ensure the operator exists in the base pool
    if (operatorScope === 'specific_operator' && specificOperatorId) {
      const specificOp = operators.find((op) => op.id === specificOperatorId);
      if (!specificOp) {
        continue; // Invalid operator, retry
      }
      // If role is set but operator doesn't have it, this attempt fails
      if (role && !specificOp.roles.includes(role)) {
        // Try relaxing: drop role for specific operator missions
        basePool = [specificOp];
      } else {
        basePool = [specificOp];
      }
    }

    // Generate restriction based on the current base pool
    const restriction = generateRestriction(basePool, role);

    // Build constraints
    const constraints: GenerationConstraints = {
      slot,
      role: operatorScope === 'specific_operator' ? null : role,
      objective,
      restriction,
      operatorScope,
      targetCount,
    };

    // Get effective pool with all constraints
    let effectivePool: Operator[];
    if (operatorScope === 'specific_operator' && specificOperatorId) {
      const specificOp = operators.find((op) => op.id === specificOperatorId);
      if (!specificOp) continue;

      // Validate restriction against the specific operator
      if (restriction) {
        const filtered = filterByRestriction([specificOp], restriction);
        if (filtered.length === 0) {
          // Relax: try without restriction
          effectivePool = [specificOp];
          constraints.restriction = null;
        } else {
          effectivePool = filtered;
        }
      } else {
        effectivePool = [specificOp];
      }
    } else {
      effectivePool = getEffectivePool(constraints.role, constraints.restriction);

      // If pool is empty, try constraint relaxation
      if (effectivePool.length === 0) {
        const relaxed = relaxConstraints(constraints);
        if (relaxed === null) continue; // All relaxation failed, retry from scratch

        constraints.role = relaxed.role;
        constraints.restriction = relaxed.restriction;
        effectivePool = getEffectivePool(relaxed.role, relaxed.restriction);

        if (effectivePool.length === 0) continue;
      }
    }

    // For gadget_only restriction, validate the gadget exists in ALL operators in the pool
    if (constraints.restriction?.kind === 'gadget_only') {
      const gadgetValid = effectivePool.every((op) =>
        op.gadgets.includes(constraints.restriction!.value)
      );
      if (!gadgetValid) {
        // Find a common gadget instead
        const commonGadgets = findCommonGadgets(effectivePool);
        if (commonGadgets.length === 0) {
          // Drop restriction
          constraints.restriction = null;
        } else {
          constraints.restriction = {
            kind: 'gadget_only',
            value: randomElement(commonGadgets),
          };
        }
      }
    }

    // Select operator pool based on scope
    const operatorPool = selectOperatorPool(
      constraints.operatorScope,
      effectivePool,
      specificOperatorId
    );

    // For random_pool, validate the pool is non-empty
    if (constraints.operatorScope === 'random_pool' && operatorPool.length === 0) {
      continue;
    }

    // For random_pool with gadget_only restriction, validate gadget against selected pool
    if (
      constraints.operatorScope === 'random_pool' &&
      constraints.restriction?.kind === 'gadget_only'
    ) {
      const poolOperators = operatorPool
        .map((id) => operators.find((op) => op.id === id))
        .filter((op): op is Operator => op !== undefined);

      const allHaveGadget = poolOperators.every((op) =>
        op.gadgets.includes(constraints.restriction!.value)
      );

      if (!allHaveGadget) {
        // Find a common gadget for the selected pool
        const commonGadgets = findCommonGadgets(poolOperators);
        if (commonGadgets.length === 0) {
          constraints.restriction = null;
        } else {
          constraints.restriction = {
            kind: 'gadget_only',
            value: randomElement(commonGadgets),
          };
        }
      }
    }

    // Compute rewards
    const xpReward = canonicalXpReward(slot, constraints.targetCount);
    const masteryPointReward = constraints.targetCount * MASTERY_POINT_MULTIPLIER;

    // Build the challenge
    const challenge: Challenge = {
      id: generateId(),
      userId,
      slot,
      role: constraints.role,
      objective: constraints.objective,
      targetCount: constraints.targetCount,
      restriction: constraints.restriction,
      operatorScope: constraints.operatorScope,
      operatorPool,
      xpReward,
      masteryPointReward,
      xpOverride: null,
      xpOverrideReason: null,
      progress: 0,
      generatedAt: new Date().toISOString(),
      expiresAt,
      completedAt: null,
      discardedAt: null,
    };

    // Final validation: reject if generation flow somehow set override fields
    // (Requirement 16.8)
    if (challenge.xpOverride !== null || challenge.xpOverrideReason !== null) {
      console.warn(
        '[XAWARS] Challenge generation attempted to set xp_override — rejected, retrying with null overrides.'
      );
      challenge.xpOverride = null;
      challenge.xpOverrideReason = null;
    }

    return { challenge, error: null };
  }

  // All retries exhausted
  return {
    challenge: null,
    error: "Couldn't roll a new challenge — try again in a few minutes.",
  };
}

// --- Public API ---

/**
 * Generate a Daily_Challenge for the given user.
 *
 * - Slot: 'daily'
 * - Target count: 1–10
 * - Expires at end of the user's local calendar day
 * - xpOverride and xpOverrideReason are always null
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 16.2
 */
export function generateDaily(userId: string, today: Date): GenerationResult {
  const expiresAt = endOfDay(today);
  return generateChallenge(userId, 'daily', 1, 10, expiresAt);
}

/**
 * Generate a Weekly_Challenge for the given user.
 *
 * - Slot: 'weekly'
 * - Target count: 5–50
 * - Expires 7 days from the week start
 * - xpOverride and xpOverrideReason are always null
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 16.2
 */
export function generateWeekly(userId: string, weekStart: Date): GenerationResult {
  const expiresAt = endOfWeek(weekStart);
  return generateChallenge(userId, 'weekly', 5, 50, expiresAt);
}

/**
 * Generate up to 3 Operator_Missions for a specific operator.
 *
 * - Slot: 'mission'
 * - Operator scope: 'specific_operator'
 * - Target count: 1–50
 * - No expiration (null expiresAt)
 * - xpOverride and xpOverrideReason are always null
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 6.1, 6.4, 6.6, 16.2
 */
export function generateOperatorMissions(
  userId: string,
  operatorId: string
): GenerationResult[] {
  // Validate operator exists in catalog
  const operatorExists = operators.some((op) => op.id === operatorId);
  if (!operatorExists) {
    return [
      {
        challenge: null,
        error: `Operator "${operatorId}" not found in catalog.`,
      },
    ];
  }

  const results: GenerationResult[] = [];
  for (let i = 0; i < 3; i++) {
    const result = generateChallenge(
      userId,
      'mission',
      1,
      50,
      null, // missions don't expire
      operatorId
    );
    results.push(result);
  }
  return results;
}

// --- Eligibility Classification ---

/**
 * Evaluate whether a Deployment is eligible for a given Active_Challenge.
 *
 * A Deployment is fully eligible if and only if all three sub-checks pass:
 * 1. Operator scope — the deployment's operator matches the challenge's scope
 * 2. Role — the deployment's role matches the challenge's role (or challenge has no role)
 * 3. Restriction — the deployment satisfies the challenge's restriction (or challenge has none)
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export function evaluateEligibility(
  deployment: DeploymentRecord,
  challenge: Challenge
): Eligibility {
  const operatorScopeOk = checkOperatorScope(deployment, challenge);
  const roleOk = checkRole(deployment, challenge);
  const restrictionOk = checkRestriction(deployment, challenge);

  return {
    operatorScopeOk,
    roleOk,
    restrictionOk,
    fullyEligible: operatorScopeOk && roleOk && restrictionOk,
  };
}

/**
 * Check operator scope eligibility.
 *
 * - 'any': always eligible (Req 3.2)
 * - 'random_pool': eligible if deployment's operatorId is in the challenge's operator pool (Req 3.3)
 * - 'specific_operator': eligible if deployment's operatorId equals the pool's single entry (Req 3.4)
 */
function checkOperatorScope(
  deployment: DeploymentRecord,
  challenge: Challenge
): boolean {
  switch (challenge.operatorScope) {
    case 'any':
      return true;
    case 'random_pool':
      return challenge.operatorPool.includes(deployment.operatorId);
    case 'specific_operator':
      return (
        challenge.operatorPool.length === 1 &&
        challenge.operatorPool[0] === deployment.operatorId
      );
    default:
      return false;
  }
}

/**
 * Check role eligibility.
 *
 * - If the challenge has no role (null), any deployment role is eligible (Req 3.5)
 * - If the challenge specifies a role, the deployment's role must match exactly (Req 3.5)
 */
function checkRole(
  deployment: DeploymentRecord,
  challenge: Challenge
): boolean {
  if (challenge.role === null) return true;
  return deployment.role === challenge.role;
}

/**
 * Check restriction eligibility.
 *
 * - If the challenge has no restriction (null), any deployment is eligible
 * - 'gadget_only': deployment's loadout gadget must equal the restriction value (Req 3.6)
 * - 'loadout_limit': deployment's loadout primary OR secondary must equal the restriction value (Req 3.7)
 * - 'playstyle': deployment's role must equal the restriction value (Req 3.8)
 */
function checkRestriction(
  deployment: DeploymentRecord,
  challenge: Challenge
): boolean {
  if (challenge.restriction === null) return true;

  switch (challenge.restriction.kind) {
    case 'gadget_only':
      return deployment.loadout.gadget === challenge.restriction.value;
    case 'loadout_limit':
      return (
        deployment.loadout.primary === challenge.restriction.value ||
        deployment.loadout.secondary === challenge.restriction.value
      );
    case 'playstyle':
      return deployment.role === challenge.restriction.value;
    default:
      return false;
  }
}

// --- Exported for testing ---

export const _internal = {
  getEffectivePool,
  filterByRole,
  filterByGadget,
  filterByWeapon,
  filterByRestriction,
  findCommonGadgets,
  relaxConstraints,
  generateRestriction,
  chooseOperatorScope,
  selectOperatorPool,
  generateChallenge,
  checkOperatorScope,
  checkRole,
  checkRestriction,
  ALL_ROLES,
  ALL_GADGETS,
  ALL_WEAPONS,
  OBJECTIVES,
  RESTRICTION_KINDS,
  MAX_RETRIES,
  MAX_POOL_SIZE,
  MASTERY_POINT_MULTIPLIER,
};
