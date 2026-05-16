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

1. WHILE no map is selected, THE Map_Advisor SHALL display a three-step indicator showing "Step 1: Pick a map", "Step 2: Pick a site", and "Step 3: See recommendations"
2. WHEN the user selects a map, THE Step_Indicator SHALL visually mark Step 1 as completed
3. WHEN the user selects a site, THE Step_Indicator SHALL visually mark Step 2 as completed and transition to showing recommendations
4. WHILE a map is selected but no site is selected, THE Step_Indicator SHALL highlight Step 2 as the current active step

### Requirement 2: Prominent Side Toggle

**User Story:** As a user, I want a larger and more visually distinct side toggle, so that I can clearly see and switch between Attack and Defense modes.

#### Acceptance Criteria

1. THE Side_Toggle SHALL render as a full-width element spanning the entire panel width
2. WHEN Defense is selected, THE Side_Toggle SHALL display a blue background color on the active segment
3. WHEN Attack is selected, THE Side_Toggle SHALL display an orange background color on the active segment
4. WHEN the user switches sides, THE Map_Advisor SHALL update the Accent_Color of the entire panel border and heading to match the selected side
5. THE Side_Toggle SHALL display the Shield icon with the label "Defense" and the Crosshair icon with the label "Attack"

### Requirement 3: Tiered Recommendation Layout

**User Story:** As a user, I want operator recommendations visually grouped by importance tier, so that I can quickly identify the most impactful picks.

#### Acceptance Criteria

1. WHEN recommendations are displayed, THE Map_Advisor SHALL render Primary_Pick operators as large featured cards at the top of the recommendations section
2. WHEN recommendations are displayed, THE Map_Advisor SHALL render Secondary_Pick operators as medium-sized cards below the primary picks
3. WHEN recommendations are displayed, THE Map_Advisor SHALL render Niche_Pick operators as a compact list below the secondary picks
4. THE Primary_Pick Recommendation_Card SHALL display the operator icon at a larger size than Secondary_Pick cards, with the operator name, role badge, and reasoning text
5. THE Niche_Pick list items SHALL display the operator icon, name, and reasoning in a single condensed row

### Requirement 4: Team Composition Summary

**User Story:** As a user, I want to see a quick visual lineup of all recommended operators, so that I can assess the team composition at a glance.

#### Acceptance Criteria

1. WHEN recommendations are displayed, THE Map_Advisor SHALL render a Team_Comp_Summary row above the tiered recommendation cards
2. THE Team_Comp_Summary SHALL display operator icons for all recommended operators in a horizontal row
3. THE Team_Comp_Summary SHALL order operators by importance tier: primary operators first, then secondary, then niche
4. WHEN an operator icon is not available, THE Team_Comp_Summary SHALL display the first letter of the operator name as a fallback

### Requirement 5: Site Nickname Badges

**User Story:** As a user, I want to see community callout names for bomb sites prominently displayed, so that I can quickly identify sites by their common nicknames.

#### Acceptance Criteria

1. WHEN a site has nicknames defined, THE Map_Advisor SHALL display Site_Nickname_Badge elements next to or below the site name
2. THE Site_Nickname_Badge SHALL render as a visually distinct pill-shaped badge with a contrasting background
3. WHEN a site has no nicknames defined, THE Map_Advisor SHALL display only the site name without any badge

### Requirement 6: Animated Transitions

**User Story:** As a user, I want smooth visual transitions when switching maps or sides, so that the interface feels polished and responsive.

#### Acceptance Criteria

1. WHEN the user selects a different map, THE Map_Advisor SHALL animate the recommendations section with a fade-out and fade-in transition
2. WHEN the user switches sides, THE Map_Advisor SHALL animate the recommendations section with a slide transition
3. WHEN the user selects a different site, THE Map_Advisor SHALL animate the recommendations section with a fade transition
4. THE Map_Advisor SHALL complete each transition animation within 300 milliseconds

### Requirement 7: Strategy Tip Section

**User Story:** As a user, I want to see a brief strategy explanation for the selected site and side, so that I understand the overall game plan beyond individual operator picks.

#### Acceptance Criteria

1. WHEN recommendations are displayed, THE Map_Advisor SHALL render a Strategy_Tip text block below the operator recommendations
2. THE Strategy_Tip SHALL contain a brief explanation of the overall approach for the selected map, site, and side combination
3. THE Strategy_Tip SHALL be visually distinct from the operator cards using a different background color or border style
4. IF no strategy tip data is available for a site, THEN THE Map_Advisor SHALL not render the Strategy_Tip section
