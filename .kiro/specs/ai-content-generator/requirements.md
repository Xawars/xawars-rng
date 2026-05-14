# Requirements Document

## Introduction

The AI Content Generator is a feature for the Xawars RNG app that helps Rainbow Six Siege content creators generate ideas for YouTube, TikTok, and Instagram content. It uses OpenAI's GPT-4o mini model to produce content ideas, title variations, story hooks, mission directives for viewer engagement, and thumbnail prompts. Users provide their own OpenAI API key, which is stored locally in the browser.

## Glossary

- **Generator_Button**: A floating action button fixed to the bottom-right corner of the viewport that triggers the content generation flow
- **API_Key_Modal**: A modal dialog that collects and validates the user's OpenAI API key
- **Content_Generator_Modal**: The main modal that displays AI-generated content sections
- **Content_Idea**: A structured response from the OpenAI API containing a content idea, title variations, story hook, mission directive, and thumbnail prompts
- **Copy_Button**: A reusable UI component that copies text to the clipboard and provides visual feedback
- **OpenAI_Client**: The module responsible for initializing and communicating with the OpenAI GPT-4o mini API
- **localStorage**: The browser's local storage mechanism used to persist the API key across sessions

## Requirements

### Requirement 1: Floating Generator Button

**User Story:** As a content creator, I want a visible floating button on the screen, so that I can quickly access the AI content generation feature from anywhere in the app.

#### Acceptance Criteria

1. THE Generator_Button SHALL render as a fixed-position element in the bottom-right corner of the viewport with 24px offset from the bottom and right edges
2. THE Generator_Button SHALL display a Sparkles icon and the text "Generate" with a yellow-500 background, black bold uppercase text, rounded-full shape, and shadow-lg elevation
3. THE Generator_Button SHALL use z-index 40 to appear above page content but below modal overlays (z-50)
4. WHEN the user clicks the Generator_Button, IF no API key is stored in localStorage or the stored key does not start with "sk-" or is shorter than 20 characters, THEN THE App SHALL open the API_Key_Modal
5. WHEN the user clicks the Generator_Button, IF a stored API key starts with "sk-" and is at least 20 characters long, THEN THE App SHALL open the Content_Generator_Modal and display a loading indicator while the content generation request is in progress
6. WHEN the user hovers over the Generator_Button, THE Generator_Button SHALL scale to 105% with a transition duration of 150ms
7. WHEN the user presses (active state) the Generator_Button, THE Generator_Button SHALL scale to 95% with a transition duration of 150ms
8. THE Generator_Button SHALL have an accessible label of "Generate AI content" for screen readers and SHALL be reachable via keyboard navigation

### Requirement 2: API Key Input and Validation

**User Story:** As a user, I want to securely enter and store my OpenAI API key, so that the app can generate content on my behalf using my own account.

#### Acceptance Criteria

1. WHEN the API_Key_Modal is open, THE API_Key_Modal SHALL display a password-type input field with placeholder text "sk-..." and a maximum input length of 200 characters.
2. WHEN the user submits an API key that does not start with "sk-", THE API_Key_Modal SHALL display the error message "Invalid API key format. Must start with sk-" and SHALL retain the entered value in the input field.
3. WHEN the user submits an API key shorter than 20 characters, THE API_Key_Modal SHALL display the error message "API key too short" and SHALL retain the entered value in the input field.
4. IF the user submits an empty input field, THEN THE API_Key_Modal SHALL display the error message "Invalid API key format. Must start with sk-" and SHALL NOT persist any value.
5. WHEN the user submits an API key that starts with "sk-" and is at least 20 characters in length, THE App SHALL persist the key to localStorage under the key "xawars_openai_api_key" using the usePersistedState hook and SHALL close the API_Key_Modal.
6. THE API_Key_Modal SHALL display a link to "https://platform.openai.com/api-keys" that opens in a new tab for users who need to obtain a key.
7. THE API_Key_Modal SHALL display a security notice stating that the key is stored locally in the browser.
8. WHEN the user clicks Cancel, THE API_Key_Modal SHALL close without persisting any value to localStorage.
9. WHEN a validation error is displayed and the user modifies the input field value, THE API_Key_Modal SHALL clear the displayed error message.

### Requirement 3: Content Generation via OpenAI API

**User Story:** As a content creator, I want the app to generate Rainbow Six Siege content ideas using AI, so that I can overcome creative blocks and produce engaging content.

#### Acceptance Criteria

1. WHEN content generation is triggered, THE OpenAI_Client SHALL send a request to the GPT-4o mini model with a system prompt defining the role as a Rainbow Six Siege content strategist and a maximum token limit of 1000 tokens
2. THE OpenAI_Client SHALL request structured JSON output containing exactly: one contentIdea string, three titleVariations strings, one storyHook string, one missionDirective string, and three thumbnailPrompts strings
3. WHEN the API returns a JSON response containing all required fields (contentIdea, titleVariations with exactly 3 items, storyHook, missionDirective, and thumbnailPrompts with exactly 3 items), THE OpenAI_Client SHALL parse it into a Content_Idea object and return it to the caller
4. IF the API returns an empty response, THEN THE OpenAI_Client SHALL throw an error with the message "No content generated from API"
5. IF the API returns malformed JSON or JSON missing any required field, THEN THE OpenAI_Client SHALL throw an error with the message "Failed to parse API response"
6. IF a network error occurs during the API call, THEN THE Content_Generator_Modal SHALL display the message "Network error. Check your connection." with a retry button that re-triggers content generation
7. IF the API returns a rate limit error, THEN THE Content_Generator_Modal SHALL display the message "Too many requests. Please wait." with a retry button that re-triggers content generation
8. IF the API returns an authentication error, THEN THE Content_Generator_Modal SHALL display an error message indicating the API key is invalid and prompt the user to re-enter their key
9. IF the API call does not receive a response within 30 seconds, THEN THE OpenAI_Client SHALL abort the request and throw a timeout error

### Requirement 4: Content Generator Modal Display

**User Story:** As a content creator, I want to view all generated content sections in a clear, organized modal, so that I can quickly review and use the ideas.

#### Acceptance Criteria

1. WHEN the Content_Generator_Modal is open with a generated Content_Idea, THE Content_Generator_Modal SHALL display five labeled sections in the following order: Content Idea, Title Variations, Story Hook, Mission Directive, and Thumbnail Prompts
2. WHEN a Content_Idea is displayed, THE Content_Generator_Modal SHALL display the three title variations as a numbered list (1, 2, 3)
3. WHEN a Content_Idea is displayed, THE Content_Generator_Modal SHALL display the three thumbnail prompts as a numbered list (1, 2, 3)
4. THE Content_Generator_Modal SHALL include a "Generate" button in the header that triggers a new content generation request
5. WHILE content is being generated, THE Content_Generator_Modal SHALL display a spinning loading indicator with the text "Generating ideas..."
6. WHILE content is being generated, THE Content_Generator_Modal SHALL disable the Generate button
7. THE Content_Generator_Modal SHALL be scrollable when content exceeds the modal height, with a maximum height of 90vh
8. THE Content_Generator_Modal SHALL use a maximum width of 448px on viewports wider than 640px, and full width with 16px horizontal padding on viewports 640px or narrower
9. WHEN the user clicks the close button or the backdrop overlay, THE Content_Generator_Modal SHALL close and return to the previous view
10. WHEN the Content_Generator_Modal is open with no Content_Idea generated, THE Content_Generator_Modal SHALL display the loading state if generation is in progress, or an empty state prompting the user to click Generate

### Requirement 5: Copy to Clipboard Functionality

**User Story:** As a content creator, I want to copy individual sections or groups of content to my clipboard, so that I can paste them into my content creation tools.

#### Acceptance Criteria

1. THE Copy_Button SHALL be displayed next to each content section (Content Idea, Story Hook, Mission Directive) showing a clipboard icon and the label "Copy" in its default state
2. WHEN the user clicks a Copy_Button, THE Copy_Button SHALL copy the associated section text to the system clipboard
3. WHEN a copy operation succeeds, THE Copy_Button SHALL display a green checkmark icon and the text "Copied!" for 2 seconds before reverting to the default state (clipboard icon and "Copy" label)
4. IF the clipboard write operation fails, THEN THE Copy_Button SHALL remain in its default state and not display the success indicator
5. THE Content_Generator_Modal SHALL display a "Copy All" button for the Title Variations section
6. WHEN the user clicks the "Copy All" button for Title Variations, THE Content_Generator_Modal SHALL copy all three titles to the system clipboard as a newline-separated numbered list (e.g., "1. Title\n2. Title\n3. Title")
7. THE Content_Generator_Modal SHALL display a "Copy All" button for the Thumbnail Prompts section
8. WHEN the user clicks the "Copy All" button for Thumbnail Prompts, THE Content_Generator_Modal SHALL copy all three prompts to the system clipboard as a newline-separated bullet list (e.g., "• Prompt\n• Prompt\n• Prompt")

### Requirement 6: Visual Design Consistency

**User Story:** As a user, I want the AI Content Generator to match the existing app design, so that the experience feels cohesive and polished.

#### Acceptance Criteria

1. THE Generator_Button SHALL use the yellow-500 background color, black text, bold uppercase tracking-wider font styling, and yellow-500/20 shadow consistent with the existing primary action buttons
2. THE Generator_Button SHALL use a pill shape (rounded-full) with a large shadow (shadow-lg) and display a hover state that lightens the background to yellow-400
3. THE API_Key_Modal SHALL use zinc-900 background, zinc-700/50 borders, white text, and rounded-xl border-radius consistent with the existing modal components
4. THE Content_Generator_Modal SHALL use zinc-900 background, zinc-700/50 borders, rounded-xl border-radius, and a header section with a border-b border-white/5 separator consistent with existing modals
5. THE Content_Generator_Modal SHALL use Lucide React icons with a size of w-4 h-4 for inline elements and w-5 h-5 for header elements, consistent with the icon sizing used in the rest of the application
6. WHEN the Generator_Button or any modal interactive element receives keyboard focus, THE element SHALL display a visible focus ring (focus:ring-2) to maintain accessibility compliance with existing button components

### Requirement 7: Responsive Design

**User Story:** As a mobile user, I want the AI Content Generator to work well on smaller screens, so that I can use it on my phone or tablet.

#### Acceptance Criteria

1. WHILE the viewport width is less than 448px, THE Content_Generator_Modal SHALL occupy full viewport width minus 16px of horizontal padding on each side
2. WHILE the viewport width is less than 448px, THE Generator_Button SHALL remain fully visible with a minimum touch target of 44×44px and SHALL not overlap the device safe area insets
3. THE API_Key_Modal SHALL use a maximum width of 448px and center itself horizontally and vertically on all screen sizes
4. WHILE the viewport height is insufficient to display all Content_Generator_Modal content, THE Content_Generator_Modal SHALL provide vertical scrolling within a maximum height of 90% of the viewport height

### Requirement 8: Error Recovery and State Management

**User Story:** As a user, I want the app to handle errors gracefully and maintain my state, so that I can recover from issues without losing my API key or needing to restart.

#### Acceptance Criteria

1. IF the OpenAI API returns an authentication error (HTTP 401), THEN THE App SHALL clear the stored API key, stop the loading state, and open the API_Key_Modal with an error message indicating the API key is invalid
2. IF the OpenAI API returns a non-authentication error (network failure, rate limit, or malformed response), THEN THE Content_Generator_Modal SHALL stop the loading state, display an error message indicating the failure reason, and present a "Try Again" button while preserving the stored API key
3. WHEN the user clicks "Try Again" after an error, THE Content_Generator_Modal SHALL clear the error state and initiate a new generation request with the loading indicator displayed
4. THE App SHALL preserve the stored API key across page reloads using the usePersistedState hook with the localStorage key "xawars_openai_api_key"
5. WHEN the Content_Generator_Modal is closed and reopened, THE Content_Generator_Modal SHALL retain the last generated Content_Idea until a new generation is triggered
