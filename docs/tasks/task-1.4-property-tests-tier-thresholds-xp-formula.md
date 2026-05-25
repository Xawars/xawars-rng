# Task 1.4: Property Tests for Tier Thresholds and XP Formula

## Summary

| Field | Value |
|-------|-------|
| **Task ID** | 1.4 |
| **Spec** | Operator Mastery MVP |
| **Status** | Completed |
| **File Created** | `app/lib/mastery/__tests__/tier-thresholds-xp.property.test.ts` |
| **Properties Covered** | Property 1 (Canonical XP Formula), Property 12 (Mastery Tier Thresholds) |
| **Requirements Validated** | 7.4, 16.1, 16.2, 16.5, 16.6, 16.7, 16.10 |
| **Test Count** | 20 tests |
| **Test Framework** | Vitest + fast-check (property-based testing) |

---

## What Was Implemented

A comprehensive property-based test suite that validates two core system invariants of the Operator Mastery module:

### Property 1: Canonical XP Formula Invariant (10 tests)

Tests that enforce the single source of truth for XP reward computation:

1. **`canonicalXpReward` correctness** — Verifies the formula `target_count × multiplier` produces correct results for all slot/target combinations
2. **`validateXp` normal path** — Challenges without overrides return canonical XP as effective reward
3. **`validateXp` admin exception path** — Valid Administrative Exceptions use `xp_override` as effective XP
4. **`validateAdminOverride` orphan override rejection** — Override present without reason is rejected
5. **`validateAdminOverride` orphan reason rejection** — Reason present without override is rejected
6. **`validateAdminOverride` out-of-range rejection** — Negative, >10000, or non-integer overrides are rejected
7. **`validateAdminOverride` reason too short** — All-whitespace reasons are rejected
8. **`validateAdminOverride` reason too long** — Reasons with >500 non-whitespace characters are rejected
9. **`validateXp` auto-correction** — Deviating `xpReward` values are auto-corrected to canonical when no admin exception exists
10. **`validateXp` orphan fix** — Orphan override states are detected and both fields are cleared

### Property 12: Mastery Tier Threshold Table (10 tests)

Tests that enforce the tier computation logic:

1. **Bronze range** — `computeTier` returns `'Bronze'` for points in [0, 100)
2. **Silver range** — `computeTier` returns `'Silver'` for points in [100, 300)
3. **Gold range** — `computeTier` returns `'Gold'` for points in [300, 600)
4. **Platinum range** — `computeTier` returns `'Platinum'` for points in [600, 1000)
5. **Diamond range** — `computeTier` returns `'Diamond'` for points >= 1000
6. **Unified tier property** — Single test covering all tiers with 500 random inputs
7. **Negative clamping** — Negative points are clamped to Bronze
8. **`pointsToNextTier` correctness** — Returns exact distance to the next tier boundary
9. **Threshold contiguity** — No gaps or overlaps between tier ranges
10. **`pointsToNextFromFloor` consistency** — Metadata in `TIER_THRESHOLDS` matches computed values

---

## Why It Was Implemented

### Business Logic Purpose

The Operator Mastery system awards XP and tracks per-operator progression tiers. Two invariants are critical to the system's integrity:

1. **XP rewards must be deterministic and auditable.** If a challenge awards the wrong XP, players lose trust in the progression system. The Canonical XP Formula ensures every challenge's reward is predictable from its slot and target count — no magic numbers, no drift.

2. **Tier boundaries must be unambiguous.** A player at 299 points must be Silver, not Gold. A player at 300 must be Gold, not Silver. Off-by-one errors in tier computation would cause incorrect badge unlocks, wrong UI displays, and broken progression.

### Why Property-Based Testing

Traditional unit tests check specific examples (e.g., "10 daily deployments = 100 XP"). Property-based tests check *universal truths* across thousands of random inputs:

- "For ANY slot and ANY target count, the formula holds"
- "For ANY non-negative integer, the tier is correct"

This catches edge cases that example-based tests miss — boundary values, unusual combinations, and regression scenarios that a developer wouldn't think to write manually.

### Requirements Traceability

| Requirement | What It Specifies | How Tests Validate It |
|-------------|-------------------|----------------------|
| 7.4 | Tier thresholds: Bronze [0,100), Silver [100,300), Gold [300,600), Platinum [600,1000), Diamond [1000,∞) | Property 12 tests verify `computeTier` against all ranges |
| 16.1 | Canonical formula: `xp_reward = target_count × {10, 15, 12}` | Property 1 tests verify `canonicalXpReward` output |
| 16.2 | Formula applies to all challenges without admin exception | `validateXp` tests confirm auto-correction behavior |
| 16.5 | Admin exception requires both `xp_override` AND `xp_override_reason` | Orphan rejection tests |
| 16.6 | Effective XP uses override when valid admin exception exists | Admin exception path test |
| 16.7 | Override must be integer in [0, 10000], reason 1-500 non-whitespace chars | Out-of-range and length validation tests |
| 16.10 | Generation flow never produces overrides | Tested indirectly (generation tests in task 2.5) |

---

## How It Works

### Architecture

```
app/lib/mastery/__tests__/tier-thresholds-xp.property.test.ts
    │
    ├── imports from: app/lib/mastery/tier-thresholds.ts
    │     └── TIER_THRESHOLDS, computeTier(), pointsToNextTier()
    │
    ├── imports from: app/lib/mastery/xp-invariant.ts
    │     └── CANONICAL_MULTIPLIERS, canonicalXpReward(), validateXp(), validateAdminOverride()
    │
    └── imports from: app/types/mastery.ts
          └── ChallengeSlot type
```

### Testing Approach: Property-Based Testing with fast-check

Instead of writing individual test cases with hardcoded values, we define **arbitraries** (random value generators) and **properties** (assertions that must hold for all generated values):

```typescript
// Arbitrary: generates random slot values
const slotArb = fc.constantFrom<ChallengeSlot>('daily', 'weekly', 'mission');

// Arbitrary: generates random target counts in valid range
const targetCountArb = fc.integer({ min: 1, max: 50 });

// Property: for ANY slot and target count, the formula holds
fc.assert(
  fc.property(slotArb, targetCountArb, (slot, targetCount) => {
    const expected = targetCount * CANONICAL_MULTIPLIERS[slot];
    const actual = canonicalXpReward(slot, targetCount);
    expect(actual).toBe(expected);
  }),
  { numRuns: 200 }  // Run 200 random combinations
);
```

### Key Technical Decisions

1. **`numRuns` values are calibrated per test:**
   - Simple properties (single input): 100 runs
   - Multi-input properties: 200 runs
   - Critical unified properties: 500 runs
   - This balances thoroughness with test speed (~330ms total)

2. **`fc.pre()` for preconditions:** The auto-correction test uses `fc.pre(wrongXp !== canonical)` to skip inputs where the "wrong" XP accidentally equals the canonical value. This avoids false negatives without biasing the test.

3. **Filtered arbitraries for complex constraints:** The admin reason validation uses `.filter()` to generate strings meeting specific non-whitespace count requirements, ensuring the test only exercises valid inputs for the "happy path" and invalid inputs for rejection paths.

4. **Structural tests alongside property tests:** The contiguity and consistency checks are deterministic (they verify the constant `TIER_THRESHOLDS` array) but are included because they guard against accidental edits to the threshold data.

### Workflow Within the Mastery System

```
Challenge Generated
    │
    ▼
validateXp() called on read ──► Auto-corrects if xpReward ≠ canonical
    │
    ▼
Challenge Completed
    │
    ▼
computeEffectiveXpReward() ──► Uses xp_override if valid admin exception
    │                           Otherwise uses canonical formula
    ▼
awardXP(effectiveXpReward, 'challenge_completed')
    │
    ▼
Mastery Points awarded to operator
    │
    ▼
computeTier(newPoints) ──► Determines if tier crossed
    │
    ▼
pointsToNextTier(newPoints) ──► UI displays progress to next tier
```

---

## How to Test It

### Automated Testing

#### Run the property tests:

```bash
npx vitest --run app/lib/mastery/__tests__/tier-thresholds-xp.property.test.ts
```

**Expected output:**
```
 ✓ Feature: operator-mastery-mvp, Property 1: Canonical XP Formula invariant (10 tests)
 ✓ Feature: operator-mastery-mvp, Property 12: Mastery_Tier threshold table (10 tests)

 Test Files  1 passed (1)
      Tests  20 passed (20)
   Duration  ~6s
```

#### Run in watch mode during development:

```bash
npx vitest app/lib/mastery/__tests__/tier-thresholds-xp.property.test.ts
```

#### Run all mastery tests:

```bash
npx vitest --run app/lib/mastery/
```

### Manual Verification

If you want to verify the logic manually:

#### XP Formula Verification

| Slot | Target Count | Expected XP | Formula |
|------|-------------|-------------|---------|
| daily | 1 | 10 | 1 × 10 |
| daily | 10 | 100 | 10 × 10 |
| weekly | 5 | 75 | 5 × 15 |
| weekly | 50 | 750 | 50 × 15 |
| mission | 1 | 12 | 1 × 12 |
| mission | 25 | 300 | 25 × 12 |

#### Tier Boundary Verification

| Points | Expected Tier | Boundary Note |
|--------|--------------|---------------|
| 0 | Bronze | Floor of Bronze |
| 99 | Bronze | Ceiling - 1 |
| 100 | Silver | Exact boundary |
| 299 | Silver | Ceiling - 1 |
| 300 | Gold | Exact boundary |
| 599 | Gold | Ceiling - 1 |
| 600 | Platinum | Exact boundary |
| 999 | Platinum | Ceiling - 1 |
| 1000 | Diamond | Exact boundary |
| 999999 | Diamond | Very high value |

#### Points-to-Next-Tier Verification

| Points | Current Tier | Points to Next | Next Tier |
|--------|-------------|----------------|-----------|
| 0 | Bronze | 100 | Silver |
| 50 | Bronze | 50 | Silver |
| 100 | Silver | 200 | Gold |
| 250 | Silver | 50 | Gold |
| 300 | Gold | 300 | Platinum |
| 600 | Platinum | 400 | Diamond |
| 1000 | Diamond | 0 | (none) |

### Edge Cases Covered

| Edge Case | Test Coverage |
|-----------|--------------|
| Points = 0 (minimum) | Bronze range test + unified test |
| Points = 99 (Bronze ceiling - 1) | Bronze range test |
| Points = 100 (exact Silver boundary) | Silver range test |
| Points = 1,000,000 (very large) | Diamond range test |
| Negative points | Negative clamping test |
| XP override = 0 (minimum valid) | Admin exception test |
| XP override = 10000 (maximum valid) | Admin exception test |
| XP override = 10001 (just over max) | Out-of-range rejection test |
| XP override = -1 (negative) | Out-of-range rejection test |
| XP override = 3.14 (non-integer) | Out-of-range rejection test |
| Reason = all whitespace | Reason too short test |
| Reason = 501 non-whitespace chars | Reason too long test |
| Orphan: override without reason | Orphan override test |
| Orphan: reason without override | Orphan reason test |
| Both override fields null (clearing) | Implicitly valid in `validateAdminOverride` |

---

## Scenarios and Practical Examples

### Scenario 1: Normal Challenge Completion

A player completes a daily challenge with `target_count = 5`.

```typescript
const challenge: ChallengeRow = {
  slot: 'daily',
  targetCount: 5,
  xpReward: 50,        // 5 × 10 = 50 (canonical)
  xpOverride: null,
  xpOverrideReason: null,
};

const outcome = validateXp(challenge);
// outcome.effectiveXpReward = 50
// outcome.isAdministrativeException = false
// outcome.needsAutoCorrection = false
// → Player receives 50 XP
```

### Scenario 2: Data Corruption — XP Reward Drifted

A database migration accidentally set `xp_reward = 999` on a daily challenge with `target_count = 3`.

```typescript
const challenge: ChallengeRow = {
  slot: 'daily',
  targetCount: 3,
  xpReward: 999,       // WRONG — should be 3 × 10 = 30
  xpOverride: null,
  xpOverrideReason: null,
};

const outcome = validateXp(challenge);
// outcome.needsAutoCorrection = true
// outcome.correctedRow.xpReward = 30
// outcome.effectiveXpReward = 30
// → System auto-corrects to 30, persists the fix, awards 30 XP
```

### Scenario 3: Admin Override for a Special Event

An admin creates a special weekly challenge that awards bonus XP for a community event.

```typescript
const challenge: ChallengeRow = {
  slot: 'weekly',
  targetCount: 10,
  xpReward: 150,       // canonical: 10 × 15 = 150
  xpOverride: 500,     // admin override: 500 XP for the event
  xpOverrideReason: 'Community event week 12 — double XP promotion',
};

const outcome = validateXp(challenge);
// outcome.isAdministrativeException = true
// outcome.effectiveXpReward = 500
// outcome.needsAutoCorrection = false
// → Player receives 500 XP (the override), not 150
```

### Scenario 4: Invalid Admin Override Attempt

Someone tries to set an override without a reason (orphan state).

```typescript
const result = validateAdminOverride({
  xp_override: 200,
  xp_override_reason: null,  // MISSING
});
// result = { ok: false, reason: 'orphan_override' }
// → Write is rejected, database unchanged
```

### Scenario 5: Player Progression Through Tiers

A player accumulates mastery points on Ash over multiple sessions:

```
Session 1: 3 wins (30 pts) → computeTier(30) = Bronze, pointsToNextTier(30) = 70
Session 2: 5 wins (50 pts) → computeTier(80) = Bronze, pointsToNextTier(80) = 20
Session 3: 2 wins (20 pts) → computeTier(100) = Silver ← TIER CROSSED!
           → Badge unlocked: (user, Ash, Silver)
Session 4: 20 wins (200 pts) → computeTier(300) = Gold ← TIER CROSSED!
           → Badge unlocked: (user, Ash, Gold)
```

### Scenario 6: Negative Points Edge Case

Due to a bug or edge case, `computeTier` receives a negative value:

```typescript
computeTier(-50);  // Returns 'Bronze' (clamped to 0)
computeTier(-1);   // Returns 'Bronze' (clamped to 0)
```

The system is defensive — negative points never crash or return an invalid tier.

### Scenario 7: Diamond Player — No Next Tier

A dedicated player has 5000 mastery points on Thermite:

```typescript
computeTier(5000);        // 'Diamond'
pointsToNextTier(5000);   // 0 (no tier above Diamond)
```

The UI shows "Max Tier Reached" instead of a progress bar.

---

## File Dependencies

| File | Role |
|------|------|
| `app/lib/mastery/tier-thresholds.ts` | Implementation under test (tier logic) |
| `app/lib/mastery/xp-invariant.ts` | Implementation under test (XP validation) |
| `app/types/mastery.ts` | Type definitions used by both |
| `app/lib/mastery/__tests__/tier-thresholds-xp.property.test.ts` | The test file created in this task |

---

## Related Tasks

| Task | Relationship |
|------|-------------|
| 1.1 (Types) | Provides `ChallengeSlot`, `MasteryTier` types used in tests |
| 1.2 (Tier thresholds & XP formula) | The implementation these tests validate |
| 2.4 (Challenge completion detection) | Uses `computeEffectiveXpReward` which relies on `validateXp` |
| 3.1 (Mastery points and tier logic) | Uses `computeTier` and `pointsToNextTier` |
| 3.3 (Mastery points property tests) | Builds on Property 12 with additional mastery-specific properties |
