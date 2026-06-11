# Requirements Document

## Introduction

Session Enhancements adds three lightweight, motivational features to XAWARS RNG: a hot streak indicator that provides real-time visual feedback when a user is performing well, a session summary that recaps performance when the user finishes playing, and map win/loss tracking that lets users record match outcomes and view win rates per map over time. These features build on the existing kill/death tracking, map performance data, and dual-persistence architecture (localStorage for guests, Supabase for authenticated users).

## Glossary

- **System**: The XAWARS RNG application.
- **Hot_Streak**: A state representing 3 or more consecutive Kill_Increments without an intervening Death_Increment within the current browser session.
- **Hot_Streak_Indicator**: A flame icon displayed in the kill/death counter area when the user is in a Hot_Streak state.
- **Kill_Streak_Counter**: An in-memory counter that tracks consecutive kills without a death in the current session.
- **Session**: A continuous period of app usage beginning when the user loads the page and ending when the user explicitly ends the session or closes the browser tab.
- **Session_Summary_Modal**: A modal displayed at session end showing aggregated performance statistics for the current session.
- **Session_Snapshot**: A record of kills, deaths, and operators played captured at session start, used to compute session deltas.
- **Match_Outcome**: A user-recorded result of "Won" or "Lost" for a completed match on a specific map.
- **Map_Win_Loss_Record**: A data structure storing wins and losses for a specific map, persisted across sessions.
- **Data_Layer**: The persistence layer comprising Supabase (for authenticated users) and localStorage (for guest users).
- **Map_Pool**: The canonical list of Rainbow Six Siege maps available for selection.

## Requirements

### Requirement 1: Hot Streak Detection

**User Story:** As a user, I want the app to detect when I'm on a killing streak, so that I get visual motivation during a hot run.

#### Acceptance Criteria

1. THE System SHALL maintain a Kill_Streak_Counter in memory, initialized to 0 when the page loads.
2. WHEN the user records a Kill_Increment, THE System SHALL increase the Kill_Streak_Counter by 1.
3. WHEN the user records a Death_Increment, THE System SHALL reset the Kill_Streak_Counter to 0.
4. WHEN the Kill_Streak_Counter reaches 3 or higher, THE System SHALL set the Hot_Streak state to active.
5. WHEN the Kill_Streak_Counter drops below 3, THE System SHALL set the Hot_Streak state to inactive.
6. THE System SHALL NOT persist the Kill_Streak_Counter across page refreshes; the counter resets to 0 on each new page load.
7. IF the user records a Kill_Decrement (subtracting a kill), THEN THE System SHALL decrease the Kill_Streak_Counter by 1, to a minimum of 0.

### Requirement 2: Hot Streak Visual Indicator

**User Story:** As a user, I want to see a flame icon when I'm on a hot streak, so that I have immediate visual feedback about my performance.

#### Acceptance Criteria

1. WHILE the Hot_Streak state is active, THE Hot_Streak_Indicator SHALL display a flame icon adjacent to the kill counter.
2. WHILE the Hot_Streak state is active, THE Hot_Streak_Indicator SHALL display the current Kill_Streak_Counter value next to the flame icon, updating the displayed value each time the Kill_Streak_Counter changes.
3. WHEN the Hot_Streak state transitions from inactive to active, THE Hot_Streak_Indicator SHALL animate into view with a scale transition from 0 to 1 and opacity transition from 0 to 1 lasting 300 milliseconds.
4. WHEN the Hot_Streak state transitions from active to inactive, THE Hot_Streak_Indicator SHALL animate out of view with a scale transition from 1 to 0 and opacity transition from 1 to 0 lasting 200 milliseconds.
5. IF the Hot_Streak state transitions from inactive to active while an exit animation is in progress, THEN THE Hot_Streak_Indicator SHALL cancel the exit animation and immediately begin the entry animation from the indicator's current visual state.
6. THE Hot_Streak_Indicator SHALL be purely decorative and have no effect on game logic, statistics, or persistence.
7. THE Hot_Streak_Indicator SHALL include an accessible label that dynamically reflects the current streak count for screen readers (e.g., "Hot streak: 5 kills").

### Requirement 3: Session Snapshot Capture

**User Story:** As a user, I want the app to remember my stats when I start playing, so that it can show me how I did when I finish.

#### Acceptance Criteria

1. WHEN the page loads and persisted state is available, THE System SHALL capture a Session_Snapshot containing the current total kills, total deaths, list of operator IDs with their respective kill and death counts, and the current Map_Win_Loss_Records from persisted state.
2. THE System SHALL store the Session_Snapshot in memory only; the snapshot is not persisted to localStorage or Supabase.
3. IF persisted state is not yet available at page load (hydration pending), THEN THE System SHALL defer snapshot capture until hydration completes and then capture the Session_Snapshot from the hydrated state.
4. IF hydration fails due to a network or storage error, THEN THE System SHALL capture the Session_Snapshot using default zero values (0 total kills, 0 total deaths, empty operator list, empty Map_Win_Loss_Records).
5. THE System SHALL NOT overwrite an existing Session_Snapshot on subsequent page visibility changes or hot-module reloads; the snapshot SHALL remain unchanged until explicitly reset by the "End Session" action.
6. WHEN the "End Session" action resets the Session_Snapshot (as defined in Requirement 4), THE System SHALL capture a new Session_Snapshot from the current persisted state values at that moment.

### Requirement 4: Session Summary Display

**User Story:** As a user, I want to see a recap of my session when I stop playing, so that I can review how I performed.

#### Acceptance Criteria

1. WHEN the user clicks an "End Session" button, THE System SHALL display the Session_Summary_Modal.
2. THE Session_Summary_Modal SHALL display: session kills (current total kills minus snapshot kills), session deaths (current total deaths minus snapshot deaths), session K/D ratio (session kills divided by session deaths, displayed to 2 decimal places), and a list of operators played during the session with their individual session kill and death counts, sorted by session kills descending then by operator name ascending.
3. WHILE session kills are greater than 0 and session deaths equal 0, THE Session_Summary_Modal SHALL display the K/D ratio as the session kill count followed by the label "Perfect" instead of a numeric ratio.
4. WHILE session kills and session deaths both equal 0, THE Session_Summary_Modal SHALL display a message indicating no matches were recorded this session, and SHALL NOT display the operator list, K/D ratio, or map performance section.
5. IF at least one Kill_Increment or Death_Increment was recorded with a map selected during the session, THEN THE Session_Summary_Modal SHALL display the map with the best session K/D ratio, including the map name and K/D value; IF multiple maps share the same best K/D ratio, THEN THE System SHALL display the map with the higher total session kills.
6. THE Session_Summary_Modal SHALL include a "Close" button that dismisses the modal and resets the Session_Snapshot to current values, beginning a new logical session.
7. WHEN the browser tab is about to close (beforeunload event), THE System SHALL NOT display the Session_Summary_Modal; session data is simply discarded.

### Requirement 5: End Session Button Placement

**User Story:** As a user, I want an accessible way to end my session, so that I can trigger the summary when I choose to stop playing.

#### Acceptance Criteria

1. WHILE an operator is deployed, THE System SHALL display an "End Session" button in the options area below the kill/death counters.
2. WHILE no operator is deployed, THE System SHALL hide the "End Session" button.
3. THE "End Session" button SHALL use a smaller font size and lower-contrast color treatment than the kill/death action buttons, and SHALL NOT use the same background color as the kill/death buttons.
4. THE "End Session" button SHALL be focusable via keyboard Tab navigation, activatable via Enter and Space keys, and include an aria-label of "End session and view summary".
5. THE "End Session" button SHALL have a minimum tap target size of 44 by 44 CSS pixels.

### Requirement 6: Map Win/Loss Recording

**User Story:** As a user, I want to record whether I won or lost a match on a map, so that I can track my win rate over time.

#### Acceptance Criteria

1. WHEN the user confirms a Kill_Increment or Death_Increment with a map selected, THE System SHALL display "Won" and "Lost" buttons in the post-confirmation area allowing the user to record the Match_Outcome for that map.
2. THE "Won" and "Lost" buttons SHALL remain visible until the user records an outcome or dismisses the prompt.
3. WHEN the user taps "Won", THE System SHALL increment the win count for the selected map in the Map_Win_Loss_Record by 1.
4. WHEN the user taps "Lost", THE System SHALL increment the loss count for the selected map in the Map_Win_Loss_Record by 1.
5. IF the user dismisses the prompt without recording an outcome, THEN THE System SHALL not modify the Map_Win_Loss_Record.
6. THE "Won" and "Lost" buttons SHALL be visually distinguished using green and red color coding respectively, with accessible labels "Record map win" and "Record map loss".

### Requirement 7: Map Win/Loss Data Persistence

**User Story:** As a user, I want my map win/loss data stored reliably, so that my win rates are available across sessions.

#### Acceptance Criteria

1. WHEN a guest user records a Match_Outcome, THE Data_Layer SHALL store Map_Win_Loss_Records in localStorage using the key `xawars_mapWinLoss`, structured as a record keyed by map ID containing `wins` and `losses` counts.
2. WHEN an authenticated user records a Match_Outcome, THE Data_Layer SHALL persist the Map_Win_Loss_Record to the Supabase `map_win_loss` table with columns: `id`, `user_id`, `map_id`, `wins`, `losses`, `updated_at`, using upsert semantics with a unique constraint on (`user_id`, `map_id`).
3. WHEN an authenticated user records a Match_Outcome while offline, THE Data_Layer SHALL enqueue the upsert operation via the syncQueue for retry when connectivity resumes.
4. WHEN a guest user migrates to an authenticated account, THE Data_Layer SHALL merge localStorage Map_Win_Loss_Records into cloud storage by summing win and loss counts with any existing cloud records for the same map.
5. IF a persistence operation for a Map_Win_Loss_Record fails, THEN THE Data_Layer SHALL retain the pre-operation state without data loss.

### Requirement 8: Map Win Rate Display

**User Story:** As a user, I want to see my win rate for each map, so that I can identify which maps I perform best on.

#### Acceptance Criteria

1. WHEN the user views map performance data (in the Map Advisor or Mastery Detail Modal), THE System SHALL display the win rate for each map that has at least 1 recorded Match_Outcome.
2. THE System SHALL calculate win rate as: wins divided by (wins plus losses), displayed as a percentage rounded to the nearest whole number.
3. WHILE a map has 0 recorded Match_Outcomes, THE System SHALL not display a win rate for that map.
4. THE System SHALL display the win rate alongside existing map performance metrics (K/D ratio, match count) using a visually compact format.
5. WHILE a map has fewer than 5 recorded Match_Outcomes, THE System SHALL display the win rate with a label indicating limited data (e.g., "3 matches").
