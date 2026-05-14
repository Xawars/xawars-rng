# Implementation Plan: Multi-Provider Support

## Overview

Extend the XaWars RNG AI Content Generator to support multiple AI providers (OpenAI, OpenRouter, Google Gemini) through a configuration-driven provider registry. The implementation introduces a provider abstraction layer, updates the API key modal with provider selection, and adapts request/response handling per provider while maintaining backward compatibility.

## Tasks

- [x] 1. Create provider configuration registry and types
  - [x] 1.1 Create `app/lib/ai-providers.ts` with provider types and configuration
    - Define `ProviderId` type union (`'openai' | 'openrouter' | 'gemini'`)
    - Define `ProviderConfig` interface with endpoint, headers, request body builder, response extractor, key validation, and auth error classifier
    - Implement the `PROVIDERS` registry object with full configuration for all three providers
    - Export `PROVIDER_ORDER`, `DEFAULT_PROVIDER` constants
    - Include OpenAI endpoint, model `gpt-4o-mini`, prefix `sk-`, min length 20
    - Include OpenRouter endpoint, model `openai/gpt-4o-mini`, prefix `sk-or-`, min length 20, HTTP-Referer header
    - Include Gemini endpoint (with key as query param), model `gemini-2.0-flash`, min length 10, Gemini request/response format
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 1.2 Write property tests for provider configuration (`app/lib/__tests__/ai-providers.property.test.ts`)
    - **Property 1: Provider-specific key validation**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Test that `validateApiKey` returns valid/invalid correctly for all providers based on prefix and length rules
    - Use fast-check arbitraries to generate random strings and verify validation logic

  - [x] 1.3 Write property tests for request construction (`app/lib/__tests__/ai-providers.property.test.ts`)
    - **Property 4: Request construction invariants**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**
    - Test that constructed requests use correct endpoint, headers, and model per provider
    - Verify system prompt and user message are identical across providers

  - [x] 1.4 Write property tests for response extraction (`app/lib/__tests__/ai-providers.property.test.ts`)
    - **Property 5: Response extraction across formats**
    - **Validates: Requirements 5.1, 5.2, 5.3**
    - Test that extraction functions produce the same ContentIdea from well-formed responses regardless of provider format

- [x] 2. Create the unified AI client module
  - [x] 2.1 Create `app/lib/ai-client.ts` with multi-provider generation logic
    - Re-export `ContentIdea`, `ApiError`, `ApiErrorType`, `parseContentIdea` from `openai.ts`
    - Implement `validateApiKey(provider, key)` that delegates to provider config
    - Implement `classifyApiError(provider, error)` with provider-specific auth error detection (Gemini uses HTTP 400)
    - Implement `generateContentIdea(options: { provider, apiKey })` that builds and sends provider-specific requests
    - Include 30-second AbortController timeout for all providers
    - _Requirements: 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4_

  - [x] 2.2 Write property tests for AI client (`app/lib/__tests__/ai-client.property.test.ts`)
    - **Property 6: ContentIdea parsing round-trip**
    - **Validates: Requirements 5.4, 5.5**
    - Test that serializing a valid ContentIdea and parsing it back produces an equivalent object
    - Test that invalid JSON or missing fields throws parse error

  - [x] 2.3 Write property tests for error classification (`app/lib/__tests__/ai-client.property.test.ts`)
    - **Property 7: Error classification correctness**
    - **Validates: Requirements 6.4, 6.5, 6.6**
    - Test that HTTP 429, TypeError, and AbortError are classified correctly with expected messages and retryable flag

  - [x] 2.4 Write unit tests for AI client (`app/lib/__tests__/ai-client.test.ts`)
    - Test Gemini request format construction (systemInstruction, contents, generationConfig)
    - Test Gemini auth error detection (HTTP 400 with INVALID_ARGUMENT)
    - Test OpenAI/OpenRouter auth error detection (HTTP 401)
    - Test backward compatibility of parseContentIdea
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

- [x] 3. Checkpoint - Core library layer
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update ApiKeyModal with provider selection
  - [x] 4.1 Update `app/components/ApiKeyModal.tsx` to support provider selection
    - Add `ProviderId` import from `ai-providers.ts`
    - Update props interface to accept `onSave: (key: string, provider: ProviderId) => void` and `initialProvider?: ProviderId`
    - Add provider selector dropdown above the API key input field
    - Style dropdown with zinc-800 background, zinc-700/50 border, white text, rounded-lg
    - Update placeholder text and help link dynamically based on selected provider
    - Clear validation error and input field when provider changes
    - Use provider-specific validation from `ai-client.ts` on submit
    - Display provider-specific error messages (Requirements 2.4, 2.5, 2.6)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 4.2 Write property test for ApiKeyModal provider switching (`app/components/__tests__/ApiKeyModal.property.test.tsx`)
    - **Property 2: Provider change clears validation state**
    - **Validates: Requirements 2.7**
    - Test that switching provider clears error and empties input field for any provider transition

  - [x] 4.3 Write unit tests for updated ApiKeyModal (`app/components/__tests__/ApiKeyModal.test.tsx`)
    - Test provider selector renders with three options in correct order
    - Test default selection is OpenAI
    - Test placeholder and help link update per provider
    - Test error messages display correctly per provider
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.4, 2.5, 2.6_

- [x] 5. Update ContentGeneratorModal with provider indicator
  - [x] 5.1 Update `app/components/ContentGeneratorModal.tsx` to show active provider
    - Add `activeProvider` and `onChangeProvider` props
    - Display provider display name in the modal header area (text-xs, zinc-400)
    - Add "Change" link next to provider name that triggers `onChangeProvider`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.2 Write unit tests for ContentGeneratorModal provider indicator (`app/components/__tests__/ContentGeneratorModal.test.tsx`)
    - Test provider name displays correctly for each provider
    - Test "Change" link triggers onChangeProvider callback
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 6. Wire provider state into the main page
  - [x] 6.1 Update `app/page.tsx` to manage provider state and integrate multi-provider flow
    - Add `usePersistedState` for provider choice (`xawars_ai_provider`, default `'openai'`)
    - Keep existing `usePersistedState` for API key (`xawars_openai_api_key`)
    - Update `ApiKeyModal` usage to pass provider and handle `onSave(key, provider)`
    - Update `ContentGeneratorModal` usage to pass `activeProvider` and `onChangeProvider`
    - Update generation logic to call `generateContentIdea({ provider, apiKey })` from `ai-client.ts`
    - Update error handling to use `classifyApiError(provider, error)` with provider-aware auth detection
    - On auth error: clear key, close generator modal, open API key modal with error
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.7, 9.1, 9.2, 9.3_

  - [x] 6.2 Write integration tests for full provider flow
    - Test: select provider → enter key → generate → display result (mocked fetch)
    - Test: legacy localStorage (key present, no provider) → app loads with OpenAI default
    - Test: auth error flow → clear key → reopen modal
    - _Requirements: 3.4, 6.1, 6.2, 6.3, 9.1, 9.2_

- [x] 7. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `app/lib/openai.ts` is preserved (not deleted) since `ai-client.ts` re-exports from it
- All API calls use mocked `fetch` in tests — no real network calls
- The project uses `vitest --run` with `fast-check` v4.8.0 for property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4"] },
    { "id": 3, "tasks": ["4.1", "5.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.2", "6.1"] },
    { "id": 5, "tasks": ["6.2"] }
  ]
}
```
