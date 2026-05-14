# Implementation Plan: AI Content Generator

## Overview

Implement an AI Content Generator feature that integrates OpenAI's GPT-4o mini into the Xawars RNG app. The implementation uses direct `fetch` calls (no SDK), client-side API key storage via `usePersistedState`, and a modal-based UX consistent with existing app patterns. The feature includes a floating action button, API key management modal, content generation modal with copy functionality, and comprehensive error handling.

## Tasks

- [x] 1. Create OpenAI client module and data types
  - [x] 1.1 Create type definitions and constants for the AI content generator
    - Create `app/lib/openai.ts` with `ContentIdea`, `ApiError`, `ApiErrorType`, `ApiKeyValidationResult` interfaces
    - Define `OPENAI_CONFIG` constant with model, maxTokens, temperature, timeoutMs, and endpoint
    - Implement `validateApiKey(key: string)` function that checks "sk-" prefix and minimum 20 character length
    - Implement `classifyApiError(error: unknown)` function that maps HTTP statuses and error conditions to typed `ApiError` objects
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 8.1, 8.2_

  - [x] 1.2 Write property tests for API key validation (Property 1)
    - **Property 1: API key validation is correct and complete**
    - Use fast-check to generate arbitrary strings and verify `validateApiKey` returns `{ valid: true }` iff string starts with "sk-" and length >= 20
    - Verify correct error messages for prefix failures vs length failures
    - **Validates: Requirements 1.4, 1.5, 2.2, 2.3, 2.4**

  - [x] 1.3 Implement `generateContentIdea(apiKey: string)` function
    - Send POST request to OpenAI Chat Completions endpoint with system prompt, model config, and AbortController timeout (30s)
    - Parse JSON response and validate all required fields (contentIdea, titleVariations[3], storyHook, missionDirective, thumbnailPrompts[3])
    - Throw typed errors for empty responses, malformed JSON, and missing fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.9_

  - [x] 1.4 Write property tests for response parsing (Properties 3 and 4)
    - **Property 3: Valid ContentIdea JSON parsing preserves all fields**
    - **Property 4: Invalid or incomplete JSON is rejected**
    - Use fast-check to generate valid ContentIdea objects and verify round-trip parsing
    - Generate malformed/incomplete JSON and verify parser throws "Failed to parse API response"
    - **Validates: Requirements 3.3, 3.4, 3.5**

- [x] 2. Create formatting utilities and CopyButton component
  - [x] 2.1 Create formatting utility functions
    - Create `app/lib/formatters.ts` with `formatTitleVariations(titles: [string, string, string])` returning numbered list format
    - Implement `formatThumbnailPrompts(prompts: [string, string, string])` returning bullet list format
    - _Requirements: 5.6, 5.8_

  - [x] 2.2 Write property tests for formatting utilities (Properties 5 and 6)
    - **Property 5: Title variations "Copy All" formatting**
    - **Property 6: Thumbnail prompts "Copy All" formatting**
    - Use fast-check to generate tuples of 3 non-empty strings and verify output format
    - **Validates: Requirements 5.6, 5.8**

  - [x] 2.3 Implement CopyButton component
    - Create `app/components/CopyButton.tsx` with clipboard icon default state and green checkmark "Copied!" success state (2s timeout)
    - Use `navigator.clipboard.writeText()` with silent failure handling
    - Accept `text`, `label`, and `className` props
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 2.4 Write property test for CopyButton text preservation (Property 7)
    - **Property 7: Copy button preserves text exactly**
    - Mock clipboard API and verify any non-empty string passed to CopyButton is written to clipboard unchanged
    - **Validates: Requirements 5.2**

- [x] 3. Checkpoint - Core utilities verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement ApiKeyModal component
  - [x] 4.1 Create ApiKeyModal component
    - Create `app/components/ApiKeyModal.tsx` with password input, validation on submit, error display, and Cancel/Save buttons
    - Include link to OpenAI platform (opens in new tab) and security notice about local storage
    - Use zinc-900 background, zinc-700/50 borders, rounded-xl styling matching existing modals
    - Implement error clearing on input change
    - Support Escape key to close
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 6.3, 6.6, 7.3_

  - [x] 4.2 Write unit tests for ApiKeyModal
    - Test validation error display for invalid prefix and short keys
    - Test error clearing on input modification
    - Test Cancel closes without persisting
    - Test successful submission calls onSave with valid key
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.8, 2.9_

- [x] 5. Implement ContentGeneratorModal component
  - [x] 5.1 Create ContentGeneratorModal component
    - Create `app/components/ContentGeneratorModal.tsx` with header (Generate button + close), loading state, error state, and content display
    - Display five sections: Content Idea, Title Variations (numbered), Story Hook, Mission Directive, Thumbnail Prompts (numbered)
    - Add CopyButton next to each single-value section and "Copy All" buttons for Title Variations and Thumbnail Prompts
    - Implement scrollable content area (max-h-[90vh]), responsive width (max-w-md desktop, full-width mobile with 16px padding)
    - Include "Try Again" button for retryable errors and "Clear API Key" option
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 5.1, 5.5, 5.6, 5.7, 5.8, 6.4, 6.5, 7.1, 7.4, 8.2, 8.3_

  - [x] 5.2 Write unit tests for ContentGeneratorModal
    - Test loading state renders spinner and disables Generate button
    - Test error state renders message and retry button
    - Test content sections render correctly with numbered lists
    - Test close button and backdrop click close the modal
    - _Requirements: 4.1, 4.4, 4.5, 4.6, 4.9_

  - [x] 5.3 Write property test for state retention (Property 8)
    - **Property 8: ContentIdea state retention across modal close/reopen**
    - Use fast-check to generate valid ContentIdea objects, simulate close/reopen, verify state unchanged
    - **Validates: Requirements 8.5**

- [x] 6. Implement FloatingGeneratorButton component
  - [x] 6.1 Create FloatingGeneratorButton component
    - Create `app/components/FloatingGeneratorButton.tsx` with fixed positioning (bottom-right, 24px offset), z-40
    - Use Sparkles icon + "Generate" text, yellow-500 background, rounded-full, shadow-lg
    - Implement hover (scale 105%) and active (scale 95%) transitions
    - Add aria-label "Generate AI content" and keyboard focus ring
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 6.1, 6.2, 6.6, 7.2_

  - [x] 6.2 Write unit tests for FloatingGeneratorButton
    - Test correct positioning classes and z-index
    - Test accessibility attributes (aria-label, keyboard reachability)
    - Test hover and active state classes
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8_

- [x] 7. Checkpoint - All components built
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate into page.tsx and wire everything together
  - [x] 8.1 Add state management and integration logic to page.tsx
    - Add `usePersistedState` for API key with key `"xawars_openai_api_key"`
    - Add transient state: `isApiKeyModalOpen`, `isGeneratorOpen`, `isGenerating`, `currentIdea`, `generatorError`
    - Implement `handleGeneratorClick` that checks API key validity and opens appropriate modal
    - Implement `handleGenerate` that calls `generateContentIdea`, handles success/error states
    - Implement `handleApiKeySave` that persists key and triggers generation
    - Handle auth errors by clearing key and opening ApiKeyModal
    - _Requirements: 1.4, 1.5, 2.5, 3.6, 3.7, 3.8, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 8.2 Add components to page.tsx render tree
    - Render `FloatingGeneratorButton` with click handler
    - Render `ApiKeyModal` conditionally with save/close handlers
    - Render `ContentGeneratorModal` conditionally with generate/close/clearApiKey handlers
    - Ensure proper z-index layering (button z-40, modals z-50)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 4.9, 6.3, 6.4_

  - [x] 8.3 Write property test for API key persistence round-trip (Property 2)
    - **Property 2: API key persistence round-trip**
    - Mock localStorage and verify any valid API key (starts with "sk-", length >= 20) persisted via usePersistedState reads back identically
    - **Validates: Requirements 2.5, 8.4**

- [x] 9. Set up testing infrastructure
  - [x] 9.1 Install and configure Vitest and fast-check
    - Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, and `fast-check` as dev dependencies
    - Create `vitest.config.ts` with jsdom environment and path aliases matching tsconfig
    - Create test setup file for jest-dom matchers
    - _Requirements: All (testing infrastructure)_

- [x] 10. Final checkpoint - Feature complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Next.js App Router, Tailwind CSS, and Lucide React icons
- No `openai` SDK is used — direct `fetch` calls to the Chat Completions endpoint
- fast-check is used for property-based testing with Vitest as the test runner

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "9.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3"] },
    { "id": 2, "tasks": ["1.4", "2.4", "4.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "5.1", "6.2"] },
    { "id": 4, "tasks": ["5.2", "5.3"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3"] }
  ]
}
```
