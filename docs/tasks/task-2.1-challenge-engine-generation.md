# Task 2.1: Challenge Engine — Generation Functions

## What Was Implemented

The file `app/lib/mastery/challenge-engine.ts` was created as the core generation layer of the Challenge_Engine. It provides three public functions that produce randomized, constraint-validated challenges for the Operator Mastery MVP:

| Function | Purpose |
|----------|---------|
| `generateDaily(userId, today)` | Produces one Daily_Challenge (slot `daily`, target 1–10, expires end of day) |
| `generateWeekly(userId, weekStart)` | Produces one Weekly_Challenge (slot `weekly`, target 5–50, expires 7 days out) |
| `generateOperatorMissions(userId, operatorId)` | Produces up to 3 Operator_Missions for a specific operator (slot `mission`, target 1–50, no expiration) |

Additionally, the module exports a `_internal` namespace that exposes internal helpers for property-based testing (task 2.5).

### Features Added

1. **Randomized challenge parameter selection** — objective, role, restriction kind/value, operator scope, target count, and operator pool are all randomly chosen per attempt.
2. **Constraint-relaxation retry loop** — up to 5 attempts to find a valid operator pool; progressively drops restriction then role.
3. **Gadget restriction validation** — ensures a `gadget_only` restriction value exists in the gadget list of *every* operator in the final pool (set intersection).
4. **Random pool selection** — for `random_pool` scope, selects 1–5 operators from the filtered pool.
5. **Canonical XP formula enforcement** — XP reward is always computed via `canonicalXpReward(slot, targetCount)` from `xp-invariant.ts`.
6. **Override field protection** — generated challenges always have `xpOverride` and `xpOverrideReason` set to `null`, with a final guard that logs and rejects any accidental override (Requirement 16.8).
7. **`GenerationResult` return type** — every public function returns `{ challenge, error }` so callers can distinguish success from exhausted retries.

---

## Why It Was Implemented

### Business Logic

The Operator Mastery MVP wraps the existing random operator selector in a structured progression loop. Without a Challenge_Engine, the operator roll is pure entertainment with no goal. The engine transforms it into a gamified loop:

- **Daily challenges** give players a reason to open the app every day.
- **Weekly challenges** provide longer-horizon goals that span multiple sessions.
- **Operator missions** let players invest in specific operators they care about, accelerating mastery progression on those operators.

### Design Reasoning

The engine is implemented as a set of **pure functions** (no side effects, no persistence) so that:

1. It can be unit-tested and property-tested cheaply without mocking databases.
2. Persistence responsibility stays with `MasteryContext` (task 5), which writes through the existing `SyncQueue`.
3. The same generation logic works for both authenticated users (Supabase) and guest preview (localStorage).

### Requirements Covered

| Requirement | Summary |
|-------------|---------|
| 1.1 | Generate exactly one Daily_Challenge when the daily slot is empty |
| 1.2 | Generate exactly one Weekly_Challenge when the weekly slot is empty |
| 1.3 | Random pool selection (1–5 operators) for `random_pool` scope |
| 1.4 | Gadget restriction must exist in every operator's gadget list |
| 1.5 | XP reward computed from Canonical_XP_Formula |
| 1.6 | Mastery point reward = target_count × 5 |
| 1.7 | Constraint-relaxation retry (up to 5 attempts) |
| 1.8 | Persist all required fields on the generated challenge |
| 16.2 | Generated challenges have xpOverride/xpOverrideReason as null |
| 16.8 | Reject and log if generation flow attempts to set override fields |

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Public API                              │
│  generateDaily() / generateWeekly() / generateOperator… │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              generateChallenge() [internal]              │
│  - Picks random params (objective, role, restriction…)  │
│  - Builds effective operator pool                       │
│  - Applies constraint relaxation if pool is empty       │
│  - Validates gadget restriction against final pool      │
│  - Selects operator pool based on scope                 │
│  - Computes XP and mastery point rewards                │
│  - Assembles Challenge object                           │
│  - Enforces xpOverride = null invariant                 │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   filterByRole   filterByGadget  filterByWeapon
   filterByRestriction            findCommonGadgets
   relaxConstraints               selectOperatorPool
```

### Workflow: Single Challenge Generation

```
1. FOR attempt = 0 to 4 (MAX_RETRIES):
   a. Pick random: objective, targetCount, role (50% chance), operatorScope
   b. Build basePool = operators filtered by role
   c. For specific_operator: basePool = [that operator]
   d. Generate a random restriction from basePool
   e. Build constraints object
   f. Compute effectivePool = operators matching role + restriction
   g. IF effectivePool is empty:
      - relaxConstraints(): drop restriction → drop role
      - IF still empty: continue to next attempt
   h. Validate gadget_only restriction against effectivePool
      - If invalid: find common gadgets or drop restriction
   i. Select operatorPool based on scope:
      - 'any' → []
      - 'random_pool' → shuffle & take 1–5 from effectivePool
      - 'specific_operator' → [operatorId]
   j. For random_pool + gadget_only: re-validate against selected subset
   k. Compute xpReward = canonicalXpReward(slot, targetCount)
   l. Compute masteryPointReward = targetCount × 5
   m. Assemble Challenge with xpOverride = null
   n. Return { challenge, error: null }

2. IF all 5 attempts fail:
   Return { challenge: null, error: "Couldn't roll a new challenge…" }
```

### Constraint-Relaxation Strategy

When the effective operator pool is empty under the chosen constraints, the engine relaxes in order:

| Step | Action | Rationale |
|------|--------|-----------|
| 1 | Try full constraints | Best case — all constraints satisfied |
| 2 | Drop restriction | Restrictions are the most specific constraint |
| 3 | Drop role | Roles are broader; dropping them opens the full catalog |
| 4 | If still empty, retry from scratch with new random params | Different objective/scope may yield a valid pool |

This happens within each of the 5 retry attempts, so the total relaxation budget is generous.

### Gadget Restriction Validation

The design requires (Property 4) that a `gadget_only` restriction value appears in the gadgets list of **every** operator in the pool. The engine enforces this via:

1. `findCommonGadgets(pool)` — computes the set intersection of all operators' gadgets.
2. The restriction value is chosen from this intersection.
3. After operator pool selection (for `random_pool`), the gadget is re-validated against the *selected subset* — if the subset doesn't share the gadget, a new common gadget is found or the restriction is dropped.

### Operator Scope Logic

| Scope | Pool Selection | Pool Size |
|-------|---------------|-----------|
| `any` | Empty array (any operator qualifies at evaluation time) | 0 |
| `random_pool` | Shuffle effective pool, take 1–5 | 1–5 |
| `specific_operator` | Single operator ID | 1 |

For daily/weekly challenges, scope is randomly chosen (~40% `any`, ~60% `random_pool`). For missions, scope is always `specific_operator`.

### XP and Mastery Point Computation

```typescript
xpReward = targetCount × CANONICAL_MULTIPLIERS[slot]
// daily: ×10, weekly: ×15, mission: ×12

masteryPointReward = targetCount × 5
```

These are computed deterministically from the slot and target count. The `xpOverride` field is always null for generated challenges — only admin tooling can set it.

### ID Generation

Uses `crypto.randomUUID()` (Web Crypto API) with a fallback to `Date.now().toString(36) + Math.random().toString(36).slice(2)` for environments where the API is unavailable. This matches the pattern used elsewhere in the project.

---

## How to Test It

### Automated Testing

#### Property Tests (Task 2.5)

The following property tests should be written in `app/lib/mastery/__tests__/challenge-generation.property.test.ts`:

**Property 2: Generated Challenge well-formedness**
```typescript
// For any userId, date, and slot:
// - slot is one of 'daily', 'weekly', 'mission'
// - targetCount is in [1,10] for daily, [5,50] for weekly, [1,50] for mission
// - objective is one of the 4 valid objectives
// - operatorScope is one of the 3 valid scopes
// - masteryPointReward === targetCount × 5
// - xpOverride === null
// - xpOverrideReason === null
// - progress === 0
// - completedAt === null
// - discardedAt === null
```

**Property 3: Random pool sizing and operator validity**
```typescript
// For any generated challenge:
// - If operatorScope === 'random_pool': operatorPool.length in [1, 5]
//   and every id exists in the operator catalog
// - If operatorScope === 'specific_operator': operatorPool.length === 1
//   and the id exists in the operator catalog
// - If operatorScope === 'any': operatorPool.length === 0
```

**Property 4: Gadget restriction respects every operator in the pool**
```typescript
// For any generated challenge with restriction.kind === 'gadget_only':
// - restriction.value appears in the gadgets[] of every operator
//   whose id is in operatorPool (or all operators if scope is 'any')
```

**Property 5: Constraint-relaxation retry produces valid result or error**
```typescript
// For any inputs to generateDaily/generateWeekly/generateOperatorMissions:
// - Result is either { challenge: non-null, error: null }
//   or { challenge: null, error: non-empty string }
// - When challenge is non-null, all structural invariants hold
```

#### Unit Tests

```typescript
// app/lib/mastery/__tests__/challenge-engine.unit.test.ts

describe('generateDaily', () => {
  it('produces a challenge with slot "daily"', () => {
    const { challenge } = generateDaily('user-1', new Date('2026-05-26'));
    expect(challenge?.slot).toBe('daily');
  });

  it('target count is between 1 and 10', () => {
    const { challenge } = generateDaily('user-1', new Date());
    expect(challenge?.targetCount).toBeGreaterThanOrEqual(1);
    expect(challenge?.targetCount).toBeLessThanOrEqual(10);
  });

  it('expires at end of the given day', () => {
    const today = new Date('2026-05-26T10:00:00Z');
    const { challenge } = generateDaily('user-1', today);
    const expires = new Date(challenge!.expiresAt!);
    expect(expires.getDate()).toBe(26);
    expect(expires.getHours()).toBe(23);
    expect(expires.getMinutes()).toBe(59);
  });

  it('xpOverride and xpOverrideReason are always null', () => {
    for (let i = 0; i < 20; i++) {
      const { challenge } = generateDaily('user-1', new Date());
      if (challenge) {
        expect(challenge.xpOverride).toBeNull();
        expect(challenge.xpOverrideReason).toBeNull();
      }
    }
  });
});

describe('generateWeekly', () => {
  it('target count is between 5 and 50', () => {
    const { challenge } = generateWeekly('user-1', new Date());
    expect(challenge?.targetCount).toBeGreaterThanOrEqual(5);
    expect(challenge?.targetCount).toBeLessThanOrEqual(50);
  });

  it('expires 7 days from week start', () => {
    const start = new Date('2026-05-26T00:00:00Z');
    const { challenge } = generateWeekly('user-1', start);
    const expires = new Date(challenge!.expiresAt!);
    expect(expires.getDate()).toBe(2); // June 2
  });
});

describe('generateOperatorMissions', () => {
  it('returns 3 results for a valid operator', () => {
    const results = generateOperatorMissions('user-1', 'ash');
    expect(results.length).toBe(3);
  });

  it('all missions have scope specific_operator with the given operator', () => {
    const results = generateOperatorMissions('user-1', 'sledge');
    for (const { challenge } of results) {
      if (challenge) {
        expect(challenge.operatorScope).toBe('specific_operator');
        expect(challenge.operatorPool).toEqual(['sledge']);
      }
    }
  });

  it('returns error for non-existent operator', () => {
    const results = generateOperatorMissions('user-1', 'nonexistent');
    expect(results[0].error).toContain('not found');
  });

  it('missions have no expiration', () => {
    const results = generateOperatorMissions('user-1', 'ash');
    for (const { challenge } of results) {
      if (challenge) {
        expect(challenge.expiresAt).toBeNull();
      }
    }
  });
});

describe('_internal.findCommonGadgets', () => {
  it('returns intersection of gadgets across operators', () => {
    const ops = [
      { gadgets: ['Claymore', 'Breach Charge', 'Stun Grenade'] },
      { gadgets: ['Claymore', 'Smoke Grenade'] },
      { gadgets: ['Claymore', 'Frag Grenade'] },
    ] as Operator[];
    expect(_internal.findCommonGadgets(ops)).toEqual(['Claymore']);
  });

  it('returns empty array when no common gadgets', () => {
    const ops = [
      { gadgets: ['Claymore'] },
      { gadgets: ['Smoke Grenade'] },
    ] as Operator[];
    expect(_internal.findCommonGadgets(ops)).toEqual([]);
  });
});

describe('_internal.relaxConstraints', () => {
  it('drops restriction first when pool is empty', () => {
    // Create constraints that produce an empty pool
    const constraints = {
      slot: 'daily' as ChallengeSlot,
      role: 'Hard Breacher',
      objective: 'win_rounds' as Objective,
      restriction: { kind: 'gadget_only' as RestrictionKind, value: 'NONEXISTENT_GADGET' },
      operatorScope: 'any' as OperatorScope,
      targetCount: 3,
    };
    const relaxed = _internal.relaxConstraints(constraints);
    // Restriction should be dropped, role may remain if pool is non-empty
    expect(relaxed?.restriction).toBeNull();
  });
});
```

#### Running Tests

```bash
# Run all mastery tests
npx vitest run app/lib/mastery/__tests__/

# Run with coverage
npx vitest run --coverage app/lib/mastery/__tests__/

# Run in watch mode during development
npx vitest app/lib/mastery/__tests__/challenge-generation
```

### Manual Testing

Since the engine is pure (no UI integration yet), manual testing is done via a Node REPL or a temporary script:

```typescript
// test-generation.ts (temporary, run with ts-node or vitest)
import { generateDaily, generateWeekly, generateOperatorMissions } from './app/lib/mastery/challenge-engine';

// Generate a daily challenge
const daily = generateDaily('test-user', new Date());
console.log('Daily:', JSON.stringify(daily, null, 2));

// Generate a weekly challenge
const weekly = generateWeekly('test-user', new Date());
console.log('Weekly:', JSON.stringify(weekly, null, 2));

// Generate missions for Ash
const missions = generateOperatorMissions('test-user', 'ash');
console.log('Ash Missions:', JSON.stringify(missions, null, 2));

// Test with non-existent operator
const invalid = generateOperatorMissions('test-user', 'fake-op');
console.log('Invalid:', JSON.stringify(invalid, null, 2));
```

### Validation Checklist

| Check | How to Verify |
|-------|---------------|
| Daily target count in [1, 10] | Run generateDaily 100 times, assert range |
| Weekly target count in [5, 50] | Run generateWeekly 100 times, assert range |
| Mission target count in [1, 50] | Run generateOperatorMissions, assert range |
| XP reward matches canonical formula | `challenge.xpReward === challenge.targetCount × multiplier[slot]` |
| Mastery point reward = target × 5 | `challenge.masteryPointReward === challenge.targetCount × 5` |
| xpOverride always null | Assert across all generated challenges |
| xpOverrideReason always null | Assert across all generated challenges |
| Gadget restriction valid for all pool operators | For each operator in pool, check gadgets includes restriction.value |
| Random pool size in [1, 5] | Assert operatorPool.length when scope is random_pool |
| All pool operator IDs exist in catalog | Look up each ID in the operators array |
| Missions always have specific_operator scope | Assert operatorScope and pool length 1 |
| Missions have no expiration | Assert expiresAt is null |
| Error returned when all retries fail | Mock operators to empty array, verify error message |

---

## Scenarios and Practical Examples

### Scenario 1: Typical Daily Challenge Generation

**Input:**
```typescript
generateDaily('user-abc', new Date('2026-05-26T14:30:00'))
```

**Possible Output:**
```json
{
  "challenge": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "user-abc",
    "slot": "daily",
    "role": "Entry Fragger",
    "objective": "win_rounds",
    "targetCount": 4,
    "restriction": {
      "kind": "gadget_only",
      "value": "Stun Grenade"
    },
    "operatorScope": "random_pool",
    "operatorPool": ["ash", "sledge", "iana"],
    "xpReward": 40,
    "masteryPointReward": 20,
    "xpOverride": null,
    "xpOverrideReason": null,
    "progress": 0,
    "generatedAt": "2026-05-26T14:30:00.000Z",
    "expiresAt": "2026-05-26T23:59:59.999Z",
    "completedAt": null,
    "discardedAt": null
  },
  "error": null
}
```

**Interpretation:** The player must win 4 rounds using one of Ash, Sledge, or Iana in the Entry Fragger role while equipping a Stun Grenade. The challenge expires at end of day. Completing it awards 40 XP and 20 mastery points.

### Scenario 2: Weekly Challenge with No Restriction

**Input:**
```typescript
generateWeekly('user-xyz', new Date('2026-05-26T00:00:00'))
```

**Possible Output:**
```json
{
  "challenge": {
    "id": "...",
    "userId": "user-xyz",
    "slot": "weekly",
    "role": null,
    "objective": "complete_deployments",
    "targetCount": 20,
    "restriction": null,
    "operatorScope": "any",
    "operatorPool": [],
    "xpReward": 300,
    "masteryPointReward": 100,
    "xpOverride": null,
    "xpOverrideReason": null,
    "progress": 0,
    "generatedAt": "2026-05-26T00:00:00.000Z",
    "expiresAt": "2026-06-02T23:59:59.999Z",
    "completedAt": null,
    "discardedAt": null
  },
  "error": null
}
```

**Interpretation:** Complete 20 deployments with any operator, any role, no restriction. Very accessible challenge. Awards 300 XP (20 × 15) and 100 mastery points (20 × 5). Expires in 7 days.

### Scenario 3: Operator Mission for Smoke

**Input:**
```typescript
generateOperatorMissions('user-123', 'smoke')
```

**Possible Output (one of three):**
```json
{
  "challenge": {
    "id": "...",
    "userId": "user-123",
    "slot": "mission",
    "role": null,
    "objective": "get_kills",
    "targetCount": 15,
    "restriction": {
      "kind": "loadout_limit",
      "value": "SMG-11"
    },
    "operatorScope": "specific_operator",
    "operatorPool": ["smoke"],
    "xpReward": 180,
    "masteryPointReward": 75,
    "xpOverride": null,
    "xpOverrideReason": null,
    "progress": 0,
    "generatedAt": "2026-05-26T14:30:00.000Z",
    "expiresAt": null,
    "completedAt": null,
    "discardedAt": null
  },
  "error": null
}
```

**Interpretation:** Get 15 kills with Smoke while using the SMG-11. No expiration — the player can take as long as they want. Awards 180 XP (15 × 12) and 75 mastery points (15 × 5) to Smoke specifically.

### Scenario 4: Constraint Relaxation in Action

**Situation:** The engine randomly picks:
- Role: "Shield" (only Montagne, Blitz, Fuze have this)
- Restriction: `gadget_only` with value "Claymore"
- But none of the Shield operators have "Claymore" in their gadgets

**What happens:**
1. `getEffectivePool("Shield", { kind: "gadget_only", value: "Claymore" })` → empty
2. `relaxConstraints()` is called:
   - Drop restriction → `getEffectivePool("Shield", null)` → [Montagne, Blitz, Fuze] ✓
3. Challenge is generated with role "Shield", no restriction, using the Shield operators

### Scenario 5: All Retries Exhausted (Edge Case)

This is extremely unlikely with the real operator catalog (70+ operators), but could happen if the catalog were artificially restricted:

**Output:**
```json
{
  "challenge": null,
  "error": "Couldn't roll a new challenge — try again in a few minutes."
}
```

The caller (MasteryContext) would surface this as a non-blocking toast and retry on the next app open or slot boundary.

### Scenario 6: Invalid Operator ID for Missions

**Input:**
```typescript
generateOperatorMissions('user-1', 'nonexistent_operator')
```

**Output:**
```json
[{
  "challenge": null,
  "error": "Operator \"nonexistent_operator\" not found in catalog."
}]
```

Returns immediately with a single error result without attempting generation.

### Scenario 7: Gadget Restriction Re-validation After Pool Selection

**Situation:**
1. Effective pool has 10 operators, all sharing "Breach Charge"
2. Restriction is `gadget_only: "Breach Charge"`
3. Random pool selection picks 3 operators: [Op A, Op B, Op C]
4. Op C actually doesn't have "Breach Charge" (edge case from pool filtering order)

**What happens:**
1. Post-selection validation detects Op C lacks the gadget
2. `findCommonGadgets([Op A, Op B, Op C])` is called
3. If a common gadget exists → restriction is updated to that gadget
4. If no common gadget exists → restriction is dropped to null

This double-validation ensures Property 4 holds even after the random subset selection.

---

## File Location

```
app/lib/mastery/challenge-engine.ts
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@/app/data/types` | `Operator` interface |
| `@/app/data/operators` | Full operator catalog array |
| `@/app/types/mastery` | `Challenge`, `ChallengeSlot`, `Objective`, etc. |
| `./xp-invariant` | `canonicalXpReward(slot, targetCount)` |

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `generateDaily` | Function | Generate a daily challenge |
| `generateWeekly` | Function | Generate a weekly challenge |
| `generateOperatorMissions` | Function | Generate up to 3 operator missions |
| `GenerationResult` | Interface | Return type for all generation functions |
| `_internal` | Object | Internal helpers exposed for testing |
