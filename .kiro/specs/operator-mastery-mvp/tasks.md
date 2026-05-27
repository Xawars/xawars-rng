# Implementation Plan: Operator Mastery MVP

## Overview

This plan implements the Operator Mastery MVP as three coordinated layers — Challenge_Engine, Mastery_Engine, and Mastery_Dashboard — on top of the existing auth-persistence-gamification infrastructure. The implementation proceeds bottom-up: types and data models first, then pure engine logic, then the React context that orchestrates them, then UI components, and finally integration wiring with the existing roll/deployment flow.

## Tasks

- [x] 1. Set up types, schema, and core constants
  - [x] 1.1 Create TypeScript types for the mastery module
    - Create `app/types/mastery.ts` with all exported types: `ChallengeSlot`, `Objective`, `RestrictionKind`, `OperatorScope`, `MasteryTier`, `MatchResult`, `Restriction`, `Challenge`, `OperatorMastery`, `MasteryBadge`, `MasteryStreakState`, `MatchResultRow`, `Eligibility`, `MatchResultReportOutcome`, `ActivateResult`, `MasteryEvent`, `StreakDelta`
    - Include the `XPSource` extension type adding `'challenge_completed'` and `'mastery_streak_bonus'`
    - _Requirements: 15.2_

  - [x] 1.2 Create tier thresholds and canonical XP formula constants
    - Create `app/lib/mastery/tier-thresholds.ts` with the `TIER_THRESHOLDS` array and `computeTier(points)` / `pointsToNextTier(points)` pure functions
    - Create `app/lib/mastery/xp-invariant.ts` with `CANONICAL_MULTIPLIERS`, `canonicalXpReward(slot, targetCount)`, `validateXp(challenge)`, and `validateAdminOverride(next)` functions
    - _Requirements: 7.4, 16.1, 16.2, 16.5, 16.6, 16.7, 16.10_

  - [x] 1.3 Create Supabase migration for new tables
    - Create a SQL migration file that creates `challenges`, `operator_mastery`, `mastery_badges`, `mastery_streak`, `match_results` tables with all constraints, indexes, and RLS policies as defined in the design
    - Add the nullable `match_result` column to the existing `deployments` table
    - _Requirements: 12.1, 15.4_

  - [x] 1.4 Write property tests for tier thresholds and XP formula (Properties 1, 12)
    - **Property 1: Canonical XP Formula invariant** — For any Challenge without xp_override, xp_reward equals target_count × multiplier for its slot
    - **Property 12: Mastery_Tier threshold table** — computeTier returns correct tier for any non-negative integer points
    - **Validates: Requirements 7.4, 16.1, 16.2, 16.5, 16.6, 16.7, 16.10**

- [x] 2. Implement Challenge_Engine (pure logic)
  - [x] 2.1 Implement challenge generation functions
    - Create `app/lib/mastery/challenge-engine.ts` with `generateDaily`, `generateWeekly`, `generateOperatorMissions` functions
    - Implement constraint-relaxation retry logic (up to 5 attempts, drop restriction first, then role)
    - Implement random pool selection (1–5 operators) and gadget restriction validation against operator catalog
    - Ensure generated challenges always have xp_override/xp_override_reason as null
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 16.2, 16.8_

  - [x] 2.2 Implement eligibility classification
    - Add `evaluateEligibility(deployment, challenge)` function that checks operator scope, role, and restriction
    - Return an `Eligibility` object with `operatorScopeOk`, `roleOk`, `restrictionOk`, and `fullyEligible` fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 2.3 Implement challenge progress application
    - Add `applyDeploymentProgress`, `applyMatchResultProgress`, `applyKillIncrement` pure functions
    - Enforce progress capped at target_count, never below 0
    - Handle kill-revert (delta -1) for get_kills objective only
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.4 Implement challenge completion detection and effective XP computation
    - Add `isCompleted(challenge)` and `computeEffectiveXpReward(challenge)` functions
    - `computeEffectiveXpReward` uses xp_override when valid Administrative_Exception, otherwise canonical value
    - _Requirements: 5.1, 5.5, 16.6_

  - [x] 2.5 Write property tests for challenge generation (Properties 2, 3, 4, 5)
    - **Property 2: Generated Challenge well-formedness** — slot, target_count ranges, objective, operator_scope, mastery_point_reward, null overrides
    - **Property 3: Random pool sizing and operator validity** — pool size [1,5] for random_pool, 1 for specific_operator, empty for any
    - **Property 4: Gadget restriction respects every operator in the pool** — restriction.value in gadgets of all pool operators
    - **Property 5: Constraint-relaxation retry** — at most 5 retries, produces valid challenge or error
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8**

  - [x] 2.6 Write property tests for eligibility and progress (Properties 6, 7)
    - **Property 6: Eligibility classification correctness** — fullyEligible iff all three sub-checks pass
    - **Property 7: Challenge_Progress evolution** — progress stays in [0, target_count], increments/decrements correctly per event type
    - **Validates: Requirements 3.1–3.8, 4.1–4.6**

- [ ] 3. Implement Mastery_Engine (pure logic)
  - [ ] 3.1 Implement mastery points and tier logic
    - Create `app/lib/mastery/mastery-engine.ts` with `pointsFor(event)`, `applyAward(state, points)`, `computeTier(points)`, `pointsToNextTier(points)` functions
    - `applyAward` returns the next OperatorMastery state and detects tier crossings
    - Points: 10 for win, 5 for survived_round, 15 for kill_target_complete, N for challenge_completed
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 3.2 Implement streak calculator for mastery challenges
    - Create `app/lib/mastery/streak-calculator.ts` with `applyStreakIncrement(state, today)` and `applyStreakReset(state)` functions
    - Detect streak milestones at 3, 7, 30 and return bonus info (50, 150, 750 XP)
    - Use `run_id` and `bonusesAwardedInRun` for idempotent bonus tracking
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 3.3 Write property tests for mastery points and tiers (Properties 10, 11, 13)
    - **Property 10: Mastery_Points trace sum** — points equal sum of all qualifying events for that operator
    - **Property 11: Mastery_Points are monotonic under sync replay** — duplicates don't increase total beyond unique awards
    - **Property 13: Mastery_Badge uniqueness per (user, operator, tier)** — at most one badge per triple
    - **Validates: Requirements 7.1–7.5, 5.3, 8.1, 8.5, 12.4**

  - [ ] 3.4 Write property tests for streak logic (Property 14)
    - **Property 14: Mastery_Challenge_Streak length and bonus idempotency** — streak tracks consecutive days, resets correctly, bonuses awarded once per run
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement MasteryContext (state orchestration)
  - [ ] 5.1 Create MasteryContext provider with state management
    - Create `app/context/MasteryContext.tsx` with the `MasteryContextValue` interface
    - Hold in-memory cache of active challenges, operator mastery, badges, and streak state
    - Implement `refreshChallenges()` that checks slot boundaries and generates new challenges when needed
    - Wire reads from local cache with Supabase fallback for authenticated users
    - _Requirements: 1.1, 1.2, 2.1, 10.1_

  - [ ] 5.2 Implement deployment and match result handlers in MasteryContext
    - Implement `onDeploymentAccepted(deployment)` — evaluates eligibility for all active challenges, applies progress for `complete_deployments` objective
    - Implement `reportMatchResult(deploymentId, result)` — persists result, evaluates progress for win/survive objectives, awards mastery points, handles 10-minute mutability window with revert logic
    - Implement `onKillIncremented(deploymentId, operatorId, delta)` — applies kill progress, handles revert
    - _Requirements: 3.1–3.8, 4.1–4.6, 7.1–7.3, 11.1–11.5_

  - [ ] 5.3 Implement challenge completion and reward pipeline in MasteryContext
    - Detect when progress reaches target_count, set completed_at, invoke `awardXP(effectiveXpReward, 'challenge_completed')`
    - Award mastery_point_reward to all contributing operators
    - Detect tier crossings and insert mastery_badges with UNIQUE constraint handling
    - Increment mastery streak on daily challenge completion, detect bonus milestones
    - Ensure idempotent reward awarding (completed_at IS NULL precondition)
    - _Requirements: 5.1–5.6, 7.1–7.5, 8.1, 8.5, 9.1–9.4, 15.1_

  - [ ] 5.4 Implement operator mission management in MasteryContext
    - Implement `activateOperatorMission(challengeId)` — enforce max 3 active missions
    - Implement `discardChallenge(challengeId)` — remove from active set, no rewards
    - Implement `availableOperatorMissions(operatorId)` — generate up to 3 missions per operator
    - _Requirements: 6.1–6.6_

  - [ ] 5.5 Implement persistence layer (SyncQueue integration and localStorage fallback)
    - Write mastery state changes through existing SyncQueue for authenticated users
    - Implement max-merge conflict resolution for monotonic counters (mastery_points, challenge_progress)
    - Implement latest-timestamp conflict resolution for match_results
    - Implement localStorage fallback for guest preview (single example daily challenge, no XP/mastery awards)
    - _Requirements: 12.1–12.5, 13.1–13.4_

  - [ ] 5.6 Write property tests for challenge completion idempotency (Property 8)
    - **Property 8: Challenge completion is idempotent** — completed_at set once, awardXP called once, awardMasteryPoints called once per challenge
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

  - [ ] 5.7 Write property tests for mission active count (Property 9)
    - **Property 9: Operator_Mission active count invariant** — count stays in [0, 3], activate succeeds iff count < 3
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**

  - [ ] 5.8 Write property tests for match result window and sync (Properties 15, 16, 17)
    - **Property 15: Match_Result mutability window re-evaluation correctness** — final state reflects only the last in-window result
    - **Property 16: Sync conflict max-merge for monotonic counters** — returns max(local, remote)
    - **Property 17: Sync conflict latest-timestamp for Match_Result** — returns row with larger updated_at
    - **Validates: Requirements 11.4, 11.5, 12.4, 12.5**

  - [ ] 5.9 Write property tests for guest mode (Properties 18, 19, 20)
    - **Property 18: Guest mode never awards XP or Mastery_Points** — no awardXP, no mastery rows created
    - **Property 19: Sign-up discards guest preview state** — localStorage cleared, fresh challenges generated
    - **Property 20: No rewards for non-gameplay events** — dashboard opens, scrolls, reloads produce no state changes
    - **Validates: Requirements 13.2, 13.3, 13.4, 14.1, 14.2**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Mastery Dashboard UI
  - [ ] 7.1 Create ChallengeBanner component
    - Create `app/components/mastery/ChallengeBanner.tsx` showing challenge title, role, objective, restriction, progress/target, and time-remaining
    - Support daily, weekly, and mission slots with appropriate styling
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 7.2 Create MatchResultControl component
    - Create `app/components/mastery/MatchResultControl.tsx` with three buttons: Win / Loss / Survived Round
    - Show "Change result (Xm left)" within the 10-minute mutability window
    - Display "Result locked" state after window expires
    - _Requirements: 11.1, 11.2, 11.4_

  - [ ] 7.3 Create MasteryDashboard with three sections
    - Create `app/components/mastery/MasteryDashboard.tsx` with Active Challenges, Operator Mastery, and Mastery Badges sections
    - Active Challenges: daily, weekly, active missions with progress and time-remaining
    - Operator Mastery: operators sorted by mastery_points descending, showing name, tier, points, points-to-next-tier
    - Mastery Badges: grouped by operator with tier and unlock timestamp
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ] 7.4 Create OperatorMasteryDetail view
    - Create `app/components/mastery/OperatorMasteryDetail.tsx` showing per-operator mastery points history, available missions (up to 3), and unlocked badges
    - Include mission activation button with limit-reached messaging
    - _Requirements: 6.1, 6.3, 10.5_

  - [ ] 7.5 Create challenge detail view and discard functionality
    - Create `app/components/mastery/ChallengeDetailModal.tsx` showing full challenge description, eligibility rules, operator pool, and discard button
    - Discard available for daily/weekly challenges and operator missions
    - _Requirements: 2.4, 6.5_

  - [ ] 7.6 Create completion and badge-unlock toast notifications
    - Create toast components for challenge completion (title, XP, mastery points) and badge unlock (operator name, new tier)
    - Use non-blocking toast pattern consistent with existing app toasts
    - _Requirements: 5.4, 8.2_

  - [ ] 7.7 Write property tests for UI render content (Properties 21, 22)
    - **Property 21: Roll-surface Challenge banner render content** — banner contains slot label, objective, role, restriction, progress/target, time-remaining
    - **Property 22: Mastery_Dashboard render content** — dashboard renders all three sections with correct data
    - **Validates: Requirements 2.1, 2.2, 2.3, 7.7, 8.4, 10.1–10.4**

- [ ] 8. Integrate with existing components
  - [ ] 8.1 Wire MasteryContext into the app provider tree
    - Add `<MasteryProvider>` to the app's provider hierarchy (after AuthContext and DataContext)
    - Call `refreshChallenges()` on app open and on slot boundary transitions
    - _Requirements: 1.1, 1.2_

  - [ ] 8.2 Integrate with Operator_Roller (deployment acceptance)
    - In `app/page.tsx` `handleAccept`, call `mastery.onDeploymentAccepted(record)` after `addDeployment(...)`
    - Render `<ChallengeBanner slot="daily" />` and `<ChallengeBanner slot="weekly" />` on the roll surface
    - Render collapsed missions indicator when at least one operator mission is active
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [ ] 8.3 Integrate with OperatorStatsModal (kill tracking)
    - After incrementing per-operator kills, call `mastery.onKillIncremented(deploymentId, operatorId, +1)`
    - On kill revert, call `mastery.onKillIncremented(deploymentId, operatorId, -1)`
    - _Requirements: 4.4, 7.3_

  - [ ] 8.4 Integrate MatchResultControl with active deployment surface
    - Render `<MatchResultControl />` on the active deployment card when match_result is null or within the 10-minute window
    - Wire result selection to `mastery.reportMatchResult(deploymentId, result)`
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ] 8.5 Add Mastery navigation entry to main hub
    - Add a "Mastery" entry to the main hub navigation that routes to `<MasteryDashboard />`
    - _Requirements: 10.1_

  - [ ] 8.6 Implement guest preview mode
    - Show one example daily challenge for unauthenticated users with "progress not saved" label
    - Track example challenge progress in localStorage without awarding XP or mastery points
    - Show login prompt when guest attempts to access dashboard, weekly challenge, missions, or badges
    - On sign-up/login, discard guest local state and generate fresh authenticated challenges
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ] 8.7 Extend XPSource type in existing gamification context
    - Add `'challenge_completed'` and `'mastery_streak_bonus'` to the existing `XPSource` type
    - Ensure `awardXP` calls from mastery flows use these new source values
    - Verify no duplicate achievement triggers from mastery XP awards
    - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (22 properties total)
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, consistent with the existing Next.js + Supabase codebase
- All XP awards flow through the existing `awardXP(amount, source)` pipeline — no parallel XP store
- The Challenge_Engine and Mastery_Engine are pure functions for easy testing; persistence is handled by MasteryContext via SyncQueue

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["2.1", "2.2", "3.1", "3.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "3.3", "3.4"] },
    { "id": 4, "tasks": ["2.6"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5"] },
    { "id": 7, "tasks": ["5.6", "5.7", "5.8", "5.9"] },
    { "id": 8, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 9, "tasks": ["7.7"] },
    { "id": 10, "tasks": ["8.1", "8.7"] },
    { "id": 11, "tasks": ["8.2", "8.3", "8.4", "8.5", "8.6"] }
  ]
}
```
