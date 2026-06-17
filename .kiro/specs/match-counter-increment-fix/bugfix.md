# Bugfix Requirements Document

## Introduction

The `handleRoundEnd` function in `page.tsx` incorrectly increments the `matches` counter in Map Performance and Site Performance on every round end. Since the round-based-match-tracking feature separated Match and Round as distinct concepts, the match count should only increment when a match actually ends (via `handleEndMatch`), not on each round within a match. This causes the MapBreakdownPanel UI to display inflated match counts (e.g., "1 match" after a single round, "3 matches" after 3 rounds within the same match).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a round ends within an active match THEN the system calls `updateMapPerformance(operatorId, mapId, { matches: 1 })`, incrementing the map match counter prematurely
1.2 WHEN a round ends within an active match with a selected site THEN the system calls `updateSitePerformance(operatorId, mapId, siteId, { matches: 1 })`, incrementing the site match counter prematurely
1.3 WHEN a player completes multiple rounds within a single match THEN the MapBreakdownPanel displays a match count equal to the number of rounds played (e.g., 3 rounds shows "3 matches") instead of 0 until the match is ended

### Expected Behavior (Correct)

2.1 WHEN a round ends within an active match THEN the system SHALL NOT call `updateMapPerformance` with `{ matches: 1 }` — round-end shall only update win/loss record and per-round stats
2.2 WHEN a round ends within an active match with a selected site THEN the system SHALL NOT call `updateSitePerformance` with `{ matches: 1 }` — round-end shall only update per-round stats
2.3 WHEN a match ends (via `handleEndMatch`) THEN the system SHALL call `updateMapPerformance(operatorId, mapId, { matches: 1 })` exactly once to increment the map match counter
2.4 WHEN a match ends and the match contained rounds with site selections THEN the system SHALL increment Site Performance match counters based on the existing Site Performance analytics model. The implementation SHALL ensure that site match counts are updated only when a Match ends and SHALL NOT increment site match counts during round completion.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a round ends within an active match THEN the system SHALL CONTINUE TO call `updateMapWinLoss(mapId, outcome)` to record the per-round win/loss result
3.2 WHEN a round ends THEN the system SHALL CONTINUE TO append the round (with kills delta, deaths delta, site, and outcome) to the active match's rounds array
3.3 WHEN a round ends THEN the system SHALL CONTINUE TO reset `roundStartKillsRef` and `roundStartDeathsRef` and clear `currentSiteId`
3.4 WHEN a match ends THEN the system SHALL CONTINUE TO set `endedAt` on the match, clear `currentMapId`, and clear `currentSiteId`
