# Requirements Document

## Introduction

This feature adds a dedicated login/signup page to the XA Wars RNG app. The app currently has a fully implemented authentication context (AuthContext) with email/password sign-up, sign-in, OAuth via Google and Discord, and sign-out capabilities, but lacks a user-facing page to access these functions. This feature creates a visually cohesive authentication page that matches the app's dark gaming aesthetic, provides clear entry points for all supported auth methods, and handles form validation and error states gracefully.

## Glossary

- **Login_Page**: The Next.js page component at `/login` that renders the authentication UI including login form, signup form, and OAuth buttons
- **Auth_Form**: The form component responsible for collecting and validating user credentials (email and password) before submission
- **OAuth_Button_Group**: The UI section displaying social login options (Google and Discord) as clickable buttons
- **Form_Validator**: The client-side validation logic that checks email format and password requirements before form submission
- **Auth_System**: The existing authentication module (AuthContext) responsible for user registration, login, session management, and account security
- **User**: A person interacting with the login/signup page to create an account or access an existing one

## Requirements

### Requirement 1: Page Routing and Access

**User Story:** As a visitor, I want to access a dedicated login page at a clear URL, so that I can find the authentication entry point easily.

#### Acceptance Criteria

1. THE Login_Page SHALL be accessible at the `/login` route
2. WHILE the Auth_System session is not null, THE Login_Page SHALL redirect the User to the `/` route within 2 seconds of confirming the session
3. WHEN a User navigates to a route that requires authentication without an active session, THE Auth_System SHALL redirect the User to the `/login` route
4. WHEN the Auth_System redirects an unauthenticated User to the Login_Page, THE Auth_System SHALL preserve the originally requested URL so that after successful authentication the User is redirected back to that URL instead of the `/` route

### Requirement 2: Auth Mode Toggle

**User Story:** As a visitor, I want to switch between login and signup modes on the same page, so that I do not need to navigate to a separate page for registration.

#### Acceptance Criteria

1. THE Login_Page SHALL display a toggle mechanism allowing the User to switch between login mode and signup mode, with text that indicates the alternative mode action (e.g., prompting to sign up when in login mode, or to log in when in signup mode)
2. WHEN the User switches auth mode, THE Auth_Form SHALL clear all input field values, validation error messages, and server error messages
3. THE Login_Page SHALL default to login mode when first loaded
4. THE Login_Page SHALL visually indicate the currently active auth mode so the User can distinguish whether the form is in login mode or signup mode

### Requirement 3: Email and Password Form

**User Story:** As a visitor, I want to enter my email and password in a form, so that I can log in or create an account.

#### Acceptance Criteria

1. THE Auth_Form SHALL display an email input field with type "email" and a password input field with type "password"
2. WHEN the User submits the form in login mode and client-side validation passes, THE Auth_Form SHALL call the Auth_System signIn method with the provided email and password
3. WHEN the User submits the form in signup mode and client-side validation passes, THE Auth_Form SHALL call the Auth_System signUp method with the provided email and password
4. WHILE a form submission is in progress, THE Auth_Form SHALL disable the submit button and display a loading indicator, and SHALL re-enable the submit button and hide the loading indicator within 1 second of receiving the Auth_System response
5. THE Auth_Form SHALL associate labels with input fields using proper HTML label elements for accessibility
6. THE Auth_Form SHALL display a submit button labeled "Log In" in login mode and "Sign Up" in signup mode
7. WHEN the Auth_System returns an AuthResult with success equal to true, THE Auth_Form SHALL not display any error message and SHALL allow navigation to proceed

### Requirement 4: Client-Side Form Validation

**User Story:** As a visitor, I want immediate feedback on invalid input, so that I can correct mistakes before submitting.

#### Acceptance Criteria

1. WHEN the User submits the form with an empty email field, THE Form_Validator SHALL prevent form submission and display an error message "Email is required"
2. WHEN the User submits the form with an email value that does not contain exactly one "@" character followed by a domain with at least one "." character, THE Form_Validator SHALL prevent form submission and display an error message "Please enter a valid email address"
3. WHEN the User submits the form with an empty password field, THE Form_Validator SHALL prevent form submission and display an error message "Password is required"
4. WHEN the User submits the form in signup mode with a password shorter than 8 characters, THE Form_Validator SHALL prevent form submission and display an error message "Password must be at least 8 characters"
5. THE Form_Validator SHALL display validation errors adjacent to the corresponding input field
6. WHEN the User submits the form with multiple invalid fields, THE Form_Validator SHALL display all applicable error messages simultaneously, one adjacent to each invalid field

### Requirement 5: Server Error Display

**User Story:** As a visitor, I want to see clear error messages when authentication fails, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the Auth_System returns an error after form submission, THE Auth_Form SHALL display the error message in an alert area positioned above the submit button, using an ARIA role of "alert" so that screen readers announce it automatically
2. WHEN the User modifies any input field after an error is displayed, THE Auth_Form SHALL clear the server error message while preserving the current values of all input fields
3. IF a network error occurs during form submission, THEN THE Auth_Form SHALL display the network error message returned by the Auth_System in the same alert area used for other server errors
4. WHEN the Auth_System returns an error after form submission, THE Auth_Form SHALL preserve all user-entered field values so the User can correct and resubmit without retyping

### Requirement 6: OAuth Social Login Buttons

**User Story:** As a visitor, I want to log in with Google or Discord, so that I can access the app without creating a separate password.

#### Acceptance Criteria

1. THE OAuth_Button_Group SHALL display a Google login button and a Discord login button, each with an accessible label identifying the provider name
2. WHEN the User clicks the Google login button, THE Login_Page SHALL call the Auth_System signInWithOAuth method with provider "google"
3. WHEN the User clicks the Discord login button, THE Login_Page SHALL call the Auth_System signInWithOAuth method with provider "discord"
4. IF the Auth_System signInWithOAuth method throws an error, THEN THE Login_Page SHALL display the error message in the alert area and re-enable the OAuth buttons
5. THE OAuth_Button_Group SHALL be visually separated from the email/password form with a divider indicating "or"
6. WHILE an OAuth sign-in request is in progress, THE OAuth_Button_Group SHALL disable both OAuth buttons and display a loading indicator on the clicked button
7. THE OAuth_Button_Group SHALL be displayed in both login mode and signup mode

### Requirement 7: Visual Design and Theming

**User Story:** As a visitor, I want the login page to match the XA Wars dark gaming aesthetic, so that the experience feels cohesive with the rest of the app.

#### Acceptance Criteria

1. THE Login_Page SHALL use a dark background matching the app's existing color scheme (black background with zinc-toned surfaces and yellow accent colors)
2. THE Login_Page SHALL display the XA Wars logo or brand name centered above the form at a minimum rendered height of 32px
3. THE Login_Page SHALL use the app's existing Button component styles for primary actions
4. THE Login_Page SHALL be responsive and display without horizontal scrolling or content overflow on viewport widths from 320px to 1920px
5. THE Login_Page SHALL center the authentication form vertically and horizontally on the viewport
6. THE Login_Page SHALL use the app's existing font family for all text elements
7. IF the viewport width is less than 480px, THEN THE Login_Page SHALL display the form at a minimum width of 280px and a maximum width equal to the viewport width minus 32px of horizontal padding

### Requirement 8: Keyboard Accessibility and Focus Management

**User Story:** As a user who navigates with a keyboard, I want to complete the login flow without a mouse, so that the page is accessible to all users.

#### Acceptance Criteria

1. WHEN the Login_Page loads, THE Auth_Form SHALL place focus on the email input field
2. WHEN the User presses the Enter key while focus is on any input field within the Auth_Form, THE Auth_Form SHALL submit the form
3. THE Login_Page SHALL maintain a tab order through all interactive elements in the following sequence: email input, password input, submit button, Google OAuth button, Discord OAuth button, mode toggle
4. WHEN a validation error is displayed, THE Auth_Form SHALL move focus to the first field with an error
5. THE Login_Page SHALL display a visible focus indicator on the currently focused interactive element that meets a minimum contrast ratio of 3:1 against adjacent colors

### Requirement 9: Loading and Redirect States

**User Story:** As a visitor, I want to see appropriate feedback while the page determines my auth state, so that I am not confused by a flash of content.

#### Acceptance Criteria

1. WHILE the Auth_System isLoading state is true, THE Login_Page SHALL display a loading indicator with an accessible label instead of the form
2. WHEN the Auth_System isLoading state becomes false and an active session exists, THE Login_Page SHALL redirect to the `/` route without rendering the Auth_Form or OAuth_Button_Group
3. WHEN authentication succeeds via email/password and the Auth_System returns a successful AuthResult, THE Login_Page SHALL redirect the User to the `/` route
4. WHEN signup succeeds and the Auth_System establishes a session, THE Login_Page SHALL redirect the User to the `/` route
5. IF the Auth_System isLoading state becomes false and no session exists, THEN THE Login_Page SHALL display the Auth_Form and OAuth_Button_Group
