# Implementation Plan: Map Performance Tracking

## Overview

This plan implements per-map performance tracking for XAWARS RNG. The approach starts with data models and pure logic, then builds persistence, UI components, and integration — wiring everything together incrementally. Each step builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Data models, map pool update, and core logic module
  - [x] 1.1 Define MapPerformanceRecord type and update MapData interface
    - Add `MapPerformanceRecord` interface to `app/types/database.ts` with fields: `operatorId`, `mapId`, `kills`, `deaths`, `matches`
    - Add `MapDisplayStats`, `MapBreakdownEntry`, and `BestOperatorEntry` types to `app/types/database.ts`
    - Update `MapData` interface in `app/data/maps.ts` to include `active: boolean` field
    - Update all existing entries in the `MAPS` array to include `active: true`
    - _Requirements: 7.1, 2.4_

  - [x] 1.2 Implement pure logic module `app/lib/map-performance.ts`
    - Implement `upsertMapPerformance()` — additive upsert of kills/deaths/matches for a composite key
    - Implement `computeMapStats()` — returns `MapDisplayStats` or null based on threshold (≥3 matches)
    - Implement `getMapBreakdown()` — returns sorted (K/D desc, ties by matches desc), capped at 10, excludes 0-match entries
    - Implement `getBestOperators()` — filters by map+side, threshold-gated, top 5, sorted by K/D desc
    - Implement `mergeMapPerformanceRecords()` — additive merge of two record sets
    - Implement `getActiveMaps()` — filters map pool by `active === true`, sorts alphabetically
    - Handle division by zero: when deaths=0 and kills>0, K/D = kills; when both 0, K/D = null
    - _Requirements: 3.1, 3.4, 4.1, 4.3, 5.1, 6.1, 6.2, 7.4_

  - [x] 1.3 Write property tests for map-performance logic
    - Create `app/lib/__tests__/map-performance.property.test.ts`
    - **Property 4: Upsert additivity** — sequential upserts produce sums of all deltas
    - **Property 7: Migration merge sums correctly** — merging two sets produces additive totals
    - **Property 9: Threshold gating of statistics** — stats returned only when matches ≥ 3
    - **Property 10: Map breakdown sorting and capping** — sorted by K/D desc, max 10, no 0-match entries
    - **Property 11: Best operators query** — max 5, correct side filter, threshold-gated, sorted correctly
    - **Property 2: Active map filtering** — returns only active maps, sorted alphabetically
    - **Validates: Requirements 3.1, 3.4, 4.1, 4.3, 5.1, 6.1, 6.2, 7.4, 2.1, 2.3**

  - [x] 1.4 Write unit tests for map-performance logic
    - Create `app/lib/__tests__/map-performance.test.ts`
    - Test K/D display with 0 deaths (should display kills value)
    - Test K/D display with 0 kills and 0 deaths (should return null/dash)
    - Test records with deactivated maps are retained but excluded from active map list
    - Test `getMapBreakdown` excludes entries with 0 matches
    - Test `getBestOperators` returns empty array when no qualifying data
    - _Requirements: 4.4, 2.2, 6.2_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Data persistence layer (localStorage and Supabase)
  - [x] 3.1 Implement localStorage persistence for map performance
    - Add `xawars_mapPerformance` key management in `DataContext`
    - Implement read/write with `{operatorId}_{mapId}` composite key format
    - Handle `QuotaExceededError` gracefully (log warning, continue)
    - Handle corrupted JSON gracefully (return empty records)
    - _Requirements: 3.3, 3.5_

  - [x] 3.2 Create Supabase migration for `map_performance` table
    - Create SQL migration file with table definition: `id`, `user_id`, `operator_id`, `map_id`, `kills`, `deaths`, `matches`, `updated_at`
    - Add unique constraint on (`user_id`, `operator_id`, `map_id`)
    - Implement upsert SQL pattern with additive semantics (ON CONFLICT DO UPDATE SET kills = kills + EXCLUDED.kills, etc.)
    - _Requirements: 7.2, 7.4_

  - [x] 3.3 Integrate map performance with `DataContext` and `syncQueue`
    - Add `mapPerformanceRecords` state to `DataContext`
    - Add `updateMapPerformance(operatorId, mapId, delta)` action that calls `upsertMapPerformance` and persists
    - For authenticated users, enqueue upsert operations through `syncQueue`
    - Load map performance records from Supabase on authenticated session init
    - _Requirements: 3.1, 3.5, 7.4_

  - [x] 3.4 Implement guest-to-authenticated migration for map performance
    - Add `migrateMapPerformance(userId)` to `migration-service.ts`
    - Read localStorage records, merge with cloud records using `mergeMapPerformanceRecords()`
    - Upsert merged results to Supabase, clear localStorage on success
    - Handle partial failure: successfully merged records persist, failed ones remain in localStorage
    - _Requirements: 3.4_

  - [x] 3.5 Write property tests for persistence round-trip
    - **Property 6: localStorage round-trip for performance records** — serialize/deserialize produces equivalent records
    - **Property 13: Map selector persistence round-trip** — persisting and reading map selection returns same value
    - **Property 8: Failed persistence preserves state** — state unchanged after failed operation
    - **Validates: Requirements 3.3, 3.5, 1.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. MapSelector component and kill/death attribution
  - [x] 5.1 Create `MapSelector` component
    - Create `app/components/MapSelector.tsx` as a controlled `<select>` dropdown
    - Populate with active maps from `getActiveMaps(MAPS)`, sorted alphabetically
    - Default to placeholder option ("No map selected")
    - Hide the component entirely if no active maps exist
    - Accept `selectedMapId`, `onMapChange`, and `disabled` props
    - _Requirements: 1.1, 1.2, 2.1, 2.5_

  - [x] 5.2 Integrate MapSelector with deployment UI and kill/death recording
    - Render `MapSelector` alongside kill/death counters in the active deployment area
    - Store selected map ID in component state, persist to localStorage for refresh survival
    - On kill/death increment: call `updateMapPerformance(operatorId, selectedMapId, { kills: delta })` or `{ deaths: delta }`
    - On map change: increment match count for previous operator-map combination (if previous map was not null)
    - When map changed back to placeholder, subsequent increments have no map attribution
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 3.2_

  - [x] 5.3 Write property tests for map attribution
    - **Property 1: Attribution follows current selection** — increments attributed to currently selected map
    - **Property 5: Match count increments on map change** — match count equals number of transitions away from a map
    - **Validates: Requirements 1.3, 1.4, 1.5, 3.2**

  - [x] 5.4 Write unit tests for MapSelector component
    - Test MapSelector defaults to placeholder
    - Test MapSelector hidden when no active maps
    - Test MapSelector displays only active maps in alphabetical order
    - _Requirements: 1.2, 2.1, 2.5_

- [x] 6. MapBreakdownPanel in Mastery Detail Modal
  - [x] 6.1 Create `MapBreakdownPanel` component
    - Create `app/components/mastery/MapBreakdownPanel.tsx`
    - Call `getMapBreakdown(operatorId, records)` for sorted map entries
    - Display each qualifying map: name, K/D (2 decimal places), total kills, total deaths, match count
    - For below-threshold entries: show match count "X/3" with "more data needed" label
    - For zero-match operator: show empty state indicating map tagging is available
    - Visually highlight the best-performing map (highest K/D) with a distinct border/background
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.2_

  - [x] 6.2 Integrate MapBreakdownPanel into MasteryDetailModal
    - Add `MapBreakdownPanel` between the existing stats grid and footer in `MasteryDetailModal`
    - Pass the current operator's ID and map performance records from `DataContext`
    - _Requirements: 5.1_

  - [x] 6.3 Write unit tests for MapBreakdownPanel
    - Test below-threshold entry shows "X/3" label
    - Test zero-match records excluded from display
    - Test empty state shown when operator has no map data
    - Test best map is highlighted with distinct style
    - _Requirements: 4.2, 4.4, 5.4, 5.5_

- [x] 7. BestOperatorsSection in Map Advisor
  - [x] 7.1 Create `BestOperatorsSection` component
    - Create `app/components/BestOperatorsSection.tsx`
    - Call `getBestOperators(mapId, side, records, operatorLookup)` for top 5 qualifying operators
    - Display each operator: name, K/D (2 decimal places), match count
    - Show empty state when no qualifying data for selected map and side
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Integrate BestOperatorsSection into MapAdvisor
    - Render `BestOperatorsSection` below existing community recommendation tiers in `MapAdvisor`
    - Pass current map ID, selected side, and map performance records from `DataContext`
    - Update when user changes the selected side (attack/defense)
    - _Requirements: 6.5, 6.6_

  - [x] 7.3 Write unit tests for BestOperatorsSection
    - Test empty state shown when no qualifying operator-map data
    - Test section positioned below community recommendations
    - Test section updates when side changes
    - _Requirements: 6.3, 6.5, 6.6_

- [x] 8. Backward compatibility and final integration
  - [x] 8.1 Verify backward compatibility with existing operator stats
    - Ensure existing `operator-stats.ts` computations (K/D, averages, deployments, mastery tier) remain unchanged
    - Ensure deployment history works without map data
    - Ensure `MapData` entries without explicit `active` field default to `true` for backward compatibility
    - _Requirements: 7.3, 2.4_

  - [x] 8.2 Write backward compatibility tests
    - **Property 12: Backward compatibility** — existing stat computations produce identical results regardless of MapPerformanceRecords
    - Test existing deployments function without map data
    - Test MapData without `active` field defaults correctly
    - **Validates: Requirements 7.3**

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The pure logic module (`map-performance.ts`) is implemented first to enable early property testing
- `fast-check` is already in devDependencies; `vitest --run` is the test runner

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "1.4", "3.2"] },
    { "id": 3, "tasks": ["3.1", "3.3"] },
    { "id": 4, "tasks": ["3.4", "3.5"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3", "5.4", "6.1"] },
    { "id": 8, "tasks": ["6.2", "7.1"] },
    { "id": 9, "tasks": ["6.3", "7.2"] },
    { "id": 10, "tasks": ["7.3", "8.1"] },
    { "id": 11, "tasks": ["8.2"] }
  ]
}
```
