# Task 2.2: Eligibility Classification

## What Was Implemented

A single exported function `evaluateEligibility(deployment, challenge)` was added to `app/lib/mastery/challenge-engine.ts`. It determines whether a given `DeploymentRecord` qualifies toward a given `Challenge` by evaluating three independent sub-checks and combining them into a final verdict.

### Function Signature

```typescript
export function evaluateEligibility(
  deployment: DeploymentRecord,
  challenge: Challenge
): Eligibility;
```

### Return Type

```typescript
interface Eligibility {
  operatorScopeOk: boolean;  // Does the deployment's operator match the challenge's scope?
  roleOk: boolean;           // Does the deployment's role match the challenge's role?
  restrictionOk: boolean;    // Does the deployment satisfy the challenge's restriction?
  fullyEligible: boolean;    // All three above are true
}
```

### Internal Helpers Added

Three private helper functions were introduced to keep the logic modular:

| Helper | Responsibility |
|--------|---------------|
| `checkOperatorScope(deployment, challenge)` | Evaluates operator scope eligibility |
| `checkRole(deployment, challenge)` | Evaluates role eligibility |
| `checkRestriction(deployment, challenge)` | Evaluates restriction eligibility |

All three are also exposed via `_internal` for direct unit testing.

---

## Why It Was Implemented

### Business Logic

When a player accepts a deployment (rolls an operator and confirms), the system needs to determine which of their active challenges that deployment counts toward. Not every deployment should advance every challenge — the challenge's constraints (operator scope, role, restriction) define what qualifies.

This classification is the bridge between "player did something" and "challenge progresses." Without it, challenges would either progress on every deployment (meaningless) or require manual tracking (frustrating).

### Design Reasoning

1. **Pure function** — `evaluateEligibility` takes data in, returns data out. No side effects, no persistence, no async. This makes it trivial to test with property-based testing and ensures the same logic works identically in online, offline, and guest modes.

2. **Three independent sub-checks** — The design spec (Property 6) defines eligibility as the conjunction of three independent conditions. Returning all three individually (not just the final boolean) lets the UI show *why* a deployment didn't count ("operator not in pool", "wrong gadget", etc.) in future iterations.

3. **Exhaustive switch statements** — Each sub-check uses a switch on the relevant enum value with a `default: return false` fallback. This ensures that if a new scope/restriction kind is added later, the function fails closed (ineligible) rather than open.

### Requirements Covered

| Requirement | Summary |
|-------------|---------|
| 3.1 | Evaluate every Active_Challenge against a Deployment and classify as eligible/ineligible |
| 3.2 | Operator scope `any` → always eligible with respect to operator scope |
| 3.3 | Operator scope `random_pool` → eligible only if operatorId is in the pool |
| 3.4 | Operator scope `specific_operator` → eligible only if operatorId equals pool[0] |
| 3.5 | Role check: null role → eligible; otherwise deployment role must match |
| 3.6 | Restriction `gadget_only` → deployment's loadout gadget must equal restriction value |
| 3.7 | Restriction `loadout_limit` → deployment's primary OR secondary must equal restriction value |
| 3.8 | Fully eligible only when all three sub-checks pass simultaneously |

---

## How It Works

### Architecture

```
┌──────────────────────────────────────────────────┐
│           evaluateEligibility(deployment, challenge)           │
└──────────┬──────────────┬──────────────┬─────────┘
           │              │              │
           ▼              ▼              ▼
   checkOperatorScope  checkRole   checkRestriction
           │              │              │
           ▼              ▼              ▼
   ┌───────────┐   ┌──────────┐   ┌─────────────────┐
   │ 'any'     │   │ null     │   │ null            │
   │ → true    │   │ → true   │   │ → true          │
   │           │   │          │   │                 │
   │ 'random_  │   │ match    │   │ 'gadget_only'   │
   │  pool'    │   │ role     │   │ → gadget ==     │
   │ → in pool │   │ exactly  │   │                 │
   │           │   │          │   │ 'loadout_limit' │
   │ 'specific │   └──────────┘   │ → primary OR    │
   │  _operator│                   │   secondary ==  │
   │ → == [0]  │                   │                 │
   └───────────┘                   │ 'playstyle'     │
                                   │ → role ==       │
                                   └─────────────────┘
```

### Decision Logic

#### Operator Scope Check

```
IF challenge.operatorScope === 'any':
    RETURN true

IF challenge.operatorScope === 'random_pool':
    RETURN challenge.operatorPool.includes(deployment.operatorId)

IF challenge.operatorScope === 'specific_operator':
    RETURN challenge.operatorPool.length === 1
       AND challenge.operatorPool[0] === deployment.operatorId
```

The `specific_operator` check validates pool length as a defensive measure — if the pool is somehow empty or malformed, the check fails closed.

#### Role Check

```
IF challenge.role === null:
    RETURN true   (role-agnostic challenge)

RETURN deployment.role === challenge.role
```

Simple string equality. The `role` field on `DeploymentRecord` is optional (`string | undefined`), so a deployment without a role will fail a role-specific challenge (undefined !== "Entry Fragger").

#### Restriction Check

```
IF challenge.restriction === null:
    RETURN true   (no restriction)

SWITCH challenge.restriction.kind:
    'gadget_only':
        RETURN deployment.loadout.gadget === challenge.restriction.value

    'loadout_limit':
        RETURN deployment.loadout.primary === challenge.restriction.value
            OR deployment.loadout.secondary === challenge.restriction.value

    'playstyle':
        RETURN deployment.role === challenge.restriction.value

    default:
        RETURN false
```

Key decisions:
- `gadget_only` checks only the gadget slot, not primaries/secondaries.
- `loadout_limit` checks both primary and secondary — the player can use the required weapon in either slot.
- `playstyle` is effectively a second role check using the restriction value as the required role. This is intentional per the design spec: a playstyle restriction narrows the deployment to a specific role regardless of the challenge's top-level role field.

### Data Flow in Context

```
Player accepts deployment
        │
        ▼
MasteryContext.onDeploymentAccepted(deployment)
        │
        ▼
FOR EACH activeChallenge:
    eligibility = evaluateEligibility(deployment, challenge)
    IF eligibility.fullyEligible AND challenge.objective === 'complete_deployments':
        increment challenge.progress
```

The eligibility function itself doesn't mutate anything — it's the caller's job to act on the result.

---

## How to Test It

### Automated Testing

#### Property Test (Task 2.6 — Property 6)

```typescript
// app/lib/mastery/__tests__/eligibility.property.test.ts
// Feature: operator-mastery-mvp, Property 6: Eligibility classification correctness

import { fc } from '@fast-check/vitest';
import { evaluateEligibility } from '../challenge-engine';

// Property: fullyEligible === (operatorScopeOk && roleOk && restrictionOk)
fc.test(
  'fullyEligible is the conjunction of all three sub-checks',
  deploymentArb,
  challengeArb,
  (deployment, challenge) => {
    const result = evaluateEligibility(deployment, challenge);
    expect(result.fullyEligible).toBe(
      result.operatorScopeOk && result.roleOk && result.restrictionOk
    );
  }
);

// Property: scope 'any' always passes operator check
fc.test(
  'any scope always passes operator check',
  deploymentArb,
  challengeWithScopeArb('any'),
  (deployment, challenge) => {
    const result = evaluateEligibility(deployment, challenge);
    expect(result.operatorScopeOk).toBe(true);
  }
);

// Property: scope 'random_pool' passes iff operatorId in pool
fc.test(
  'random_pool passes iff operator in pool',
  deploymentArb,
  challengeWithScopeArb('random_pool'),
  (deployment, challenge) => {
    const result = evaluateEligibility(deployment, challenge);
    expect(result.operatorScopeOk).toBe(
      challenge.operatorPool.includes(deployment.operatorId)
    );
  }
);

// Property: null role always passes role check
fc.test(
  'null role always passes',
  deploymentArb,
  challengeWithNullRoleArb,
  (deployment, challenge) => {
    const result = evaluateEligibility(deployment, challenge);
    expect(result.roleOk).toBe(true);
  }
);

// Property: null restriction always passes restriction check
fc.test(
  'null restriction always passes',
  deploymentArb,
  challengeWithNullRestrictionArb,
  (deployment, challenge) => {
    const result = evaluateEligibility(deployment, challenge);
    expect(result.restrictionOk).toBe(true);
  }
);
```

#### Unit Tests

```typescript
// app/lib/mastery/__tests__/eligibility.unit.test.ts
import { evaluateEligibility } from '../challenge-engine';
import type { Challenge } from '@/app/types/mastery';
import type { DeploymentRecord } from '@/app/types/database';

function makeDeployment(overrides: Partial<DeploymentRecord> = {}): DeploymentRecord {
  return {
    id: 'deploy-1',
    operatorId: 'ash',
    operatorName: 'Ash',
    operatorSide: 'attacker',
    loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' },
    targetKills: 5,
    role: 'Entry Fragger',
    deployedAt: '2026-05-26T12:00:00Z',
    ...overrides,
  };
}

function makeChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'chal-1',
    userId: 'user-1',
    slot: 'daily',
    role: null,
    objective: 'complete_deployments',
    targetCount: 5,
    restriction: null,
    operatorScope: 'any',
    operatorPool: [],
    xpReward: 50,
    masteryPointReward: 25,
    xpOverride: null,
    xpOverrideReason: null,
    progress: 0,
    generatedAt: '2026-05-26T00:00:00Z',
    expiresAt: '2026-05-26T23:59:59Z',
    completedAt: null,
    discardedAt: null,
    ...overrides,
  };
}

describe('evaluateEligibility', () => {
  describe('operator scope', () => {
    it('any scope: always eligible', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'sledge' }),
        makeChallenge({ operatorScope: 'any', operatorPool: [] })
      );
      expect(result.operatorScopeOk).toBe(true);
    });

    it('random_pool: eligible when operator in pool', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'ash' }),
        makeChallenge({ operatorScope: 'random_pool', operatorPool: ['ash', 'sledge', 'iana'] })
      );
      expect(result.operatorScopeOk).toBe(true);
    });

    it('random_pool: ineligible when operator not in pool', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'thermite' }),
        makeChallenge({ operatorScope: 'random_pool', operatorPool: ['ash', 'sledge'] })
      );
      expect(result.operatorScopeOk).toBe(false);
    });

    it('specific_operator: eligible when operator matches', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'smoke' }),
        makeChallenge({ operatorScope: 'specific_operator', operatorPool: ['smoke'] })
      );
      expect(result.operatorScopeOk).toBe(true);
    });

    it('specific_operator: ineligible when operator differs', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'mute' }),
        makeChallenge({ operatorScope: 'specific_operator', operatorPool: ['smoke'] })
      );
      expect(result.operatorScopeOk).toBe(false);
    });
  });

  describe('role', () => {
    it('null role: always eligible', () => {
      const result = evaluateEligibility(
        makeDeployment({ role: 'Roamer' }),
        makeChallenge({ role: null })
      );
      expect(result.roleOk).toBe(true);
    });

    it('matching role: eligible', () => {
      const result = evaluateEligibility(
        makeDeployment({ role: 'Entry Fragger' }),
        makeChallenge({ role: 'Entry Fragger' })
      );
      expect(result.roleOk).toBe(true);
    });

    it('mismatched role: ineligible', () => {
      const result = evaluateEligibility(
        makeDeployment({ role: 'Support' }),
        makeChallenge({ role: 'Entry Fragger' })
      );
      expect(result.roleOk).toBe(false);
    });

    it('undefined deployment role vs specified challenge role: ineligible', () => {
      const result = evaluateEligibility(
        makeDeployment({ role: undefined }),
        makeChallenge({ role: 'Anchor' })
      );
      expect(result.roleOk).toBe(false);
    });
  });

  describe('restriction', () => {
    it('null restriction: always eligible', () => {
      const result = evaluateEligibility(
        makeDeployment(),
        makeChallenge({ restriction: null })
      );
      expect(result.restrictionOk).toBe(true);
    });

    it('gadget_only: eligible when gadget matches', () => {
      const result = evaluateEligibility(
        makeDeployment({ loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Claymore' } }),
        makeChallenge({ restriction: { kind: 'gadget_only', value: 'Claymore' } })
      );
      expect(result.restrictionOk).toBe(true);
    });

    it('gadget_only: ineligible when gadget differs', () => {
      const result = evaluateEligibility(
        makeDeployment({ loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' } }),
        makeChallenge({ restriction: { kind: 'gadget_only', value: 'Claymore' } })
      );
      expect(result.restrictionOk).toBe(false);
    });

    it('loadout_limit: eligible when primary matches', () => {
      const result = evaluateEligibility(
        makeDeployment({ loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Claymore' } }),
        makeChallenge({ restriction: { kind: 'loadout_limit', value: 'R4-C' } })
      );
      expect(result.restrictionOk).toBe(true);
    });

    it('loadout_limit: eligible when secondary matches', () => {
      const result = evaluateEligibility(
        makeDeployment({ loadout: { primary: 'G36C', secondary: 'M45 MEUSOC', gadget: 'Claymore' } }),
        makeChallenge({ restriction: { kind: 'loadout_limit', value: 'M45 MEUSOC' } })
      );
      expect(result.restrictionOk).toBe(true);
    });

    it('loadout_limit: ineligible when neither matches', () => {
      const result = evaluateEligibility(
        makeDeployment({ loadout: { primary: 'G36C', secondary: '5.7 USG', gadget: 'Claymore' } }),
        makeChallenge({ restriction: { kind: 'loadout_limit', value: 'R4-C' } })
      );
      expect(result.restrictionOk).toBe(false);
    });

    it('playstyle: eligible when deployment role matches restriction value', () => {
      const result = evaluateEligibility(
        makeDeployment({ role: 'Hard Breacher' }),
        makeChallenge({ restriction: { kind: 'playstyle', value: 'Hard Breacher' } })
      );
      expect(result.restrictionOk).toBe(true);
    });

    it('playstyle: ineligible when deployment role differs from restriction value', () => {
      const result = evaluateEligibility(
        makeDeployment({ role: 'Support' }),
        makeChallenge({ restriction: { kind: 'playstyle', value: 'Hard Breacher' } })
      );
      expect(result.restrictionOk).toBe(false);
    });
  });

  describe('fullyEligible', () => {
    it('true when all three checks pass', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'ash', role: 'Entry Fragger', loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' } }),
        makeChallenge({
          operatorScope: 'random_pool',
          operatorPool: ['ash', 'sledge'],
          role: 'Entry Fragger',
          restriction: { kind: 'gadget_only', value: 'Breach Charge' },
        })
      );
      expect(result.fullyEligible).toBe(true);
    });

    it('false when operator scope fails', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'thermite' }),
        makeChallenge({ operatorScope: 'random_pool', operatorPool: ['ash'] })
      );
      expect(result.fullyEligible).toBe(false);
      expect(result.operatorScopeOk).toBe(false);
    });

    it('false when role fails even if other checks pass', () => {
      const result = evaluateEligibility(
        makeDeployment({ operatorId: 'ash', role: 'Support' }),
        makeChallenge({ operatorScope: 'any', role: 'Entry Fragger', restriction: null })
      );
      expect(result.fullyEligible).toBe(false);
      expect(result.operatorScopeOk).toBe(true);
      expect(result.roleOk).toBe(false);
      expect(result.restrictionOk).toBe(true);
    });
  });
});
```

#### Running Tests

```bash
# Run eligibility tests specifically
npx vitest run app/lib/mastery/__tests__/eligibility

# Run all mastery engine tests
npx vitest run app/lib/mastery/__tests__/

# Run with verbose output
npx vitest run --reporter=verbose app/lib/mastery/__tests__/eligibility
```

### Manual Testing

Since `evaluateEligibility` is a pure function with no UI yet, manual testing is done via a script:

```typescript
import { evaluateEligibility } from './app/lib/mastery/challenge-engine';

// Simulate: player rolled Ash as Entry Fragger with R4-C
const deployment = {
  id: 'dep-1',
  operatorId: 'ash',
  operatorName: 'Ash',
  operatorSide: 'attacker' as const,
  loadout: { primary: 'R4-C', secondary: '5.7 USG', gadget: 'Breach Charge' },
  targetKills: 5,
  role: 'Entry Fragger',
  deployedAt: new Date().toISOString(),
};

// Challenge: win 3 rounds with an Entry Fragger using Breach Charge
const challenge = {
  id: 'chal-1', userId: 'u1', slot: 'daily' as const,
  role: 'Entry Fragger', objective: 'win_rounds' as const,
  targetCount: 3, restriction: { kind: 'gadget_only' as const, value: 'Breach Charge' },
  operatorScope: 'random_pool' as const, operatorPool: ['ash', 'sledge', 'iana'],
  xpReward: 30, masteryPointReward: 15,
  xpOverride: null, xpOverrideReason: null,
  progress: 1, generatedAt: '', expiresAt: null, completedAt: null, discardedAt: null,
};

console.log(evaluateEligibility(deployment, challenge));
// Expected: { operatorScopeOk: true, roleOk: true, restrictionOk: true, fullyEligible: true }
```

### Edge Cases to Validate

| Edge Case | Expected Behavior |
|-----------|-------------------|
| Empty `operatorPool` with scope `random_pool` | `operatorScopeOk: false` (includes on empty array is always false) |
| Empty `operatorPool` with scope `specific_operator` | `operatorScopeOk: false` (length !== 1) |
| Deployment with `role: undefined` and challenge with `role: null` | `roleOk: true` (null role = role-agnostic) |
| Deployment with `role: undefined` and challenge with `role: "Anchor"` | `roleOk: false` (undefined !== "Anchor") |
| `playstyle` restriction with deployment `role: undefined` | `restrictionOk: false` (undefined !== restriction value) |
| Challenge with all constraints null/any | `fullyEligible: true` for any deployment |
| Case sensitivity: role "entry fragger" vs "Entry Fragger" | `roleOk: false` (exact string match) |

---

## Scenarios and Practical Examples

### Scenario 1: Daily Challenge — Complete Deployments with Any Operator

**Challenge:**
```
Slot: daily | Objective: complete_deployments | Target: 5
Role: null | Restriction: null | Scope: any | Pool: []
```

**Deployment:** Player rolls Thermite as Hard Breacher with Claymore.

**Evaluation:**
- Operator scope: `any` → **true**
- Role: `null` → **true**
- Restriction: `null` → **true**
- **Fully eligible: true** ✓

Every deployment counts toward this challenge regardless of operator, role, or loadout.

---

### Scenario 2: Weekly Challenge — Win Rounds as Entry Fragger from a Pool

**Challenge:**
```
Slot: weekly | Objective: win_rounds | Target: 15
Role: Entry Fragger | Restriction: null | Scope: random_pool | Pool: [ash, sledge, iana, ram]
```

**Deployment A:** Player rolls Ash as Entry Fragger.
- Operator scope: `ash` in pool → **true**
- Role: "Entry Fragger" === "Entry Fragger" → **true**
- Restriction: null → **true**
- **Fully eligible: true** ✓

**Deployment B:** Player rolls Ash as Support (different role assignment).
- Operator scope: `ash` in pool → **true**
- Role: "Support" !== "Entry Fragger" → **false**
- Restriction: null → **true**
- **Fully eligible: false** ✗ (role mismatch)

**Deployment C:** Player rolls Thermite as Entry Fragger.
- Operator scope: `thermite` NOT in pool → **false**
- Role: "Entry Fragger" === "Entry Fragger" → **true**
- Restriction: null → **true**
- **Fully eligible: false** ✗ (operator not in pool)

---

### Scenario 3: Operator Mission — Get Kills with Smoke Using SMG-11

**Challenge:**
```
Slot: mission | Objective: get_kills | Target: 15
Role: null | Restriction: { kind: loadout_limit, value: SMG-11 }
Scope: specific_operator | Pool: [smoke]
```

**Deployment A:** Player rolls Smoke with SMG-11 as secondary.
- Operator scope: `smoke` === pool[0] → **true**
- Role: null → **true**
- Restriction: "SMG-11" === loadout.secondary → **true**
- **Fully eligible: true** ✓

**Deployment B:** Player rolls Smoke with P226 Mk 25 as secondary.
- Operator scope: `smoke` === pool[0] → **true**
- Role: null → **true**
- Restriction: "P226 Mk 25" !== "SMG-11" AND "FMG-9" !== "SMG-11" → **false**
- **Fully eligible: false** ✗ (wrong weapon)

**Deployment C:** Player rolls Mute (also has SMG-11).
- Operator scope: `mute` !== `smoke` → **false**
- Role: null → **true**
- Restriction: "SMG-11" === loadout.secondary → **true**
- **Fully eligible: false** ✗ (wrong operator for this mission)

---

### Scenario 4: Gadget-Only Restriction

**Challenge:**
```
Slot: daily | Objective: survive_rounds | Target: 3
Role: null | Restriction: { kind: gadget_only, value: Claymore }
Scope: any | Pool: []
```

**Deployment A:** Player rolls Thatcher with Claymore equipped.
- Restriction: loadout.gadget "Claymore" === "Claymore" → **true**
- **Fully eligible: true** ✓

**Deployment B:** Player rolls Thatcher with Breach Charge equipped.
- Restriction: loadout.gadget "Breach Charge" !== "Claymore" → **false**
- **Fully eligible: false** ✗

Note: The gadget check is against the *equipped* gadget in the deployment's loadout, not the operator's available gadgets list. The player must have actually chosen Claymore for that specific deployment.

---

### Scenario 5: Playstyle Restriction (Double Role Check)

**Challenge:**
```
Slot: weekly | Objective: complete_deployments | Target: 10
Role: null | Restriction: { kind: playstyle, value: Anchor }
Scope: any | Pool: []
```

**Deployment A:** Player rolls Smoke as Anchor.
- Role: null → **true** (challenge has no top-level role)
- Restriction (playstyle): deployment.role "Anchor" === "Anchor" → **true**
- **Fully eligible: true** ✓

**Deployment B:** Player rolls Smoke as Area Denial.
- Role: null → **true**
- Restriction (playstyle): deployment.role "Area Denial" !== "Anchor" → **false**
- **Fully eligible: false** ✗

The playstyle restriction effectively acts as a role requirement through the restriction system, allowing a challenge to have both a top-level role AND a playstyle restriction for maximum specificity.

---

### Scenario 6: All Constraints Active (Maximum Specificity)

**Challenge:**
```
Slot: mission | Objective: win_rounds | Target: 5
Role: Hard Breacher | Restriction: { kind: gadget_only, value: Claymore }
Scope: specific_operator | Pool: [thermite]
```

**Deployment:** Player rolls Thermite as Hard Breacher with Claymore.
- Operator scope: `thermite` === pool[0] → **true**
- Role: "Hard Breacher" === "Hard Breacher" → **true**
- Restriction: loadout.gadget "Claymore" === "Claymore" → **true**
- **Fully eligible: true** ✓

This is the most constrained possible challenge — specific operator, specific role, specific gadget. Only one exact deployment configuration qualifies.

---

## File Location

```
app/lib/mastery/challenge-engine.ts (lines ~600–680)
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@/app/types/mastery` | `Challenge`, `Eligibility` interfaces |
| `@/app/types/database` | `DeploymentRecord` interface |

## Exports

| Export | Type | Purpose |
|--------|------|---------|
| `evaluateEligibility` | Function | Main eligibility classification function |
| `_internal.checkOperatorScope` | Function | Operator scope sub-check (testing) |
| `_internal.checkRole` | Function | Role sub-check (testing) |
| `_internal.checkRestriction` | Function | Restriction sub-check (testing) |
