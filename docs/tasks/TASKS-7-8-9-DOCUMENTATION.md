# Tasks 7, 8 & 9: Mastery Dashboard UI, Integration & Final Checkpoint

## Table of Contents

1. [What Was Implemented](#what-was-implemented)
2. [Why It Was Implemented](#why-it-was-implemented)
3. [How It Works](#how-it-works)
4. [How to Test It](#how-to-test-it)
5. [Scenarios and Practical Examples](#scenarios-and-practical-examples)

---

## What Was Implemented

### Task 7: Mastery Dashboard UI Components

Six new UI components and two property test suites were created in `app/components/mastery/`:

| File | Purpose |
|------|---------|
| `ChallengeBanner.tsx` | Expandable banner showing active challenge on the roll surface (slot label, objective, role, restriction, progress/target, time-remaining) |
| `MatchResultControl.tsx` | Three-button radio group (Win / Loss / Survived) with 10-minute mutability window countdown and "Result locked" state |
| `MasteryDashboard.tsx` | Full-page dashboard with three sections: Active Challenges, Operator Mastery grid, Badge Collection |
| `OperatorMasteryDetail.tsx` | Per-operator detail view showing mastery points, tier progress, active/available missions, and unlocked badges |
| `ChallengeDetailModal.tsx` | Modal showing full challenge details (objective, restrictions, operator scope, progress, rewards) with discard confirmation |
| `MasteryToast.tsx` | Non-blocking toast notifications for challenge completion, badge unlock, and streak milestones |
| `index.ts` | Barrel file exporting all components and types |
| `__tests__/ChallengeBanner.test.tsx` | Unit tests for ChallengeBanner (39 tests) |
| `__tests__/MasteryToast.test.tsx` | Unit tests for MasteryToast (17 tests) |
| `__tests__/ChallengeBanner.property.test.tsx` | Property 21: Roll-surface banner render content (8 property tests, 200 runs each) |
| `__tests__/MasteryDashboard.property.test.tsx` | Property 22: Dashboard render content (7 property tests, 50-100 runs each) |

### Task 8: Integration with Existing Components

| Sub-task | Files Modified | What Was Done |
|----------|---------------|---------------|
| 8.1 Provider wiring | `app/layout.tsx` | Added `<MasteryProvider>` between DataProvider and SoundProvider |
| 8.2 Deployment acceptance | `app/page.tsx` | Wired `onDeploymentAccepted()` into `handleAccept`, added ChallengeBanners to roll surface |
| 8.3 Kill tracking | `app/page.tsx` | Wired `onKillIncremented()` into kill increment/decrement handlers |
| 8.4 Match result control | `app/page.tsx` | Rendered `<MatchResultControl>` below the operator card when deployed |
| 8.5 Mastery navigation | `app/page.tsx` | Added "Mastery" tab to view mode switcher, renders `<MasteryDashboard>` |
| 8.6 Guest preview | Already in MasteryContext | Single preview daily challenge for guests, no rewards |
| 8.7 XPSource extension | Already in `types/mastery.ts` | `'challenge_completed'` and `'mastery_streak_bonus'` values |

### Task 9: Final Checkpoint

- All 54 mastery-related tests pass (unit + property tests)
- Zero TypeScript diagnostics on modified files
- Pre-existing failures in `auth/__tests__/LoginPage.property.test.tsx` are unrelated to mastery work

### Additional Fix

| File | Fix |
|------|-----|
| `app/components/OperatorStatsModal.tsx` | Replaced deprecated Tailwind classes: `bg-gradient-to-r` → `bg-linear-to-r` (2×), `flex-shrink-0` → `shrink-0` (5×) |

---

## Why It Was Implemented

### Business Logic & Purpose

The Mastery Dashboard UI is the **player-facing surface** of the Operator Mastery system. Without it, the Challenge_Engine and Mastery_Engine are invisible backend logic. The UI serves three critical purposes:

1. **Engagement loop visibility** — Players need to see their active challenges, progress, and rewards directly on the roll surface to feel motivated to continue playing.

2. **Match result reporting** — The Win/Loss/Survived buttons allow players to report outcomes, which drives challenge progress for `win_rounds` and `survive_rounds` objectives and awards mastery points.

3. **Progression dashboard** — The full Mastery tab gives players a sense of long-term progression through operator tiers, badge collections, and streak tracking.

### Design Decisions

| Decision | Reasoning |
|----------|-----------|
| ChallengeBanner is expandable (collapsed by default) | Minimizes visual clutter on the roll surface while keeping progress visible at a glance |
| MatchResultControl uses radio-group pattern | Only one result can be active per deployment; radio semantics communicate this clearly |
| 10-minute countdown is live (updates every second) | Creates urgency and transparency about the mutability window |
| MasteryDashboard has three distinct sections | Maps directly to the three data domains: challenges, operator mastery, badges |
| Property tests use `cleanup()` between iterations | React Testing Library doesn't auto-cleanup inside `fc.assert` loops |
| Timeouts set to 30s for property tests | 100-200 render iterations with DOM assertions need more than the default 5s |
| MasteryProvider placed between DataProvider and SoundProvider | It depends on AuthContext (for user/guest state) and DataContext (for deployment history) |
| ChallengeBanners rendered above the stats row | Challenges are the first thing players should see when they open the roulette view |

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        app/layout.tsx                             │
│                                                                   │
│  AuthProvider → DataProvider → MasteryProvider → SoundProvider    │
│                                    │                              │
│                                    ▼                              │
│                          MasteryContext                           │
│                    (state + lifecycle hooks)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     app/page.tsx      MasteryDashboard   OperatorMasteryDetail
     (roll surface)    (mastery tab)      (per-operator view)
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
ChallengeBanner  MatchResultControl  MasteryToast
(daily/weekly/   (Win/Loss/Survived) (completion/badge
 mission)                             notifications)
```

### Component Hierarchy

```
page.tsx (HomeContent)
├── ChallengeBanner slot="daily"     ← shows active daily challenge
├── ChallengeBanner slot="weekly"    ← shows active weekly challenge
├── ChallengeBanner slot="mission"   ← shows first active mission
├── StatCounter (Kills)              ← wired to onKillIncremented
├── OperatorDisplay                  ← existing operator card
├── MatchResultControl               ← Win/Loss/Survived buttons
├── Action Buttons                   ← Roll/Pick/Surrender
└── [viewMode === 'mastery']
    └── MasteryDashboard
        ├── StreakDisplay
        ├── ActiveChallengesSection
        │   └── ChallengeCard × N
        ├── OperatorMasterySection
        │   └── OperatorMasteryCard × N (sorted by points desc)
        └── BadgeCollectionSection
            └── BadgeItem × N (grouped by operator)
```

### Data Flow: Deployment → Challenge Progress

```
User clicks "Deploy Operator"
         │
         ▼
handleAccept() in page.tsx
         │
         ├─ addDeployment(record)          ← persists to Supabase
         │
         └─ onDeploymentAccepted(record)   ← MasteryContext
              │
              ▼
         evaluateEligibility() for each active challenge
              │
              ├─ If eligible + objective == 'complete_deployments'
              │   └─ progress += 1
              │       └─ If progress == targetCount → completion pipeline
              │
              └─ ChallengeBanner re-renders with updated progress
```

### Data Flow: Kill Increment → Challenge Progress

```
User clicks "+" on Kills counter
         │
         ├─ setOperatorKills(prev => prev + 1)
         │
         └─ onKillIncremented(deploymentId, operatorId, +1)
              │
              ▼
         evaluateEligibility() for challenges with objective == 'get_kills'
              │
              └─ progress += 1 (capped at targetCount)

User clicks "−" on Kills counter
         │
         ├─ setOperatorKills(prev => max(0, prev - 1))
         │
         └─ onKillIncremented(deploymentId, operatorId, -1)
              │
              └─ progress -= 1 (clamped to 0)
```

### Data Flow: Match Result Reporting

```
User clicks "Win" in MatchResultControl
         │
         ▼
reportMatchResult(deploymentId, 'win')  ← MasteryContext
         │
         ├─ First report?
         │   ├─ Persist match result
         │   ├─ Evaluate win_rounds/survive_rounds challenges
         │   └─ Award mastery points (10 for win, 5 for survived)
         │
         └─ Change within 10-min window?
             ├─ Revert previous result's progress + points
             ├─ Apply new result's progress + points
             └─ Update UI (MatchResultControl shows new selection)

After 10 minutes:
         │
         └─ MatchResultControl shows "Result locked" with Lock icon
            All buttons disabled
```

### ChallengeBanner States

| State | Visual |
|-------|--------|
| Collapsed (default) | Slot badge + objective text + progress fraction + time remaining + chevron |
| Expanded (on click) | Above + full progress bar + role + restriction + operator pool + XP/MP rewards |
| No challenge | Component returns `null` (invisible) |
| Completed (progress == target) | Progress shows green, 100% bar |
| Expired | Time remaining shows "Expired" |

### MatchResultControl States

| State | Visual |
|-------|--------|
| No result reported | Three buttons (Win/Loss/Survived), all unselected |
| Result selected, within window | Selected button highlighted, timer shows "Xm Ys left" |
| Result locked (after 10 min) | Selected button highlighted, "Result locked" with Lock icon, all buttons disabled |
| Error | Red error text below buttons |

### MasteryDashboard Sections

| Section | Data Source | Sort/Group |
|---------|-------------|------------|
| Active Challenges | `dailyChallenge`, `weeklyChallenge`, `activeOperatorMissions` | Daily → Weekly → Missions |
| Operator Mastery | `operatorMastery` record | Sorted by `masteryPoints` descending |
| Badge Collection | `masteryBadges` array | Grouped by `operatorId` (alphabetical), badges sorted by tier order |

### Toast Notification System

The `MasteryToast` system uses a hook-based pattern:

```tsx
const { toasts, showToast, dismissToast } = useMasteryToasts();

// Trigger toasts from MasteryContext on:
showToast({ type: 'challenge_complete', challengeName: '...', xpEarned: 50, masteryPointsEarned: 25 });
showToast({ type: 'badge_unlock', operatorName: 'Ash', tier: 'Gold' });
showToast({ type: 'streak_milestone', streakLength: 7, bonusXp: 150 });
```

- Toasts auto-dismiss after 5 seconds
- Manual dismiss via X button
- ARIA live region for screen reader announcements
- Slide-in/slide-out animations
- Stacks vertically (top-right, fixed position)

---

## How to Test It

### Automated Tests

#### Running All Mastery UI Tests

```bash
npx vitest run app/components/mastery/__tests__/ --reporter=verbose
```

#### Running Individual Test Suites

```bash
# Unit tests: ChallengeBanner (22 tests)
npx vitest run app/components/mastery/__tests__/ChallengeBanner.test.tsx

# Unit tests: MasteryToast (17 tests)
npx vitest run app/components/mastery/__tests__/MasteryToast.test.tsx

# Property 21: ChallengeBanner render content (8 property tests × 200 runs)
npx vitest run app/components/mastery/__tests__/ChallengeBanner.property.test.tsx

# Property 22: MasteryDashboard render content (7 property tests × 50-100 runs)
npx vitest run app/components/mastery/__tests__/MasteryDashboard.property.test.tsx
```

### Property Test Coverage

| Property | Test File | What It Validates | Runs |
|----------|-----------|-------------------|------|
| **21** | `ChallengeBanner.property.test.tsx` | For any valid Challenge, banner renders slot label, objective, role prefix, progress, time-remaining, restriction, and rewards | 100-200 |
| **22** | `MasteryDashboard.property.test.tsx` | Dashboard always renders all three section headings, challenge cards with progress, operator cards sorted by points, badges grouped by operator, empty states, streak display, and points-to-next-tier | 50-100 |

### Unit Test Coverage

| Test File | What It Validates |
|-----------|-------------------|
| `ChallengeBanner.test.tsx` | Rendering for all slots, expand/collapse behavior, restriction/role/operator display, accessibility (aria-expanded, aria-controls, aria-label, progressbar role), edge cases (zero progress, completed, null role, "any" scope) |
| `MasteryToast.test.tsx` | Container rendering, ARIA live region, challenge/badge/streak toast content, multiple toasts, dismiss behavior, auto-dismiss after 5s, accessible dismiss button, hook state management |

### Manual Testing Instructions

#### Testing ChallengeBanners on Roll Surface

1. Open the app as an authenticated user
2. Verify daily and weekly challenge banners appear above the kill/death counters
3. Click a banner to expand — verify role, restriction, operator pool, and rewards are shown
4. Click again to collapse
5. Accept a deployment that matches the daily challenge's criteria
6. Verify the progress counter increments (e.g., "2/5" → "3/5")

#### Testing MatchResultControl

1. Accept a deployment (roll an operator)
2. Below the operator card, verify the Win/Loss/Survived buttons appear
3. Click "Win" — verify it highlights green and shows a countdown timer
4. Click "Loss" within 10 minutes — verify it changes to red (result updated)
5. Wait 10 minutes (or mock time) — verify "Result locked" appears and buttons are disabled

#### Testing Mastery Dashboard Tab

1. Click the "Mastery" tab in the header navigation
2. Verify three sections appear: Active Challenges, Operator Mastery, Badge Collection
3. If no data exists, verify empty states show appropriate messages
4. Deploy several operators and report match results
5. Return to Mastery tab — verify operator mastery cards appear sorted by points
6. Verify streak display shows current streak count

#### Testing Kill Tracking Integration

1. Accept a deployment for an operator
2. If a `get_kills` challenge is active for that operator:
   - Increment kills via the "+" button
   - Verify challenge progress updates
   - Decrement kills via the "−" button
   - Verify challenge progress reverts

#### Testing Guest Preview Mode

1. Open the app without logging in (guest mode)
2. Verify a single daily challenge banner appears
3. Accept deployments — verify progress tracks locally
4. Click the "Mastery" tab — verify the dashboard shows limited data
5. Sign up — verify guest state is cleared and fresh challenges generate

#### Testing Toast Notifications

1. Complete a challenge (reach target_count)
2. Verify a "Challenge Complete" toast appears with XP and MP values
3. Verify it auto-dismisses after ~5 seconds
4. If a tier crossing occurs, verify a "Badge Unlocked" toast appears

---

## Scenarios and Practical Examples

### Scenario 1: Daily Challenge Progress via Deployment

**Setup:** Authenticated user has a daily challenge: "Complete 3 deployments with any operator" (progress: 1/3).

**Action:** User rolls and accepts a deployment.

**What happens:**
1. `handleAccept()` creates a `DeploymentRecord` and calls `addDeployment()`
2. `onDeploymentAccepted(record)` is called on MasteryContext
3. Challenge_Engine evaluates eligibility: operator scope is "any" → eligible
4. Progress increments: 1 → 2
5. ChallengeBanner re-renders showing "2/3"
6. User sees the progress update immediately

**Visual result:** The daily banner shows `2/3` with the progress bar at 66%.

### Scenario 2: Match Result Reporting and Challenge Progress

**Setup:** User has a weekly challenge: "Win 5 rounds" (progress: 3/5). User just accepted a deployment.

**Action:** User clicks "Win" in the MatchResultControl.

**What happens:**
1. `reportMatchResult(deploymentId, 'win')` is called
2. Match result persisted, timer starts (10-minute window)
3. Challenge_Engine evaluates: objective is `win_rounds`, deployment is eligible
4. Progress increments: 3 → 4
5. Mastery points awarded: +10 to the deployed operator
6. MatchResultControl shows "Win" highlighted with "9m 59s left"
7. ChallengeBanner for weekly shows "4/5"

**If user changes mind (within 10 min):**
- Clicks "Loss" → previous win progress reverted (4 → 3), mastery points reverted (-10)
- New result applied: no progress for loss, no mastery points
- Banner shows "3/5" again

### Scenario 3: Kill Tracking with Mastery Integration

**Setup:** User has an active mission: "Get 5 kills with Ash" (progress: 3/5). User is currently deployed as Ash.

**Action:** User clicks "+" on the Kills counter twice.

**What happens:**
1. First click: `onKillIncremented(deploymentId, 'ash', +1)` → progress 3 → 4
2. Second click: `onKillIncremented(deploymentId, 'ash', +1)` → progress 4 → 5
3. Progress reaches targetCount (5) → completion pipeline fires:
   - `completedAt` set
   - XP awarded: `5 × 12 = 60 XP` (mission multiplier)
   - Mastery points awarded to Ash: `masteryPointReward`
   - If Ash crosses a tier threshold → badge unlocked
   - Toast notification: "Challenge Complete — Get Kills — +60 XP, +25 MP"

**If user accidentally over-counted:**
- Clicks "−" → `onKillIncremented(deploymentId, 'ash', -1)`
- But challenge is already completed (completedAt is set) → no revert of rewards (idempotency)

### Scenario 4: Mastery Dashboard with Multiple Operators

**Setup:** User has played 50+ deployments across 8 operators. Three have reached Silver tier, one is Gold.

**Action:** User clicks the "Mastery" tab.

**What they see:**
1. **Streak Display:** "5 day streak" with "2 more days to 7-day bonus"
2. **Active Challenges:**
   - Daily: "Win Rounds" — 2/3 — "4h 30m left"
   - Weekly: "Complete Deployments [Support]" — 8/15 — "3d 12h left"
   - Mission: "Get Kills" — 7/10 (for Thermite)
3. **Operator Mastery** (sorted by points):
   - Ash — Gold — 350 pts — "250 pts to next tier"
   - Thermite — Silver — 220 pts — "80 pts to next tier"
   - Sledge — Silver — 180 pts — "120 pts to next tier"
   - ... (remaining operators)
4. **Badge Collection:**
   - Ash: Bronze, Silver, Gold badges with unlock dates
   - Thermite: Bronze, Silver badges
   - Sledge: Bronze, Silver badges

### Scenario 5: Guest User Experience

**Setup:** Unauthenticated visitor opens the app for the first time.

**What they see:**
1. A single daily ChallengeBanner on the roll surface: "Complete 3 Deployments" — 0/3
2. No weekly banner (guests don't get weekly challenges)
3. No mission banner
4. The "Mastery" tab shows the dashboard with empty states for Operator Mastery and Badges
5. Streak shows "0 day streak"

**When they deploy:**
- Progress increments locally (localStorage)
- No XP or mastery points awarded
- No toasts for completion

**When they sign up:**
- Guest localStorage state is cleared
- Fresh daily + weekly challenges generated with progress 0
- Full mastery system becomes active

### Scenario 6: MatchResultControl Mutability Window Expiry

**Setup:** User reported "Win" 9 minutes ago. Timer shows "1m 0s left".

**Action:** User does nothing for 60 seconds.

**What happens:**
1. Timer counts down: "59s left" → "58s left" → ... → "1s left"
2. At 0: timer clears, UI transitions to locked state
3. "Result locked" text appears with Lock icon
4. All three buttons become disabled (opacity reduced, cursor-not-allowed)
5. The selected "Win" button remains highlighted but unclickable

**If user tries to click "Loss" after lock:**
- Button is disabled, click has no effect
- No API call is made

### Scenario 7: Challenge Detail Modal with Discard

**Setup:** User has a weekly challenge they don't want to complete.

**Action:** User opens the ChallengeDetailModal (from the dashboard) and clicks "Discard Challenge".

**What happens:**
1. Confirmation dialog appears: "Discard this challenge? You will not receive any rewards."
2. User clicks "Confirm Discard"
3. `discardChallenge(challengeId)` is called on MasteryContext
4. Challenge removed from active state, `discardedAt` timestamp set
5. Modal closes
6. Weekly ChallengeBanner disappears from roll surface
7. A new weekly challenge will generate at the next weekly refresh boundary

---

## Files Changed (Git Status)

### Modified Files

| File | Changes |
|------|---------|
| `.kiro/specs/operator-mastery-mvp/tasks.md` | Tasks 7, 8, 9 marked as complete |
| `app/layout.tsx` | Added MasteryProvider to provider tree |
| `app/page.tsx` | Imported mastery components, wired hooks, added banners/tabs/MatchResultControl |
| `app/components/OperatorStatsModal.tsx` | Fixed deprecated Tailwind classes |

### New Files

| File | Purpose |
|------|---------|
| `app/components/mastery/ChallengeBanner.tsx` | Expandable challenge banner component |
| `app/components/mastery/ChallengeDetailModal.tsx` | Full challenge detail modal with discard |
| `app/components/mastery/MasteryDashboard.tsx` | Three-section mastery dashboard |
| `app/components/mastery/MasteryToast.tsx` | Toast notification system |
| `app/components/mastery/MatchResultControl.tsx` | Win/Loss/Survived radio buttons |
| `app/components/mastery/OperatorMasteryDetail.tsx` | Per-operator mastery detail view |
| `app/components/mastery/index.ts` | Barrel exports |
| `app/components/mastery/__tests__/ChallengeBanner.test.tsx` | Unit tests |
| `app/components/mastery/__tests__/ChallengeBanner.property.test.tsx` | Property 21 tests |
| `app/components/mastery/__tests__/MasteryDashboard.property.test.tsx` | Property 22 tests |
| `app/components/mastery/__tests__/MasteryToast.test.tsx` | Toast unit tests |

---

## Key Invariants Enforced by UI

| Invariant | UI Enforcement |
|-----------|----------------|
| Match results immutable after 10 min | MatchResultControl disables all buttons, shows "Result locked" |
| Challenges render only when active | ChallengeBanner returns `null` when no challenge exists for the slot |
| Progress never exceeds target | Progress bar capped at 100%, text shows exact fraction |
| Guest mode shows no rewards | No XP/MP toast notifications, no badge unlocks for guests |
| Operator mastery sorted by points | `Object.values(operatorMastery).sort((a, b) => b.masteryPoints - a.masteryPoints)` |
| Badges grouped by operator | `Record<operatorId, MasteryBadge[]>` with alphabetical operator sort |
| Accessibility compliance | ARIA roles, labels, live regions, keyboard navigation, focus management |
