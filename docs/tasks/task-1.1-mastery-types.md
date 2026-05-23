# Task 1.1 — Create TypeScript Types for the Mastery Module

## Summary

| Field | Value |
|-------|-------|
| **Task ID** | 1.1 |
| **Status** | Completed |
| **File Created** | `app/types/mastery.ts` |
| **Spec** | `.kiro/specs/operator-mastery-mvp` |
| **Requirements** | 15.2 (Integration with existing gamification) |

---

## What Was Implemented

A single TypeScript type-definition file (`app/types/mastery.ts`) that serves as the **canonical type contract** for the entire Operator Mastery MVP module. It exports:

### Scalar / Union Types (6)

| Type | Values | Purpose |
|------|--------|---------|
| `ChallengeSlot` | `'daily' \| 'weekly' \| 'mission'` | Identifies which slot a challenge occupies |
| `Objective` | `'complete_deployments' \| 'win_rounds' \| 'survive_rounds' \| 'get_kills'` | The completion condition of a challenge |
| `RestrictionKind` | `'gadget_only' \| 'playstyle' \| 'loadout_limit'` | Optional constraint narrowing valid deployments |
| `OperatorScope` | `'any' \| 'random_pool' \| 'specific_operator'` | How operators are scoped to a challenge |
| `MasteryTier` | `'Bronze' \| 'Silver' \| 'Gold' \| 'Platinum' \| 'Diamond'` | Per-operator progression tiers |
| `MatchResult` | `'win' \| 'loss' \| 'survived_round'` | User-reported outcome of a deployment |

### Core Data Interfaces (5)

| Interface | Description |
|-----------|-------------|
| `Restriction` | A `{kind, value}` pair representing an optional challenge constraint |
| `Challenge` | The full challenge record with all fields (id, slot, role, objective, target, progress, rewards, timestamps, etc.) |
| `OperatorMastery` | Per-operator mastery state (points + current tier) |
| `MasteryBadge` | A badge unlocked when an operator reaches a new tier |
| `MasteryStreakState` | Tracks consecutive daily challenge completions and bonus awards |

### Persistence / Reporting Interfaces (2)

| Interface | Description |
|-----------|-------------|
| `MatchResultRow` | Database row shape for a reported match result |
| `Eligibility` | Result of evaluating whether a deployment qualifies for a challenge |

### Engine Result Types (4)

| Type | Description |
|------|-------------|
| `MatchResultReportOutcome` | Return value when reporting a match result (success/failure + reason) |
| `ActivateResult` | Return value when activating an operator mission (success/failure + reason) |
| `MasteryEvent` | Discriminated union of events that award mastery points |
| `StreakDelta` | Return value from streak calculation (next state + optional bonus) |

### XPSource Extension (1)

| Type | Description |
|------|-------------|
| `XPSource` | Full union type including existing sources (`deployment`, `kill_target`, `content_idea`, `ranked_win`) plus two new mastery sources (`challenge_completed`, `mastery_streak_bonus`) |

---

## Why It Was Implemented

### Business Logic Rationale

The Operator Mastery MVP introduces a structured progression loop on top of the existing random operator selector. Before any engine logic, context providers, or UI components can be built, the system needs a **shared type contract** that:

1. **Defines the domain vocabulary** — Every developer and every module agrees on what a "Challenge", "MasteryTier", or "MatchResult" means at the type level.
2. **Enforces correctness at compile time** — TypeScript's structural type system catches mismatches between the Challenge_Engine, Mastery_Engine, MasteryContext, and UI components before runtime.
3. **Enables parallel development** — With types defined first, multiple tasks (engine logic, persistence, UI) can proceed in parallel against the same contract.
4. **Satisfies Requirement 15.2** — The existing gamification system's `XPSource` type must be extended with mastery-specific sources so that `awardXP` calls from the mastery flow are properly categorized.

### Architectural Decision: Single File

All mastery types live in one file rather than being scattered across modules because:

- The mastery module is a cohesive domain — types reference each other (e.g., `StreakDelta` contains `MasteryStreakState`, `Challenge` uses `ChallengeSlot`, `Objective`, `Restriction`, `OperatorScope`).
- A single import path (`app/types/mastery`) keeps consumer code clean.
- The file is small enough (~110 lines) that splitting would add indirection without benefit.

---

## How It Works

### Architecture

```
app/types/mastery.ts
    │
    ├── Used by: app/lib/mastery/challenge-engine.ts  (Task 2.x)
    ├── Used by: app/lib/mastery/mastery-engine.ts    (Task 3.x)
    ├── Used by: app/lib/mastery/tier-thresholds.ts   (Task 1.2)
    ├── Used by: app/lib/mastery/xp-invariant.ts      (Task 1.2)
    ├── Used by: app/context/MasteryContext.tsx        (Task 5.x)
    ├── Used by: app/components/mastery/*.tsx          (Task 7.x)
    └── Used by: Existing gamification context         (Task 8.7)
```

### Type Design Decisions

1. **String literal unions over enums** — Consistent with the existing codebase style. String literals serialize naturally to/from JSON and Supabase without transformation.

2. **`null` over `undefined` for optional fields** — Fields like `role`, `restriction`, `expiresAt`, `completedAt`, `discardedAt` use `null` because they map directly to nullable SQL columns. This avoids the `undefined` vs `null` ambiguity when reading from the database.

3. **ISO string timestamps** — All date fields (`generatedAt`, `expiresAt`, `completedAt`, `unlockedAt`, `reportedAt`, `updatedAt`, `lastCompletedDate`) are typed as `string` (ISO 8601) rather than `Date` objects. This matches the JSON serialization format from Supabase and localStorage, avoiding hydration issues.

4. **`bonusesAwardedInRun: Array<3 | 7 | 30>`** — A literal-typed array that can only contain the three valid streak milestone lengths. This makes it impossible to accidentally record an invalid bonus milestone.

5. **Discriminated union for `MasteryEvent`** — The `kind` field acts as a discriminant, enabling exhaustive pattern matching in the mastery engine's `pointsFor()` function.

6. **`XPSource` as a complete union** — Rather than just exporting the two new values, the full union is defined so that any consumer importing from `mastery.ts` gets the complete picture. Task 8.7 will wire this into the existing gamification context.

### Workflow

```
1. Developer imports types:
   import { Challenge, MasteryTier, Eligibility } from '@/types/mastery';

2. Engine functions use types for input/output contracts:
   function evaluateEligibility(deployment, challenge: Challenge): Eligibility

3. Context providers use types for state shape:
   const [dailyChallenge, setDailyChallenge] = useState<Challenge | null>(null);

4. UI components use types for props:
   function ChallengeBanner({ challenge }: { challenge: Challenge }): JSX.Element
```

---

## How to Test It

### Automated Testing

Since this is a pure type-definition file with no runtime logic, testing focuses on **compilation correctness**:

```bash
# Run TypeScript compiler in check mode (no emit)
npx tsc --noEmit
```

Expected result: Zero errors. The file should compile cleanly with the project's existing `tsconfig.json`.

### Manual Verification Checklist

| Check | How to verify |
|-------|---------------|
| All 17 exports present | Open the file and confirm: `ChallengeSlot`, `Objective`, `RestrictionKind`, `OperatorScope`, `MasteryTier`, `MatchResult`, `Restriction`, `Challenge`, `OperatorMastery`, `MasteryBadge`, `MasteryStreakState`, `MatchResultRow`, `Eligibility`, `MatchResultReportOutcome`, `ActivateResult`, `MasteryEvent`, `StreakDelta`, `XPSource` |
| Types match design doc | Compare each interface field against the "TypeScript Types" section in `design.md` |
| No runtime code | File contains only `type` and `interface` declarations — no functions, classes, or values |
| Consistent with SQL schema | Field names in interfaces map to their snake_case equivalents in the Supabase schema (e.g., `targetCount` ↔ `target_count`) |

### Import Test

Create a temporary file to verify imports resolve:

```typescript
// test-imports.ts (temporary, delete after verification)
import type {
  ChallengeSlot,
  Objective,
  RestrictionKind,
  OperatorScope,
  MasteryTier,
  MatchResult,
  Restriction,
  Challenge,
  OperatorMastery,
  MasteryBadge,
  MasteryStreakState,
  MatchResultRow,
  Eligibility,
  MatchResultReportOutcome,
  ActivateResult,
  MasteryEvent,
  StreakDelta,
  XPSource,
} from '@/types/mastery';

// Type-level assertions (compile-time only)
const slot: ChallengeSlot = 'daily';        // ✓
const tier: MasteryTier = 'Diamond';        // ✓
const event: MasteryEvent = { kind: 'match_result_win' }; // ✓
const source: XPSource = 'challenge_completed'; // ✓
```

### Edge Cases to Validate

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Assigning `'invalid'` to `ChallengeSlot` | TypeScript error: not assignable |
| Setting `progress` to a negative number | No type error (runtime validation is in the engine), but the design doc specifies `progress >= 0` |
| `bonusesAwardedInRun` containing `5` | TypeScript error: `5` is not assignable to `3 \| 7 \| 30` |
| `MasteryEvent` without `kind` field | TypeScript error: missing discriminant |
| `MatchResultReportOutcome` with invalid `reason` | TypeScript error: not in the union |

---

## Scenarios and Practical Examples

### Scenario 1: Challenge Engine generates a daily challenge

```typescript
import { Challenge } from '@/types/mastery';

const dailyChallenge: Challenge = {
  id: 'c-uuid-001',
  userId: 'user-uuid-123',
  slot: 'daily',
  role: 'Hard Breacher',
  objective: 'complete_deployments',
  targetCount: 3,
  restriction: { kind: 'gadget_only', value: 'Breach Charge' },
  operatorScope: 'random_pool',
  operatorPool: ['thermite', 'hibana', 'ace'],
  xpReward: 30,              // 3 × 10 (daily multiplier)
  masteryPointReward: 15,    // 3 × 5
  xpOverride: null,
  xpOverrideReason: null,
  progress: 0,
  generatedAt: '2026-05-23T00:00:00Z',
  expiresAt: '2026-05-24T00:00:00Z',
  completedAt: null,
  discardedAt: null,
};
```

### Scenario 2: Evaluating eligibility for a deployment

```typescript
import { Eligibility } from '@/types/mastery';

// Player deployed Thermite (Hard Breacher) with Breach Charge
const eligibility: Eligibility = {
  operatorScopeOk: true,   // 'thermite' is in operatorPool
  roleOk: true,            // deployment role matches 'Hard Breacher'
  restrictionOk: true,     // gadget matches 'Breach Charge'
  fullyEligible: true,     // all three pass
};
```

### Scenario 3: Reporting a match result

```typescript
import { MatchResultReportOutcome } from '@/types/mastery';

// Success case: result applied within 10-minute window
const success: MatchResultReportOutcome = { applied: true };

// Failure case: tried to change after window expired
const locked: MatchResultReportOutcome = {
  applied: false,
  reason: 'outside_mutability_window',
};
```

### Scenario 4: Streak milestone triggers bonus XP

```typescript
import { StreakDelta, MasteryStreakState } from '@/types/mastery';

const previousState: MasteryStreakState = {
  userId: 'user-uuid-123',
  currentStreak: 6,
  longestStreak: 6,
  lastCompletedDate: '2026-05-22',
  runId: 'run-uuid-abc',
  bonusesAwardedInRun: [3],  // already got the 3-day bonus
};

// After completing today's daily challenge (streak becomes 7)
const delta: StreakDelta = {
  next: {
    ...previousState,
    currentStreak: 7,
    longestStreak: 7,
    lastCompletedDate: '2026-05-23',
    bonusesAwardedInRun: [3, 7],  // 7-day bonus now awarded
  },
  bonusEarned: { length: 7, xp: 150 },
};
```

### Scenario 5: Activating an operator mission (limit reached)

```typescript
import { ActivateResult } from '@/types/mastery';

// Player already has 3 active missions
const rejected: ActivateResult = {
  activated: false,
  reason: 'mission_limit_reached',
};

// Player has room for another mission
const accepted: ActivateResult = { activated: true };
```

### Scenario 6: Mastery event discrimination in engine logic

```typescript
import { MasteryEvent } from '@/types/mastery';

function pointsFor(event: MasteryEvent): number {
  switch (event.kind) {
    case 'match_result_win':
      return 10;
    case 'match_result_survived':
      return 5;
    case 'kill_target_complete':
      return 15;
    case 'challenge_completed':
      return event.reward; // only this variant carries a payload
  }
}
```

---

## Dependencies and Next Steps

This task is a **prerequisite** for nearly every subsequent task in the spec:

| Dependent Task | What it imports |
|----------------|-----------------|
| 1.2 (Tier thresholds & XP formula) | `ChallengeSlot`, `MasteryTier` |
| 2.x (Challenge Engine) | `Challenge`, `Eligibility`, `Objective`, `OperatorScope`, `Restriction` |
| 3.x (Mastery Engine) | `OperatorMastery`, `MasteryTier`, `MasteryEvent`, `StreakDelta`, `MasteryStreakState` |
| 5.x (MasteryContext) | All types |
| 7.x (Dashboard UI) | `Challenge`, `OperatorMastery`, `MasteryBadge`, `MatchResult` |
| 8.7 (XPSource wiring) | `XPSource` |
