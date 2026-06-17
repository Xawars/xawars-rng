# Implementation Plan

## Overview

Fix the match counter increment bug where `handleRoundEnd` incorrectly increments the `matches` counter per round instead of per match. Uses exploratory bug condition testing to confirm the bug, preservation testing to capture baseline behavior, then applies the minimal fix (delete from wrong place, add to right place).

## Tasks

- [x] 1. Write bug condition regression test
  - **Property 1: Bug Condition** - Round-end incorrectly increments match counter
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Confirm that `handleRoundEnd` erroneously calls `updateMapPerformance`/`updateSitePerformance` with `{ matches: 1 }`
  - Create an active match with a valid map and operator
  - Call `handleRoundEnd()`
  - Assert `updateMapPerformance` is NOT called with `{ matches: 1 }`
  - Assert `updateSitePerformance` is NOT called with `{ matches: 1 }`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists: both update functions ARE called with `{ matches: 1 }` on round-end)
  - Document failure (e.g., "`updateMapPerformance` was called with `{ matches: 1 }` during round-end")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Round-end still records win/loss, appends round data, and resets refs
  - **IMPORTANT**: Follow observation-first methodology
  - **IMPORTANT**: Run these on UNFIXED code to capture baseline behavior
  - Observe: `handleRoundEnd('win')` calls `updateMapWinLoss(mapId, 'win')` on unfixed code
  - Observe: `handleRoundEnd` appends round (kills delta, deaths delta, site, outcome) to `activeMatch.rounds` on unfixed code
  - Observe: `handleRoundEnd` resets `roundStartKillsRef`, `roundStartDeathsRef`, and clears `currentSiteId` on unfixed code
  - Write property-based test: for all round-end events with varying operator/map/site/outcome combinations, assert `updateMapWinLoss` is called with correct outcome (from Preservation Requirements in design)
  - Write property-based test: for all round-end events, assert round data is appended to match with correct kills delta, deaths delta, site, and outcome
  - Write property-based test: for all round-end events, assert refs are reset and `currentSiteId` is cleared
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix match counter increment location

  - [x] 3.1 Remove match increment from `handleRoundEnd`
    - Delete `updateMapPerformance(currentOperator.id, activeMatch.mapId, { matches: 1 })` call from `handleRoundEnd`
    - Delete `updateSitePerformance(currentOperator.id, activeMatch.mapId, currentSiteId, { matches: 1 })` call from `handleRoundEnd`
    - _Bug_Condition: isBugCondition(input) where event == 'roundEnd' AND activeMatch.mapId IS NOT NULL AND currentOperator IS NOT NULL_
    - _Expected_Behavior: handleRoundEnd SHALL NOT call updateMapPerformance or updateSitePerformance with { matches: 1 }_
    - _Preservation: updateMapWinLoss, round appending, ref resets, site clearing all unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Add match increment to `handleEndMatch`
    - Add `updateMapPerformance(operatorId, mapId, { matches: 1 })` call in `handleEndMatch` after setting `endedAt`
    - Collect distinct `siteId` values from `activeMatch.rounds` and call `updateSitePerformance(operatorId, mapId, siteId, { matches: 1 })` once per distinct site
    - **Source of truth**: The implementation SHALL use the rounds already persisted on the active Match (`activeMatch.rounds`) when determining distinct sites for match-level Site Performance updates. This prevents future refactors from accidentally reading stale state or an alternate source.
    - No new dependencies needed — `activeMatch`, `currentOperator`, and update functions already available in scope
    - _Bug_Condition: match-end previously never incremented match counter_
    - _Expected_Behavior: handleEndMatch SHALL call updateMapPerformance with { matches: 1 } exactly once, and updateSitePerformance for each distinct site in activeMatch.rounds_
    - _Preservation: handleEndMatch continues to set endedAt, clear currentMapId, clear currentSiteId_
    - _Requirements: 2.3, 2.4, 3.4_

  - [x] 3.3 Verify bug condition regression test now passes
    - **Property 1: Expected Behavior** - Round-end does not increment match counter
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (no `{ matches: 1 }` calls during round-end)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition regression test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Round-end still records win/loss, appends round data, and resets refs
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in win/loss, round appending, ref resets)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite to confirm no regressions
  - Verify bug condition test passes (match counter not incremented on round-end)
  - Verify preservation tests pass (win/loss, round data, ref resets unchanged)
  - Verify `handleEndMatch` increments map match counter exactly once and site match counters for each distinct site
  - Ask the user if questions arise

- [x] 5. Match lifecycle integration test
  - **Given**: Active deployment, active match on Clubhouse map with a valid operator
  - **When**: Round 1 ends on site CCTV, Round 2 ends on site Church, Round 3 ends on site CCTV, then match ends
  - **Then**:
    - Map (Clubhouse) match count = 1
    - CCTV site match count = 1
    - Church site match count = 1
    - No duplicate site increments (CCTV appears in 2 rounds but only gets 1 match increment)
    - Active match contains 3 rounds with correct site assignments
  - This validates the entire Match → Round architecture end-to-end
  - _Requirements: 2.3, 2.4, 3.2_

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["4"] },
    { "id": 5, "tasks": ["5"] }
  ]
}
```

## Notes

- The fix is pure deletion + relocation: remove 2 calls from `handleRoundEnd`, add equivalent calls in `handleEndMatch`
- Site match increment in `handleEndMatch` uses distinct sites from `activeMatch.rounds` — no new state needed
- All functions and state are already in scope in both handlers — no plumbing required
