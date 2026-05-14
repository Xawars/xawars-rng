# Implementation Plan: Content Idea History

## Overview

This plan implements a history system for AI-generated content ideas in the XaWars RNG application. The implementation adds a `useContentIdeaHistory` hook for state management and persistence, utility functions for formatting, a `ContentIdeaHistoryPanel` component for browsing saved ideas, and integrates everything into the existing `ContentGeneratorModal`. The approach builds incrementally: data layer first, then utilities, then UI components, and finally integration.

## Tasks

- [x] 1. Create data model interfaces and utility functions
  - [x] 1.1 Create the `SavedContentIdea` interface and history types
    - Create `app/hooks/useContentIdeaHistory.ts` with the `SavedContentIdea` interface extending `ContentIdea` with `id` (string) and `savedAt` (string) fields
    - Define the `UseContentIdeaHistoryReturn` interface with `entries`, `addEntry`, `deleteEntry`, `clearAll`, and `storageError`
    - Define the `MAX_HISTORY_SIZE` constant as 50
    - _Requirements: 1.1, 1.3, 4.1_

  - [x] 1.2 Implement `truncatePreview` utility function
    - Create `app/lib/history-formatters.ts` with the `truncatePreview(text: string, maxLength: number): string` function
    - Return original string if length ≤ maxLength, otherwise return first maxLength characters + "…"
    - _Requirements: 2.4_

  - [x] 1.3 Implement `formatRelativeTime` utility function
    - Add `formatRelativeTime(isoTimestamp: string): string` to `app/lib/history-formatters.ts`
    - Return relative time string (e.g., "2 minutes ago", "3 days ago") for timestamps less than 7 days old
    - Return absolute date string (e.g., "Jan 15, 2025") for timestamps 7 days or older
    - _Requirements: 2.3_

  - [x] 1.4 Write property test for `truncatePreview`
    - **Property 4: Text truncation**
    - **Validates: Requirements 2.4**
    - Create `app/lib/__tests__/truncatePreview.property.test.ts`
    - Use `fast-check` to verify: strings ≤ 100 chars return unchanged, strings > 100 chars return first 100 chars + "…"

  - [x] 1.5 Write property test for `formatRelativeTime`
    - **Property 3: Timestamp formatting rules**
    - **Validates: Requirements 2.3**
    - Create `app/lib/__tests__/formatRelativeTime.property.test.ts`
    - Use `fast-check` to verify: timestamps < 7 days old produce relative format, timestamps ≥ 7 days old produce absolute date format

- [x] 2. Implement `useContentIdeaHistory` hook
  - [x] 2.1 Implement core hook with add, delete, and clear operations
    - Implement `useContentIdeaHistory` in `app/hooks/useContentIdeaHistory.ts`
    - Wrap `usePersistedState` with key `'content-idea-history'` and initial value `[]`
    - `addEntry`: generate UUID via `crypto.randomUUID()` (with fallback), create ISO timestamp, prepend to array, enforce 50-entry cap by removing last entry if at capacity
    - `deleteEntry`: filter out entry by ID
    - `clearAll`: set entries to empty array
    - Return `{ entries, addEntry, deleteEntry, clearAll, storageError }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 4.1, 4.2_

  - [x] 2.2 Implement load-time truncation and error handling
    - On initial load, if stored entries exceed 50, truncate to 50 most recent (by `savedAt`) and persist trimmed collection
    - Wrap localStorage operations in try/catch, surface errors via `storageError` state
    - Handle corrupted/unparseable data by resetting to empty history
    - Implement `crypto.randomUUID()` fallback using `Date.now().toString(36) + Math.random().toString(36).slice(2)`
    - _Requirements: 1.5, 4.3, 4.4_

  - [x] 2.3 Write property test for add entry prepends with valid metadata
    - **Property 1: Add entry prepends with valid metadata**
    - **Validates: Requirements 1.1, 1.4**
    - Create `app/hooks/__tests__/useContentIdeaHistory.property.test.ts`
    - Verify new entry appears at index 0 with valid UUID v4 format and valid ISO 8601 timestamp

  - [x] 2.4 Write property test for save/retrieve round-trip
    - **Property 2: Save/retrieve round-trip preserves all fields**
    - **Validates: Requirements 1.3**
    - Add to `app/hooks/__tests__/useContentIdeaHistory.property.test.ts`
    - Verify all ContentIdea fields are deeply equal after save and retrieve

  - [x] 2.5 Write property test for delete removes exactly the target entry
    - **Property 5: Delete removes exactly the target entry**
    - **Validates: Requirements 3.1**
    - Add to `app/hooks/__tests__/useContentIdeaHistory.property.test.ts`
    - Verify history no longer contains deleted ID, length decreased by 1, other entries preserved in order

  - [x] 2.6 Write property test for history length invariant
    - **Property 6: History length invariant**
    - **Validates: Requirements 4.1**
    - Add to `app/hooks/__tests__/useContentIdeaHistory.property.test.ts`
    - Verify history length never exceeds 50 after any sequence of add operations

  - [x] 2.7 Write property test for eviction removes oldest when at capacity
    - **Property 7: Eviction removes oldest when at capacity**
    - **Validates: Requirements 4.2**
    - Add to `app/hooks/__tests__/useContentIdeaHistory.property.test.ts`
    - Verify: after adding to a full (50-entry) history, new entry is at index 0, previous index 49 entry is gone, length is still 50

  - [x] 2.8 Write property test for load truncation to 50 most recent
    - **Property 8: Load truncation to 50 most recent**
    - **Validates: Requirements 4.3**
    - Add to `app/hooks/__tests__/useContentIdeaHistory.property.test.ts`
    - Verify: given N > 50 entries, truncation produces exactly 50 entries with the most recent savedAt values

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `ContentIdeaHistoryPanel` component
  - [x] 4.1 Create the history panel component
    - Create `app/components/ContentIdeaHistoryPanel.tsx`
    - Accept props: `entries: SavedContentIdea[]`, `onSelect: (entry: SavedContentIdea) => void`, `onDelete: (id: string) => void`, `onClearAll: () => void`
    - Render list of entries in reverse chronological order (already sorted by hook)
    - Display truncated preview (100 chars) using `truncatePreview` for each entry's `contentIdea` field
    - Display formatted timestamp using `formatRelativeTime` for each entry's `savedAt` field
    - Include a delete button per entry (no confirmation needed for single delete)
    - Include a "Clear All" button that triggers a `window.confirm()` prompt before calling `onClearAll`
    - Display empty state message when entries array is empty: "No ideas have been saved yet."
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 5.3_

  - [x] 4.2 Write unit tests for `ContentIdeaHistoryPanel`
    - Create `app/components/__tests__/ContentIdeaHistoryPanel.test.tsx`
    - Test: renders entries in order, shows truncated previews, shows timestamps, empty state message displays
    - Test: delete button calls `onDelete` with correct ID
    - Test: clear all shows confirmation, confirm clears, cancel preserves
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 5.3_

- [x] 5. Integrate history into `ContentGeneratorModal`
  - [x] 5.1 Add history toggle and panel to `ContentGeneratorModal`
    - Import and use `useContentIdeaHistory` hook in the modal (or in the parent that manages the modal, depending on existing state architecture)
    - Add a history toggle button (e.g., clock/history icon from lucide-react) in the modal header area
    - Add state `showHistory: boolean` to toggle between history panel and content view
    - Conditionally render `ContentIdeaHistoryPanel` when `showHistory` is true
    - Disable the history toggle button while `isGenerating` is true
    - _Requirements: 5.1, 5.4_

  - [x] 5.2 Implement auto-save on generation and selection from history
    - Call `addEntry(idea)` when a new ContentIdea is successfully generated (eager save)
    - When a user selects an entry from the history panel, close the panel (`showHistory = false`) and display the selected idea's full content in the modal content area with CopyButtons for each field
    - Display a storage error banner when `storageError` is non-null
    - _Requirements: 1.1, 1.4, 1.5, 2.2, 5.2, 5.5_

  - [x] 5.3 Write unit tests for ContentGeneratorModal history integration
    - Create or extend `app/components/__tests__/ContentGeneratorModal.test.tsx`
    - Test: history toggle button exists in header
    - Test: toggle button is disabled during generation
    - Test: clicking toggle shows/hides history panel
    - Test: selecting an entry closes panel and displays full content
    - Test: storage error banner displays when storageError is set
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and UI behavior
- The implementation uses TypeScript throughout, matching the existing project stack (Next.js, React, Vitest, fast-check)
- The `usePersistedState` hook already handles localStorage read/write with hydration safety; `useContentIdeaHistory` wraps it with domain-specific logic

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "1.5", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5", "2.6", "2.7", "2.8"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3"] }
  ]
}
```
