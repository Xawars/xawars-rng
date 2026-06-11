# Requirements Document

## Introduction

Map Performance Tracking adds per-map performance insights to XAWARS RNG. Users can tag their kill/death increments with a map, enabling the system to track which maps they perform best on with each operator. A single deployment spans multiple matches across different maps, so map tracking happens at the kill/death recording level — not at deployment creation. This data surfaces in the Mastery Detail Modal as per-operator map breakdowns and enhances the Map Advisor with personalized "best operators on this map" recommendations. The feature accounts for data sparsity by requiring a minimum match threshold before displaying map-level insights, and maintains a seasonally-updatable map pool.

## Glossary

- **Deployment**: A single operator roulette roll that a user commits to playing, spanning one or more matches until the kill target is reached.
- **Match**: A single game played on a specific map during a deployment.
- **Kill_Increment**: A user action that records one or more kills earned in a match, optionally associated with a map.
- **Death_Increment**: A user action that records one or more deaths suffered in a match, optionally associated with a map.
- **Map_Selector**: The UI element displayed alongside the kill/death counters that allows a user to set the current map they are playing on.
- **Map_Pool**: The canonical list of Rainbow Six Siege maps available for selection, maintained as a data file that can be updated seasonally.
- **Map_Performance_Record**: A data structure storing kills, deaths, and match count for a specific operator on a specific map.
- **Insight_Threshold**: The minimum number of matches on a given operator-map combination (3) required before map-level statistics are displayed.
- **Map_Breakdown_Panel**: The section within the Mastery Detail Modal showing per-map performance for a specific operator.
- **Best_Operators_Section**: The section within the Map Advisor that displays the user's top-performing operators on the currently selected map.
- **System**: The XAWARS RNG application.
- **Data_Layer**: The persistence layer comprising Supabase (for authenticated users) and localStorage (for guest users).

## Requirements

### Requirement 1: Map Selection on Kill/Death Recording

**User Story:** As a user, I want to set which map I'm currently playing on, so that my kills and deaths are attributed to the correct map.

#### Acceptance Criteria

1. WHEN an operator is deployed, THE Map_Selector SHALL be displayed alongside the kill/death counter area, populated with all active maps from the Map_Pool in alphabetical order.
2. THE Map_Selector SHALL default to a placeholder option indicating no map is selected, allowing the user to track kills/deaths without map attribution.
3. WHEN the user selects a map from the Map_Selector, THE System SHALL attribute all subsequent kill and death increments to that map until the user changes the selection.
4. WHEN the user changes the Map_Selector to a different map mid-deployment, THE System SHALL attribute new kill and death increments to the newly selected map without modifying previously recorded increments.
5. WHEN the user changes the Map_Selector back to the placeholder, THE System SHALL record subsequent kill/death increments without map attribution.
6. THE Map_Selector SHALL persist its current selection across page refreshes for the active deployment.

### Requirement 2: Map Pool Management

**User Story:** As a developer, I want the map pool to be maintained in a single data source, so that seasonal map rotations can be updated without code changes across multiple files.

#### Acceptance Criteria

1. THE System SHALL source the Map_Selector options exclusively from the `MAPS` array exported by the Map_Pool data file (`app/data/maps.ts`), rendering only entries whose `active` property is `true` as selectable options.
2. WHEN a map entry's `active` property is set to `false` in the Map_Pool, THE System SHALL retain all existing Map_Performance_Records referencing that map.
3. WHEN a map entry's `active` property is set to `false` in the Map_Pool, THE Map_Selector SHALL exclude that map from the selectable options on the next page load.
4. THE Map_Pool SHALL support adding new maps by appending entries to the `MAPS` array, where each entry contains at minimum an `id` (unique string), a `name` (string, 1–50 characters), and an `active` flag, without requiring modification of existing entries or code changes in consuming components.
5. IF the Map_Pool contains zero entries with `active` set to `true`, THEN THE Map_Selector SHALL be hidden.

### Requirement 3: Map Performance Data Persistence

**User Story:** As a user, I want my per-map performance data stored reliably, so that my statistics are available across sessions.

#### Acceptance Criteria

1. WHEN a user increments kills or deaths while a map is selected, THE Data_Layer SHALL upsert the Map_Performance_Record for that operator-map combination by adding the kill/death delta to the existing totals.
2. WHEN the user changes the selected map during a deployment, THE Data_Layer SHALL increment the match count for the previous operator-map combination by 1 (representing a completed match on that map).
3. WHEN a guest user records kills/deaths with a map selected, THE Data_Layer SHALL store Map_Performance_Records in localStorage using the key `xawars_mapPerformance`, structured as a record keyed by `{operatorId}_{mapId}`.
4. WHEN a user migrates from guest to authenticated, THE Data_Layer SHALL merge localStorage Map_Performance_Records into cloud storage by summing kills, deaths, and match counts with any existing cloud records for the same operator-map combination.
5. IF a persistence operation for a Map_Performance_Record fails, THEN THE Data_Layer SHALL retain the pre-operation state without data loss.

### Requirement 4: Data Sparsity Threshold

**User Story:** As a user, I want to see map-level insights only when there is enough data to be meaningful, so that I am not misled by small sample sizes.

#### Acceptance Criteria

1. WHILE an operator-map combination has fewer than 3 matches, THE System SHALL hide K/D ratio and average-kills values for that operator-map combination.
2. WHILE an operator-map combination has fewer than 3 matches, THE Map_Breakdown_Panel SHALL display the current match count (e.g., "1/3" or "2/3") alongside a label indicating more data is needed before statistics are shown.
3. WHEN an operator-map combination reaches 3 or more matches, THE System SHALL display K/D ratio, average kills per match, total kills, total deaths, and match count for that operator-map combination.
4. WHILE an operator-map combination has 0 matches, THE Map_Breakdown_Panel SHALL NOT display that map in the operator's map breakdown list.

### Requirement 5: Mastery Detail Modal Map Breakdown

**User Story:** As a user, I want to see which maps I perform best on with each operator, so that I can make informed decisions about operator picks.

#### Acceptance Criteria

1. WHEN a user opens the Mastery Detail Modal for an operator that has at least one map-attributed match, THE Map_Breakdown_Panel SHALL display a list of maps sorted by K/D ratio descending, with ties broken by match count descending, showing a maximum of 10 maps.
2. THE Map_Breakdown_Panel SHALL display for each map meeting the Insight_Threshold: map name, K/D ratio (to 2 decimal places), total kills, total deaths, and match count.
3. WHILE an operator-map combination has fewer than 3 matches, THE Map_Breakdown_Panel SHALL display that map's entry with match count only and a label indicating more data is needed.
4. WHILE the operator has zero map-attributed matches, THE Map_Breakdown_Panel SHALL display an empty state indicating map tagging is available.
5. IF at least one map meets the Insight_Threshold, THEN THE Map_Breakdown_Panel SHALL visually distinguish the operator's best-performing map (highest K/D) from other entries using a differentiated border or background style.

### Requirement 6: Map Advisor Best Operators Integration

**User Story:** As a user, I want the Map Advisor to show which operators I personally perform best on for a given map, so that I can combine community recommendations with my own data.

#### Acceptance Criteria

1. WHEN a user selects a map in the Map Advisor, THE Best_Operators_Section SHALL display up to 5 of the user's top operators on that map for the currently selected side (attack or defense), sorted by K/D ratio descending, with ties broken by higher match count.
2. THE Best_Operators_Section SHALL only display operators that meet the Insight_Threshold for the selected map.
3. WHILE the user has no qualifying operator-map data for the selected map and side, THE Best_Operators_Section SHALL display an empty state indicating that map-tagged matches are needed to populate recommendations.
4. THE Best_Operators_Section SHALL display each operator's K/D ratio (rounded to 2 decimal places) and match count on the selected map.
5. THE Best_Operators_Section SHALL appear as a distinct section below the existing community recommendations in the Map Advisor.
6. WHEN the user changes the selected side (attack or defense), THE Best_Operators_Section SHALL update to show only operators matching the newly selected side.

### Requirement 7: Map Performance Record Schema

**User Story:** As a developer, I want a clear data model for map performance, so that the feature integrates cleanly with the existing persistence layer.

#### Acceptance Criteria

1. THE System SHALL define a `MapPerformanceRecord` type containing: `operatorId` (string), `mapId` (string), `kills` (number), `deaths` (number), and `matches` (number).
2. WHEN persisting to Supabase, THE Data_Layer SHALL store Map_Performance_Records in a `map_performance` table with columns: `id`, `user_id`, `operator_id`, `map_id`, `kills`, `deaths`, `matches`, `updated_at`, with a unique constraint on (`user_id`, `operator_id`, `map_id`).
3. THE System SHALL maintain backward compatibility — existing deployments and operator stats without map data SHALL continue to function without error.
4. THE Data_Layer SHALL support upsert semantics on the `map_performance` table, incrementing kills/deaths/matches rather than overwriting.
