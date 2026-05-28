# Tasks 5 & 6: MasteryContext Implementation & Checkpoint

## Table of Contents

1. [What Was Implemented](#what-was-implemented)
2. [Why It Was Implemented](#why-it-was-implemented)
3. [How It Works](#how-it-works)
4. [How to Test It](#how-to-test-it)
5. [Scenarios and Practical Examples](#scenarios-and-practical-examples)

---

## What Was Implemented

### Task 5: MasteryContext (State Orchestration)

The MasteryContext is the single React context that orchestrates the entire Operator Mastery system. It composes the pure-logic engines (Challenge_Engine, Mastery_Engine) with React state management, persistence, and lifecycle hooks.

#### Files Created

| File | Purpose |
|------|---------|
| `app/context/MasteryContext.tsx` | Main context provider — state management, lifecycle hooks, reward pipeline, persistence orchestration |
| `app/lib/mastery/persistence.ts` | Persistence layer — SyncQueue integration, conflict resolution, localStorage fallback |
| `app/context/__tests__/challenge-completion-idempotency.property.test.ts` | Property 8: Challenge completion idempotency |
| `app/context/__tests__/mastery-completion-pipeline.test.ts` | Unit tests for the reward pipeline |
| `app/lib/mastery/__tests__/mission-active-count.property.test.ts` | Property 9: Mission active count invariant |
| `app/lib/mastery/__tests__/match-result-sync.property.test.ts` | Properties 15, 16, 17: Match result window & sync conflict resolution |
| `app/lib/mastery/__tests__/guest-mode.property.test.ts` | Properties 18, 19, 20: Guest mode behavior |
| `app/lib/mastery/__tests__/persistence.test.ts` | Unit tests for persistence layer |

#### Features Delivered

- **5.1** — MasteryContext provider with full state management (challenges, mastery, badges, streak)
- **5.2** — Deployment acceptance handler, match result reporting with 10-minute mutability window, kill increment/revert handler
- **5.3** — Challenge completion detection, idempotent reward pipeline (XP + mastery points + badges + streak bonuses)
- **5.4** — Operator mission management (activate up to 3, discard, re-activate)
- **5.5** — Persistence layer with max-merge for monotonic counters, latest-timestamp for match results, localStorage guest fallback
- **5.6** — Property tests for challenge completion idempotency (Property 8)
- **5.7** — Property tests for mission active count invariant (Property 9)
- **5.8** — Property tests for match result window and sync conflict resolution (Properties 15, 16, 17)
- **5.9** — Property tests for guest mode (Properties 18, 19, 20)

### Task 6: Checkpoint

All property tests and unit tests pass for the implemented features.

---

## Why It Was Implemented

### Business Logic & Purpose

The MasteryContext is the **orchestration layer** that connects the pure-logic engines to the React UI and the persistence backend. Without it, the Challenge_Engine and Mastery_Engine are just standalone functions with no way to:

1. **React to gameplay events** — When a player accepts a deployment, reports a match result, or gets a kill, the system needs to evaluate all active challenges, update progress, detect completions, and award rewards.

2. **Maintain state across the session** — Active challenges, operator mastery points, badges, and streak state need to live in memory for fast UI rendering while being persisted to Supabase for cross-device sync.

3. **Enforce invariants** — The system must guarantee that rewards are awarded exactly once (idempotency), that operator missions never exceed 3 active, that match results are immutable after 10 minutes, and that guest users never receive XP or mastery points.

4. **Handle offline/sync scenarios** — The persistence layer implements conflict resolution strategies (max-merge for monotonic counters, latest-timestamp for match results) that ensure data converges correctly across devices.

### Design Decisions

| Decision | Reasoning |
|----------|-----------|
| Single context entry point | UI components only need `useMastery()` — no direct engine imports needed |
| Pure engines + stateful context | Engines are easy to test in isolation; context handles side effects |
| `completedAt IS NULL` precondition | Structural idempotency anchor — sync replays of completions are no-ops |
| Max-merge for counters | Mastery points and challenge progress only ever increase, so `max(local, remote)` is always correct |
| Latest-timestamp for match results | Within the mutability window, the most recent change wins; after the window, results are locked |
| Ref-based match results cache | Avoids re-renders on every match result check while keeping the mutability window accessible |
| Contributors tracking via ref | Maps challenge IDs to sets of operator IDs that contributed progress, used for mastery point distribution on completion |
| Guest mode as a true preview | Single localStorage challenge with progress tracking but zero rewards — demonstrates the system without polluting real data |

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    MasteryContext Provider                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ React State  │  │   Refs       │  │  Persistence     │  │
│  │              │  │              │  │                  │  │
│  │ dailyChall.  │  │ matchResults │  │ SyncQueue        │  │
│  │ weeklyChall. │  │ contributors │  │ localStorage     │  │
│  │ missions[]   │  │ hydratedUser │  │ Supabase fetch   │  │
│  │ mastery{}    │  │ genMissions  │  │                  │  │
│  │ badges[]     │  │              │  │                  │  │
│  │ streak       │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Lifecycle Hooks (exposed to UI)           │   │
│  │                                                        │   │
│  │  onDeploymentAccepted(deployment)                      │   │
│  │  reportMatchResult(deploymentId, result)               │   │
│  │  onKillIncremented(deploymentId, operatorId, delta)    │   │
│  │  activateOperatorMission(challengeId)                  │   │
│  │  discardChallenge(challengeId)                         │   │
│  │  refreshChallenges()                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Internal Pipeline                         │   │
│  │                                                        │   │
│  │  handleChallengeCompletion(challenge)                  │   │
│  │  checkAndCompleteChallenge(challenge)                  │   │
│  │  awardMasteryPointsToOperator(operatorId, points)      │   │
│  │  awardXP(amount, source)                               │   │
│  │  revertMatchResultProgress(deployment, previousResult) │   │
│  │  revertMasteryPoints(deployment, previousResult)       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
│ Challenge   │    │  Mastery     │    │  Streak          │
│ Engine      │    │  Engine      │    │  Calculator      │
│ (pure)      │    │  (pure)      │    │  (pure)          │
└─────────────┘    └──────────────┘    └──────────────────┘
```

### Hydration Flow

When the app loads, MasteryContext hydrates state based on authentication status:

**Authenticated User:**
1. Read local cache from localStorage (fast UI render)
2. Fetch from Supabase in parallel (challenges, mastery, badges, streak)
3. Override local cache with cloud data (source of truth)
4. Check if challenges need refreshing (slot boundaries)
5. Generate new daily/weekly challenges if needed

**Guest User:**
1. Read single example challenge from localStorage
2. If expired or missing, generate a new preview daily challenge
3. Set all other state to empty/defaults (no mastery, no badges, no streak)

### Deployment Acceptance Flow (`onDeploymentAccepted`)

```
Deployment accepted by Operator_Roller
         │
         ▼
┌─ Guest mode? ─── YES ──→ Update guest challenge progress in localStorage
│                           (only for complete_deployments objective)
│                           Return early — no rewards
│
└─── NO (authenticated)
         │
         ▼
Get all active challenges (daily + weekly + missions)
         │
         ▼
For each active challenge with objective == 'complete_deployments':
    │
    ├─ evaluateEligibility(deployment, challenge)
    │   ├─ Check operator scope (any / random_pool / specific_operator)
    │   ├─ Check role match
    │   └─ Check restriction match
    │
    ├─ If NOT fullyEligible → skip
    │
    ├─ applyDeploymentProgress(deployment, challenge)
    │   └─ Returns challenge with progress + 1 (capped at targetCount)
    │
    ├─ Track operator as contributor to this challenge
    │
    └─ updateChallengeInState(updated)
        │
        └─ checkAndCompleteChallenge(updated)
            │
            ├─ If progress < targetCount → persist progress, update UI
            │
            └─ If progress >= targetCount → handleChallengeCompletion()
                (see Reward Pipeline below)
```

### Match Result Reporting Flow (`reportMatchResult`)

```
User reports match result (win / loss / survived_round)
         │
         ▼
┌─ Guest mode? ─── YES ──→ Return { applied: false, reason: 'persistence_failure' }
│
└─── NO (authenticated)
         │
         ▼
Find deployment in history
         │
         ▼
┌─ Existing result for this deployment?
│
├─── YES ──→ Same result? → Return { applied: false, reason: 'no_change' }
│         │
│         └─ Check 10-minute mutability window
│              │
│              ├─ Outside window → Return { applied: false, reason: 'outside_mutability_window' }
│              │
│              └─ Inside window → REVERT previous result:
│                   ├─ revertMatchResultProgress(deployment, previousResult)
│                   │   └─ Decrement progress for win_rounds/survive_rounds challenges
│                   └─ revertMasteryPoints(deployment, previousResult)
│                       └─ Subtract 10 (win) or 5 (survived) from operator
│
└─── NO (first report)
         │
         ▼
Persist match result to match_results table (SyncQueue)
Persist denormalized match_result on deployments table
         │
         ▼
Evaluate challenge progress for win_rounds / survive_rounds objectives
(same eligibility check + progress application as deployment flow)
         │
         ▼
Award mastery points based on result:
  - win → 10 points to deployment's operator
  - survived_round → 5 points to deployment's operator
  - loss → 0 points (no award)
         │
         ▼
Return { applied: true }
```

### Reward Pipeline (`handleChallengeCompletion`)

This is the core idempotent reward pipeline triggered when a challenge's progress reaches its target_count:

```
handleChallengeCompletion(challenge)
         │
         ▼
┌─ completedAt !== null? ─── YES ──→ Return unchanged (IDEMPOTENCY ANCHOR)
│
└─── NO (first completion)
         │
         ▼
┌─ Guest mode? ─── YES ──→ Set completedAt, return (no rewards)
│
└─── NO (authenticated)
         │
         ▼
Step 1: Set completedAt = NOW()
         │
Step 2: Compute effectiveXpReward
         │   ├─ If valid Administrative_Exception → use xpOverride
         │   └─ Otherwise → use canonical formula (target × multiplier)
         │
Step 3: awardXP(effectiveXpReward, 'challenge_completed')
         │   └─ Enqueues to gamification table via SyncQueue
         │
Step 4: Award mastery_point_reward to all contributing operators
         │   └─ For each operator that contributed progress:
         │       ├─ applyAward(currentState, masteryPointReward)
         │       ├─ Detect tier crossing → unlock badge (UNIQUE constraint)
         │       └─ Persist via SyncQueue
         │
Step 5: If daily challenge → increment mastery streak
         │   ├─ applyStreakIncrement(currentStreak, today)
         │   ├─ If milestone hit (3/7/30) and not already awarded in this run:
         │   │   └─ awardXP(bonusXP, 'mastery_streak_bonus')
         │   └─ Persist streak state via SyncQueue
         │
Step 6: Persist completed challenge via SyncQueue
         │
Step 7: Clean up contributors tracking
         │
         ▼
Return completed challenge (slot now empty until next refresh)
```

### Persistence Layer

The persistence module (`app/lib/mastery/persistence.ts`) provides:

#### Conflict Resolution Strategies

| Strategy | Used For | Logic |
|----------|----------|-------|
| `maxMerge(local, remote)` | `mastery_points`, `challenge_progress` | Returns `Math.max(local, remote)` — safe because these counters only ever increase |
| `latestTimestampMerge(local, remote)` | `match_results` | Returns the row with larger `updatedAt`; on tie, local wins (optimistic-local-first) |

#### SyncQueue Integration

All authenticated writes go through the existing `SyncQueue`:
- `persistChallenge(challenge)` — full challenge upsert
- `persistChallengeProgress(id, userId, progress)` — progress-only update
- `persistOperatorMastery(mastery)` — mastery points + tier
- `persistMasteryBadge(badge)` — insert with UNIQUE constraint (duplicates = success)
- `persistMasteryStreak(streak)` — full streak state upsert
- `persistMatchResult(row)` — match result with latest-timestamp semantics
- `persistDeploymentMatchResult(id, result)` — denormalized column update

#### localStorage Fallback

Guest users and the local cache use localStorage:
- `saveGuestChallenge(challenge)` / `loadGuestChallenge()` — single preview challenge
- `cacheChallenges(challenges)` / `loadCachedChallenges()` — fast hydration cache
- `clearGuestState()` — called on sign-up to discard preview data
- `clearAuthenticatedCache()` — called on logout to prevent stale data

### Mission Management

#### `activateOperatorMission(challengeId)`

1. Check if active mission count < 3 → if not, return `{ activated: false, reason: 'mission_limit_reached' }`
2. Check if mission is already active → if so, return `{ activated: false, reason: 'already_active' }`
3. Look up mission in Supabase (for re-activation of previously discarded missions)
4. Look up mission in generated missions cache (for freshly generated missions)
5. Persist mission to Supabase via SyncQueue
6. Add to active missions state
7. Return `{ activated: true }`

#### `discardChallenge(challengeId)`

1. Find challenge in active state (daily, weekly, or missions)
2. Remove from active state
3. Set `discardedAt` timestamp
4. Persist via SyncQueue
5. No rewards awarded

#### `availableOperatorMissions(operatorId)`

1. Generate up to 3 missions for the operator using `generateOperatorMissions()`
2. Filter out any that are already active
3. Cache generated missions in a ref (so `activateOperatorMission` can find them by ID)
4. Return the available missions

---

## How to Test It

### Automated Tests

#### Running All Mastery Tests

```bash
npx vitest run --reporter=verbose app/context/__tests__/challenge-completion-idempotency.property.test.ts app/context/__tests__/mastery-completion-pipeline.test.ts app/lib/mastery/__tests__/mission-active-count.property.test.ts app/lib/mastery/__tests__/match-result-sync.property.test.ts app/lib/mastery/__tests__/guest-mode.property.test.ts app/lib/mastery/__tests__/persistence.test.ts
```

#### Running Individual Test Suites

```bash
# Property 8: Challenge completion idempotency
npx vitest run app/context/__tests__/challenge-completion-idempotency.property.test.ts

# Property 9: Mission active count invariant
npx vitest run app/lib/mastery/__tests__/mission-active-count.property.test.ts

# Properties 15, 16, 17: Match result window & sync
npx vitest run app/lib/mastery/__tests__/match-result-sync.property.test.ts

# Properties 18, 19, 20: Guest mode
npx vitest run app/lib/mastery/__tests__/guest-mode.property.test.ts

# Persistence layer unit tests
npx vitest run app/lib/mastery/__tests__/persistence.test.ts

# Completion pipeline unit tests
npx vitest run app/context/__tests__/mastery-completion-pipeline.test.ts
```

### Property Test Coverage

| Property | Test File | What It Validates | Runs |
|----------|-----------|-------------------|------|
| **8** | `challenge-completion-idempotency.property.test.ts` | `awardXP` called once, `completedAt` set once, mastery points awarded once — regardless of replay count | 200 |
| **9** | `mission-active-count.property.test.ts` | Active missions ∈ [0, 3], activate succeeds iff count < 3 and not already active | 200 |
| **15** | `match-result-sync.property.test.ts` | Final state reflects only last in-window result; out-of-window changes rejected | 200 |
| **16** | `match-result-sync.property.test.ts` | `maxMerge(a, b) == Math.max(a, b)` — commutative, associative, idempotent | 500 |
| **17** | `match-result-sync.property.test.ts` | `latestTimestampMerge` returns row with larger `updatedAt`; local wins on tie | 500 |
| **18** | `guest-mode.property.test.ts` | No `syncQueue.enqueue` calls for gamification/mastery tables in guest mode | 200 |
| **19** | `guest-mode.property.test.ts` | `clearGuestState()` removes localStorage key; fresh challenges have progress == 0 | 200 |
| **20** | `guest-mode.property.test.ts` | Non-gameplay events (dashboard open, scroll, reload) produce zero state changes | 200 |

### Unit Test Coverage

| Test File | What It Validates |
|-----------|-------------------|
| `mastery-completion-pipeline.test.ts` | Completion detection, effective XP computation, mastery point awards, tier crossings, streak increments, idempotency precondition |
| `persistence.test.ts` | `maxMerge` / `latestTimestampMerge` examples, SyncQueue enqueue calls, localStorage round-trips, guest mode isolation, cache operations |

### Manual Testing Instructions

#### Testing Challenge Refresh

1. Open the app as an authenticated user
2. Verify a daily challenge appears on the roll surface
3. Wait for the daily slot boundary (midnight local time) or manually clear `xawars_mastery_last_daily_refresh` from localStorage
4. Reload the app — a new daily challenge should generate

#### Testing Deployment Progress

1. Accept a deployment (roll an operator)
2. If the daily challenge has objective `complete_deployments` and the deployment matches the challenge's operator scope, role, and restriction:
   - Progress should increment by 1
   - The challenge banner should update

#### Testing Match Result Reporting

1. Accept a deployment
2. Report a match result (Win / Loss / Survived Round)
3. Verify progress updates for `win_rounds` or `survive_rounds` challenges
4. Within 10 minutes: change the result → verify progress reverts and re-applies
5. After 10 minutes: attempt to change → verify rejection ("result is locked")

#### Testing Mission Management

1. Open the Mastery Dashboard for a specific operator
2. Activate up to 3 operator missions
3. Attempt to activate a 4th → verify "mission limit reached" message
4. Discard one mission → verify it's removed and a new one can be activated
5. Re-activate a previously discarded mission → verify it works

#### Testing Guest Mode

1. Open the app without logging in
2. Verify a single example daily challenge appears with "progress not saved" label
3. Accept deployments → verify progress tracks locally
4. Attempt to access Mastery Dashboard → verify login prompt
5. Sign up → verify guest state is cleared and fresh challenges generate

#### Testing Idempotency

1. Complete a challenge (progress reaches target_count)
2. Check browser console / network tab — `awardXP` should fire exactly once
3. Simulate a sync replay by calling `handleChallengeCompletion` again on the same challenge
4. Verify no additional XP or mastery point awards

---

## Scenarios and Practical Examples

### Scenario 1: Daily Challenge Completion with Streak Bonus

**Setup:** User has a daily challenge "Complete 3 deployments with any operator" (progress: 2/3). Current mastery streak: 2 days.

**Event:** User accepts a 3rd deployment that matches the challenge.

**What happens:**
1. `onDeploymentAccepted(deployment)` is called
2. Challenge is evaluated as eligible (operator scope: any, no role/restriction)
3. Progress increments: 2 → 3 (reaches target_count)
4. `handleChallengeCompletion()` fires:
   - `completedAt` set to current timestamp
   - `awardXP(30, 'challenge_completed')` — 3 × 10 for daily
   - Mastery points (15 = 3 × 5) awarded to the operator used in this deployment
   - Streak increments: 2 → 3 (hits milestone!)
   - `awardXP(50, 'mastery_streak_bonus')` — 3-day streak bonus
5. Daily challenge slot becomes empty until next day

**Total rewards:** 30 XP (challenge) + 50 XP (streak bonus) + 15 mastery points to operator

### Scenario 2: Match Result Change Within Mutability Window

**Setup:** User reported "win" for a deployment 5 minutes ago. An active weekly challenge has objective `win_rounds` with progress 4/10.

**Event:** User changes the result to "loss".

**What happens:**
1. `reportMatchResult(deploymentId, 'loss')` is called
2. Existing result found, elapsed time = 5 min < 10 min (within window)
3. **Revert previous result:**
   - Challenge progress decrements: 4 → 3 (was a win, now it's not)
   - Mastery points for operator decremented by 10 (win award reverted)
4. **Apply new result:**
   - Match result updated to 'loss' in match_results table
   - No challenge progress for 'loss' (only win_rounds/survive_rounds advance)
   - No mastery points for 'loss'
5. Returns `{ applied: true }`

**Net effect:** Progress went from 4 → 3, operator lost 10 mastery points

### Scenario 3: Mission Limit Enforcement

**Setup:** User has 3 active operator missions (Ash, Thermite, Sledge).

**Event:** User tries to activate a 4th mission for Mute.

**What happens:**
1. `activateOperatorMission('mute-mission-id')` is called
2. Active mission count = 3 (at limit)
3. Returns `{ activated: false, reason: 'mission_limit_reached' }`
4. UI shows "Mission limit reached" message

**Recovery:** User discards one mission, then activates the Mute mission successfully.

### Scenario 4: Guest Preview Mode

**Setup:** Unauthenticated visitor opens the app for the first time.

**Event:** Visitor accepts deployments and interacts with the preview challenge.

**What happens:**
1. On load: `hydrateGuestState()` generates a single daily challenge
2. Challenge stored in `localStorage['xawars_mastery_guest_challenge']`
3. On deployment acceptance: progress increments locally
4. **No XP awarded** — `awardXP` guard: `if (!user || isGuest) return`
5. **No mastery points** — same guard prevents all SyncQueue writes
6. **No badges** — no operator_mastery rows exist
7. If visitor tries to access Dashboard → login prompt shown

**On sign-up:**
1. `clearGuestState()` removes the localStorage key
2. Fresh daily + weekly challenges generated with `progress: 0`
3. User starts with a clean slate

### Scenario 5: Sync Conflict Resolution

**Setup:** User plays on Device A and Device B simultaneously. Both devices report different match results for the same deployment.

**Device A:** Reports "win" at 10:00:00 (updatedAt: 10:00:00)
**Device B:** Reports "survived_round" at 10:00:05 (updatedAt: 10:00:05)

**What happens on sync:**
1. `latestTimestampMerge(deviceA_row, deviceB_row)` is called
2. Device B has larger `updatedAt` (10:00:05 > 10:00:00)
3. Device B's result ("survived_round") wins
4. Device A's UI updates to show "survived_round" on next sync

**For mastery points (monotonic counter):**
- Device A has 150 points for operator
- Device B has 155 points for operator
- `maxMerge(150, 155)` → 155 wins
- Both devices converge to 155

### Scenario 6: Kill Increment and Revert

**Setup:** Active mission for Ash with objective `get_kills`, progress 3/5.

**Event sequence:**
1. User increments kill counter for Ash → `onKillIncremented(deploymentId, 'ash', +1)`
2. Progress: 3 → 4
3. User realizes it was a mistake, reverts → `onKillIncremented(deploymentId, 'ash', -1)`
4. Progress: 4 → 3

**What happens:**
- Kill increment: eligibility checked, progress incremented, operator tracked as contributor
- Kill revert: `applyKillIncrement` with delta -1, progress decremented (clamped to 0)
- No completion triggered (progress never reached 5)
- Mastery points for kill_target_complete are NOT awarded (that's a separate event from the existing system)

### Scenario 7: Multi-Tier Jump on Challenge Completion

**Setup:** Operator "Thermite" has 280 mastery points (Silver tier). A weekly challenge completes with `masteryPointReward: 50` (target_count 10 × 5). Thermite contributed to the challenge.

**Event:** Challenge completes.

**What happens:**
1. `awardMasteryPointsToOperator('thermite', 50)` is called
2. `applyAward({ masteryPoints: 280, currentTier: 'Silver' }, 50)`:
   - New points: 280 + 50 = 330
   - New tier: Gold (threshold: 300)
   - `tierCrossed: 'Gold'`
3. Badge unlock check: no existing Gold badge for Thermite
4. New `MasteryBadge` created: `{ operatorId: 'thermite', tier: 'Gold' }`
5. Badge persisted via SyncQueue (UNIQUE constraint prevents duplicates on replay)
6. UI shows badge-unlock toast: "Thermite reached Gold tier!"

### Scenario 8: Idempotent Badge Unlock on Sync Replay

**Setup:** User completed a challenge that triggered a Gold badge for Ash. The SyncQueue replays the same event.

**What happens:**
1. `handleChallengeCompletion(challenge)` is called again
2. `challenge.completedAt !== null` → **returns immediately** (idempotency anchor)
3. No XP awarded, no mastery points awarded, no badge insert attempted
4. Even if the badge insert were attempted, the `UNIQUE (user_id, operator_id, tier)` constraint would reject it with error code 23505, which the SyncQueue treats as success

---

## Key Invariants Enforced

| Invariant | Enforcement Mechanism |
|-----------|----------------------|
| Rewards awarded exactly once per challenge | `completedAt IS NULL` precondition in `handleChallengeCompletion` |
| Active missions ≤ 3 | Count check in `activateOperatorMission` before activation |
| Match results immutable after 10 minutes | Elapsed time check against `reportedAt` in `reportMatchResult` |
| Mastery points monotonically non-decreasing | `maxMerge` conflict resolution; only additive operations in normal flow |
| One badge per (user, operator, tier) | In-memory check + `UNIQUE` constraint in database |
| Guest mode produces no rewards | Early-return guards (`if (!user || isGuest) return`) on all reward paths |
| Streak bonuses awarded once per run | `bonusesAwardedInRun` array checked before awarding; `run_id` resets on streak break |
| XP flows through single pipeline | All XP awards call `awardXP(amount, source)` — no parallel XP store |
