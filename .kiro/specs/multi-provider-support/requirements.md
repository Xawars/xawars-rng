# Requirements Document

## Introduction

The Multi-Provider Support feature extends the existing AI Content Generator in the Xawars RNG app to support multiple AI providers beyond OpenAI. Users can choose between OpenAI, OpenRouter, and Google Gemini as their AI provider, each with its own API key and endpoint configuration. The provider selection is integrated into the existing API key modal, and the choice is persisted alongside the API key in localStorage. All API calls remain client-side with no backend proxy required.

## Glossary

- **Provider_Selector**: A dropdown UI element within the API_Key_Modal that allows the user to choose between supported AI providers (OpenAI, OpenRouter, Gemini)
- **Provider_Config**: A data structure containing the endpoint URL, headers, model identifier, and request/response format details for a specific AI provider
- **API_Key_Modal**: The existing modal dialog, extended to include provider selection alongside API key entry
- **OpenAI_Provider**: The AI provider using the OpenAI Chat Completions API at https://api.openai.com/v1/chat/completions
- **OpenRouter_Provider**: The AI provider using the OpenRouter API at https://openrouter.ai/api/v1/chat/completions, which provides access to multiple models (Claude, Gemini, Llama, Mistral) through an OpenAI-compatible interface
- **Gemini_Provider**: The AI provider using the Google Gemini API, which supports browser-compatible API key authentication
- **Provider_Choice**: The user's selected provider stored in localStorage as a string value ("openai", "openrouter", or "gemini")
- **AI_Client**: The module (app/lib/openai.ts) responsible for routing API requests to the correct provider endpoint based on the stored Provider_Choice
- **Content_Idea**: The structured response object containing contentIdea, titleVariations, storyHook, missionDirective, and thumbnailPrompts fields

## Requirements

### Requirement 1: Provider Selection UI

**User Story:** As a content creator, I want to choose which AI provider to use for content generation, so that I can use my preferred service or take advantage of different models.

#### Acceptance Criteria

1. WHEN the API_Key_Modal is open, THE Provider_Selector SHALL display a dropdown with three options: "OpenAI", "OpenRouter", and "Gemini" in that order
2. THE Provider_Selector SHALL default to "OpenAI" when no provider has been previously selected
3. WHEN the user selects a provider from the Provider_Selector, THE API_Key_Modal SHALL update the placeholder text and help link to match the selected provider
4. WHEN the OpenAI_Provider is selected, THE API_Key_Modal SHALL display placeholder text "sk-..." and link to "https://platform.openai.com/api-keys"
5. WHEN the OpenRouter_Provider is selected, THE API_Key_Modal SHALL display placeholder text "sk-or-..." and link to "https://openrouter.ai/keys"
6. WHEN the Gemini_Provider is selected, THE API_Key_Modal SHALL display placeholder text "AI..." and link to "https://aistudio.google.com/apikey"
7. THE Provider_Selector SHALL be positioned above the API key input field within the API_Key_Modal
8. THE Provider_Selector SHALL use zinc-800 background, zinc-700/50 border, white text, and rounded-lg styling consistent with the existing input field

### Requirement 2: Provider-Specific API Key Validation

**User Story:** As a user, I want the app to validate my API key format based on the selected provider, so that I receive immediate feedback if my key is incorrectly formatted.

#### Acceptance Criteria

1. WHEN the user submits an API key with the OpenAI_Provider selected, THE API_Key_Modal SHALL validate that the key starts with "sk-" and is at least 20 characters long
2. WHEN the user submits an API key with the OpenRouter_Provider selected, THE API_Key_Modal SHALL validate that the key starts with "sk-or-" and is at least 20 characters long
3. WHEN the user submits an API key with the Gemini_Provider selected, THE API_Key_Modal SHALL validate that the key is at least 10 characters long
4. IF the user submits an API key that fails validation for the OpenAI_Provider, THEN THE API_Key_Modal SHALL display the error message "Invalid API key format. Must start with sk-"
5. IF the user submits an API key that fails validation for the OpenRouter_Provider, THEN THE API_Key_Modal SHALL display the error message "Invalid API key format. Must start with sk-or-"
6. IF the user submits an API key that fails validation for the Gemini_Provider, THEN THE API_Key_Modal SHALL display the error message "Invalid API key. Must be at least 10 characters"
7. WHEN the user changes the selected provider in the Provider_Selector, THE API_Key_Modal SHALL clear any displayed validation error and clear the API key input field

### Requirement 3: Provider and Key Persistence

**User Story:** As a user, I want my provider choice and API key to be remembered across sessions, so that I do not need to re-enter them every time I use the app.

#### Acceptance Criteria

1. WHEN the user saves a valid API key, THE App SHALL persist the Provider_Choice to localStorage under the key "xawars_ai_provider" using the usePersistedState hook
2. WHEN the user saves a valid API key, THE App SHALL persist the API key to localStorage under the key "xawars_openai_api_key" using the usePersistedState hook
3. WHEN the app loads and a Provider_Choice exists in localStorage, THE Provider_Selector SHALL display the previously saved provider as the selected option
4. WHEN the app loads and no Provider_Choice exists in localStorage, THE App SHALL default to "openai" as the Provider_Choice
5. WHEN the user changes the provider and saves a new API key, THE App SHALL overwrite both the stored Provider_Choice and the stored API key

### Requirement 4: Provider-Based Request Routing

**User Story:** As a user, I want the app to send my content generation requests to the correct AI provider endpoint, so that my chosen provider processes the request.

#### Acceptance Criteria

1. WHEN content generation is triggered with the OpenAI_Provider selected, THE AI_Client SHALL send a POST request to "https://api.openai.com/v1/chat/completions" with the Authorization header set to "Bearer {apiKey}"
2. WHEN content generation is triggered with the OpenRouter_Provider selected, THE AI_Client SHALL send a POST request to "https://openrouter.ai/api/v1/chat/completions" with the Authorization header set to "Bearer {apiKey}" and an additional "HTTP-Referer" header set to the application origin
3. WHEN content generation is triggered with the Gemini_Provider selected, THE AI_Client SHALL send a POST request to the Google Gemini generateContent endpoint with the API key passed as a query parameter
4. WHEN the OpenAI_Provider is selected, THE AI_Client SHALL use the model "gpt-4o-mini" in the request body
5. WHEN the OpenRouter_Provider is selected, THE AI_Client SHALL use the model "openai/gpt-4o-mini" in the request body as the default model
6. WHEN the Gemini_Provider is selected, THE AI_Client SHALL use the model "gemini-2.0-flash" in the request body
7. THE AI_Client SHALL use the same system prompt and user message content regardless of the selected provider
8. THE AI_Client SHALL apply a 30-second timeout via AbortController for all provider requests

### Requirement 5: Response Parsing Across Providers

**User Story:** As a user, I want the app to correctly parse content from any provider, so that I see the same structured content regardless of which provider generated it.

#### Acceptance Criteria

1. WHEN the OpenAI_Provider returns a response, THE AI_Client SHALL extract the content from response.choices[0].message.content and parse it as a Content_Idea JSON object
2. WHEN the OpenRouter_Provider returns a response, THE AI_Client SHALL extract the content from response.choices[0].message.content and parse it as a Content_Idea JSON object
3. WHEN the Gemini_Provider returns a response, THE AI_Client SHALL extract the content from the Gemini response format (response.candidates[0].content.parts[0].text) and parse it as a Content_Idea JSON object
4. FOR ALL providers, THE AI_Client SHALL validate that the parsed response contains exactly: one contentIdea string, one titleVariations array of exactly 3 strings, one storyHook string, one missionDirective string, and one thumbnailPrompts array of exactly 3 strings
5. IF any provider returns a response that does not contain all required fields or has incorrect array lengths, THEN THE AI_Client SHALL throw an error with the message "Failed to parse API response"

### Requirement 6: Provider-Specific Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong with my chosen provider, so that I can understand and resolve the issue.

#### Acceptance Criteria

1. IF the OpenAI_Provider returns HTTP 401, THEN THE App SHALL clear the stored API key, close the Content_Generator_Modal, and open the API_Key_Modal with the error message "API key is invalid. Please re-enter."
2. IF the OpenRouter_Provider returns HTTP 401, THEN THE App SHALL clear the stored API key, close the Content_Generator_Modal, and open the API_Key_Modal with the error message "API key is invalid. Please re-enter."
3. IF the Gemini_Provider returns HTTP 400 with an API key error, THEN THE App SHALL clear the stored API key, close the Content_Generator_Modal, and open the API_Key_Modal with the error message "API key is invalid. Please re-enter."
4. IF any provider returns a rate limit error (HTTP 429), THEN THE Content_Generator_Modal SHALL display the message "Too many requests. Please wait." with a "Try Again" button
5. IF a network error occurs during a request to any provider, THEN THE Content_Generator_Modal SHALL display the message "Network error. Check your connection." with a "Try Again" button
6. IF any provider request times out after 30 seconds, THEN THE Content_Generator_Modal SHALL display the message "Request timed out. Try again." with a "Try Again" button
7. WHEN the user clicks "Try Again" after a non-authentication error, THE Content_Generator_Modal SHALL clear the error state and initiate a new generation request to the same provider

### Requirement 7: Gemini Request Format Adaptation

**User Story:** As a user selecting Google Gemini, I want the app to correctly format requests for the Gemini API, so that content generation works seamlessly with this provider.

#### Acceptance Criteria

1. WHEN the Gemini_Provider is selected, THE AI_Client SHALL format the request body using the Gemini generateContent schema with "contents" array containing user role messages and "systemInstruction" for the system prompt
2. WHEN the Gemini_Provider is selected, THE AI_Client SHALL set the "generationConfig" field with maxOutputTokens of 1000 and temperature of 0.9
3. WHEN the Gemini_Provider is selected, THE AI_Client SHALL set the response MIME type to "application/json" in the generationConfig to request structured JSON output
4. WHEN the Gemini_Provider is selected, THE AI_Client SHALL send the request with the Content-Type header set to "application/json" and no Authorization header (API key is in the URL query parameter)

### Requirement 8: Provider Indicator in Content Generator Modal

**User Story:** As a user, I want to see which AI provider is currently active when generating content, so that I know which service is being used.

#### Acceptance Criteria

1. WHEN the Content_Generator_Modal is open, THE Content_Generator_Modal SHALL display the name of the active provider (e.g., "OpenAI", "OpenRouter", "Gemini") in the modal header area
2. THE provider indicator SHALL use text-xs font size, zinc-400 text color, and be positioned below or beside the modal title
3. WHEN the user clicks the provider indicator or a "Change" link next to it, THE App SHALL close the Content_Generator_Modal and open the API_Key_Modal to allow provider switching

### Requirement 9: Backward Compatibility

**User Story:** As an existing user with a saved OpenAI API key, I want the app to continue working without requiring me to reconfigure anything, so that the update does not disrupt my workflow.

#### Acceptance Criteria

1. WHEN the app loads and an API key exists in localStorage under "xawars_openai_api_key" but no Provider_Choice exists under "xawars_ai_provider", THE App SHALL default to "openai" as the Provider_Choice and use the existing key without prompting the user
2. WHEN the app loads with a legacy configuration (key present, no provider stored), THE App SHALL validate the existing key using OpenAI_Provider validation rules (starts with "sk-", at least 20 characters)
3. THE App SHALL preserve the existing localStorage key name "xawars_openai_api_key" for storing the API key regardless of the selected provider to maintain backward compatibility
