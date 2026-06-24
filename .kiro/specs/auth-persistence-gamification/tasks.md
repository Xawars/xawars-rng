# Implementation Plan: Auth, Persistence & Gamification

## Overview

This plan implements user authentication (email/password + OAuth), cloud persistence via Supabase, data migration from localStorage, and a gamification layer (XP, levels, achievements, streaks) for the XA Wars RNG app. Each task builds incrementally, starting with foundational types and Supabase setup, then layering in auth, persistence, gamification, and finally wiring everything together.

## Tasks

- [x] 1. Set up Supabase client and shared types
  - [x] 1.1 Install Supabase dependencies and create the Supabase client module
    - Install `@supabase/supabase-js` package
    - Create `app/lib/supabase.ts` with `createClient` using env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - Add `.env.local.example` with placeholder Supabase env vars
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 1.2 Create shared TypeScript types and interfaces for database models
    - Create `app/types/database.ts` with `DeploymentRecord`, `OperatorStatRecord`, `GamificationRecord`, `AchievementRecord`, `RankedStats`, `RankProgress` interfaces
    - Create `app/types/auth.ts` with `AuthState`, `AuthResult`, `User`, `Session` interfaces
    - Ensure types align with the Supabase schema defined in the design
    - _Requirements: 6.4, 7.1, 8.2, 9.1_

  - [x] 1.3 Create achievement definitions data file
    - Create `app/data/achievements.ts` with all achievement definitions (deployment, kills, rank, content, streak milestones)
    - Export `ACHIEVEMENT_DEFINITIONS` array with id, title, description, category, xpReward, and condition for each achievement
    - _Requirements: 11.3_

- [x] 2. Implement Authentication Context
  - [x] 2.1 Create AuthContext with email/password registration and login
    - Create `app/context/AuthContext.tsx` with `AuthProvider` and `useAuth` hook
    - Implement `signUp` method that calls `supabase.auth.signUp` with email/password validation (min 8 chars)
    - Implement `signIn` method that calls `supabase.auth.signInWithPassword`
    - Handle error states: duplicate email, invalid credentials, network errors with descriptive messages
    - Expose `isGuest` flag (true when no session exists)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 13.1_

  - [x] 2.2 Write property test for password validation boundary
    - **Property 1: Password Validation Boundary**
    - Test that any string < 8 chars is rejected and any string >= 8 chars is accepted
    - **Validates: Requirements 1.3**

  - [x] 2.3 Implement OAuth login (Google and Discord)
    - Add `signInWithOAuth` method to AuthContext that calls `supabase.auth.signInWithOAuth` with provider param
    - Handle OAuth error responses with descriptive messages and retry option
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Implement session management and persistence
    - Subscribe to `supabase.auth.onAuthStateChange` to track session state
    - Maintain authenticated state across page refreshes using Supabase's built-in session handling
    - Implement `signOut` that calls `supabase.auth.signOut` and clears local state
    - Handle session expiry by redirecting to login
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 2.5 Write unit tests for AuthContext
    - Test registration with valid/invalid inputs
    - Test login error messages (generic, no field-specific hints)
    - Test OAuth error handling
    - Test session expiry redirect
    - Test logout clears tokens
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 3.3, 4.2, 4.3_

- [x] 3. Implement Sync Queue for offline resilience
  - [x] 3.1 Create SyncQueue module with enqueue, drain, and online detection
    - Create `app/lib/sync-queue.ts` implementing the `SyncQueue` interface
    - Enqueue operations with id, table, operation type, payload, timestamp, and retryCount
    - Persist queue in localStorage as JSON
    - Detect online/offline status via `navigator.onLine` and `online`/`offline` events
    - Implement `drain` that processes queued operations in FIFO order against Supabase
    - Implement retry with max 3 attempts per operation
    - _Requirements: 15.1, 15.2_

  - [x] 3.2 Implement timestamp-based conflict resolution
    - When a sync conflict occurs (409 or equivalent), compare timestamps and keep the most recent write
    - Add conflict resolution logic to the drain process
    - _Requirements: 15.3_

  - [x] 3.3 Write property test for sync queue operation preservation
    - **Property 13: Sync Queue Operation Preservation**
    - Test that for any sequence of enqueued operations, draining sends each exactly once in FIFO order
    - **Validates: Requirements 15.1, 15.2**

  - [x] 3.4 Write property test for conflict resolution by timestamp
    - **Property 14: Conflict Resolution by Timestamp**
    - Test that for any two conflicting operations, the one with the more recent timestamp persists
    - **Validates: Requirements 15.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Data Context with cloud persistence
  - [x] 5.1 Create DataContext with ranked stats persistence
    - Create `app/context/DataContext.tsx` with `DataProvider` and `useData` hook
    - Implement `updateRankedStats(platform, stats)` that writes locally first, then enqueues sync to `ranked_stats` table
    - On login, fetch ranked stats from Supabase and hydrate local state
    - Store PC and Console stats independently (keyed by platform)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 5.2 Write property test for platform independence
    - **Property 3: Platform Independence for Rank Stats**
    - Test that updating one platform's rank data does not affect the other platform's data
    - **Validates: Requirements 6.4**

  - [x] 5.3 Implement deployment history persistence with capacity limit
    - Add `addDeployment` method to DataContext that inserts into `deployments` table
    - Enforce 100-record cap: when adding to a full history, remove the oldest record
    - On login, load full deployment history from Supabase
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.4 Write property test for deployment history capacity invariant
    - **Property 4: Deployment History Capacity Invariant**
    - Test that history length never exceeds 100 and oldest is evicted when full
    - **Validates: Requirements 7.2, 7.3**

  - [x] 5.5 Implement operator stats persistence
    - Add `updateOperatorStat(operatorId, delta)` method to DataContext
    - Upsert kills/deaths/deployments per operator per user in `operator_stats` table
    - On login, load all operator stats from Supabase
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.6 Write property test for operator stats independence
    - **Property 5: Operator Stats Independence**
    - Test that updating one operator's stats does not affect any other operator's stats
    - **Validates: Requirements 8.2**

  - [x] 5.7 Implement content ideas persistence with capacity limit
    - Add `addContentIdea` and `deleteContentIdea` methods to DataContext
    - Enforce 50-idea cap: when adding to a full history, remove the oldest entry
    - Persist title variations, story hook, mission directive, and thumbnail prompts
    - On login, load full content idea history from Supabase
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 5.8 Write property test for content idea serialization round-trip
    - **Property 6: Content Idea Serialization Round-Trip**
    - Test that serializing a content idea to DB format and deserializing back produces an equivalent idea
    - **Validates: Requirements 9.1**

  - [x] 5.9 Write property test for content idea capacity invariant
    - **Property 7: Content Idea Capacity Invariant**
    - Test that content idea history never exceeds 50 and oldest is evicted when full
    - **Validates: Requirements 9.2, 9.3**

- [ ] 6. Implement Migration Service
  - [x] 6.1 Create migration service to transfer localStorage data to Supabase
    - Create `app/lib/migration-service.ts` with `detectLocalStorageData`, `migrateToCloud`, and `clearMigratedKeys` functions
    - Detect existing localStorage keys for ranked stats, operator history, kills/deaths, content ideas
    - Transform localStorage data to Supabase table formats and insert via DataContext
    - On success, clear migrated localStorage keys
    - On failure, preserve localStorage and surface error with retry option
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 6.2 Add migration prompt UI and integrate with DataContext
    - Add `migrationStatus` state to DataContext ('idle' | 'pending' | 'migrating' | 'complete' | 'failed')
    - On first login when localStorage data exists, set status to 'pending' and show migration prompt
    - Wire `startMigration` and `dismissMigration` methods
    - _Requirements: 5.1, 5.4_

  - [x] 6.3 Write property test for migration data transformation round-trip
    - **Property 2: Migration Data Transformation Round-Trip**
    - Test that transforming localStorage data to cloud format and back produces equivalent data
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Gamification Context
  - [ ] 8.1 Create GamificationContext with XP and level system
    - Create `app/context/GamificationContext.tsx` with `GamificationProvider` and `useGamification` hook
    - Implement `awardXP(amount, source)` that adds XP to total, persists via DataContext/SyncQueue
    - Calculate level using `floor(totalXP / 100) + 1`
    - Detect level-up boundary crossings and emit level-up notification
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 8.2 Write property test for level calculation formula
    - **Property 8: Level Calculation Formula**
    - Test that for any non-negative totalXP, level equals `floor(totalXP / 100) + 1`
    - **Validates: Requirements 10.5**

  - [ ] 8.3 Write property test for level-up boundary detection
    - **Property 9: Level-Up Boundary Detection**
    - Test that a level-up event fires if and only if XP crosses a 100-point boundary
    - **Validates: Requirements 10.6**

  - [ ] 8.4 Implement achievements system
    - Add `checkAchievements` method to GamificationContext
    - After each qualifying action, evaluate all achievement conditions against current metrics
    - Unlock achievement when threshold met for the first time, award XP bonus, persist to `achievements` table
    - Display notification on unlock
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 8.5 Write property test for achievement unlock at threshold
    - **Property 10: Achievement Unlock at Threshold**
    - Test that an achievement unlocks if and only if metric >= threshold AND not previously unlocked
    - **Validates: Requirements 11.2**

  - [ ] 8.6 Implement daily streak tracking
    - Add `recordActivity` method that marks the current calendar day as active
    - Increment streak on consecutive days, reset to zero on missed days
    - Persist current streak, longest streak, and last active date via DataContext
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 8.7 Write property test for streak calculation correctness
    - **Property 11: Streak Calculation Correctness**
    - Test that streak equals the length of consecutive calendar-day run ending at most recent active date, or zero if gap exists
    - **Validates: Requirements 12.2, 12.3**

  - [ ] 8.8 Write unit tests for XP award amounts
    - Test specific XP values: 10 for deployment, 25 for kill target, 15 for content idea, 20 for ranked win
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 9. Implement User Profile Display
  - [ ] 9.1 Create UserProfile component with level, XP, streak, and stats
    - Create `app/components/UserProfile.tsx` displaying current level, total XP, XP progress bar to next level, current streak, longest streak
    - Display total deployments, total kills, total deaths, and overall K/D ratio
    - Show all achievements with locked/unlocked status
    - _Requirements: 14.1, 14.2, 14.3, 11.5_

  - [ ] 9.2 Write property test for K/D ratio calculation
    - **Property 12: K/D Ratio Calculation**
    - Test that K/D = kills/deaths rounded to 2 decimals when deaths > 0, null when deaths = 0
    - **Validates: Requirements 14.3**

- [ ] 10. Implement Guest Mode and account creation prompts
  - [ ] 10.1 Add guest mode access control and account creation prompts
    - When no session exists, allow access to operator roulette and basic kill/death tracking via localStorage
    - Display a non-intrusive prompt encouraging account creation for cloud save and gamification
    - When a guest attempts to access gamification features, show a login prompt
    - _Requirements: 13.1, 13.2, 13.3_

- [ ] 11. Wire everything together and integrate with existing components
  - [ ] 11.1 Wrap app with AuthProvider, DataProvider, and GamificationProvider
    - Update `app/layout.tsx` to wrap children with the three context providers in correct order (Auth → Data → Gamification)
    - Ensure DataContext reads auth state to decide between localStorage (guest) and Supabase (authenticated)
    - _Requirements: 4.1, 13.1_

  - [ ] 11.2 Integrate DataContext with existing components
    - Update `OperatorDisplay` / roulette flow to call `addDeployment` and `awardXP('deployment')` on accept
    - Update `OperatorStatsModal` to call `updateOperatorStat` and `awardXP('kill_target')` on kill target completion
    - Update `RankedDisplay` to call `updateRankedStats` and `awardXP('ranked_win')` on win
    - Update `ContentGeneratorModal` to call `addContentIdea` and `awardXP('content_idea')` on save
    - Call `recordActivity` on each qualifying action for streak tracking
    - Call `checkAchievements` after each XP-awarding action
    - _Requirements: 6.1, 7.1, 8.1, 9.1, 10.1, 10.2, 10.3, 10.4, 11.1, 12.1_

  - [ ] 11.3 Add login/register UI and offline status indicator
    - Create login/register page or modal with email/password fields and OAuth buttons
    - Add offline status indicator in the header (subtle dot)
    - Add "Syncing..." / "All changes saved" indicator on reconnection
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 15.1_

  - [ ] 11.4 Add level-up and achievement notification toasts
    - Create notification toast component for level-up events and achievement unlocks
    - Wire notifications to GamificationContext events
    - _Requirements: 10.6, 11.2_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses vitest with fast-check for property-based testing
- Supabase handles auth, database, and RLS — no custom backend needed
- All writes are optimistic (local-first) with async cloud sync via the SyncQueue

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2"] },
    { "id": 3, "tasks": ["2.5", "3.3", "3.4"] },
    { "id": 4, "tasks": ["5.1", "5.3", "5.5", "5.7"] },
    { "id": 5, "tasks": ["5.2", "5.4", "5.6", "5.8", "5.9", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3"] },
    { "id": 7, "tasks": ["8.1", "8.6"] },
    { "id": 8, "tasks": ["8.2", "8.3", "8.4", "8.7", "8.8"] },
    { "id": 9, "tasks": ["8.5", "9.1"] },
    { "id": 10, "tasks": ["9.2", "10.1"] },
    { "id": 11, "tasks": ["11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3", "11.4"] }
  ]
}
```
