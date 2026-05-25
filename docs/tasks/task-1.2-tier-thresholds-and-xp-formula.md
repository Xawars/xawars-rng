# Task 1.2 — Tier Thresholds and Canonical XP Formula Constants

## What Was Implemented

Two pure-function modules that form the mathematical foundation of the Operator Mastery system:

### 1. `app/lib/mastery/tier-thresholds.ts`

| Export | Type | Description |
|--------|------|-------------|
| `TierThreshold` | Interface | Shape of a single tier entry (tier name, floor, ceiling, points to next) |
| `TIER_THRESHOLDS` | Readonly array | All 5 tiers with their numeric boundaries |
| `computeTier(points)` | Function | Maps any point value to its `MasteryTier` |
| `pointsToNextTier(points)` | Function | Returns how many more points are needed to reach the next tier |

### 2. `app/lib/mastery/xp-invariant.ts`

| Export | Type | Description |
|--------|------|-------------|
| `CANONICAL_MULTIPLIERS` | Const object | `{ daily: 10, weekly: 15, mission: 12 }` |
| `ChallengeRow` | Type alias | Minimal shape needed for XP validation (Pick from Challenge) |
| `XpValidationOutcome` | Interface | Full result of validating a challenge's XP fields |
| `AdminOverrideRejection` | Union type | All possible rejection reasons for admin overrides |
| `canonicalXpReward(slot, targetCount)` | Function | Computes the single-source-of-truth XP reward |
| `validateXp(challenge)` | Function | Validates a challenge row, detects deviations, returns corrected row |
| `validateAdminOverride(next)` | Function | Validates admin/migration writes to override fields |

---

## Why It Was Implemented

### Business Logic

The Operator Mastery system awards XP and Mastery Points when players complete challenges. Two critical invariants must hold across the entire system:

1. **Tier progression must be deterministic.** Given any number of Mastery Points, the tier is always computable without ambiguity. This ensures the UI, badge-unlock logic, and persistence layer all agree on a player's tier at any moment.

2. **XP rewards must be predictable and auditable.** The Canonical XP Formula (`target_count × slot_multiplier`) is the single source of truth. Any challenge that deviates from this formula (without an explicit admin exception) is auto-corrected on read. This prevents data corruption, migration bugs, or manual DB edits from silently awarding incorrect XP.

### Why Pure Functions?

Both modules are intentionally stateless and side-effect-free:

- They can be unit-tested and property-tested without mocking any infrastructure.
- They can run identically on client and server (important for SSR in Next.js).
- The `MasteryContext` and `MasteryEngine` compose these functions without coupling to persistence.

### Requirements Satisfied

| Requirement | What it mandates |
|-------------|-----------------|
| **7.4** | Compute Mastery_Tier from points using the threshold table |
| **16.1** | Define the Canonical XP Formula |
| **16.2** | Generated challenges always use canonical formula (xp_override null) |
| **16.5** | Auto-correct deviating rows that lack an admin exception |
| **16.6** | Use xp_override as effective XP when it's a valid Administrative_Exception |
| **16.7** | Admin override validation rules (integer range, reason length, no orphans) |
| **16.10** | Orphan fix — clear both fields when exactly one is non-null |

---

## How It Works

### Tier Thresholds Architecture

```
Points:  0 ──────── 100 ──────── 300 ──────── 600 ──────── 1000 ────────→ ∞
Tier:    Bronze      Silver       Gold         Platinum     Diamond
         [0, 100)   [100, 300)   [300, 600)   [600, 1000)  [1000, ∞)
```

#### `computeTier(points)` — Algorithm

1. Clamp input to `max(0, points)` (negative values become 0).
2. Iterate the `TIER_THRESHOLDS` array **from highest to lowest** (Diamond → Bronze).
3. Return the first tier whose `floor ≤ clamped_points`.
4. Fallback: `'Bronze'` (unreachable given clamping, but satisfies TypeScript).

The reverse iteration is an optimization: most lookups in a mature system will be for higher tiers, so checking Diamond first short-circuits early.

#### `pointsToNextTier(points)` — Algorithm

1. Clamp input to `max(0, points)`.
2. Iterate `TIER_THRESHOLDS` **from lowest to highest** (Bronze → Diamond).
3. Find the first tier where `clamped < ceiling` — this is the current tier.
4. If there's a next tier in the array, return `nextTier.floor - clamped`.
5. If already at Diamond (no next tier), return `0`.

### XP Invariant Validator Architecture

The validator enforces a three-state model for every challenge row:

```
┌─────────────────────────────────────────────────────────┐
│                    Challenge Row                          │
├─────────────────────────────────────────────────────────┤
│ xpOverride: null, xpOverrideReason: null                │
│ → Normal challenge. xpReward MUST equal canonical.      │
│   If it doesn't → needsAutoCorrection = true           │
├─────────────────────────────────────────────────────────┤
│ xpOverride: number, xpOverrideReason: string            │
│ → Administrative_Exception. Effective XP = xpOverride.  │
│   xpReward is NOT auto-corrected.                       │
├─────────────────────────────────────────────────────────┤
│ Exactly one of xpOverride/xpOverrideReason is non-null  │
│ → Orphan state. needsOrphanFix = true.                  │
│   Both fields cleared, xpReward set to canonical.       │
└─────────────────────────────────────────────────────────┘
```

#### `validateXp(challenge)` — Decision Flow

```
1. Compute canonical = targetCount × CANONICAL_MULTIPLIERS[slot]
2. Check orphan: hasOverride XOR hasReason?
   → Yes: needsOrphanFix = true, clear both, set xpReward = canonical
3. Check admin exception: both present AND values pass validation?
   → Yes: effectiveXpReward = xpOverride, no correction needed
4. Otherwise: effectiveXpReward = canonical
   → If xpReward ≠ canonical: needsAutoCorrection = true, fix xpReward
5. Return { effectiveXpReward, needsAutoCorrection, needsOrphanFix,
            isAdministrativeException, correctedRow }
```

#### `validateAdminOverride(next)` — Validation Rules

| Condition | Result |
|-----------|--------|
| Both null | `{ ok: true }` — clearing the override is always valid |
| Override present, reason missing | `{ ok: false, reason: 'orphan_override' }` |
| Reason present, override missing | `{ ok: false, reason: 'orphan_reason' }` |
| Override not integer, or < 0, or > 10000 | `{ ok: false, reason: 'override_out_of_range' }` |
| Reason has < 1 non-whitespace char | `{ ok: false, reason: 'reason_too_short' }` |
| Reason has > 500 non-whitespace chars | `{ ok: false, reason: 'reason_too_long' }` |
| Both valid | `{ ok: true }` |

### Key Design Decisions

1. **Orphan fix clears both fields.** When data is in an inconsistent state (one field set, the other null), the safest action is to revert to canonical behavior rather than guessing the admin's intent.

2. **Auto-correction over quarantine.** A challenge with a wrong `xpReward` is silently fixed on read so the player never sees a "stuck" challenge. The `correctedRow` is persisted back to the database.

3. **Non-whitespace counting for reason validation.** A reason like `"   "` (all spaces) is rejected. This prevents meaningless admin overrides while allowing normal prose with spaces.

4. **`ChallengeRow` as a Pick type.** The validator only needs 5 fields from the full `Challenge` interface. Using `Pick` means it works with both full Challenge objects and minimal DB row projections.

---

## How to Test It

### Automated Tests (Property Tests — Task 1.4)

Task 1.4 defines two property tests that validate these modules:

#### Property 1: Canonical XP Formula Invariant

```typescript
// For any challenge without xp_override:
// xp_reward === target_count × multiplier[slot]
fc.assert(
  fc.property(
    fc.constantFrom('daily', 'weekly', 'mission'),
    fc.integer({ min: 1, max: 50 }),
    (slot, targetCount) => {
      const expected = targetCount * CANONICAL_MULTIPLIERS[slot];
      expect(canonicalXpReward(slot, targetCount)).toBe(expected);
    }
  )
);
```

#### Property 12: Mastery Tier Threshold Table

```typescript
// For any non-negative integer points, computeTier returns the correct tier
fc.assert(
  fc.property(
    fc.integer({ min: 0, max: 100000 }),
    (points) => {
      const tier = computeTier(points);
      const threshold = TIER_THRESHOLDS.find(t => t.tier === tier)!;
      expect(points).toBeGreaterThanOrEqual(threshold.floor);
      expect(points).toBeLessThan(threshold.ceiling);
    }
  )
);
```

### Manual Testing Instructions

#### Tier Thresholds

Open a Node/TS REPL or write a quick script:

```typescript
import { computeTier, pointsToNextTier } from '@/app/lib/mastery/tier-thresholds';

// Boundary tests
console.log(computeTier(0));     // → 'Bronze'
console.log(computeTier(99));    // → 'Bronze'
console.log(computeTier(100));   // → 'Silver'
console.log(computeTier(299));   // → 'Silver'
console.log(computeTier(300));   // → 'Gold'
console.log(computeTier(599));   // → 'Gold'
console.log(computeTier(600));   // → 'Platinum'
console.log(computeTier(999));   // → 'Platinum'
console.log(computeTier(1000));  // → 'Diamond'
console.log(computeTier(99999)); // → 'Diamond'

// Points to next
console.log(pointsToNextTier(0));    // → 100 (need 100 to reach Silver)
console.log(pointsToNextTier(50));   // → 50  (need 50 to reach Silver)
console.log(pointsToNextTier(100));  // → 200 (need 200 to reach Gold)
console.log(pointsToNextTier(1000)); // → 0   (already Diamond)
```

#### XP Invariant Validator

```typescript
import { validateXp, validateAdminOverride, canonicalXpReward } from '@/app/lib/mastery/xp-invariant';

// Normal challenge — correct xpReward
const normal = validateXp({
  slot: 'daily', targetCount: 5, xpReward: 50,
  xpOverride: null, xpOverrideReason: null
});
console.log(normal.effectiveXpReward);      // → 50
console.log(normal.needsAutoCorrection);    // → false

// Normal challenge — wrong xpReward (needs correction)
const wrong = validateXp({
  slot: 'daily', targetCount: 5, xpReward: 999,
  xpOverride: null, xpOverrideReason: null
});
console.log(wrong.needsAutoCorrection);     // → true
console.log(wrong.correctedRow.xpReward);   // → 50

// Admin exception — valid
const admin = validateXp({
  slot: 'daily', targetCount: 5, xpReward: 50,
  xpOverride: 200, xpOverrideReason: 'Holiday event bonus'
});
console.log(admin.isAdministrativeException); // → true
console.log(admin.effectiveXpReward);         // → 200

// Orphan — only override set
const orphan = validateXp({
  slot: 'weekly', targetCount: 10, xpReward: 150,
  xpOverride: 300, xpOverrideReason: null
});
console.log(orphan.needsOrphanFix);           // → true
console.log(orphan.correctedRow.xpOverride);  // → null
console.log(orphan.correctedRow.xpReward);    // → 150 (canonical for weekly×10)

// Admin override validation
console.log(validateAdminOverride({ xp_override: 100, xp_override_reason: 'Bug fix' }));
// → { ok: true }

console.log(validateAdminOverride({ xp_override: 100, xp_override_reason: null }));
// → { ok: false, reason: 'orphan_override' }

console.log(validateAdminOverride({ xp_override: -5, xp_override_reason: 'Test' }));
// → { ok: false, reason: 'override_out_of_range' }
```

### Edge Cases to Validate

| Case | Input | Expected |
|------|-------|----------|
| Negative points | `computeTier(-10)` | `'Bronze'` (clamped to 0) |
| Exact boundary | `computeTier(100)` | `'Silver'` (floor-inclusive) |
| Very large points | `computeTier(1_000_000)` | `'Diamond'` |
| Zero target count | `canonicalXpReward('daily', 0)` | `0` |
| Float override | `validateAdminOverride({ xp_override: 3.14, ... })` | Rejected: `'override_out_of_range'` |
| Whitespace-only reason | `validateAdminOverride({ xp_override: 50, xp_override_reason: '   ' })` | Rejected: `'reason_too_short'` |
| 501-char reason | Long string with 501 non-whitespace chars | Rejected: `'reason_too_long'` |
| Both override fields null | `validateAdminOverride({ xp_override: null, xp_override_reason: null })` | `{ ok: true }` |

---

## Scenarios and Practical Examples

### Scenario 1: New Player Earns Their First Tier

A new player starts with 0 Mastery Points on Sledge.

```typescript
computeTier(0)          // → 'Bronze'
pointsToNextTier(0)     // → 100

// After 10 wins (10 points each):
computeTier(100)        // → 'Silver'  ← tier crossing detected!
pointsToNextTier(100)   // → 200
```

The `MasteryEngine.applyAward` function calls `computeTier` before and after adding points. When the tier changes, it triggers a badge unlock.

### Scenario 2: Daily Challenge Completion Awards XP

A player completes a daily challenge with `targetCount: 7`.

```typescript
canonicalXpReward('daily', 7)  // → 70 XP

// The system calls validateXp before awarding:
const result = validateXp({
  slot: 'daily', targetCount: 7, xpReward: 70,
  xpOverride: null, xpOverrideReason: null
});
result.effectiveXpReward       // → 70
result.needsAutoCorrection     // → false
// → awardXP(70, 'challenge_completed') is called
```

### Scenario 3: Database Migration Corrupts a Challenge's XP

An operator accidentally runs a migration that sets `xp_reward = 999` on a weekly challenge with `targetCount: 10`.

```typescript
const corrupted = validateXp({
  slot: 'weekly', targetCount: 10, xpReward: 999,
  xpOverride: null, xpOverrideReason: null
});
corrupted.needsAutoCorrection     // → true
corrupted.effectiveXpReward       // → 150 (canonical: 10 × 15)
corrupted.correctedRow.xpReward   // → 150
// The system persists correctedRow back to the DB, then awards 150 XP
```

The player never sees the corrupted value. The system self-heals on read.

### Scenario 4: Admin Creates a Holiday Event Challenge

An admin wants to award 500 XP for a special event challenge (normally would be 120 for a mission with targetCount 10).

```typescript
// Admin tooling calls validateAdminOverride first:
validateAdminOverride({ xp_override: 500, xp_override_reason: 'Winter 2026 holiday event' });
// → { ok: true }

// The challenge is persisted with xpOverride: 500, xpOverrideReason: '...'
// On completion:
const holiday = validateXp({
  slot: 'mission', targetCount: 10, xpReward: 120,
  xpOverride: 500, xpOverrideReason: 'Winter 2026 holiday event'
});
holiday.isAdministrativeException  // → true
holiday.effectiveXpReward          // → 500 (override takes precedence)
holiday.needsAutoCorrection        // → false
```

### Scenario 5: Orphaned Override Field After Partial Migration

A migration sets `xp_override = 200` but crashes before setting `xp_override_reason`. The row is now orphaned.

```typescript
const orphaned = validateXp({
  slot: 'daily', targetCount: 3, xpReward: 30,
  xpOverride: 200, xpOverrideReason: null  // orphan!
});
orphaned.needsOrphanFix            // → true
orphaned.isAdministrativeException // → false
orphaned.effectiveXpReward         // → 30 (falls back to canonical)
orphaned.correctedRow.xpOverride   // → null (cleared)
orphaned.correctedRow.xpOverrideReason // → null (cleared)
orphaned.correctedRow.xpReward     // → 30 (canonical: 3 × 10)
```

The system clears the orphaned field and reverts to canonical behavior. No incorrect XP is ever awarded.

### Scenario 6: Diamond Player Checking Progress

A veteran player has 1500 Mastery Points on Ash.

```typescript
computeTier(1500)        // → 'Diamond'
pointsToNextTier(1500)   // → 0 (already at max tier)
```

The UI shows "Diamond" with no progress bar toward a next tier.

### Scenario 7: Operator Mission XP Calculation

A player activates an operator mission for Thermite with `targetCount: 4`.

```typescript
canonicalXpReward('mission', 4)  // → 48 XP (4 × 12)
```

The mission multiplier (12) sits between daily (10) and weekly (15) because missions span multiple sessions but are scoped to a single operator.

---

## File Locations

| File | Path |
|------|------|
| Tier thresholds module | `app/lib/mastery/tier-thresholds.ts` |
| XP invariant validator | `app/lib/mastery/xp-invariant.ts` |
| Shared types (dependency) | `app/types/mastery.ts` |
| Spec design document | `.kiro/specs/operator-mastery-mvp/design.md` |
| Task definition | `.kiro/specs/operator-mastery-mvp/tasks.md` (Task 1.2) |

---

## Dependencies

- **Upstream:** `app/types/mastery.ts` (Task 1.1) — provides `MasteryTier`, `ChallengeSlot`, `Challenge`
- **Downstream consumers:**
  - `MasteryEngine` (Task 3.1) — uses `computeTier`, `pointsToNextTier`
  - `ChallengeEngine` (Task 2.1, 2.4) — uses `canonicalXpReward`, `validateXp`
  - `MasteryContext` (Task 5.3) — uses `validateXp` on read, `computeEffectiveXpReward` on completion
  - Property tests (Task 1.4) — validates Properties 1 and 12 against these functions
