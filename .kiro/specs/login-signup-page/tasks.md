# Implementation Plan: Login/Signup Page

## Overview

Implement a dedicated login/signup page at `/login` for the XA Wars RNG app. The page provides email/password authentication, OAuth social login (Google, Discord), client-side form validation, mode toggling, loading/redirect states, and dark gaming theme styling. All auth operations use the existing `AuthContext` and Supabase backend.

## Tasks

- [x] 1. Create form validation utility
  - [x] 1.1 Implement `app/lib/form-validator.ts` with pure validation functions
    - Create `isValidEmail(email: string): boolean` — returns true iff email contains exactly one `@` followed by a domain with at least one `.` with non-empty labels
    - Create `validateLoginForm(email, password): ValidationErrors` — checks email required, email format, password required
    - Create `validateSignupForm(email, password): ValidationErrors` — same as login plus password minimum 8 characters
    - Export `ValidationErrors` interface with optional `email` and `password` string fields
    - All validators must return ALL errors simultaneously (no short-circuiting)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

  - [x] 1.2 Write property tests for form validation (`app/lib/__tests__/form-validator.property.test.ts`)
    - **Property 1: Email validation correctness**
    - **Validates: Requirements 4.2**
    - **Property 2: Password length validation in signup mode**
    - **Validates: Requirements 4.4**
    - **Property 3: Simultaneous validation errors**
    - **Validates: Requirements 4.6**

  - [x] 1.3 Write unit tests for form validation (`app/lib/__tests__/form-validator.test.ts`)
    - Test empty email returns "Email is required"
    - Test invalid email formats return "Please enter a valid email address"
    - Test empty password returns "Password is required"
    - Test short password in signup mode returns "Password must be at least 8 characters"
    - Test valid inputs return empty errors object
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Implement auth page components
  - [x] 2.1 Create `app/components/auth/ModeToggle.tsx`
    - Accept `mode` ('login' | 'signup') and `onToggle` callback props
    - Render a text button prompting the alternative action (e.g., "Don't have an account? Sign up" / "Already have an account? Log in")
    - Visually indicate the current mode
    - _Requirements: 2.1, 2.4_

  - [x] 2.2 Create `app/components/auth/OAuthButtonGroup.tsx`
    - Accept `onOAuthClick`, `loadingProvider`, and `disabled` props
    - Render Google and Discord buttons with provider icons and accessible labels
    - Show loading spinner on the clicked button while `loadingProvider` is set
    - Disable both buttons when `loadingProvider` is non-null or `disabled` is true
    - Render a visual divider with "or" text separating OAuth from the form
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

  - [x] 2.3 Create `app/components/auth/AuthForm.tsx`
    - Accept `mode`, `onSubmit`, `isSubmitting`, `serverError`, and `onFieldChange` props
    - Render email input (type="email") and password input (type="password") with associated `<label>` elements
    - Display submit button labeled "Log In" or "Sign Up" based on mode
    - Run client-side validation on submit using `form-validator.ts`; display errors adjacent to fields using `aria-describedby`
    - On validation failure, move focus to the first errored field (email before password)
    - Display server error in an alert area (`role="alert"`) above the submit button
    - Clear server error via `onFieldChange` when any input changes
    - Disable submit button and show loading indicator while `isSubmitting` is true
    - Auto-focus email input on mount
    - Submit form on Enter key press from any input field
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.5, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.4_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the login page route
  - [x] 4.1 Create `app/login/page.tsx` (LoginPage)
    - Mark as `'use client'`
    - Use `useAuth()` to access `isLoading`, `session`, `signIn`, `signUp`, `signInWithOAuth`
    - Manage `mode` state (default: 'login'), `serverError`, `isSubmitting`, and `oauthLoading` state
    - While `isLoading` is true, render a full-page loading indicator with accessible label
    - If session exists and not loading, redirect to `returnUrl` query param or `/` using `useRouter().push()`
    - If not loading and no session, render the auth form, OAuth buttons, and mode toggle
    - On mode toggle: clear all form fields, validation errors, and server error
    - On form submit: call `signIn` or `signUp` based on mode; on success redirect to `returnUrl` or `/`; on failure set `serverError`
    - On OAuth click: call `signInWithOAuth` with provider; on error display in alert area and re-enable buttons
    - Extract `returnUrl` from `useSearchParams()`; fall back to `/` if absent or external URL
    - _Requirements: 1.1, 1.2, 1.4, 2.2, 2.3, 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 4.2 Apply dark gaming theme styling to the login page
    - Use dark background (black/zinc) matching existing app color scheme
    - Display XA Wars brand name or logo centered above the form at minimum 32px height
    - Center the form vertically and horizontally on the viewport
    - Use existing Button component styles for primary actions
    - Use existing font family for all text
    - Ensure responsive layout: no horizontal scroll from 320px to 1920px
    - On viewports < 480px: form min-width 280px, max-width viewport minus 32px padding
    - Ensure visible focus indicators with minimum 3:1 contrast ratio
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.5_

  - [x] 4.3 Implement tab order and keyboard accessibility
    - Ensure tab order: email → password → submit → Google OAuth → Discord OAuth → mode toggle
    - Verify Enter key submits form from any input
    - Verify focus moves to first errored field on validation failure
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5. Implement route protection and redirect handling
  - [x] 5.1 Add auth redirect logic for protected routes
    - When an unauthenticated user navigates to a protected route, redirect to `/login?returnUrl=<original_path>`
    - After successful auth on the login page, redirect to the preserved `returnUrl` or `/`
    - Validate `returnUrl` is a relative path (not external) before redirecting
    - _Requirements: 1.3, 1.4_

- [x] 6. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write component tests
  - [x] 7.1 Write unit tests for AuthForm (`app/components/auth/__tests__/AuthForm.test.tsx`)
    - Test rendering of inputs, labels, and submit button
    - Test submit button label changes with mode
    - Test loading state disables button and shows spinner
    - Test server error displays in alert area
    - Test server error clears on field change
    - Test form submission calls onSubmit with email and password
    - Test validation errors display adjacent to fields
    - Test auto-focus on email input
    - _Requirements: 3.1, 3.4, 3.5, 3.6, 5.1, 5.2, 8.1_

  - [x] 7.2 Write unit tests for OAuthButtonGroup (`app/components/auth/__tests__/OAuthButtonGroup.test.tsx`)
    - Test rendering of Google and Discord buttons with accessible labels
    - Test click calls onOAuthClick with correct provider
    - Test loading state disables buttons and shows spinner
    - Test divider with "or" text is rendered
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 7.3 Write property tests for AuthForm (`app/components/auth/__tests__/AuthForm.property.test.tsx`)
    - **Property 4: Mode switch clears all form state**
    - **Validates: Requirements 2.2**
    - **Property 5: Server error clears on field modification while preserving values**
    - **Validates: Requirements 5.2, 5.4**
    - **Property 6: Login credential passthrough**
    - **Validates: Requirements 3.2**
    - **Property 7: Signup credential passthrough**
    - **Validates: Requirements 3.3**
    - **Property 9: Focus moves to first errored field**
    - **Validates: Requirements 8.4**

  - [x] 7.4 Write property test for LoginPage redirect (`app/components/auth/__tests__/LoginPage.property.test.tsx`)
    - **Property 8: Return URL preservation**
    - **Validates: Requirements 1.4**

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All auth operations use the existing `AuthContext` — no new backend code needed
- The design uses TypeScript with Next.js App Router conventions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.3"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "7.4"] }
  ]
}
```
