# Mastery Engine Implementation Documentation

## Overview

This document covers the implementation of **Task Group 3: Mastery_Engine (pure logic)** from the Operator Mastery MVP spec. The Mastery Engine is the core scoring and progression system that awards points to operators based on gameplay events, tracks tier progression, and manages daily challenge streaks with milestone bonuses.

---

## What Was Implemented

### Task 3.1 — Mastery Points and Tier Logic

**File:** `app/lib/mastery/mastery-engine.ts`

Four exported functions:

| Function | Purpose |
|----------|---------|
| `pointsFor(event)` | Maps a gameplay event to its mastery point value |
| `applyAward(state, points)` | Applies points to an operator's mastery state, detects tier crossings |
| `computeTier(points)` | Returns the tier for a given point total (re-exported from tier-thresholds) |
| `pointsToNextTier(points)` | Returns points remaining until the next tier (re-exported from tier-thresholds) |

### Task 3.2 — Streak Calculator

**File:** `app/lib/mastery/streak-calculator.ts`

Two exported functions:

| Function | Purpose |
|----------|---------|
| `applyStreakIncrement(state, today)` | Increments the daily challenge streak, detects milestone bonuses |
| `applyStreakReset(state)` | Resets the streak to zero when a daily slot expires without completion |

### Task 3.3 — Property Tests for Mastery Points and Tiers

**File:** `app/lib/mastery/__tests__/mastery-engine.property.test.ts`

11 property-based tests covering three formal properties:
- **Property 10:** Mastery_Points trace sum
- **Property 11:** Mastery_Points monotonicity under sync replay
- **Property 13:** Mastery_Badge uniqueness per (user, operator, tier)

### Task 3.4 — Property Tests for Streak Logic

**File:** `app/lib/mastery/__tests__/streak-calculator.property.test.ts`

8 property-based tests covering:
- **Property 14:** Mastery_Challenge_Streak length and bonus idempotency

### Task 4 — Checkpoint

All 126 mastery-related tests pass (unit + property tests across all modules).

---

## Why It Was Implemented

### Business Logic

The Mastery Engine provides the **operator-level progression system** that gives players long-term engagement incentives beyond the existing XP system. While XP is a global player resource, mastery points are **per-operator** — encouraging players to diversify their operator usage and develop expertise with specific operators.

### Key Design Decisions

1. **Pure functions with no side effects** — The engine is entirely deterministic and testable. Persistence is handled by the MasteryContext layer above it. This separation makes the logic easy to reason about, test with property-based testing, and replay during sync operations.

2. **Monotonic points (never decrease)** — Requirement 7.5 mandates that mastery points only ever increase. The `applyAward` function enforces this by ignoring non-positive point values. This simplifies conflict resolution during sync (max-merge strategy).

3. **Idempotent bonus tracking via `run_id`** — Streak bonuses use a `run_id` + `bonusesAwardedInRun` pattern to ensure that sync replays don't double-award milestone bonuses. Each streak "run" (consecutive sequence of days) gets a unique ID, and bonuses are tracked per-run.

4. **Tier crossing detection** — `applyAward` returns a `tierCrossed` field so the calling layer can trigger badge creation and toast notifications without re-computing tier state.

### Requirements Traceability

| Requirement | Implementation |
|-------------|---------------|
| 7.1 — Win awards 10 mastery points | `pointsFor({ kind: 'match_result_win' })` → 10 |
| 7.2 — Survived round awards 5 points | `pointsFor({ kind: 'match_result_survived' })` → 5 |
| 7.3 — Kill target complete awards 15 points | `pointsFor({ kind: 'kill_target_complete' })` → 15 |
| 7.4 — Tier thresholds are correct | `computeTier` uses TIER_THRESHOLDS table |
| 7.5 — Points only ever increase | `applyAward` ignores points ≤ 0 |
| 9.1 — Streak tracks consecutive days | `applyStreakIncrement` checks consecutive calendar days |
| 9.2 — Streak resets on gap | Gap > 1 day starts new run at streak 1 |
| 9.3 — Milestone bonuses awarded once per run | `bonusesAwardedInRun` prevents re-awarding |
| 9.4 — Streak milestones at 3, 7, 30 | `STREAK_MILESTONES` constant defines thresholds |

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MasteryContext                       │  (Task 5 — orchestration layer)
│  Calls engine functions, handles persistence         │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
    ┌──────────▼──────────┐  ┌───────▼────────────┐
    │   mastery-engine.ts  │  │ streak-calculator.ts│   ← Task 3 (this layer)
    │   pointsFor()        │  │ applyStreakIncrement│
    │   applyAward()       │  │ applyStreakReset()  │
    └──────────┬───────────┘  └────────────────────┘
               │
    ┌──────────▼──────────┐
    │  tier-thresholds.ts  │   (Task 1.2 — constants)
    │  computeTier()       │
    │  pointsToNextTier()  │
    └──────────────────────┘
```

### Mastery Engine Workflow

#### Point Calculation (`pointsFor`)

```typescript
type MasteryEvent =
  | { kind: 'match_result_win' }          // → 10 points
  | { kind: 'match_result_survived' }     // → 5 points
  | { kind: 'kill_target_complete' }      // → 15 points
  | { kind: 'challenge_completed'; reward: number }  // → N points
```

The function is a simple switch statement — no branching complexity, no external dependencies.

#### Award Application (`applyAward`)

```
Input: OperatorMastery state + points (number)
Output: { next: OperatorMastery, tierCrossed: MasteryTier | null }
```

**Algorithm:**
1. If `points ≤ 0`, return state unchanged with `tierCrossed: null`
2. Compute `previousTier = computeTier(state.masteryPoints)`
3. Compute `newPoints = state.masteryPoints + points`
4. Compute `newTier = computeTier(newPoints)`
5. Create new state with updated `masteryPoints` and `currentTier`
6. If `newTier !== previousTier`, set `tierCrossed = newTier`

**Immutability:** The original state is never mutated. A new object is always returned via spread.

#### Tier Thresholds

| Tier | Floor | Ceiling | Points to Next |
|------|-------|---------|----------------|
| Bronze | 0 | 100 | 100 |
| Silver | 100 | 300 | 200 |
| Gold | 300 | 600 | 300 |
| Platinum | 600 | 1000 | 400 |
| Diamond | 1000 | ∞ | — |

The tier system uses half-open intervals `[floor, ceiling)`. Diamond is the terminal tier with no ceiling.

### Streak Calculator Workflow

#### Streak Increment (`applyStreakIncrement`)

```
Input: MasteryStreakState + today (Date)
Output: StreakDelta { next: MasteryStreakState, bonusEarned: {...} | null }
```

**Algorithm:**
1. Convert `today` to ISO date string (YYYY-MM-DD)
2. **Same-day check:** If `lastCompletedDate === today` → return state unchanged (no-op)
3. **Consecutive check:** If `lastCompletedDate` is exactly yesterday:
   - Increment `currentStreak` by 1
   - Keep same `runId` and `bonusesAwardedInRun`
4. **Gap detected:** Otherwise (gap > 1 day or first completion):
   - Reset `currentStreak` to 1
   - Generate new `runId`
   - Clear `bonusesAwardedInRun`
5. Update `longestStreak = max(longestStreak, newStreak)`
6. **Milestone check:** If `newStreak ∈ {3, 7, 30}` AND milestone not in `bonusesAwardedInRun`:
   - Set `bonusEarned = { length, xp }`
   - Add milestone to `bonusesAwardedInRun`
7. Return new state and bonus info

#### Streak Reset (`applyStreakReset`)

Called when a daily challenge slot expires without the user completing it:
- Sets `currentStreak` to 0
- Generates new `runId`
- Clears `bonusesAwardedInRun`
- Preserves `longestStreak` and `lastCompletedDate`

#### Idempotency via `run_id`

The `run_id` pattern solves a critical sync problem: when events are replayed during offline-to-online sync, milestone bonuses must not be re-awarded. Each consecutive streak "run" gets a unique UUID. Bonuses are tracked per-run in `bonusesAwardedInRun`. If a sync replay hits the same milestone in the same run, the bonus is skipped.

When the streak breaks (gap > 1 day) or is explicitly reset, a new `run_id` is generated and `bonusesAwardedInRun` is cleared — allowing the user to earn milestones again in their next streak.

---

## How to Test It

### Automated Tests

#### Run All Mastery Tests

```bash
npx vitest run app/lib/mastery
```

This runs all 126 tests across 8 test files (unit + property tests).

#### Run Only Mastery Engine Tests

```bash
# Unit tests
npx vitest run app/lib/mastery/__tests__/mastery-engine.test.ts

# Property tests (Properties 10, 11, 13)
npx vitest run app/lib/mastery/__tests__/mastery-engine.property.test.ts
```

#### Run Only Streak Calculator Tests

```bash
# Unit tests
npx vitest run app/lib/mastery/__tests__/streak-calculator.test.ts

# Property tests (Property 14)
npx vitest run app/lib/mastery/__tests__/streak-calculator.property.test.ts
```

### Unit Test Coverage

#### mastery-engine.test.ts (23 tests)

| Test Group | Cases |
|------------|-------|
| `pointsFor` | win→10, survived→5, kill_target→15, challenge→reward, challenge→0 |
| `applyAward` | adds points, tier crossing detection, no crossing, zero points, negative points, multi-tier jump (Bronze→Gold), Diamond crossing, preserves userId/operatorId, immutability |
| `computeTier` | Bronze(0), Silver(100), Gold(300), Platinum(600), Diamond(1000) |
| `pointsToNextTier` | 0→100, 50→50, 100→200, 1000→0 |

#### streak-calculator.test.ts (16 tests)

| Test Group | Cases |
|------------|-------|
| `applyStreakIncrement` | new streak at 1, consecutive day increment, gap resets to 1, same-day no-op, milestone 3 (50 XP), milestone 7 (150 XP), milestone 30 (750 XP), idempotent bonus (already awarded), longestStreak update, userId preservation |
| `applyStreakReset` | resets currentStreak, preserves longestStreak, new runId, clears bonuses, preserves lastCompletedDate, preserves userId |

### Property Test Coverage

#### Property 10: Mastery_Points Trace Sum (4 tests, 200 runs each)

Validates that for any random sequence of mastery events, the final `masteryPoints` equals the arithmetic sum of `pointsFor(event)` for each event. Also validates commutativity (order independence) and that zero-point events are no-ops.

#### Property 11: Mastery_Points Monotonicity (3 tests, 200 runs each)

Validates that mastery points never decrease across any trace. Also validates that duplicate events (sync replays) with idempotent tracking don't inflate the total beyond unique awards, and that negative/zero awards are safely ignored.

#### Property 13: Mastery_Badge Uniqueness (4 tests, 200 runs each)

Validates that at most one badge exists per (user, operator, tier) triple, even after replaying the same trace twice. Also validates cross-operator uniqueness and the maximum of 4 badges per operator (Silver, Gold, Platinum, Diamond).

#### Property 14: Streak Length and Bonus Idempotency (8 tests, 200-300 runs each)

Validates that streak length equals the consecutive-day run ending at the most recent completion, that gaps reset correctly, that same-day completions are no-ops, that bonuses are awarded exactly once per milestone per run, and that after a reset, milestones can be re-earned in a new run.

### Manual Testing

Since these are pure logic modules with no UI, manual testing is done through the MasteryContext layer (Task 5) and the dashboard UI (Task 7). However, you can verify the logic in isolation:

```typescript
import { pointsFor, applyAward } from '@/app/lib/mastery/mastery-engine';
import { applyStreakIncrement, applyStreakReset } from '@/app/lib/mastery/streak-calculator';

// Test mastery points
const event = { kind: 'match_result_win' as const };
console.log(pointsFor(event)); // 10

const state = { userId: 'u1', operatorId: 'ash', masteryPoints: 95, currentTier: 'Bronze' as const };
const { next, tierCrossed } = applyAward(state, pointsFor(event));
console.log(next.masteryPoints); // 105
console.log(next.currentTier);  // 'Silver'
console.log(tierCrossed);       // 'Silver'

// Test streak
const streakState = {
  userId: 'u1', currentStreak: 2, longestStreak: 2,
  lastCompletedDate: '2024-06-14', runId: 'run-1', bonusesAwardedInRun: []
};
const result = applyStreakIncrement(streakState, new Date(2024, 5, 15));
console.log(result.next.currentStreak); // 3
console.log(result.bonusEarned);        // { length: 3, xp: 50 }
```

### Edge Cases to Verify

| Scenario | Expected Behavior |
|----------|-------------------|
| `applyAward` with 0 points | State unchanged, no tier crossing |
| `applyAward` with negative points | State unchanged, no tier crossing |
| `applyAward` jumping multiple tiers (0 → 350) | Reports highest tier crossed (Gold) |
| `applyStreakIncrement` called twice same day | Second call is no-op (returns same reference) |
| `applyStreakIncrement` after 2-day gap | Resets to streak 1, new run_id |
| Milestone already awarded in same run | No bonus returned, bonusesAwardedInRun unchanged |
| `applyStreakReset` then rebuild to milestone | Milestone re-awarded in new run |

---

## Scenarios and Practical Examples

### Scenario 1: Player Wins a Match with Ash

```typescript
// Player reports a win after deploying Ash
const event: MasteryEvent = { kind: 'match_result_win' };
const points = pointsFor(event); // 10

// Ash's current state: 95 points, Bronze tier
const ashState: OperatorMastery = {
  userId: 'player-1',
  operatorId: 'ash',
  masteryPoints: 95,
  currentTier: 'Bronze'
};

const { next, tierCrossed } = applyAward(ashState, points);
// next.masteryPoints = 105
// next.currentTier = 'Silver'
// tierCrossed = 'Silver' → triggers badge creation + toast notification
```

**What happens next (in MasteryContext):**
1. A `MasteryBadge` is inserted: `{ userId: 'player-1', operatorId: 'ash', tier: 'Silver' }`
2. A toast notification shows: "Ash reached Silver tier!"
3. The badge is persisted via SyncQueue

### Scenario 2: Challenge Completion Awards Mastery Points to Multiple Operators

```typescript
// Player completes a "Win 3 rounds" challenge with operator pool [ash, thermite]
const event: MasteryEvent = { kind: 'challenge_completed', reward: 20 };
const points = pointsFor(event); // 20

// Award to each contributing operator
for (const operatorId of ['ash', 'thermite']) {
  const state = getOperatorMastery(userId, operatorId);
  const { next, tierCrossed } = applyAward(state, points);
  saveOperatorMastery(next);
  if (tierCrossed) createBadge(userId, operatorId, tierCrossed);
}
```

### Scenario 3: Daily Challenge Streak Building Over a Week

```typescript
// Day 1 (Monday): Player completes daily challenge
let state: MasteryStreakState = {
  userId: 'player-1', currentStreak: 0, longestStreak: 0,
  lastCompletedDate: null, runId: 'initial', bonusesAwardedInRun: []
};

const monday = new Date(2024, 5, 10);
let result = applyStreakIncrement(state, monday);
state = result.next;
// currentStreak: 1, bonusEarned: null

// Day 2 (Tuesday)
result = applyStreakIncrement(state, new Date(2024, 5, 11));
state = result.next;
// currentStreak: 2, bonusEarned: null

// Day 3 (Wednesday) — MILESTONE!
result = applyStreakIncrement(state, new Date(2024, 5, 12));
state = result.next;
// currentStreak: 3, bonusEarned: { length: 3, xp: 50 }
// → MasteryContext calls awardXP(50, 'mastery_streak_bonus')

// Day 4 (Thursday)
result = applyStreakIncrement(state, new Date(2024, 5, 13));
state = result.next;
// currentStreak: 4, bonusEarned: null

// Day 5 (Friday) — Player forgets to play!
// Day 6 (Saturday) — Player comes back
result = applyStreakIncrement(state, new Date(2024, 5, 15)); // gap of 2 days
state = result.next;
// currentStreak: 1 (RESET!), new runId, bonusesAwardedInRun: []
// longestStreak: 4 (preserved from the previous run)
```

### Scenario 4: Sync Replay Doesn't Double-Award Bonuses

```typescript
// Player earned 3-day bonus in run "run-abc"
const state: MasteryStreakState = {
  userId: 'player-1', currentStreak: 3, longestStreak: 3,
  lastCompletedDate: '2024-06-12', runId: 'run-abc',
  bonusesAwardedInRun: [3] // already awarded
};

// Sync replay tries to re-apply the same day's completion
const result = applyStreakIncrement(state, new Date(2024, 5, 12));
// Same day → no-op, returns same state reference
// bonusEarned: null (not re-awarded)
```

### Scenario 5: Multi-Tier Jump from a Large Challenge Reward

```typescript
// A high-value challenge awards 400 mastery points
const event: MasteryEvent = { kind: 'challenge_completed', reward: 400 };
const points = pointsFor(event); // 400

// Operator starts at 0 points (Bronze)
const state: OperatorMastery = {
  userId: 'player-1', operatorId: 'sledge',
  masteryPoints: 0, currentTier: 'Bronze'
};

const { next, tierCrossed } = applyAward(state, points);
// next.masteryPoints = 400
// next.currentTier = 'Gold' (skipped Silver entirely)
// tierCrossed = 'Gold' (reports the FINAL tier, not intermediate ones)
```

**Note:** In this case, only one badge is created (Gold). The Silver badge is NOT created because `applyAward` reports only the final tier crossed. The MasteryContext layer handles this by checking if intermediate tiers were skipped and creating badges for each.

### Scenario 6: Streak Reset When Daily Slot Expires

```typescript
// Player had a 5-day streak but didn't complete today's challenge
const state: MasteryStreakState = {
  userId: 'player-1', currentStreak: 5, longestStreak: 12,
  lastCompletedDate: '2024-06-14', runId: 'run-xyz',
  bonusesAwardedInRun: [3]
};

// Daily slot refreshes at midnight — MasteryContext calls reset
const resetState = applyStreakReset(state);
// currentStreak: 0
// longestStreak: 12 (preserved!)
// lastCompletedDate: '2024-06-14' (preserved for reference)
// runId: <new UUID> (fresh run)
// bonusesAwardedInRun: [] (cleared — can re-earn milestones in next run)
```

### Scenario 7: Diamond Tier — No Further Progression

```typescript
const state: OperatorMastery = {
  userId: 'player-1', operatorId: 'jager',
  masteryPoints: 1500, currentTier: 'Diamond'
};

// Player wins another match
const { next, tierCrossed } = applyAward(state, 10);
// next.masteryPoints = 1510
// next.currentTier = 'Diamond' (still Diamond)
// tierCrossed = null (no crossing — already at max)

// pointsToNextTier returns 0 for Diamond
import { pointsToNextTier } from '@/app/lib/mastery/mastery-engine';
console.log(pointsToNextTier(1510)); // 0
```

---

## File Summary

| File | Purpose | Lines |
|------|---------|-------|
| `app/lib/mastery/mastery-engine.ts` | Core mastery point logic | ~60 |
| `app/lib/mastery/streak-calculator.ts` | Daily challenge streak tracking | ~120 |
| `app/lib/mastery/tier-thresholds.ts` | Tier constants and computation | ~65 |
| `app/types/mastery.ts` | All TypeScript types | ~100 |
| `app/lib/mastery/__tests__/mastery-engine.test.ts` | Unit tests (23 tests) | ~110 |
| `app/lib/mastery/__tests__/mastery-engine.property.test.ts` | Property tests P10, P11, P13 (11 tests) | ~280 |
| `app/lib/mastery/__tests__/streak-calculator.test.ts` | Unit tests (16 tests) | ~170 |
| `app/lib/mastery/__tests__/streak-calculator.property.test.ts` | Property tests P14 (8 tests) | ~220 |
