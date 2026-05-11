# Requirements Document

## Introduction

This feature improves the UI/UX of the Map Advisor component in the xawars-rng Rainbow Six Siege operator randomizer app. The Map Advisor currently allows users to select a map, site, and side (attack/defense) to receive operator recommendations. These improvements introduce guided step indicators, a more prominent side toggle, tiered recommendation layouts, team composition summaries, site nickname badges, animated transitions, and strategy tips to create a more polished and informative experience.

## Glossary

- **Map_Advisor**: The React component that provides map-specific operator recommendations based on user-selected map, site, and side
- **Step_Indicator**: A visual progress element showing the user which selection step they are on (map, site, recommendations)
- **Side_Toggle**: The full-width UI control that switches between Attack and Defense modes
- **Recommendation_Card**: A UI card displaying an operator recommendation with icon, name, role, and reasoning
- **Primary_Pick**: An operator recommendation with importance level "primary" — the most impactful picks for a given site
- **Secondary_Pick**: An operator recommendation with importance level "secondary" — strong supporting picks
- **Niche_Pick**: An operator recommendation with importance level "niche" — situational or specialized picks
- **Team_Comp_Summary**: A horizontal row of operator icons representing the full recommended lineup at a glance
- **Site_Nickname_Badge**: A visual badge displaying community callout names for a bomb site
- **Strategy_Tip**: A brief text block explaining the overall approach or game plan for a given site and side combination
- **Accent_Color**: The theme color applied to the Map Advisor panel based on the selected side (blue for defense, orange for attack)

## Requirements

### Requirement 1: Step Indicators for Empty State

**User Story:** As a user, I want to see clear step-by-step guidance when no selections have been made, so that I understand the workflow to get recommendations.

#### Acceptance Criteria

1. WHILE no map is selected, THE Map_Advisor SHALL display a three-step indicator showing "Step 1: Pick a map", "Step 2: Pick a site", and "Step 3: See recommendations", where Step 1 is visually distinguished as the current active step using a contrasting text color or border distinct from the other steps, and Steps 2 and 3 appear in a muted or dimmed style.
2. WHEN the user selects a map, THE Step_Indicator SHALL mark Step 1 as completed by displaying a checkmark icon or filled indicator replacing the step number, and SHALL visually distinguish Step 2 as the current active step using the same contrasting style previously applied to Step 1.
3. WHEN the user selects a site, THE Step_Indicator SHALL mark Step 2 as completed by displaying a checkmark icon or filled indicator replacing the step number, and the step indicator section SHALL be replaced by the recommendations display.
4. WHILE a map is selected but no site is selected, THE Step_Indicator SHALL display Step 2 with the active step styling, Step 1 with completed styling, and Step 3 with the muted pending styling.
5. WHEN the user changes the selected map to a different map, THE Step_Indicator SHALL reset Step 2 to active styling and clear the site selection, preserving Step 1 as completed.
6. WHEN the user deselects the map (sets selection to empty), THE Step_Indicator SHALL reset all steps to their initial state with Step 1 as the active step and Steps 2 and 3 as pending.

### Requirement 2: Prominent Side Toggle

**User Story:** As a user, I want a larger and more visually distinct side toggle, so that I can clearly see and switch between Attack and Defense modes.

#### Acceptance Criteria

1. THE Side_Toggle SHALL render as a full-width element spanning the entire panel width, positioned between the heading and the selectors grid
2. WHEN Defense is selected, THE Side_Toggle SHALL display bg-blue-600 as the background color on the active segment and bg-zinc-800 on the inactive segment
3. WHEN Attack is selected, THE Side_Toggle SHALL display bg-orange-600 as the background color on the active segment and bg-zinc-800 on the inactive segment
4. WHEN the user switches to Defense, THE Map_Advisor SHALL update the panel border color to border-blue-600 and the heading text color to text-blue-500
5. WHEN the user switches to Attack, THE Map_Advisor SHALL update the panel border color to border-orange-600 and the heading text color to text-orange-500
6. THE Side_Toggle SHALL display the Shield icon with the label "Defense" and the Crosshair icon with the label "Attack", with each segment having a minimum height of 44px
7. THE Side_Toggle SHALL render each segment button with font size of at least text-base (16px) and font-bold weight to ensure legibility

### Requirement 3: Tiered Recommendation Layout

**User Story:** As a user, I want operator recommendations visually grouped by importance tier, so that I can quickly identify the most impactful picks.

#### Acceptance Criteria

1. WHEN recommendations are displayed, THE Map_Advisor SHALL render Primary_Pick operators as featured cards spanning the full width of the recommendations section, positioned above all other tiers, with operator icons displayed at 64x64 pixels, the operator name, role badge, and reasoning text
2. WHEN recommendations are displayed, THE Map_Advisor SHALL render Secondary_Pick operators as cards in a 2-column grid below the primary picks, with operator icons displayed at 48x48 pixels, the operator name, role badge, and reasoning text
3. WHEN recommendations are displayed, THE Map_Advisor SHALL render Niche_Pick operators as single-row list items below the secondary picks, with each row containing the operator icon at 32x32 pixels, operator name, and reasoning text on a single line
4. IF a tier contains zero recommendations, THEN THE Map_Advisor SHALL omit that tier's section entirely without rendering an empty container or heading for it
5. WHEN recommendations are displayed, THE Map_Advisor SHALL render a visible tier heading label ("Primary Picks", "Secondary Picks", "Niche Picks") above each non-empty tier group to identify the importance level

### Requirement 4: Team Composition Summary

**User Story:** As a user, I want to see a quick visual lineup of all recommended operators, so that I can assess the team composition at a glance.

#### Acceptance Criteria

1. WHEN recommendations are displayed, THE Map_Advisor SHALL render a Team_Comp_Summary row above the tiered recommendation cards
2. WHILE recommendations are displayed, THE Team_Comp_Summary SHALL display one operator icon per recommended operator in a horizontal row, rendering a maximum of 10 icons
3. THE Team_Comp_Summary SHALL order operators by importance tier: all primary operators first, then all secondary operators, then all niche operators, preserving the original recommendation array order within each tier
4. IF an operator icon is not available from the r6operators package, THEN THE Team_Comp_Summary SHALL display the first uppercase letter of the operator name inside a container of the same dimensions as a standard icon
5. IF the recommendations array is empty, THEN THE Map_Advisor SHALL NOT render the Team_Comp_Summary row

### Requirement 5: Site Nickname Badges

**User Story:** As a user, I want to see community callout names for bomb sites prominently displayed, so that I can quickly identify sites by their common nicknames.

#### Acceptance Criteria

1. WHEN a site with one or more nicknames defined is selected, THE Map_Advisor SHALL display one Site_Nickname_Badge element per nickname string, positioned adjacent to or directly below the selected site name in the recommendations display area
2. THE Site_Nickname_Badge SHALL render as a pill-shaped inline element with rounded corners, a background color that differs from the surrounding container background, and text content matching the nickname string exactly
3. IF a site has multiple nicknames defined, THEN THE Map_Advisor SHALL display each nickname as a separate Site_Nickname_Badge in the order they appear in the nicknames array, with a maximum of 5 badges displayed
4. WHEN a site has no nicknames defined, THE Map_Advisor SHALL display only the site name without any Site_Nickname_Badge elements
5. THE Site_Nickname_Badge text SHALL be fully visible without truncation for nickname strings up to 20 characters in length

### Requirement 6: Animated Transitions

**User Story:** As a user, I want smooth visual transitions when switching maps or sides, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. WHEN the user selects a different map, THE Map_Advisor SHALL animate the recommendations section by fading the current content from opacity 1 to 0, then fading the new content from opacity 0 to 1, with each fade phase lasting 150 milliseconds
2. WHEN the user switches sides, THE Map_Advisor SHALL animate the recommendations section by sliding the current content out horizontally in the direction of the deselected side and sliding the new content in from the opposite edge, completing within 300 milliseconds total
3. WHEN the user selects a different site, THE Map_Advisor SHALL animate the recommendations section by cross-fading from the current content to the new content over 300 milliseconds using an opacity transition
4. THE Map_Advisor SHALL complete each transition animation within a total duration of 300 milliseconds measured from the start of the outgoing animation to the end of the incoming animation
5. IF the user changes a selection while a transition animation is in progress, THEN THE Map_Advisor SHALL cancel the in-progress animation and immediately begin the new transition from the current visual state

### Requirement 7: Strategy Tip Section

**User Story:** As a user, I want to see a brief strategy explanation for the selected site and side, so that I understand the overall game plan beyond individual operator picks.

#### Acceptance Criteria

1. WHEN recommendations are displayed, THE Map_Advisor SHALL render a Strategy_Tip text block below the operator recommendations grid
2. THE Strategy_Tip SHALL contain a plain-text explanation of the overall approach for the selected map, site, and side combination, limited to a maximum of 2 sentences and no more than 280 characters
3. THE Strategy_Tip SHALL be visually distinct from the operator cards using a different background color or border style
4. IF no strategy tip data is available for the selected map, site, and side combination, THEN THE Map_Advisor SHALL not render the Strategy_Tip section
5. WHEN the user changes the selected map, site, or side, THE Map_Advisor SHALL update the Strategy_Tip to reflect the newly selected combination
