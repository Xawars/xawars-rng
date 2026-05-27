# Task 2: Challenge_Engine Implementation — Complete Documentation

## Table of Contents

1. [What Was Implemented](#what-was-implemented)
2. [Why It Was Implemented](#why-it-was-implemented)
3. [How It Works](#how-it-works)
4. [How to Test It](#how-to-test-it)
5. [Scenarios and Practical Examples](#scenarios-and-practical-examples)

---

## What Was Implemented

Task 2 delivers the **Challenge_Engine** — the pure-logic core of the Operator Mastery MVP. It is responsible for generating randomized challenges, evaluating whether a deployment qualifies for a challenge, tracking challenge progress, detecting completion, and computing XP rewards.

### Completed Sub-Tasks

| Sub-Task | Description | Files Created/Modified |
|----------|-------------|----------------------|
| 2.1 | Challenge generation functions (`generateDaily`, `generateWeekly`, `generateOperatorMissions`) with constraint-relaxation retry logic | `app/lib/mastery/challenge-engine.ts` |
| 2.2 | Eligibility classification (`evaluateEligibility`) | `app/lib/mastery/challenge-engine.ts` |
| 2.3 | Challenge progress application (`applyDeploymentProgress`, `applyMatchResultProgress`, `applyKillIncrement`) | `app/lib/mastery/challenge-engine.ts` |
| 2.4 | Completion detection and effective XP computation (`isCompleted`, `computeEffectiveXpReward`) | `app/lib/mastery/challenge-engine.ts` |
| 2.5 | Property tests for challenge generation (Properties 2, 3, 4, 5) | `app/lib/mastery/__tests__/challenge-generation.property.test.ts` |
| 2.6 | Property tests for eligibility and progress (Properties 6, 7) | `app/lib/mastery/__tests__/eligibility-progress.property.test.ts` |

### Supporting Modules (from Task 1)

| Module | Purpose | File |
|--------|---------|------|
| Type definitions | All TypeScript types for the mastery system | `app/types/mastery.ts` |
| Tier thresholds | `computeTier()`, `pointsToNextTier()` | `app/lib/mastery/tier-thresholds.ts` |
| XP invariant validator | `canonicalXpReward()`, `validateXp()`, `validateAdminOverride()` | `app/lib/mastery/xp-invariant.ts` |

### Key Functions Delivered

```typescript
// Generation
generateDaily(userId, today): GenerationResult
generateWeekly(userId, weekStart): GenerationResult
generateOperatorMissions(userId, operatorId): GenerationResult[]

// Eligibility
evaluateEligibility(deployment, challenge): Eligibility

// Progress
applyDeploymentProgress(deployment, challenge): Challenge
applyMatchResultProgress(deployment, result, challenge): Challenge
applyKillIncrement(deployment, challenge, delta): Challenge

// Completion
isCompleted(challenge): boolean
computeEffectiveXpReward(challenge): number
```

---

## Why It Was Implemented

### Business Purpose

The Challenge_Engine transforms the existing random operator selector from a novelty tool into a **structured progression loop**. Without it, users roll an operator and play — there's no reason to come back tomorrow. With it, every roll becomes part of a larger goal: complete a daily challenge, advance a weekly objective, or progress an operator-specific mission.

### Design Rationale

1. **Pure functions over stateful classes.** Every function in the Challenge_Engine takes input and returns output without side effects. This makes the engine trivially testable, replay-safe, and independent of persistence concerns. The caller (MasteryContext) handles all state management and persistence.

2. **Constraint-relaxation retry.** Real operator catalogs have uneven distributions — some roles have few operators, some gadgets are rare. Rather than failing silently or producing invalid challenges, the engine progressively relaxes constraints (drop restriction first, then role) up to 5 times. This guarantees either a valid challenge or a clear error.

3. **Canonical XP Formula as a system invariant.** The formula `xp_reward = target_count × multiplier[slot]` is enforced at generation time and validated on every read. This prevents data corruption from producing incorrect rewards and ensures players always receive fair XP.

4. **Immutable challenge updates.** Progress functions return new Challenge objects rather than mutating in place. This aligns with React's state model and makes it safe to use challenges in concurrent contexts without race conditions.

### Requirements Satisfied

- **Req 1.1–1.8**: Challenge generation with all constraint types
- **Req 3.1–3.8**: Eligibility classification for deployments
- **Req 4.1–4.6**: Progress tracking with bounds enforcement
- **Req 5.1, 5.5**: Completion detection and idempotent reward computation
- **Req 16.2, 16.6, 16.8**: Canonical XP formula enforcement

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    MasteryContext                         │
│  (state orchestration, persistence, React context)       │
└──────────────┬──────────────────────────────┬───────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│     Challenge_Engine      │    │      Mastery_Engine       │
│  (pure logic, no state)   │    │  (pure logic, no state)   │
│                           │    │                           │
│  • generateDaily()        │    │  • pointsFor()            │
│  • generateWeekly()       │    │  • applyAward()           │
│  • generateOperatorMissions()│ │  • computeTier()          │
│  • evaluateEligibility()  │    │  • applyStreakIncrement() │
│  • applyDeploymentProgress()│  │                           │
│  • applyMatchResultProgress()│ └──────────────────────────┘
│  • applyKillIncrement()   │
│  • isCompleted()          │
│  • computeEffectiveXpReward()│
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────┐
│    XP Invariant Validator │
│  • canonicalXpReward()    │
│  • validateXp()           │
│  • validateAdminOverride()│
└──────────────────────────┘
```

### Challenge Generation Flow

```
generateDaily(userId, today)
    │
    ▼
generateChallenge(userId, 'daily', 1, 10, expiresAt)
    │
    ├── For each attempt (up to MAX_RETRIES = 5):
    │   │
    │   ├── 1. Pick random parameters:
    │   │      • objective (one of 4)
    │   │      • targetCount (within slot range)
    │   │      • role (50% chance of null for daily/weekly, always null for mission)
    │   │      • operatorScope (40% 'any', 60% 'random_pool' for daily/weekly)
    │   │
    │   ├── 2. Build base operator pool filtered by role
    │   │
    │   ├── 3. Generate restriction from the base pool
    │   │      • 30% chance of no restriction
    │   │      • gadget_only: picks a gadget common to ALL pool operators
    │   │      • playstyle: picks a role from pool operators
    │   │      • loadout_limit: picks a weapon from pool operators
    │   │
    │   ├── 4. Compute effective pool with all constraints
    │   │      • If empty → constraint relaxation:
    │   │        Step 1: Drop restriction
    │   │        Step 2: Drop role
    │   │        Step 3: If still empty → retry from scratch
    │   │
    │   ├── 5. Validate gadget_only restriction against final pool
    │   │      • For 'any' scope: validate against ALL operators in catalog
    │   │      • For 'random_pool': validate against selected pool operators
    │   │      • If invalid: find common gadget or drop restriction
    │   │
    │   ├── 6. Select operator pool based on scope
    │   │      • 'any' → []
    │   │      • 'random_pool' → 1–5 random operators from effective pool
    │   │      • 'specific_operator' → [operatorId]
    │   │
    │   ├── 7. Compute rewards
    │   │      • xpReward = canonicalXpReward(slot, targetCount)
    │   │      • masteryPointReward = targetCount × 5
    │   │
    │   └── 8. Build and return Challenge object
    │          • xpOverride = null (always)
    │          • xpOverrideReason = null (always)
    │          • progress = 0
    │
    └── If all retries fail → return { challenge: null, error: "..." }
```

### Eligibility Classification

When a user accepts a deployment, the engine evaluates every active challenge against it:

```typescript
evaluateEligibility(deployment, challenge) → Eligibility
```

Three independent checks are performed:

| Check | Rule | Result |
|-------|------|--------|
| **Operator Scope** | `any` → always true; `random_pool` → operator in pool; `specific_operator` → operator equals pool[0] | `operatorScopeOk` |
| **Role** | `null` → always true; otherwise → deployment.role === challenge.role | `roleOk` |
| **Restriction** | `null` → always true; `gadget_only` → gadget matches; `loadout_limit` → primary or secondary matches; `playstyle` → role matches | `restrictionOk` |

The final verdict: `fullyEligible = operatorScopeOk && roleOk && restrictionOk`

### Progress Application

Each progress function follows the same pattern:

1. Check if the event type matches the challenge's objective
2. Check if the deployment is fully eligible
3. If both pass, apply the delta (clamped to `[0, targetCount]`)
4. Return a new Challenge object (immutable)

| Function | Triggers When | Objective Match |
|----------|---------------|-----------------|
| `applyDeploymentProgress` | User accepts a deployment | `complete_deployments` |
| `applyMatchResultProgress` | User reports win/survived | `win_rounds` + `'win'`, `survive_rounds` + `'survived_round'` |
| `applyKillIncrement` | Kill counter changes | `get_kills` (supports +1 and -1) |

**Key invariants:**
- Progress is always in `[0, targetCount]`
- Progress never exceeds `targetCount` (capped on increment)
- Progress never goes below 0 (capped on decrement)
- Only `get_kills` supports decrement (kill-revert scenario)

### Completion Detection

```typescript
isCompleted(challenge): boolean
// Returns true when challenge.progress >= challenge.targetCount
```

### Effective XP Computation

```typescript
computeEffectiveXpReward(challenge): number
// If valid Administrative_Exception (both xpOverride AND xpOverrideReason non-null):
//   → returns xpOverride
// Otherwise:
//   → returns canonicalXpReward(slot, targetCount)
```

The Canonical XP Formula:
- **Daily**: `targetCount × 10`
- **Weekly**: `targetCount × 15`
- **Mission**: `targetCount × 12`

### Important Design Decisions

1. **Why missions use multiplier 12 (between daily and weekly)?** Operator Missions span multiple sessions but are scoped to a single operator. They sit between a single-day and a full-week commitment, so the multiplier reflects that middle ground.

2. **Why `applyKillIncrement` accepts delta -1?** In the existing app, users can revert a kill count (misclick). The engine must handle this gracefully without corrupting progress.

3. **Why gadget_only validates against ALL operators for 'any' scope?** When scope is 'any', any operator could be deployed. If the gadget restriction only exists on 3 operators but the scope allows all 60+, the challenge would be unfairly restrictive. The engine either finds a universally-available gadget or drops the restriction.

4. **Why constraint relaxation drops restriction before role?** Restrictions are the most specific constraint and most likely to cause empty pools. Roles are broader categories with many operators, so they're dropped last.

---

## How to Test It

### Automated Tests

All tests use **Vitest** with **fast-check** for property-based testing.

#### Running Tests

```bash
# Run all mastery tests
npx vitest run app/lib/mastery/__tests__/ --reporter=verbose

# Run only challenge generation property tests
npx vitest run app/lib/mastery/__tests__/challenge-generation.property.test.ts

# Run only eligibility and progress property tests
npx vitest run app/lib/mastery/__tests__/eligibility-progress.property.test.ts

# Run only completion/XP unit tests
npx vitest run app/lib/mastery/__tests__/challenge-completion.test.ts

# Run tier threshold and XP invariant property tests
npx vitest run app/lib/mastery/__tests__/tier-thresholds-xp.property.test.ts

# Run all tests in watch mode (for development)
npx vitest app/lib/mastery/__tests__/
```

#### Test File Summary

| File | Tests | Type | Properties Covered |
|------|-------|------|-------------------|
| `challenge-generation.property.test.ts` | 15 | Property-based | P2, P3, P4, P5 |
| `eligibility-progress.property.test.ts` | 21 | Property-based | P6, P7 |
| `challenge-completion.test.ts` | 12 | Unit | Completion + XP |
| `tier-thresholds-xp.property.test.ts` | 20 | Property-based | P1, P12 |

**Total: 68 tests**

#### Property Test Details

**Property 2 — Generated Challenge well-formedness (3 tests)**
- Verifies every generated challenge has valid slot, target_count within range, valid objective, valid operator_scope, correct mastery_point_reward formula, null overrides, and all required fields present.
- Runs 200 iterations per generator function.

**Property 3 — Random pool sizing and operator validity (3 tests)**
- Verifies pool size is [1,5] for `random_pool`, exactly 1 for `specific_operator`, empty for `any`.
- Verifies every operator ID in the pool exists in the catalog.

**Property 4 — Gadget restriction respects every operator in the pool (3 tests)**
- Verifies that when `restriction.kind === 'gadget_only'`, the restriction value exists in the gadgets list of every operator in the pool.
- Runs 300 iterations for higher confidence.

**Property 5 — Constraint-relaxation retry (6 tests)**
- Verifies generation always terminates (never hangs).
- Verifies it returns either a valid challenge or an error string.
- Verifies MAX_RETRIES is 5.
- Verifies relaxation order: restriction dropped first, then role.

**Property 6 — Eligibility classification correctness (9 tests)**
- Verifies `fullyEligible === (operatorScopeOk && roleOk && restrictionOk)`.
- Verifies each sub-check independently against all scope/role/restriction combinations.
- Uses realistic deployment records built from the actual operator catalog.

**Property 7 — Challenge_Progress evolution (12 tests)**
- Verifies progress stays in `[0, targetCount]` after any sequence of events.
- Verifies correct increment/no-change behavior per objective type.
- Verifies ineligible deployments don't affect progress.
- Verifies mixed increment/decrement sequences maintain bounds.

#### Unit Test Details (challenge-completion.test.ts)

| Test | Input | Expected |
|------|-------|----------|
| progress=0, target=5 | `isCompleted` | `false` |
| progress=4, target=5 | `isCompleted` | `false` |
| progress=5, target=5 | `isCompleted` | `true` |
| progress=6, target=5 | `isCompleted` | `true` |
| daily, target=5, no override | `computeEffectiveXpReward` | `50` |
| weekly, target=10, no override | `computeEffectiveXpReward` | `150` |
| mission, target=8, no override | `computeEffectiveXpReward` | `96` |
| daily, override=200, reason="Admin bonus" | `computeEffectiveXpReward` | `200` |
| daily, override=200, reason=null (orphan) | `computeEffectiveXpReward` | `50` (canonical) |
| weekly, override=null, reason="Some reason" (orphan) | `computeEffectiveXpReward` | `150` (canonical) |
| mission, override=0, reason="Zero penalty" | `computeEffectiveXpReward` | `0` |

### Manual Testing

Since the Challenge_Engine is pure logic (no UI, no persistence), manual testing is done through the test runner. However, once integrated with MasteryContext (Task 5+), you can manually verify:

1. **Open the app** → A daily challenge banner should appear on the roll surface
2. **Accept a deployment** → If eligible, the challenge progress should increment
3. **Report a match result** → Win/survived should increment relevant challenges
4. **Increment kills** → Kill-based challenges should progress
5. **Complete a challenge** → Toast should appear with XP and mastery points

### Edge Cases to Verify

- Generate a challenge when the operator catalog has very few operators with a specific gadget
- Generate a mission for an operator with no gadgets (should produce restriction-free missions)
- Apply progress when challenge is already at targetCount (should not exceed)
- Apply kill revert when progress is 0 (should stay at 0)
- Compute XP for a challenge with orphaned override fields (should fall back to canonical)

---

## Scenarios and Practical Examples

### Scenario 1: Daily Challenge Generation

**Context:** User opens the app on a new day. No active daily challenge exists.

```typescript
const result = generateDaily('user-123', new Date('2025-03-15'));

// Possible output:
{
  challenge: {
    id: 'a1b2c3d4-...',
    userId: 'user-123',
    slot: 'daily',
    role: 'Hard Breacher',
    objective: 'complete_deployments',
    targetCount: 3,
    restriction: { kind: 'gadget_only', value: 'Breach Charge' },
    operatorScope: 'random_pool',
    operatorPool: ['thermite', 'ace', 'hibana'],
    xpReward: 30,              // 3 × 10
    masteryPointReward: 15,    // 3 × 5
    xpOverride: null,
    xpOverrideReason: null,
    progress: 0,
    generatedAt: '2025-03-15T08:00:00.000Z',
    expiresAt: '2025-03-15T23:59:59.999Z',
    completedAt: null,
    discardedAt: null,
  },
  error: null
}
```

**Interpretation:** The user needs to deploy 3 times as a Hard Breacher using Breach Charge, with one of Thermite, Ace, or Hibana. Reward: 30 XP + 15 mastery points.

### Scenario 2: Eligibility Check on Deployment

**Context:** User rolls Thermite with Breach Charge in the Hard Breacher role.

```typescript
const deployment = {
  id: 'deploy-456',
  operatorId: 'thermite',
  operatorName: 'Thermite',
  operatorSide: 'attacker',
  loadout: { primary: 'M1014', secondary: '5.7 USG', gadget: 'Breach Charge' },
  matchType: 'Ranked',
  platform: 'PC',
  targetKills: 5,
  role: 'Hard Breacher',
  deployedAt: '2025-03-15T09:30:00.000Z',
};

const eligibility = evaluateEligibility(deployment, dailyChallenge);
// Result:
{
  operatorScopeOk: true,   // 'thermite' is in ['thermite', 'ace', 'hibana']
  roleOk: true,            // 'Hard Breacher' === 'Hard Breacher'
  restrictionOk: true,     // 'Breach Charge' === 'Breach Charge'
  fullyEligible: true      // all three pass
}
```

### Scenario 3: Eligibility Fails — Wrong Operator

**Context:** User rolls Sledge (not in the pool) with the same role and gadget.

```typescript
const deployment = {
  ...baseDeployment,
  operatorId: 'sledge',
  operatorName: 'Sledge',
};

const eligibility = evaluateEligibility(deployment, dailyChallenge);
// Result:
{
  operatorScopeOk: false,  // 'sledge' NOT in ['thermite', 'ace', 'hibana']
  roleOk: true,
  restrictionOk: true,
  fullyEligible: false     // operator scope failed
}
```

**Progress is NOT incremented** because the deployment is ineligible.

### Scenario 4: Progress Increment and Completion

**Context:** User has completed 2 of 3 required deployments. They accept a third eligible deployment.

```typescript
// Before: progress = 2, targetCount = 3
const updated = applyDeploymentProgress(eligibleDeployment, challenge);
// After: progress = 3

isCompleted(updated); // true — progress (3) >= targetCount (3)

const xp = computeEffectiveXpReward(updated);
// xp = 30 (daily, targetCount=3, multiplier=10)
```

**The MasteryContext would then:**
1. Set `completedAt` timestamp
2. Call `awardXP(30, 'challenge_completed')`
3. Award 15 mastery points to all contributing operators
4. Show a completion toast

### Scenario 5: Kill-Based Challenge with Revert

**Context:** User has a "get 5 kills" challenge. They increment kills, then revert one.

```typescript
let challenge = makeChallenge({ objective: 'get_kills', targetCount: 5, progress: 3 });

// User gets a kill
challenge = applyKillIncrement(deployment, challenge, 1);
// progress: 4

// User reverts the kill (misclick)
challenge = applyKillIncrement(deployment, challenge, -1);
// progress: 3

// User gets 2 more kills
challenge = applyKillIncrement(deployment, challenge, 1); // progress: 4
challenge = applyKillIncrement(deployment, challenge, 1); // progress: 5

isCompleted(challenge); // true
```

### Scenario 6: Progress Capping at Target

**Context:** Challenge has targetCount=5 and progress is already at 5.

```typescript
let challenge = makeChallenge({ objective: 'get_kills', targetCount: 5, progress: 5 });

// Another kill comes in
challenge = applyKillIncrement(deployment, challenge, 1);
// progress: 5 (capped, does not go to 6)

// Decrement still works
challenge = applyKillIncrement(deployment, challenge, -1);
// progress: 4
```

### Scenario 7: Administrative Exception Override

**Context:** An admin sets a special XP reward for a promotional challenge.

```typescript
const promoChallenge = {
  ...normalChallenge,
  slot: 'daily',
  targetCount: 3,
  xpReward: 30,           // canonical value stored
  xpOverride: 500,        // admin override
  xpOverrideReason: 'Launch week promotional bonus',
};

computeEffectiveXpReward(promoChallenge);
// Returns 500 (the override), not 30 (the canonical)
```

### Scenario 8: Orphaned Override Falls Back to Canonical

**Context:** Data corruption left xpOverride set but xpOverrideReason null.

```typescript
const corruptedChallenge = {
  ...normalChallenge,
  slot: 'weekly',
  targetCount: 10,
  xpOverride: 999,
  xpOverrideReason: null,  // orphan!
};

computeEffectiveXpReward(corruptedChallenge);
// Returns 150 (canonical: 10 × 15), NOT 999
// The orphan state is not a valid Administrative_Exception
```

### Scenario 9: Constraint Relaxation in Action

**Context:** The engine tries to generate a challenge with role "Shield" and gadget_only restriction "Claymore", but no Shield operator has Claymore.

```
Attempt 1: role="Shield", restriction=gadget_only("Claymore")
  → Pool empty (no Shield operator has Claymore)
  → Relax: drop restriction

Attempt 1 (relaxed): role="Shield", restriction=null
  → Pool has operators: Montagne, Blitz, Fuze (Shield)
  → Valid! Generate challenge without restriction.
```

If even dropping the role doesn't help (extremely unlikely with a real catalog), the engine retries from scratch with new random parameters, up to 5 total attempts.

### Scenario 10: Operator Mission Generation

**Context:** User wants missions for Thermite.

```typescript
const results = generateOperatorMissions('user-123', 'thermite');
// Returns array of 3 GenerationResult objects

// Example output:
[
  {
    challenge: {
      slot: 'mission',
      operatorScope: 'specific_operator',
      operatorPool: ['thermite'],
      objective: 'win_rounds',
      targetCount: 8,
      xpReward: 96,           // 8 × 12
      masteryPointReward: 40, // 8 × 5
      restriction: { kind: 'gadget_only', value: 'Exothermic Charge' },
      ...
    },
    error: null
  },
  {
    challenge: {
      slot: 'mission',
      operatorScope: 'specific_operator',
      operatorPool: ['thermite'],
      objective: 'get_kills',
      targetCount: 15,
      xpReward: 180,          // 15 × 12
      masteryPointReward: 75, // 15 × 5
      restriction: null,
      ...
    },
    error: null
  },
  {
    challenge: {
      slot: 'mission',
      operatorScope: 'specific_operator',
      operatorPool: ['thermite'],
      objective: 'complete_deployments',
      targetCount: 5,
      xpReward: 60,           // 5 × 12
      masteryPointReward: 25, // 5 × 5
      restriction: null,
      ...
    },
    error: null
  }
]
```

**Key difference from daily/weekly:** Missions always have `operatorScope: 'specific_operator'`, never expire (`expiresAt: null`), and the pool always contains exactly the target operator.

---

## Summary of Correctness Guarantees

The property-based tests provide strong evidence for these universal invariants:

| # | Property | Guarantee |
|---|----------|-----------|
| P1 | Canonical XP Formula | XP reward always matches `target × multiplier` unless valid admin exception |
| P2 | Well-formedness | Every generated challenge has valid types, ranges, and required fields |
| P3 | Pool sizing | Pool size matches scope rules; all IDs exist in catalog |
| P4 | Gadget validity | Gadget restrictions are satisfiable by every operator in the pool |
| P5 | Termination | Generation always terminates within 5 retries |
| P6 | Eligibility correctness | `fullyEligible` is the logical AND of all three sub-checks |
| P7 | Progress bounds | Progress stays in `[0, targetCount]` under any event sequence |
| P12 | Tier computation | `computeTier` returns correct tier for any non-negative point value |

These properties hold across hundreds of randomized inputs per test, providing confidence that the engine behaves correctly for any valid combination of operators, roles, gadgets, and challenge parameters.
