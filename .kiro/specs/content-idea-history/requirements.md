# Requirements Document

## Introduction

The Content Idea History feature allows users to save AI-generated content ideas and browse them in a dedicated history section. Currently, the AI Content Generator produces a `ContentIdea` (content idea, title variations, story hook, mission directive, thumbnail prompts) but the idea is lost when a new one is generated or the modal is closed. This feature persists generated ideas to localStorage and provides a browsable history UI so users can revisit, copy from, and manage their past ideas.

## Glossary

- **Content_Idea**: A structured object containing a content idea description, three title variations, a story hook, a mission directive, and three thumbnail prompts, as produced by the AI Content Generator.
- **Idea_History**: An ordered collection of saved Content_Ideas, stored in localStorage, with the most recently saved idea appearing first.
- **History_Panel**: A UI section that displays the Idea_History, allowing users to browse, view, and manage saved Content_Ideas.
- **System**: The XaWars RNG Next.js client-side application.

## Requirements

### Requirement 1: Save Generated Ideas

**User Story:** As a content creator, I want generated content ideas to be automatically saved, so that I do not lose ideas when generating new ones or closing the modal.

#### Acceptance Criteria

1. WHEN the AI Content Generator successfully produces a Content_Idea, THE System SHALL prepend the Content_Idea to the Idea_History with a unique identifier (UUID v4) and a timestamp (ISO 8601 UTC string).
2. THE System SHALL persist the Idea_History to localStorage using the existing `usePersistedState` hook pattern.
3. THE System SHALL store each saved Content_Idea with all original fields intact: contentIdea, titleVariations, storyHook, missionDirective, and thumbnailPrompts.
4. WHEN a Content_Idea is saved, THE System SHALL place the new entry at the beginning of the Idea_History list so that the most recent idea appears first.
5. IF the localStorage write fails due to storage quota or other browser storage errors, THEN THE System SHALL retain the Content_Idea in the current session state and display an error message indicating that the idea could not be persisted.

### Requirement 2: View Idea History

**User Story:** As a content creator, I want to browse my previously generated ideas, so that I can revisit and use past ideas for my content.

#### Acceptance Criteria

1. THE System SHALL display a History_Panel that lists all saved Content_Ideas in reverse chronological order (newest first).
2. WHEN a user selects a Content_Idea from the History_Panel, THE System SHALL display the full Content_Idea details including all fields (contentIdea, titleVariations, storyHook, missionDirective, thumbnailPrompts).
3. THE System SHALL display the saved timestamp for each entry in the History_Panel using a relative time format (e.g., "2 minutes ago", "3 days ago") for timestamps less than 7 days old, and an absolute date format (e.g., "Jan 15, 2025") for timestamps 7 days or older.
4. THE System SHALL display a preview of each Content_Idea in the History_Panel list by showing the contentIdea field truncated to a maximum of 100 characters, with an ellipsis ("…") appended when the text exceeds 100 characters.

### Requirement 3: Delete Saved Ideas

**User Story:** As a content creator, I want to delete ideas from my history, so that I can keep my history relevant and manageable.

#### Acceptance Criteria

1. WHEN a user requests deletion of a single Content_Idea, THE System SHALL remove that entry from the Idea_History, update localStorage, and remove the entry from the History_Panel without requiring confirmation.
2. WHEN a user requests to clear all history, THE System SHALL display a confirmation prompt before performing the deletion.
3. IF the user confirms the clear-all-history prompt, THEN THE System SHALL remove all entries from the Idea_History, update localStorage, and display the History_Panel empty state.
4. IF the user dismisses or cancels the clear-all-history prompt, THEN THE System SHALL leave the Idea_History unchanged.

### Requirement 4: History Capacity Management

**User Story:** As a content creator, I want the history to manage its size automatically, so that localStorage does not grow unbounded.

#### Acceptance Criteria

1. THE System SHALL retain a maximum of 50 Content_Ideas in the Idea_History.
2. WHEN the Idea_History reaches 50 Content_Ideas and a new Content_Idea is saved, THE System SHALL remove the entry at the end of the list (oldest by save timestamp) before inserting the new entry at the beginning.
3. WHEN the System loads Idea_History from localStorage and the stored collection contains more than 50 entries, THE System SHALL truncate the collection to the 50 most recent entries and persist the trimmed collection back to localStorage.
4. IF localStorage write fails during an eviction or truncation operation, THEN THE System SHALL retain the in-memory Idea_History state and allow the user to continue without data loss in the current session.

### Requirement 5: Access History from Content Generator

**User Story:** As a content creator, I want to access my idea history from within the content generator interface, so that I can quickly reference past ideas while generating new ones.

#### Acceptance Criteria

1. THE System SHALL provide a navigation element within the ContentGeneratorModal header area that toggles the visibility of the History_Panel.
2. WHEN a user selects a Content_Idea from the History_Panel, THE System SHALL display that idea's full content (contentIdea, titleVariations, storyHook, missionDirective, and thumbnailPrompts) in the ContentGeneratorModal content area with a CopyButton for each field.
3. WHEN the History_Panel is open and contains no saved Content_Ideas, THE System SHALL display an empty state message indicating no ideas have been saved yet.
4. WHILE the System is generating a new Content_Idea, THE System SHALL disable the navigation element that opens the History_Panel.
5. WHEN a user selects a Content_Idea from the History_Panel, THE System SHALL close the History_Panel and replace the currently displayed content in the ContentGeneratorModal with the selected idea.
