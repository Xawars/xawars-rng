# Requirements Document

## Introduction

The Operator Rivalry feature adds a head-to-head comparison view to XA Wars RNG where users select two operators and see a side-by-side breakdown of their personal tracked stats. The feature answers the question "Am I actually better with Operator A or Operator B?" using real deployment data already collected by the mastery system.

The feature builds on top of the existing per-operator stat tracking (deployments, kills, deaths, K/D ratio, average kills, pick rate, mastery tier, XP progress, last played) and introduces a comparison UI that highlights stat differences with clear visual indicators. An optional image export leverages the existing html-to-image infrastructure so users can share rivalry cards on social media.

## Glossary

- **Rivalry_View**: The full-screen modal or dedicated view that displays a side-by-side comparison of two selected operators' personal stats.
- **Operator_Selector**: A picker control that lets the user choose an operator for one side of the Rivalry_View. Supports search and side filtering (All/ATK/DEF).
- **Stat_Card**: A single stat row within the Rivalry_View that shows one metric for both operators, with a visual highlight on the leading value.
- **Rivalry_Stat**: A single comparable metric derived from existing per-operator data. The set of Rivalry_Stats is: deployments, kills, deaths, K/D ratio, average kills per deployment, pick rate, and mastery tier.
- **Advantage_Indicator**: A visual element on a Stat_Card that highlights which operator has the superior value for that metric (higher K/D, more kills, higher tier, etc.), or indicates a tie.
- **Rivalry_Image**: A rendered image of the Rivalry_View suitable for sharing, produced by the existing html-to-image export pipeline.
- **Operator_Data**: The per-operator stats record derived from deployment history and kill/death counters, as defined by the existing MasteryOperatorData interface.
- **Comparison_Engine**: The pure logic module that takes two Operator_Data records and produces a set of Stat_Cards with advantage determinations.

## Requirements

### Requirement 1: Operator Selection for Rivalry

**User Story:** As a player, I want to pick two operators to compare, so that I can set up a head-to-head rivalry using my personal data.

#### Acceptance Criteria

1. WHEN a User opens the Rivalry_View, THE Operator_Selector SHALL display a left slot and a right slot, each initially empty, with a prompt to select an operator.
2. WHEN a User taps an empty slot, THE Operator_Selector SHALL open a searchable operator list supporting text filtering by operator name and side filtering by All, Attacker, or Defender.
3. WHEN a User selects an operator from the operator list, THE Operator_Selector SHALL populate the tapped slot with the selected operator's icon and name, then close the operator list.
4. WHEN both slots are populated with the same operator, THE Operator_Selector SHALL display a validation message stating that two different operators are required and SHALL NOT render the comparison.
5. WHEN a User taps a populated slot, THE Operator_Selector SHALL open the operator list to allow replacing the current selection.
6. THE Operator_Selector SHALL allow comparing any two operators regardless of side (attacker vs attacker, defender vs defender, or cross-side).

### Requirement 2: Side-by-Side Stat Comparison

**User Story:** As a player, I want to see my stats for two operators displayed side by side, so that I can quickly determine which operator I perform better with.

#### Acceptance Criteria

1. WHEN both operator slots are populated with different operators, THE Comparison_Engine SHALL compute and display Stat_Cards for all Rivalry_Stats: deployments, kills, deaths, K/D ratio, average kills per deployment, pick rate, and mastery tier.
2. THE Comparison_Engine SHALL derive all displayed values from the existing per-operator deployment history, kill counters, and death counters without requiring additional data entry.
3. WHEN a Rivalry_Stat has a numerically higher value for one operator (higher K/D, more kills, more deployments, higher pick rate, higher average kills), THE Advantage_Indicator SHALL visually highlight the leading operator's value for that Stat_Card.
4. WHEN a Rivalry_Stat has a numerically lower value that is better for the user (fewer deaths), THE Advantage_Indicator SHALL visually highlight the operator with fewer deaths as having the advantage for that Stat_Card.
5. WHEN both operators have identical values for a Rivalry_Stat, THE Advantage_Indicator SHALL display a tie state with no highlight on either side.
6. THE Comparison_Engine SHALL display mastery tier comparison using the tier order: unplayed < recruit < operative < veteran < elite, highlighting the operator with the higher tier.
7. WHEN an operator has zero deployments, THE Comparison_Engine SHALL display a dash or "No data" for ratio-based stats (K/D ratio, average kills, pick rate) rather than zero.

### Requirement 3: Rivalry Summary Verdict

**User Story:** As a player, I want a quick verdict on which operator I perform better with overall, so that I do not have to mentally tally individual stats.

#### Acceptance Criteria

1. WHEN both operators have at least one deployment each, THE Comparison_Engine SHALL compute an overall advantage count by tallying the number of Stat_Cards where each operator leads (excluding ties).
2. WHEN one operator leads in more Stat_Cards than the other, THE Rivalry_View SHALL display a summary verdict naming the leading operator with the count of stats won (e.g., "Vigil leads 4-2").
3. WHEN both operators lead in an equal number of Stat_Cards, THE Rivalry_View SHALL display a "Dead even" verdict.
4. WHEN one or both operators have zero deployments, THE Rivalry_View SHALL display a verdict stating "Not enough data" and SHALL NOT compute an advantage count.

### Requirement 4: Rivalry Image Export

**User Story:** As a content creator, I want to export my rivalry comparison as an image, so that I can share it on social media or with friends.

#### Acceptance Criteria

1. WHEN both operator slots are populated and the comparison is displayed, THE Rivalry_View SHALL display an export button labeled "Share" or with a share icon.
2. WHEN a User taps the export button, THE Rivalry_View SHALL render the comparison layout as a PNG image using the existing html-to-image pipeline.
3. THE Rivalry_Image SHALL include both operator icons, names, all Stat_Cards with values and Advantage_Indicators, the summary verdict, and an XA Wars RNG watermark.
4. WHEN the image export completes, THE Rivalry_View SHALL trigger the browser's native share dialog or download prompt so the user can save or share the image.
5. IF the image export fails, THEN THE Rivalry_View SHALL display a non-blocking error toast and SHALL NOT crash or navigate away from the comparison.

### Requirement 5: Entry Points to Rivalry View

**User Story:** As a player, I want to access the rivalry comparison from multiple places in the app, so that I can quickly compare operators without a complicated navigation flow.

#### Acceptance Criteria

1. THE Rivalry_View SHALL be accessible from a dedicated button or tab in the main navigation area of the app.
2. WHEN a User is viewing a single operator's detail (MasteryDetailModal), THE Mastery_System SHALL display a "Compare" action that opens the Rivalry_View with that operator pre-filled in the left slot.
3. WHEN the Rivalry_View is opened with a pre-filled operator, THE Operator_Selector SHALL populate the left slot and immediately prompt the user to select the right slot operator.

### Requirement 6: Accessibility and Keyboard Navigation

**User Story:** As a player who uses assistive technology, I want the rivalry view to be navigable via keyboard and readable by screen readers, so that the comparison is usable without a mouse.

#### Acceptance Criteria

1. THE Rivalry_View SHALL be navigable using Tab, Shift+Tab, Enter, and Escape keys for all interactive elements (slots, operator list, export button, close button).
2. THE Rivalry_View SHALL use ARIA roles and labels so that screen readers can announce each Stat_Card's label, both operator values, and which operator has the advantage.
3. WHEN the Rivalry_View modal opens, THE Rivalry_View SHALL trap focus within the modal and return focus to the trigger element on close.
4. THE Advantage_Indicator SHALL convey advantage information through both color and a supplementary text indicator (e.g., an arrow or "leads" label) so that color-blind users can perceive it.

### Requirement 7: Rivalry Data Computation

**User Story:** As a developer, I want the comparison logic to be a pure function separate from the UI, so that it can be tested independently and reused.

#### Acceptance Criteria

1. THE Comparison_Engine SHALL accept two Operator_Data records as input and SHALL return an array of Stat_Card results, each containing the metric name, left value, right value, and advantage determination (left, right, or tie).
2. THE Comparison_Engine SHALL compute K/D ratio as kills divided by deaths, rounded to two decimal places, returning null when deaths equals zero and kills equals zero.
3. WHEN deaths equals zero and kills is greater than zero, THE Comparison_Engine SHALL treat K/D ratio as the kills value (perfect K/D) for display and comparison purposes.
4. THE Comparison_Engine SHALL compute average kills as total kills divided by total deployments, rounded to one decimal place, returning null when deployments equals zero.
5. THE Comparison_Engine SHALL compute pick rate as (operator deployments divided by total deployments across all operators) multiplied by 100, rounded to one decimal place.
6. FOR ALL pairs of Operator_Data records, computing a comparison and then swapping the two inputs SHALL produce mirrored advantage determinations (left becomes right and right becomes left) with identical absolute values (symmetry property).
