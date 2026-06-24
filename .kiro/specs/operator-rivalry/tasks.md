# Implementation Plan: Operator Rivalry

## Overview

Implement a head-to-head operator comparison feature using a pure `ComparisonEngine` module for stat computation and a modal-based UI for display. The engine computes K/D ratio, average kills, pick rate, and mastery tier comparisons with clear advantage indicators. The UI reuses the existing `OperatorPickerModal` for selection and the `html-to-image` pipeline for image export.

## Tasks

- [x] 1. Create ComparisonEngine pure logic module
  - [x] 1.1 Create `app/lib/comparison-engine.ts` with interfaces and types
    - Define `RivalryOperatorData`, `Advantage`, `StatCardResult`, `RivalryMetric`, `RivalryVerdict`, and `ComparisonResult` interfaces/types
    - Export the tier ranking map (unplayed=0, recruit=1, operative=2, veteran=3, elite=4)
    - _Requirements: 7.1_

  - [x] 1.2 Implement `computeKdRatio`, `computeAvgKills`, `computePickRate`, and `compareTiers` helper functions
    - `computeKdRatio`: kills/deaths rounded to 2 decimal places; null when kills=0 and deaths=0; kills value when deaths=0 and kills>0
    - `computeAvgKills`: kills/deployments rounded to 1 decimal place; null when deployments=0
    - `computePickRate`: (opDeployments/totalDeployments)*100 rounded to 1 decimal place; null when totalDeployments=0
    - `compareTiers`: compare two MasteryTier values using tier rank map
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 1.3 Implement `computeComparison` function
    - Compute all 7 stat cards (deployments, kills, deaths, kdRatio, avgKills, pickRate, masteryTier)
    - Determine advantage for each stat card (higher is better for most, lower is better for deaths)
    - Format display strings with appropriate formatting (dash/no data for null values)
    - Compute verdict: tally wins, classify as left-leads/right-leads/even/insufficient-data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 7.1, 7.6_

  - [x] 1.4 Write property tests for ComparisonEngine (Properties 1–12)
    - Create `app/lib/__tests__/comparison-engine.property.test.ts`
    - Implement `arbitraryRivalryOperatorData` and `arbitraryMasteryTier` generators
    - **Property 1: Same operator validation** — same operator in both slots produces validation error
    - **Validates: Requirements 1.4**
    - **Property 2: Complete stat card coverage** — always returns exactly 7 stat cards
    - **Validates: Requirements 2.1**
    - **Property 3: Advantage determination correctness** — correct advantage for higher/lower-is-better metrics
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
    - **Property 4: Zero deployments nulls ratio stats** — null for avgKills/pickRate when deployments=0
    - **Validates: Requirements 2.7**
    - **Property 5: Verdict count invariant** — leftWins + rightWins + ties = statCards.length
    - **Validates: Requirements 3.1**
    - **Property 6: Verdict classification** — correct verdict type based on win counts
    - **Validates: Requirements 3.2, 3.3**
    - **Property 7: Insufficient data verdict** — 'insufficient-data' when deployments=0
    - **Validates: Requirements 3.4**
    - **Property 8: K/D ratio computation** — correct formula and edge cases
    - **Validates: Requirements 7.2, 7.3**
    - **Property 9: Average kills computation** — correct formula and null handling
    - **Validates: Requirements 7.4**
    - **Property 10: Pick rate computation** — correct formula
    - **Validates: Requirements 7.5**
    - **Property 11: Comparison symmetry** — swapped inputs produce mirrored advantages
    - **Validates: Requirements 7.6**
    - **Property 12: Well-formed output structure** — all fields valid and non-empty
    - **Validates: Requirements 7.1**

  - [x] 1.5 Write unit tests for ComparisonEngine edge cases
    - Create `app/lib/__tests__/comparison-engine.test.ts`
    - Test K/D edge cases: 0/0 → null, 5/0 → 5, 0/5 → 0
    - Test tie scenario: all stats identical
    - Test elite vs unplayed tier comparison
    - Test concrete comparison with known values
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Checkpoint - Ensure ComparisonEngine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create useRivalry hook
  - [x] 3.1 Implement `app/hooks/useRivalry.ts`
    - Manage left/right operator state
    - Look up `OperatorStatRecord` from DataContext for each selected operator
    - Compute `RivalryOperatorData` from stats (aggregate kills, deaths, deployments, tier, totalDeployments)
    - Call `computeComparison` when both slots are populated with different operators
    - Implement same-operator validation (set validationError when both slots have same operator)
    - Handle missing operator data as zero-deployment operator (0 kills, 0 deaths, tier='unplayed')
    - Wire image export using `toPng` from html-to-image with error handling
    - Support `prefilledOperator` prop for pre-populating left slot
    - _Requirements: 1.4, 2.2, 5.2, 5.3_

  - [ ]* 3.2 Write unit tests for useRivalry hook
    - Create `app/hooks/__tests__/useRivalry.test.ts`
    - Test same-operator validation produces error
    - Test pre-filled operator populates left slot
    - Test missing operator data treated as zero-deployment
    - Test export error handling shows toast
    - _Requirements: 1.4, 5.2, 5.3_

- [x] 4. Create RivalryStatCard component
  - [x] 4.1 Implement `app/components/rivalry/RivalryStatCard.tsx`
    - Render stat label, left value, right value in a row layout
    - Apply advantage highlight styling (color class + arrow/leads text indicator)
    - Show tie state with no highlight
    - Display dash for null values
    - Add ARIA label including metric name, both values, and advantage determination
    - _Requirements: 2.3, 2.4, 2.5, 6.2, 6.4_

  - [x] 4.2 Write property tests for RivalryStatCard accessibility (Properties 13–14)
    - Create `app/components/rivalry/__tests__/RivalryStatCard.property.test.ts`
    - **Property 13: ARIA labels on stat cards** — rendered output has aria-label with metric, values, and advantage
    - **Validates: Requirements 6.2**
    - **Property 14: Advantage indicator accessibility** — advantage uses color class plus supplementary text
    - **Validates: Requirements 6.4**

- [x] 5. Create RivalrySelector component
  - [x] 5.1 Implement `app/components/rivalry/RivalrySelector.tsx`
    - Render left and right operator slots (empty state with prompt, filled state with icon+name)
    - Open OperatorPickerModal on slot tap/click
    - Display validation error message when same operator selected
    - Support keyboard interaction (Enter to open, Escape to close)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 6. Create RivalryView modal component
  - [x] 6.1 Implement `app/components/rivalry/RivalryView.tsx`
    - Create full-screen modal with RivalrySelector, ComparisonDisplay area, export button, and verdict
    - Use `useRivalry` hook to manage state
    - Render all StatCardResults as RivalryStatCard components when comparison is available
    - Show verdict summary section (leading operator + count, "Dead even", or "Not enough data")
    - Show export/share button only when comparison is displayed
    - Implement focus trap (Tab/Shift+Tab within modal, Escape to close)
    - Return focus to trigger element on close
    - Accept `prefilledOperator` prop and pass to useRivalry
    - Add ref to comparison container for html-to-image export
    - Include XA Wars RNG watermark in exportable area
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 3.3, 3.4, 4.1, 4.3, 5.3, 6.1, 6.3_

  - [x] 6.2 Implement image export handler in RivalryView
    - Use `toPng` from html-to-image to render the comparison container
    - Trigger native share dialog via `navigator.share` if available
    - Fallback to download via anchor element click if share API unavailable
    - Show non-blocking error toast on export failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.3 Write component tests for RivalryView
    - Create `app/components/rivalry/__tests__/RivalryView.test.tsx`
    - Test initial render with empty slots
    - Test same-operator validation message display
    - Test export button visibility (only with comparison)
    - Test export error handling (mocked toPng failure shows toast)
    - Test keyboard navigation (Tab, Escape)
    - Test focus trap behavior
    - Test pre-filled operator flow
    - Test ARIA roles and labels
    - _Requirements: 1.1, 1.4, 4.1, 4.5, 5.2, 5.3, 6.1, 6.2, 6.3_

- [x] 7. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add entry points and wire to existing app
  - [x] 8.1 Add rivalry button to main navigation area
    - Add a "Rivalry" or comparison icon button in the main app navigation
    - Opens RivalryView modal on click
    - _Requirements: 5.1_

  - [x] 8.2 Add "Compare" action to MasteryDetailModal
    - Add a "Compare" button/action in the existing MasteryDetailModal
    - Opens RivalryView with the current operator pre-filled in the left slot
    - _Requirements: 5.2, 5.3_

  - [x] 8.3 Create barrel export `app/components/rivalry/index.ts`
    - Export RivalryView, RivalrySelector, RivalryStatCard components
    - _Requirements: N/A (project structure)_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The ComparisonEngine is implemented first as a pure module so property tests can validate logic before UI work begins
- No new data persistence or API calls needed — all data sourced from existing DataContext

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["3.1", "4.1"] },
    { "id": 5, "tasks": ["3.2", "4.2", "5.1"] },
    { "id": 6, "tasks": ["6.1"] },
    { "id": 7, "tasks": ["6.2"] },
    { "id": 8, "tasks": ["6.3"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3"] }
  ]
}
```
