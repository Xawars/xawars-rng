# Match Counter Increment Fix — Bugfix Design

## Overview

The `handleRoundEnd` function in `app/page.tsx` incorrectly increments the `matches` counter in both Map Performance and Site Performance every time a round ends. Since matches and rounds are distinct concepts, the match counter should only increment once per match — when `handleEndMatch` is called — not on every round within that match. The fix removes the `{ matches: 1 }` calls from `handleRoundEnd` and adds them to `handleEndMatch`.

## Glossary

- **Bug_Condition (C)**: A round ends within an active match (`handleRoundEnd` is invoked) while `activeMatch.mapId` exists and `currentOperator` is set
- **Property (P)**: Round-end shall NOT increment the `matches` field in map/site performance; match-end shall increment it exactly once
- **Preservation**: Per-round win/loss recording, round appending to the match, and kill/death ref resets must remain unchanged
- **handleRoundEnd**: The function in `app/page.tsx` that records a round outcome (win/loss) and resets per-round state
- **handleEndMatch**: The function in `app/page.tsx` that closes an active match by setting `endedAt` and clearing map/site state
- **updateMapPerformance**: Additive upsert in DataContext that increments kills, deaths, or matches for an operator+map pair
- **updateSitePerformance**: Additive upsert in DataContext that increments kills, deaths, or matches for an operator+map+site tuple

## Bug Details

### Bug Condition

The bug manifests when a round ends within an active match that has a `mapId` and a `currentOperator`. The `handleRoundEnd` function calls `updateMapPerformance(operatorId, mapId, { matches: 1 })` and (if a site is selected) `updateSitePerformance(operatorId, mapId, siteId, { matches: 1 })`, inflating the match counter by 1 per round instead of per match.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { event: 'roundEnd', activeMatch: Match, currentOperator: Operator | null, mapId: string | null }
  OUTPUT: boolean

  RETURN input.event == 'roundEnd'
         AND input.activeMatch IS NOT NULL
         AND input.activeMatch.mapId IS NOT NULL
         AND input.currentOperator IS NOT NULL
END FUNCTION
```

### Examples

- Player plays 3 rounds in a single match on "Consulate" → Map Performance shows "3 matches" instead of "0" (match hasn't ended yet)
- Player plays 5 rounds with site "B" selected on some of them → Site Performance increments match count per round, not per match
- Player ends the match via `handleEndMatch` → Match count is NOT incremented (it was already over-counted during rounds)
- Player plays rounds without a `currentOperator` set → No bug (guard clause prevents the call)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `updateMapWinLoss(mapId, outcome)` must continue to be called in `handleRoundEnd` to record per-round win/loss
- Round data (kills delta, deaths delta, site, outcome) must continue to be appended to the active match's rounds array
- `roundStartKillsRef` and `roundStartDeathsRef` must continue to be reset after each round
- `currentSiteId` must continue to be cleared after each round
- `handleEndMatch` must continue to set `endedAt`, clear `currentMapId`, and clear `currentSiteId`
- Kill/death attribution to map/site performance (via `performKillIncrement` / `performDeathIncrement`) must remain unchanged

**Scope:**
All inputs that do NOT involve the `{ matches: 1 }` delta passed during round-end should be completely unaffected by this fix. This includes:
- Per-round kill/death map performance updates (those happen in `performKillIncrement`/`performDeathIncrement`)
- Win/loss recording per round
- Match lifecycle (start, append rounds, end)

## Hypothesized Root Cause

Based on the code, the root cause is straightforward:

1. **Misplaced increment call**: Lines 575–578 in `handleRoundEnd` call `updateMapPerformance(... { matches: 1 })` and `updateSitePerformance(... { matches: 1 })`. These calls belong in `handleEndMatch`, not `handleRoundEnd`.

2. **Missing increment in `handleEndMatch`**: The `handleEndMatch` function only sets `endedAt` and clears state — it never calls `updateMapPerformance` or `updateSitePerformance` with `{ matches: 1 }`. So the match counter is incremented in the wrong place and missing from the right place.

## Correctness Properties

Property 1: Bug Condition - Round-end does not increment match counter

_For any_ round-end event where `isBugCondition` returns true (active match with mapId and operator), the fixed `handleRoundEnd` function SHALL NOT call `updateMapPerformance` or `updateSitePerformance` with `{ matches: 1 }`.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Round-end still records win/loss and round data

_For any_ round-end event, the fixed `handleRoundEnd` function SHALL produce the same side effects as the original function for all fields except the `matches` increment — specifically preserving `updateMapWinLoss`, round appending, ref resets, and site clearing.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 3: Fix Condition - Match-end increments match counter exactly once

_For any_ match-end event (invocation of `handleEndMatch`) where the active match has a `mapId` and `currentOperator`, the fixed `handleEndMatch` function SHALL call `updateMapPerformance(operatorId, mapId, { matches: 1 })` exactly once, and SHALL call `updateSitePerformance` for sites that had rounds in that match.

**Validates: Requirements 2.3, 2.4**

## Fix Implementation

### Changes Required

**File**: `app/page.tsx`

**Function**: `handleRoundEnd`

**Specific Changes**:
1. **Remove match increment from round-end**: Delete the `updateMapPerformance(currentOperator.id, activeMatch.mapId, { matches: 1 })` call and the corresponding `updateSitePerformance(... { matches: 1 })` call from `handleRoundEnd`.

**Function**: `handleEndMatch`

**Specific Changes**:
2. **Add match increment to match-end**: In `handleEndMatch`, after setting `endedAt`, call `updateMapPerformance(operatorId, mapId, { matches: 1 })` once for the match's map.
3. **Add site match increment to match-end**: Determine which distinct sites had rounds in the ending match and call `updateSitePerformance(operatorId, mapId, siteId, { matches: 1 })` once per distinct site. The metric is "matches containing this site," not "rounds played on this site" — round counts are derivable from the rounds array and don't need a separate counter.
4. **Access necessary state**: `handleEndMatch` already has access to `activeMatch` (which contains `mapId` and `rounds`), `currentOperator`, and the update functions — no new dependencies needed.

### Lifecycle Ordering Guarantee

The UI enforces strict sequencing: the player clicks "Win"/"Loss" to record a round (which appends to `activeMatch.rounds` via `setHistory`) before clicking "End Match." These are separate button actions — `handleEndMatch` cannot fire without a preceding round-end. The site aggregation in `handleEndMatch` reads from the already-updated `rounds` array in state, so the final round is always present when match-end statistics are computed. No race condition or ordering issue exists.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that `handleRoundEnd` calls `updateMapPerformance` with `{ matches: 1 }`.

**Test Plan**: Write unit tests that invoke `handleRoundEnd` and assert whether `updateMapPerformance` is called with a `matches` delta. Run on UNFIXED code to observe the incorrect behavior.

**Test Cases**:
1. **Single round end**: Call `handleRoundEnd('win')` once → observe `updateMapPerformance` called with `{ matches: 1 }` (will fail assertion that it should NOT be called)
2. **Multiple rounds in one match**: Call `handleRoundEnd` 3 times → observe match counter incremented 3 times (demonstrates inflation)
3. **Round with site**: Call `handleRoundEnd` with `currentSiteId` set → observe `updateSitePerformance` also called with `{ matches: 1 }`

**Expected Counterexamples**:
- `updateMapPerformance` is called with `{ matches: 1 }` on every round-end invocation
- Match count equals round count after N rounds in a single match

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleRoundEnd_fixed(input)
  ASSERT updateMapPerformance NOT called with { matches: 1 }
  ASSERT updateSitePerformance NOT called with { matches: 1 }
END FOR

FOR ALL match WHERE matchEnds(match) DO
  result := handleEndMatch_fixed(match)
  ASSERT updateMapPerformance called with { matches: 1 } exactly once
  ASSERT updateSitePerformance called with { matches: 1 } for each distinct site in match.rounds
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT handleRoundEnd_original(input) = handleRoundEnd_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many round-end scenarios (varying operator, map, site, kills, deaths, outcome)
- It catches edge cases like missing operator, missing map, or no active match
- It provides strong guarantees that non-match-counter behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code for win/loss recording, round appending, and ref resets, then write property-based tests capturing that behavior remains identical after the fix.

**Test Cases**:
1. **Win/loss preservation**: Verify `updateMapWinLoss` is still called with the correct outcome after fix
2. **Round appending preservation**: Verify round data (kills, deaths, site, outcome) is still appended to the match
3. **Ref reset preservation**: Verify `roundStartKillsRef` and `roundStartDeathsRef` are reset after round-end
4. **handleEndMatch lifecycle preservation**: Verify `endedAt` is set and `currentMapId`/`currentSiteId` are cleared

### Unit Tests

- Test that `handleRoundEnd` does NOT call `updateMapPerformance` with `{ matches: 1 }`
- Test that `handleRoundEnd` still calls `updateMapWinLoss`
- Test that `handleEndMatch` calls `updateMapPerformance` with `{ matches: 1 }` exactly once
- Test that `handleEndMatch` calls `updateSitePerformance` with `{ matches: 1 }` for each distinct site in the match

### Property-Based Tests

- Generate random sequences of round-end calls and verify match counter is never incremented during rounds
- Generate matches with varying numbers of rounds and sites, end the match, and verify site match counts equal the number of distinct sites (not the number of rounds)
- Generate round-end inputs with various operator/map/site combinations and verify all non-match side effects are preserved

### Integration Tests

- Full match flow: start match → play N rounds → end match → verify map match count is 1
- Multi-site match: play rounds on sites A, B, A → end match → verify site match counts are 1 for A and 1 for B
- Multiple matches on same map: complete 2 separate matches → verify map match count is 2
