# Implementation Plan: Session Enhancements

## Overview

This plan implements three motivational features for XAWARS RNG: hot streak detection with a visual flame indicator, a session summary modal for end-of-session performance review, and map win/loss tracking with win rate display. The approach starts with pure logic modules (enabling early property testing), then builds UI components, persistence, and integration — wiring everything together incrementally.

## Tasks

- [x] 1. Pure logic modules and data types
  - [x] 1.1 Define data types for session enhancements
    - Add `MapWinLossRecord` interface to `app/types/database.ts` with fields: `mapId`, `wins`, `losses`
    - Add `StreakState`, `SessionSnapshot`, `SessionDeltaData`, `SessionOperatorDelta`, `SessionBestMap` types to `app/types/database.ts`
    - _Requirements: 1.1, 3.1, 6.3, 6.4, 7.1_

  - [x] 1.2 Implement `app/lib/session-logic.ts` — streak and session delta functions
    - Implement `initialStreakState()` — returns `{ count: 0, isHotStreak: false }`
    - Implement `applyStreakAction(state, action)` — state machine for 'kill' (+1), 'death' (reset to 0), 'decrement' (-1, floor 0); derive `isHotStreak` from count ≥ 3
    - Implement `captureSnapshot(totalKills, totalDeaths, operatorKills, operatorDeaths, mapWinLoss)` — returns SessionSnapshot with all values captured
    - Implement `computeSessionDeltas(snapshot, currentKills, currentDeaths, currentOperatorKills, currentOperatorDeaths, currentMapWinLoss, operatorNames)` — computes kills/deaths/K/D deltas, isPerfect, isEmpty, operators sorted by kills desc then name asc, bestMap
    - Implement `findBestSessionMap(snapshotMapWinLoss, currentMapPerformance, snapshotMapPerformance, mapNames)` — returns map with highest session K/D; ties broken by higher total session kills
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7, 3.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.3 Implement `app/lib/win-loss-logic.ts` — win/loss data transformations
    - Implement `upsertMapWinLoss(records, mapId, outcome)` — increments wins or losses for the specified map by 1, returns new records object
    - Implement `computeWinRate(record)` — returns `Math.round(wins / (wins + losses) * 100)` or null when total is 0
    - Implement `hasLimitedData(record)` — returns true when (wins + losses) < 5
    - Implement `getTotalOutcomes(record)` — returns wins + losses
    - Implement `mergeMapWinLossRecords(local, cloud)` — additive merge, non-overlapping maps included unchanged
    - Implement `serializeMapWinLoss(records)` / `deserializeMapWinLoss(json)` — JSON round-trip with graceful error handling (returns `{}` on invalid JSON)
    - _Requirements: 6.3, 6.4, 7.1, 7.4, 8.2, 8.3, 8.5_

  - [x] 1.4 Write property tests for session-logic
    - Create `app/lib/__tests__/session-logic.property.test.ts`
    - **Property 1: Streak counter state machine** — for random sequences of actions, counter equals consecutive kills since last death minus decrements, floored at 0
    - **Property 2: Hot streak state derivation** — isHotStreak is true iff count ≥ 3
    - **Property 4: Session snapshot captures current state** — captureSnapshot output matches inputs exactly
    - **Property 5: Session delta computation** — deltas equal current minus snapshot values, operators sorted correctly
    - **Property 6: Session best map selection** — returns map with highest K/D, ties broken by kills
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.7, 3.1, 3.6, 4.2, 4.5**

  - [x] 1.5 Write property tests for win-loss-logic
    - Create `app/lib/__tests__/win-loss-logic.property.test.ts`
    - **Property 7: Win/loss upsert correctness** — increments exactly wins or losses for specified map, others unchanged
    - **Property 8: Win/loss dismiss preserves state** — not calling upsert leaves records identical
    - **Property 9: Win/loss localStorage round-trip** — serialize then deserialize produces equivalent records
    - **Property 10: Win/loss migration merge** — merged wins = local.wins + cloud.wins, same for losses; non-overlapping maps included
    - **Property 12: Win rate computation** — Math.round(wins/(wins+losses)*100) for total > 0, null for total = 0
    - **Property 13: Limited data threshold** — hasLimitedData returns true iff (wins + losses) < 5
    - **Validates: Requirements 6.3, 6.4, 6.5, 7.1, 7.4, 8.2, 8.3, 8.5**

  - [x] 1.6 Write unit tests for session-logic and win-loss-logic
    - Create `app/lib/__tests__/session-logic.test.ts`
    - Test streak counter initializes to 0
    - Test kill decrement at streak 0 stays at 0
    - Test `computeSessionDeltas` returns isPerfect when kills > 0, deaths = 0
    - Test `computeSessionDeltas` returns isEmpty when both kills and deaths = 0
    - Create `app/lib/__tests__/win-loss-logic.test.ts`
    - Test `deserializeMapWinLoss` returns empty object on invalid JSON
    - Test `computeWinRate` returns null for 0 total outcomes
    - Test `hasLimitedData` boundary: 4 outcomes → true, 5 outcomes → false
    - _Requirements: 1.1, 1.7, 4.3, 4.4, 7.1, 8.2, 8.3, 8.5_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Hot streak UI components
  - [x] 3.1 Create `HotStreakIndicator` component
    - Create `app/components/HotStreakIndicator.tsx`
    - Accept `streakCount` and `isActive` props
    - Render flame icon (🔥 or SVG) and streak count number when active
    - Apply CSS transition for entry: scale 0→1, opacity 0→1, 300ms duration
    - Apply CSS transition for exit: scale 1→0, opacity 1→0, 200ms duration
    - Handle animation interruption: cancel exit animation on re-entry, start from current visual state
    - Include `aria-label` with dynamic streak count (e.g., "Hot streak: 5 kills")
    - Mark as purely decorative with no effect on game logic or persistence
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.2 Integrate hot streak into `page.tsx`
    - Add in-memory `killStreak` state using `useState` initialized to `initialStreakState()`
    - On kill increment: call `applyStreakAction(state, 'kill')` to update streak
    - On death increment: call `applyStreakAction(state, 'death')` to update streak
    - On kill decrement: call `applyStreakAction(state, 'decrement')` to update streak
    - Render `HotStreakIndicator` adjacent to kill StatCounter, passing `killStreak.count` and `killStreak.isHotStreak`
    - Ensure streak state resets on page load (no persistence)
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1_

  - [x] 3.3 Write unit tests for HotStreakIndicator
    - Create `app/components/__tests__/HotStreakIndicator.test.tsx`
    - Test flame icon renders when `isActive` is true
    - Test streak count displays correctly
    - Test entry animation CSS classes are applied when transitioning to active
    - Test exit animation CSS classes are applied when transitioning to inactive
    - Test `aria-label` contains dynamic streak count
    - Test component has no side effects on data (no localStorage/Supabase calls)
    - **Property 3: Indicator display correctness** — for any counter ≥ 3, displayed value matches counter in both visual and aria-label
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6, 2.7**

- [x] 4. Session snapshot and summary UI
  - [x] 4.1 Implement session snapshot capture in `page.tsx`
    - Add `sessionSnapshot` ref (useRef) initialized to null
    - After hydration completes (DataContext ready), capture snapshot via `captureSnapshot()` with current kills, deaths, operator stats, map win/loss
    - If hydration fails, capture snapshot with zero defaults (0 kills, 0 deaths, empty operator list, empty win/loss)
    - Use a ref flag to prevent double-capture on visibility changes or HMR
    - On session end + modal close, re-capture snapshot from current state
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Create `SessionSummaryModal` component
    - Create `app/components/SessionSummaryModal.tsx`
    - Accept `isOpen`, `onClose`, and `sessionData: SessionDeltaData` props
    - Display session kills, session deaths, session K/D ratio (2 decimal places)
    - When `isPerfect` is true: display kill count followed by "Perfect" label instead of numeric ratio
    - When `isEmpty` is true: display "No matches recorded this session" message, hide operator list and K/D
    - Display operator list with individual session kills/deaths, sorted by kills desc then name asc
    - Display best map section when `bestMap` is not null (map name + K/D value)
    - Include "Close" button that calls `onClose`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.3 Create "End Session" button and wire session flow in `page.tsx`
    - Add "End Session" button in options area below kill/death counters
    - Show button only when an operator is deployed; hide when no operator
    - Style with smaller font size, lower-contrast color, distinct from kill/death buttons
    - Make keyboard accessible: focusable via Tab, activatable via Enter/Space, `aria-label="End session and view summary"`
    - Ensure minimum 44×44px tap target
    - On click: compute deltas via `computeSessionDeltas()`, open `SessionSummaryModal`
    - On modal close: reset snapshot via re-capture, starting new logical session
    - Do NOT show modal on `beforeunload` — session data is simply discarded
    - _Requirements: 4.1, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.4 Write unit tests for SessionSummaryModal and End Session button
    - Create `app/components/__tests__/SessionSummaryModal.test.tsx`
    - Test modal displays kills, deaths, K/D ratio
    - Test "Perfect" label shown when isPerfect is true
    - Test empty session message shown when isEmpty is true
    - Test operator list sorted by kills desc then name asc
    - Test best map section shown when bestMap is not null
    - Test Close button calls onClose
    - Create `app/components/__tests__/EndSessionButton.test.tsx`
    - Test button visible when operator deployed
    - Test button hidden when no operator deployed
    - Test button has subdued styling (smaller font, lower contrast)
    - Test keyboard accessibility (Tab focus, Enter/Space activation, aria-label)
    - Test minimum 44×44px tap target
    - Test no modal on beforeunload
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Map win/loss recording and persistence
  - [x] 6.1 Create `WinLossPrompt` component
    - Create `app/components/WinLossPrompt.tsx`
    - Accept `mapId`, `mapName`, `onWin`, `onLoss`, `onDismiss` props
    - Display "Won" button (green) and "Lost" button (red) with accessible labels "Record map win" and "Record map loss"
    - Buttons remain visible until user records outcome or dismisses
    - Include dismiss option (X button or tap outside)
    - _Requirements: 6.1, 6.2, 6.5, 6.6_

  - [x] 6.2 Integrate WinLossPrompt into `page.tsx`
    - After kill/death increment confirmed with a map selected via MapPickerModal, store `lastConfirmedMapId` in state
    - Show `WinLossPrompt` when `lastConfirmedMapId` is set
    - On "Won": call `DataContext.updateMapWinLoss(mapId, 'win')`, clear prompt
    - On "Lost": call `DataContext.updateMapWinLoss(mapId, 'loss')`, clear prompt
    - On dismiss: clear prompt without modifying records
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.3 Implement localStorage persistence for map win/loss
    - Add `xawars_mapWinLoss` key management in `DataContext`
    - Use `serializeMapWinLoss` / `deserializeMapWinLoss` for read/write
    - Handle `QuotaExceededError` gracefully (log warning, continue with in-memory state)
    - Handle corrupted JSON gracefully (return empty records, start fresh)
    - _Requirements: 7.1, 7.5_

  - [x] 6.4 Create Supabase migration for `map_win_loss` table
    - Create SQL migration file with table: `id` (uuid PK), `user_id` (uuid FK), `map_id` (text), `wins` (integer, default 0), `losses` (integer, default 0), `updated_at` (timestamptz)
    - Add unique constraint on (`user_id`, `map_id`)
    - Implement additive upsert SQL pattern (ON CONFLICT DO UPDATE SET wins = map_win_loss.wins + EXCLUDED.wins, losses = map_win_loss.losses + EXCLUDED.losses)
    - _Requirements: 7.2_

  - [x] 6.5 Integrate map win/loss with `DataContext` and `syncQueue`
    - Add `mapWinLossRecords` state to DataContext
    - Add `updateMapWinLoss(mapId, outcome)` action that calls `upsertMapWinLoss` and persists
    - For authenticated users: enqueue upsert operations through `syncQueue` for offline resilience
    - Load map win/loss records from Supabase on authenticated session init
    - On failed persistence: retain pre-operation state without data loss
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [x] 6.6 Implement guest-to-authenticated migration for map win/loss
    - Add win/loss migration to existing migration service
    - Read localStorage `xawars_mapWinLoss` records
    - Merge with cloud records using `mergeMapWinLossRecords()` (additive: sum wins and losses)
    - Upsert merged results to Supabase, clear localStorage on success
    - Handle partial failure: successfully merged records persist, failures remain in localStorage
    - _Requirements: 7.4_

  - [x] 6.7 Write unit tests for WinLossPrompt and persistence
    - Create `app/components/__tests__/WinLossPrompt.test.tsx`
    - Test Won/Lost buttons appear after map confirm
    - Test buttons remain visible until action taken
    - Test Won button uses green color, Lost button uses red
    - Test accessible labels present ("Record map win", "Record map loss")
    - Test dismiss does not modify records
    - **Property 11: Failed persistence preserves state** — state unchanged after simulated failure
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 7.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Win rate display integration
  - [x] 8.1 Add win rate display to MapAdvisor
    - Read `mapWinLossRecords` from DataContext
    - For each map with at least 1 recorded outcome, display win rate percentage using `computeWinRate()`
    - Display win rate alongside existing map performance metrics (K/D ratio, match count)
    - For maps with < 5 outcomes, show "X matches" limited data label using `hasLimitedData()`
    - Do not display win rate for maps with 0 outcomes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.2 Add win rate display to MasteryDetailModal / MapBreakdownPanel
    - Read `mapWinLossRecords` from DataContext
    - Add win rate column to map breakdown when win/loss data exists
    - Apply same display rules: percentage, limited data label, hide for 0 outcomes
    - Use visually compact format alongside K/D and match count
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.3 Add map win/loss data to session summary
    - In `SessionSummaryModal`, include map performance section when map win/loss data changed during session
    - Display session map wins/losses using snapshot delta comparison
    - _Requirements: 4.5_

  - [x] 8.4 Write unit tests for win rate display
    - Test win rate displayed when outcomes ≥ 1
    - Test win rate hidden when outcomes = 0
    - Test limited data label shown when outcomes < 5
    - Test win rate displayed alongside existing metrics
    - Test percentage rounds to nearest whole number
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Pure logic modules (`session-logic.ts`, `win-loss-logic.ts`) are implemented first to enable early property testing
- `fast-check` is already in devDependencies; `vitest --run` is the test runner
- Streak counter is in-memory only — no localStorage or Supabase involvement
- Session snapshot uses `useRef` to avoid re-renders and prevent double-capture

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "1.6"] },
    { "id": 3, "tasks": ["3.1", "6.1", "6.4"] },
    { "id": 4, "tasks": ["3.2", "4.1", "6.2", "6.3"] },
    { "id": 5, "tasks": ["4.2", "4.3", "6.5"] },
    { "id": 6, "tasks": ["3.3", "4.4", "6.6"] },
    { "id": 7, "tasks": ["6.7", "8.1", "8.2"] },
    { "id": 8, "tasks": ["8.3", "8.4"] }
  ]
}
```
