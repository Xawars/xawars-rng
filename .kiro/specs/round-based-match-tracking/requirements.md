# Requirements Document

## Introduction

Introduces a Match container between the existing Deployment and Round levels. A Deployment contains zero or more Matches; a Match contains one or more Rounds. Map selection moves to Match-start and remains fixed for all Rounds within that Match. Existing flat `rounds[]` data is migrated into a synthetic "Legacy Match" on first load.

## Glossary

- **Tracker**: The Xawars RNG client application (Next.js SPA persisting to localStorage)
- **Match**: A named container within a Deployment representing a single competitive game, bound to a specific map
- **Round**: A single round played within a Match, recording site, kills, deaths, and outcome
- **Deployment**: An existing entity representing an operator session (unchanged by this feature)
- **HistoryItem**: The persisted data structure representing a Deployment and its child Matches/Rounds in localStorage
- **Legacy_Data**: Persisted HistoryItems using the old flat `rounds: RoundEntry[]` schema without a wrapping Match container
- **Schema_Version**: A numeric field on the persisted data indicating the storage format version

## Requirements

### Requirement 1: Match Data Model

**User Story:** As a player, I want my rounds grouped into distinct matches, so that I can review my performance on a per-match basis.

#### Acceptance Criteria

1. THE Tracker SHALL store Matches as an ordered array within each HistoryItem, where each Match contains an identifier, a map identifier, a start timestamp, an optional end timestamp, and an ordered array of Rounds.
2. THE Tracker SHALL store each Round within a Match containing: site identifier (nullable), kills count, deaths count, and outcome (win or loss).
3. THE Tracker SHALL treat the `matches` array as the single source of truth for round-level data within a HistoryItem, replacing the previous flat `rounds` array.

### Requirement 2: Match Lifecycle — Start

**User Story:** As a player, I want to start a match by selecting a map, so that the map is locked for all rounds in that match.

#### Acceptance Criteria

1. WHEN the player selects a map while a Deployment is active and no Match is in progress, THE Tracker SHALL create a new Match entity with the selected map and a start timestamp.
2. WHILE a Match is in progress, THE Tracker SHALL display the map as locked and prevent changing to a different map.
3. WHILE a Match is in progress, THE Tracker SHALL allow the player to select and change the bomb site between rounds.

### Requirement 3: Match Lifecycle — End Round

**User Story:** As a player, I want to end a round with a win or loss result, so that my per-round stats are captured within the active match.

#### Acceptance Criteria

1. WHEN the player ends a round with an outcome, THE Tracker SHALL append a new Round to the current Match containing the active site, the kills accumulated since the round started, the deaths accumulated since the round started, and the selected outcome.
2. WHEN a round is appended, THE Tracker SHALL reset the round-start kill/death reference counters for the next round.
3. WHEN a round is appended, THE Tracker SHALL clear the selected site so the player picks a new site for the next round.

### Requirement 4: Match Lifecycle — End Match

**User Story:** As a player, I want to explicitly end a match, so that the match container is closed and I can start a new match on a different map.

#### Acceptance Criteria

1. WHEN the player ends a match, THE Tracker SHALL set the end timestamp on the current Match and mark the Match as closed.
2. WHEN the player ends a match, THE Tracker SHALL clear the active map and site selections.
3. WHEN a Match is closed, THE Tracker SHALL allow the player to start a new Match within the same Deployment by selecting another map.

### Requirement 5: Match Map Correction

**User Story:** As a player, I want to correct the map on an active match if I selected the wrong one, so that my data reflects the actual game.

#### Acceptance Criteria

1. WHILE a Match is in progress, THE Tracker SHALL provide a mechanism to edit the Match map as a correction.
2. WHEN the player corrects a Match map, THE Tracker SHALL update the map identifier on the active Match without creating a new Match.

### Requirement 6: Data Migration

**User Story:** As a returning player, I want my old round data preserved after the update, so that I do not lose historical stats.

#### Acceptance Criteria

1. THE Tracker SHALL include a schema version field in the persisted data structure.
2. WHEN the Tracker loads persisted data that contains a flat `rounds` array without a `matches` array, THE Tracker SHALL migrate the flat rounds into a single synthetic Match named "Legacy Match" with no map identifier.
3. WHEN migration completes, THE Tracker SHALL persist the migrated structure immediately and read/write only the new format going forward.
4. IF the persisted data contains neither `rounds` nor `matches`, THEN THE Tracker SHALL initialize the HistoryItem with an empty `matches` array.

### Requirement 7: Operator Card Modal Timeline

**User Story:** As a player, I want the Operator Card timeline to show my rounds grouped by match, so that I can see match boundaries clearly.

#### Acceptance Criteria

1. WHEN the Operator Card Modal displays round history, THE Tracker SHALL render rounds grouped under their parent Match, showing the Match map name as a header.
2. WHEN a Match contains multiple rounds, THE Tracker SHALL display them in chronological order within the Match group.
3. WHERE a Match has no map identifier (Legacy Match), THE Tracker SHALL display the per-round map identifiers inline as in the current behavior.

### Requirement 8: Mastery Integration

**User Story:** As a player, I want map performance tracking to continue working with the new match structure, so that Operator Mastery stats remain accurate.

#### Acceptance Criteria

1. WHEN a round is ended within a Match, THE Tracker SHALL update the Operator Mastery map performance data using the Match-level map identifier.
2. WHEN a round is ended within a Match with a selected site, THE Tracker SHALL update the Operator Mastery site performance data using the Match-level map identifier and the Round-level site identifier.
3. WHEN a round is ended within a Match, THE Tracker SHALL update the map win/loss record using the Match-level map identifier and the round outcome.

### Requirement 9: Persistence Format

**User Story:** As a player, I want my match data reliably persisted, so that it survives page reloads and syncs correctly.

#### Acceptance Criteria

1. THE Tracker SHALL persist the complete `matches` array within the existing HistoryItem stored via the usePersistedState hook under the `xawars_history` localStorage key.
2. THE Tracker SHALL persist the schema version alongside the history data so future migrations can be detected.
3. WHILE a Match is in progress, THE Tracker SHALL persist partial Match state (open Match with appended rounds) so that data is not lost on unexpected page close.
