# Implementation Plan: XAWARS Design System

## Overview

This plan implements the XAWARS Design System in layers: foundation tokens first, then semantic tokens, then core UI components, then composite patterns. Each task builds incrementally so the system is usable at every checkpoint. The existing `globals.css` and `Button.tsx` will be refactored to align with the full token architecture.

## Tasks

- [x] 1. Establish foundation and semantic token layer in globals.css
  - [x] 1.1 Define foundation tokens and semantic tokens as CSS custom properties in globals.css
    - Replace the existing `:root` block with the full foundation token palette (neutral scale, brand yellow, attack orange, defense blue, success green, error red, pure white)
    - Add all semantic tokens (surfaces, text, accent, borders, states, gaming context)
    - Remove the `prefers-color-scheme: dark` media query to enforce dark-mode-only
    - Set `--background` and `--foreground` to use the new semantic tokens
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 10.1, 10.2, 10.3_

  - [x] 1.2 Configure Tailwind v4 @theme directive to expose all tokens as utility classes
    - Update the `@theme inline` block to register all foundation and semantic tokens
    - Ensure utility classes like `bg-accent`, `text-text-primary`, `border-border-default` are generated
    - Register the font families (`--font-sans`, `--font-mono`) for Geist
    - _Requirements: 1.2, 1.3, 3.1_

  - [x] 1.3 Create design token validation utilities in `app/lib/design-tokens.ts`
    - Define the `DesignTokens` interface with foundation/semantic registries
    - Implement `isValidToken()`, `resolveToken()`, `getContextColor()`, and `getImportanceBorder()` functions
    - Export token constants for use in component logic (e.g., variant style maps)
    - _Requirements: 2.4, 17.1, 17.2, 17.3_

  - [x] 1.4 Write property test for semantic token resolution (Property 1)
    - **Property 1: Semantic Token Resolution**
    - **Validates: Requirements 2.1, 2.4**
    - Test file: `app/lib/__tests__/design-tokens.property.test.ts`

  - [x] 1.5 Write property test for gaming context color resolution (Property 7)
    - **Property 7: Gaming Context Color Resolution**
    - **Validates: Requirements 17.1, 17.2, 17.3**
    - Test file: `app/lib/__tests__/gaming-context.property.test.ts`

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Refactor Button component and build Input/Select components
  - [x] 3.1 Refactor `app/components/ui/Button.tsx` to support loading state, focus ring offset, and full interface
    - Add `loading` and `disabled` interaction state handling
    - Add spinner SVG pattern for loading state with "Please wait..." text
    - Update focus ring to `focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900`
    - Ensure `className` prop merges without overriding base styles
    - Add `aria-disabled` and `aria-busy` attributes for accessibility
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 11.5, 12.1, 12.3_

  - [x] 3.2 Create `app/components/ui/Input.tsx` component
    - Implement the `InputProps` interface with label, error, helperText support
    - Style with zinc-800/50 background, border-2 border-zinc-700, rounded-md, px-4 py-3
    - Add focus transition to yellow-500 border with ring
    - Add error state with role="alert", aria-invalid, aria-describedby
    - Add disabled state with opacity-50 and cursor-not-allowed
    - Accept className prop for extension
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 12.1, 12.5_

  - [x] 3.3 Create `app/components/ui/Select.tsx` component
    - Implement the `SelectProps` interface with label, error, options array
    - Style with zinc-800 background, border border-zinc-700, rounded-lg, matching Input padding
    - Add focus ring, error state with role="alert" and aria-describedby
    - Add disabled state handling
    - Accept className prop for extension
    - _Requirements: 5.4, 5.3, 12.1, 12.5_

  - [x] 3.4 Write property test for Button variant and size rendering (Property 2)
    - **Property 2: Button Variant and Size Rendering**
    - **Validates: Requirements 4.1, 4.2, 9.4**
    - Test file: `app/components/ui/__tests__/Button.property.test.tsx`

  - [x] 3.5 Write property test for error accessibility semantics (Property 3)
    - **Property 3: Error Accessibility Semantics**
    - **Validates: Requirements 5.3, 12.5, 14.3**
    - Test file: `app/components/ui/__tests__/form-accessibility.property.test.tsx`

  - [x] 3.6 Write property test for interactive component focus indicators (Property 4)
    - **Property 4: Interactive Component Focus Indicators**
    - **Validates: Requirements 11.5, 4.5**
    - Test file: `app/components/ui/__tests__/focus-indicators.property.test.tsx`

- [x] 4. Build Modal, Badge, Card, and remaining core components
  - [x] 4.1 Create `app/components/ui/Modal.tsx` component
    - Implement the `ModalProps` interface with isOpen, onClose, title, children
    - Use z-50 for modal content, z-40 for backdrop
    - Implement focus trapping (cycle focus within modal, return to trigger on close)
    - Handle Escape key dismissal and backdrop click
    - Add aria-modal="true", role="dialog", aria-labelledby for title
    - Apply shadow-lg, bg-zinc-800, border border-zinc-700, rounded-xl
    - Accept className prop
    - _Requirements: 7.2, 8.1, 12.1, 20.2_

  - [x] 4.2 Create `app/components/ui/Badge.tsx` component
    - Implement the `BadgeProps` interface with variant and size props
    - Define variant styles: default, attack, defense, success, error, warning
    - Use rounded-sm (4px) border radius, appropriate padding per size
    - Accept className prop
    - _Requirements: 7.1, 12.1, 12.2, 17.4_

  - [x] 4.3 Create `app/components/ui/Card.tsx` component
    - Implement the `CardProps` interface with variant (default, elevated, interactive) and padding
    - Apply elevation model: Level 1 bg-zinc-900 border-zinc-700 shadow-md for default
    - Level 2 bg-zinc-800 shadow-lg for elevated
    - Interactive variant adds hover:border-zinc-500 transition
    - Use rounded-xl border radius
    - Accept className prop
    - _Requirements: 6.2, 7.1, 7.2, 7.4, 12.1_

  - [x] 4.4 Create `app/components/ui/Spinner.tsx` component
    - Implement the `SpinnerProps` interface with size and color props
    - Use consistent SVG pattern: animate-spin with opacity-25 circle and opacity-75 arc
    - Size mappings: sm (w-4 h-4), md (w-5 h-5), lg (w-8 h-8)
    - Color mappings: primary (yellow-500), white, contextual (inherit)
    - _Requirements: 11.4, 14.2_

  - [x] 4.5 Create `app/components/ui/Divider.tsx` component
    - Implement border-t border-zinc-700 divider
    - Support optional centered "or" text with mx-4 text-xs uppercase tracking-wider text-zinc-500
    - _Requirements: 11.3_

  - [x] 4.6 Create `app/components/ui/EmptyState.tsx` component
    - Implement the `EmptyStateProps` interface with message, action, minHeight
    - Apply border-2 border-dashed border-zinc-800, rounded-xl, centered content
    - Use font-mono uppercase tracking-widest text-sm text-zinc-500 for message
    - Default minHeight of 300px
    - Accept className prop
    - _Requirements: 12.4, 14.1, 19.4_

  - [x] 4.7 Create `app/components/ui/ErrorBanner.tsx` component
    - Implement the `ErrorBannerProps` interface with message, onRetry, onDismiss
    - Apply rounded border-red-500/30, bg-red-500/10, px-4 py-3, text-sm text-red-400
    - Add role="alert" for screen reader announcement
    - Render ghost button for retry, X icon button for dismiss
    - Accept className prop
    - _Requirements: 5.6, 14.3, 12.1_

  - [x] 4.8 Create barrel export `app/components/ui/index.ts`
    - Export all core components: Button, Input, Select, Modal, Badge, Card, Spinner, Divider, EmptyState, ErrorBanner
    - _Requirements: 13.1, 13.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement className passthrough, typography, and icon accessibility patterns
  - [x] 6.1 Ensure all core components pass className without overriding base styles
    - Audit each component's className merging logic
    - Ensure custom classes append rather than replace variant/base styles
    - _Requirements: 12.1_

  - [x] 6.2 Write property test for className prop passthrough (Property 5)
    - **Property 5: className Prop Passthrough**
    - **Validates: Requirements 12.1**
    - Test file: `app/components/ui/__tests__/className-passthrough.property.test.tsx`

  - [x] 6.3 Write property test for uppercase tracking consistency (Property 6)
    - **Property 6: Uppercase Tracking Consistency**
    - **Validates: Requirements 11.2, 3.3**
    - Test file: `app/components/ui/__tests__/typography-consistency.property.test.tsx`

  - [x] 6.4 Write property test for decorative icon accessibility (Property 9)
    - **Property 9: Decorative Icon Accessibility**
    - **Validates: Requirements 20.5, 9.2**
    - Test file: `app/components/ui/__tests__/icon-accessibility.property.test.tsx`

- [x] 7. Implement data visualization primitives and delta indicators
  - [x] 7.1 Create stat counter and delta indicator utilities
    - Implement StatCounter styling pattern: font-black text-white value, text-[10px] font-bold uppercase tracking-widest text-zinc-500 label, bg-zinc-800/60 rounded-lg border border-zinc-700/50 container
    - Implement delta indicator logic: green-400 + up arrow for positive, red-400 + down arrow for negative, zinc-400 for zero
    - Implement progress bar component: bg-zinc-800 track, colored fill (green/yellow/red), rounded-full, h-2
    - _Requirements: 18.1, 18.2, 18.3_

  - [x] 7.2 Write property test for delta indicator correctness (Property 8)
    - **Property 8: Delta Indicator Correctness**
    - **Validates: Requirements 18.3**
    - Test file: `app/components/ui/__tests__/delta-indicators.property.test.tsx`

- [x] 8. Add animation definitions and reduced-motion support
  - [x] 8.1 Consolidate animation keyframes and add reduced-motion media query to globals.css
    - Ensure all keyframes are defined: fade-in, slide-in-left, slide-in-right, shimmer, ken-burns, button-press
    - Add `@media (prefers-reduced-motion: reduce)` block that disables decorative animations
    - Preserve functional animations (spinner rotation, focus ring appearance) under reduced motion
    - Add animation utility classes with correct timing (200ms micro, 300ms standard, 1-2s dramatic)
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 20.1_

- [x] 9. Add responsive layout utilities and z-index documentation
  - [x] 9.1 Add responsive layout patterns and constraints to globals.css
    - Add mobile card width constraint: `calc(100vw - 32px)` with min-width 280px below 480px
    - Ensure minimum touch target size of 44x44px for interactive elements on mobile
    - Document z-index layer usage as CSS comments in globals.css
    - _Requirements: 6.4, 6.5, 8.1, 8.2, 16.1, 16.2, 16.3, 16.4_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing Button.tsx is refactored in task 3.1 rather than rebuilt from scratch
- The existing globals.css animations are preserved and extended in task 8.1
- All components use TypeScript with strict typing as shown in the design interfaces

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["1.4", "1.5"] },
    { "id": 4, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 5, "tasks": ["3.4", "3.5", "3.6", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 6, "tasks": ["4.8"] },
    { "id": 7, "tasks": ["6.1", "7.1", "8.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "6.4", "7.2", "9.1"] }
  ]
}
```
