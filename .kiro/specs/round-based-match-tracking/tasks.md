# Implementation Plan: Round-Based Match Tracking

## Overview

Insert a Match layer between Deployment and Round. Map selection starts a Match, rounds append into it, and match-end closes it. Migration wraps old flat rounds into a synthetic legacy match. All state stays in `page.tsx` via existing `usePersistedState` hooks.

## Tasks

- [x] 1. Update data types and migration logic
  - [x] 1.1 Update HistoryList.tsx types — add MatchEntry interface, remove mapId from RoundEntry, add matches/schemaVersion to HistoryItem
    - Replace `RoundEntry.mapId` with match-level map
    - Add `MatchEntry` interface (id, mapId, startedAt, endedAt?, rounds[])
    - Add `matches?: MatchEntry[]` and `schemaVersion?: number` to `HistoryItem`
    - Keep `LegacyRoundEntry` type for migration reference
    - _Requirements: 1.1, 1.2, 1.3, 9.1_

  - [x] 1.2 Implement migrateHistoryItem function in page.tsx
    - Add `migrateHistoryItem` that wraps old `rounds[]` into a single legacy MatchEntry with `mapId: null`
    - Preserve per-round `_legacyMapId` for display
    - Handle case: no rounds and no matches → empty `matches: []`
    - Add mount `useEffect` that calls `setHistory(history.map(migrateHistoryItem))` when any item lacks `schemaVersion === 2`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 1.3 Write property test for legacy migration (Property 7)
    - **Property 7: Legacy migration preserves all rounds**
    - **Validates: Requirements 6.2, 6.4**

- [x] 2. Implement match lifecycle in page.tsx
  - [x] 2.1 Implement match-start logic — map selection creates a MatchEntry when no open match exists
    - Derive `activeMatch` from history (match without `endedAt` in current deployment)
    - On map selection: if no active match, create `MatchEntry { id, mapId, startedAt, rounds: [] }` and push to `activeHistoryItem.matches[]`
    - Set `currentMapId`, lock map selector
    - If active match already exists, reject the change (map is locked)
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Implement handleRoundEnd — append round to active match, reset counters, clear site
    - Compute `roundKills = kills - roundStartKillsRef.current`, same for deaths
    - Append `{ siteId, kills: roundKills, deaths: roundDeaths, outcome }` to `activeMatch.rounds`
    - Reset `roundStartKillsRef` and `roundStartDeathsRef` to current totals
    - Clear `currentSiteId` to null
    - Wire mastery calls using `activeMatch.mapId`
    - Replace existing `handleMatchEnd` with this new `handleRoundEnd`
    - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3_

  - [x] 2.3 Implement handleMatchEnd — close the active match and clear map/site
    - Set `activeMatch.endedAt` to ISO timestamp
    - Clear `currentMapId` and `currentSiteId`
    - Player can now select a new map to start another match
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.4 Implement map correction — update active match mapId in-place
    - Add correction affordance (edit button) on locked map selector
    - On correction: update `activeMatch.mapId` and `currentMapId`, no new match created
    - _Requirements: 5.1, 5.2_

  - [x] 2.5 Write property tests for match lifecycle (Properties 2, 3, 4, 5, 6)
    - **Property 2: Match creation from map selection**
    - **Property 3: Map locked during active match**
    - **Property 4: Round-end produces correct delta and resets counters**
    - **Property 5: Match-end sets valid timestamp**
    - **Property 6: Map correction updates in-place**
    - **Validates: Requirements 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 5.1, 5.2**

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update UI components
  - [x] 4.1 Update MapDeploySelector — add locked state with correction icon when match is active
    - Accept `isLocked` and `onCorrect` props
    - When locked: show selected map as non-interactive with small edit/pencil icon
    - When edit icon clicked: allow map change via `onCorrect`
    - _Requirements: 2.2, 5.1_

  - [x] 4.2 Update page.tsx round-end UI — replace "Match End" with "Round End" + separate "End Match" button
    - "Round End" triggers `handleRoundEnd` (win/loss result for the round)
    - "End Match" button closes the match (appears when match is active)
    - Round-end UI only appears when a match is active
    - _Requirements: 3.1, 4.1_

  - [x] 4.3 Update OperatorCardModal timeline — render rounds grouped by match
    - Group rounds under parent match, show match map name as header
    - For legacy matches (mapId null): show per-round `_legacyMapId` inline
    - Display rounds in chronological order within each match
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.4 Write unit tests for OperatorCardModal grouped timeline rendering
    - Test match-grouped display with map headers
    - Test legacy match inline map fallback
    - _Requirements: 7.1, 7.3_

- [x] 5. Wire persistence and remove deprecated fields
  - [x] 5.1 Clean up page.tsx — remove old handleMatchEnd, old mapId/siteId on HistoryItem writes, ensure history persists open matches
    - Remove the old `handleMatchEnd` that wrote to flat `rounds`
    - Remove `mapId`/`siteId` top-level fields from new HistoryItem creation in `handleAccept`
    - Verify `usePersistedState` persists partial match state (open match with rounds) on every state change
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 5.2 Write property test for persistence invariant (Property 9)
    - **Property 9: Partial match state persisted after round-end**
    - **Validates: Requirements 9.3**

- [x] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All state stays in `page.tsx` via existing `usePersistedState` — no new stores or context providers
- Active match is derived from `history` array, not stored separately
- `currentMapId` / `currentSiteId` are reused (set on match start, cleared on match end)
- Migration runs once on mount; schema version 2 indicates new format
- Property tests target extracted pure functions (migration, round-end delta, match transitions)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "4.1"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 4, "tasks": ["2.5", "4.2", "4.3"] },
    { "id": 5, "tasks": ["4.4", "5.1"] },
    { "id": 6, "tasks": ["5.2"] }
  ]
}
```
