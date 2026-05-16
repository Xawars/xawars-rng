# Requirements Document

## Introduction

XAWARS is a Rainbow Six Siege operator randomizer and content creation tool built with Next.js, Tailwind CSS v4, and Supabase. This design system defines the visual language, component patterns, and interaction principles that unify the entire application. The system targets competitive R6 Siege players and content creators who expect a dark, tactical, high-contrast gaming aesthetic with fast, responsive interactions.

The design system serves as a living reference for all UI development — ensuring consistency across the operator randomizer, map advisor, content generator, creator tools, and authentication flows.

## Design Philosophy

The XAWARS design system is guided by these core principles:

1. **Fast tactical readability over visual decoration** — Every element earns its place by communicating information. Ornament without purpose is removed.
2. **Competitive-game-inspired hierarchy** — Information is ranked like a HUD: critical data is large, bold, and high-contrast; supporting data recedes.
3. **High information density without clutter** — Tight spacing and small labels pack data efficiently, but generous padding between sections prevents cognitive overload.
4. **Motion used for feedback, not entertainment** — Animations confirm actions and guide attention. They never delay the user or exist for spectacle.
5. **Minimal cognitive friction** — Consistent patterns mean users learn the interface once. Predictability is a feature.
6. **Strong contextual awareness** — The UI adapts its color language to game state (attack/defense), importance tiers, and user actions without requiring explicit mode switches.

When rules are ambiguous, contributors should ask: "Does this help the user make a faster, more confident decision?" If not, simplify.

## Glossary

- **Design_System**: The complete set of visual tokens, component patterns, spacing rules, and interaction guidelines governing the XAWARS application UI
- **Foundation_Token**: A raw design value from the base palette (e.g., zinc-900, yellow-500) with no semantic meaning attached
- **Semantic_Token**: A purpose-driven design value that maps a Foundation_Token to a UI role (e.g., --color-accent maps to yellow-500)
- **Surface**: A distinct visual layer in the UI hierarchy (e.g., page background, card, elevated modal)
- **Component**: A reusable UI element (button, input, card, badge) that follows the design system rules
- **Accent_Color**: The primary brand highlight color used for CTAs, focus rings, and emphasis (yellow-500 in the current palette)
- **Elevation**: The visual depth of a surface, communicated through background lightness, border opacity, shadow intensity, and z-index stacking
- **Interaction_State**: A visual change applied to a component in response to user action (hover, focus, active, disabled, loading)
- **Global_State**: An application-level UI condition (empty, loading, error, success, partial, offline) with shared visual patterns
- **Breakpoint**: A viewport width threshold where layout adapts (mobile-first: 640px, 768px, 1024px, 1280px)
- **Tactical_Aesthetic**: The dark, high-contrast, military-inspired visual style appropriate for competitive FPS gaming tools
- **WCAG_AA**: Web Content Accessibility Guidelines level AA, requiring minimum 4.5:1 contrast for normal text and 3:1 for large text
- **Core_Component**: A foundational UI primitive (Button, Input, Modal, Badge, Card) used across all features
- **Composite_Component**: A feature-aware component built from Core_Components (OperatorCard, TeamPanel, LoadoutDisplay)

## Requirements

### Requirement 1: Foundation Token Palette

**User Story:** As a developer, I want raw color values defined as foundation tokens, so that the base palette is centralized and any branding change propagates automatically.

#### Acceptance Criteria

1. THE Design_System SHALL define Foundation_Tokens as CSS custom properties in globals.css for: neutral scale (--color-black: #000000, --color-zinc-900: #18181b, --color-zinc-800: #27272a, --color-zinc-700: #3f3f46, --color-zinc-600: #52525b, --color-zinc-500: #71717a, --color-zinc-400: #a1a1aa), brand yellow (--color-yellow-500: #eab308, --color-yellow-400: #facc15), attack orange (--color-orange-500: #f97316, --color-orange-600: #ea580c), defense blue (--color-blue-500: #3b82f6, --color-blue-600: #2563eb), success green (--color-green-500: #22c55e, --color-green-400: #4ade80), error red (--color-red-500: #ef4444, --color-red-400: #f87171, --color-red-600: #dc2626), and pure white (--color-white: #ffffff)
2. THE Design_System SHALL expose all Foundation_Tokens through Tailwind v4 @theme configuration for utility class access
3. THE Design_System SHALL prohibit the use of arbitrary hex values in component code — all colors must reference a defined Foundation_Token or Semantic_Token

### Requirement 2: Semantic Token Layer

**User Story:** As a developer, I want purpose-driven semantic tokens that map foundation colors to UI roles, so that I choose tokens by intent rather than by visual appearance.

#### Acceptance Criteria

1. THE Design_System SHALL define Semantic_Tokens mapping Foundation_Tokens to UI purposes: --color-bg-primary (black), --color-bg-surface (zinc-900), --color-bg-elevated (zinc-800), --color-bg-overlay (zinc-700), --color-text-primary (white), --color-text-secondary (zinc-400), --color-text-muted (zinc-500), --color-text-disabled (zinc-600), --color-accent (yellow-500), --color-accent-hover (yellow-400), --color-border-default (zinc-700), --color-border-hover (zinc-500), --color-border-focus (yellow-500)
2. THE Design_System SHALL define state-specific Semantic_Tokens: --color-success (green-500), --color-error (red-500), --color-warning (amber-500), --color-info (blue-500), --color-error-bg (red-500/10), --color-error-border (red-500/30), --color-error-text (red-400)
3. THE Design_System SHALL define context-specific Semantic_Tokens: --color-attack (orange-500), --color-attack-active (orange-600), --color-defense (blue-500), --color-defense-active (blue-600)
4. IF a brand color change is required, THEN THE Design_System SHALL support it by updating only Foundation_Token values without modifying Semantic_Token names or component code

### Requirement 3: Typography System

**User Story:** As a developer, I want a clear typography scale with defined font families, sizes, and weights, so that text hierarchy is consistent and readable across all screens.

#### Acceptance Criteria

1. THE Design_System SHALL use Geist Sans as the primary font for UI text (labels, body, descriptions) and Geist Mono as the secondary font for data displays (stats, codes, operator loadouts, technical values)
2. THE Design_System SHALL define a type scale with these roles: Display (text-3xl/text-4xl, font-black, uppercase, tracking-tighter — for operator names and hero headings), Heading (text-xl/text-2xl, font-bold, uppercase — for section titles), Label (text-xs/text-[10px], font-bold, uppercase, tracking-widest — for field labels and categories), Body (text-sm/text-base, font-medium — for descriptions and content), and Caption (text-xs, font-medium, text-zinc-500 — for helper text and timestamps)
3. THE Design_System SHALL apply uppercase tracking-wider treatment to all interactive labels (buttons, tabs, navigation items) to reinforce the Tactical_Aesthetic
4. WHEN text exceeds its container width, THE Design_System SHALL truncate with ellipsis for single-line elements or apply line-clamp for multi-line content rather than allowing horizontal overflow

### Requirement 4: Button Styles and Interaction States

**User Story:** As a developer, I want a complete button system with variants, sizes, and states, so that all clickable actions are visually consistent and provide clear feedback.

#### Acceptance Criteria

1. THE Design_System SHALL define four button variants: Primary (yellow-500 background, black text, shadow-lg with shadow-yellow-500/20 glow), Danger (red-600 background, white text, shadow-lg with shadow-red-600/20), Outline (transparent with border-2 border-white/20, white text), and Ghost (transparent, text-white/60)
2. THE Design_System SHALL define three button sizes: Small (px-3 py-1.5 text-xs gap-1.5), Medium (px-6 py-3 text-sm gap-2), and Large (px-8 py-4 text-base gap-3)
3. WHEN a user hovers over a Primary button, THE Component SHALL transition to yellow-400 background within 200ms
4. WHEN a user presses a button, THE Component SHALL apply a translate-y-0.5 transform to simulate physical depression
5. WHEN a button is focused via keyboard, THE Component SHALL display a 2px yellow-500 focus ring with a 2px offset from the zinc-900 background
6. WHEN a button is disabled, THE Component SHALL reduce opacity to 50% and display a not-allowed cursor
7. WHEN a button is in a loading state, THE Component SHALL display an animated spinner icon alongside "Please wait..." text and disable further interaction

### Requirement 5: Input and Form Styling

**User Story:** As a developer, I want standardized form controls that match the dark tactical theme, so that all data entry points feel cohesive and accessible.

#### Acceptance Criteria

1. THE Design_System SHALL style text inputs with: zinc-800/50 background, border-2 border-zinc-700, rounded corners (border-radius md), px-4 py-3 padding, text-sm text-white, and placeholder-zinc-500
2. WHEN an input receives focus, THE Component SHALL transition the border color to yellow-500 and display a focus ring (ring-2 ring-yellow-500 ring-offset-2 ring-offset-zinc-900) within 200ms
3. WHEN an input contains a validation error, THE Component SHALL display a red-400 error message below the field with role="alert" for screen reader announcement
4. THE Design_System SHALL style select dropdowns with: zinc-800 background, border border-zinc-700, rounded-lg, matching padding and text styles to text inputs
5. WHEN an input is disabled, THE Component SHALL reduce opacity to 50% and display a not-allowed cursor
6. THE Design_System SHALL define error container styling as: rounded border with border-red-500/30, bg-red-500/10 background, and red-400 text

### Requirement 6: Spacing and Layout System

**User Story:** As a developer, I want a consistent spacing scale and layout patterns, so that whitespace and alignment are predictable across all views.

#### Acceptance Criteria

1. THE Design_System SHALL use Tailwind's default 4px-based spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64) as the sole spacing vocabulary for margins, padding, and gaps
2. THE Design_System SHALL define standard layout containers: Full-bleed (min-h-screen with centered content), Card (p-5 or p-6 with rounded-xl and border), and Section (space-y-4 or space-y-6 for vertical rhythm)
3. THE Design_System SHALL define a maximum content width of max-w-sm (384px) for auth forms and max-w-4xl (896px) for main application content
4. WHEN the viewport width is below 640px, THE Design_System SHALL stack horizontal layouts vertically and reduce padding from p-6 to p-4
5. THE Design_System SHALL maintain a minimum touch target size of 44x44px for all interactive elements on mobile viewports

### Requirement 7: Border Radius, Shadows, and Elevation

**User Story:** As a developer, I want defined border radius and shadow values tied to elevation levels, so that depth and containment are communicated consistently.

#### Acceptance Criteria

1. THE Design_System SHALL define border radius tokens: none (0) for sharp tactical elements, sm (4px) for small badges, default/md (6px) for buttons and inputs, lg (8px) for select dropdowns, xl (12px) for cards and panels, full (9999px) for pills and avatars
2. THE Design_System SHALL define shadow tokens tied to Elevation: Level 0 (no shadow), Level 1 (shadow-md for cards), Level 2 (shadow-lg for modals and dropdowns), Level 3 (shadow-2xl for floating elements)
3. THE Design_System SHALL apply colored glow shadows to primary actions: shadow-yellow-500/20 for primary buttons, shadow-blue-600/20 for defense-context actions, shadow-orange-600/20 for attack-context actions
4. THE Design_System SHALL use border opacity (border-zinc-700 at rest, border-zinc-500 on hover) to communicate interactive boundaries without harsh visual weight

### Requirement 8: Z-Index Layering Rules

**User Story:** As a developer, I want a defined z-index scale, so that stacking contexts are predictable and overlapping elements never fight for visibility.

#### Acceptance Criteria

1. THE Design_System SHALL define z-index layers: Base content (z-0), Sticky headers and navigation (z-10), Dropdowns and popovers (z-20), Floating action buttons (z-30), Modal backdrops (z-40), Modal content (z-50), Toast notifications (z-[60])
2. THE Design_System SHALL prohibit arbitrary z-index values outside the defined scale — all stacking must use a named layer
3. IF two elements at the same z-index layer overlap, THEN THE Design_System SHALL resolve the conflict through DOM order (later elements on top) rather than incrementing z-index

### Requirement 9: Iconography

**User Story:** As a developer, I want a consistent icon system with defined sizes and usage rules, so that icons enhance comprehension without visual clutter.

#### Acceptance Criteria

1. THE Design_System SHALL use Lucide React as the sole icon library for UI icons (navigation, actions, status indicators)
2. THE Design_System SHALL define icon sizes: Small (w-3 h-3 or w-3.5 h-3.5 — inline with text), Medium (w-4 h-4 — buttons and labels), Large (w-5 h-5 — section headers), and XL (w-8 h-8 — empty states and loading)
3. THE Design_System SHALL use the r6operators library exclusively for operator-specific icons, rendered via dangerouslySetInnerHTML with drop-shadow-lg styling
4. WHEN an icon accompanies text in a button or label, THE Component SHALL place the icon before the text with a gap of 1.5 (6px) for small buttons or 2 (8px) for medium/large buttons

### Requirement 10: Dark Mode Strategy

**User Story:** As a developer, I want a clear dark-mode-only strategy documented, so that the team avoids unnecessary light mode code and maintains the gaming aesthetic.

#### Acceptance Criteria

1. THE Design_System SHALL implement a dark-mode-only strategy with no light mode variant, using black (#000000) as the base page background
2. THE Design_System SHALL remove the prefers-color-scheme media query from globals.css and set fixed dark values in :root to eliminate theme flashing
3. THE Design_System SHALL define all neutral surfaces using the zinc scale (zinc-700 through zinc-900 and black) to maintain a cool, tactical tone
4. IF a future light mode is required, THEN THE Design_System SHALL support it through CSS custom property overrides on a .light class applied to the html element, without modifying component markup

### Requirement 11: UI Consistency Rules and Prohibitions

**User Story:** As a developer, I want explicit consistency rules and "do not" prohibitions, so that new components automatically align with existing ones and visual drift is prevented.

#### Acceptance Criteria

1. THE Design_System SHALL enforce that all transition durations use duration-200 (200ms) for micro-interactions (hover, focus) and duration-300 (300ms) for layout animations (slide, fade)
2. THE Design_System SHALL enforce that all uppercase text uses tracking-wider (buttons, tabs) or tracking-widest (labels, captions) — plain uppercase without tracking adjustment is prohibited
3. THE Design_System SHALL enforce that dividers use border-t border-zinc-700 with optional "or" text centered in mx-4 text-xs uppercase tracking-wider text-zinc-500
4. THE Design_System SHALL enforce that loading spinners use a consistent SVG pattern: animate-spin with opacity-25 circle and opacity-75 arc path, colored to match context (yellow-500 for primary, white for secondary)
5. THE Design_System SHALL enforce that all interactive elements include a visible focus indicator meeting WCAG_AA requirements (focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900)
6. THE Design_System SHALL prohibit: pure white (#ffffff) backgrounds on any Surface, arbitrary spacing values not in the 4px scale, new accent colors without Semantic_Token definition, layout-shift animations exceeding 300ms duration, mixed border-radius styles within a single Component, and inline style attributes for values expressible as Tailwind utilities

### Requirement 12: Component Design Principles

**User Story:** As a developer, I want documented component architecture principles, so that new components are built with the right level of abstraction and composability.

#### Acceptance Criteria

1. THE Design_System SHALL require that all reusable components accept a className prop for style extension without modifying internal styles
2. THE Design_System SHALL require that components with multiple visual treatments expose a variant prop (using a TypeScript union type) rather than accepting arbitrary style overrides for core appearance
3. THE Design_System SHALL require that all interactive components support disabled, loading, and error Interaction_States through dedicated props
4. THE Design_System SHALL require that components rendering lists or collections handle empty states with a consistent pattern: dashed border (border-2 border-dashed border-zinc-800), centered text, and font-mono uppercase styling
5. THE Design_System SHALL require that all form-related components use proper HTML semantics: label elements with htmlFor, aria-describedby for error messages, aria-invalid for error states, and role="alert" for dynamic error announcements

### Requirement 13: Component Priority Inventory

**User Story:** As a developer, I want a categorized component inventory, so that I know which components to build first and which are feature-specific compositions.

#### Acceptance Criteria

1. THE Design_System SHALL define Core_Components (foundational primitives used across all features): Button, Input, Select, Modal, Badge, Card, Spinner, Divider, EmptyState, and ErrorBanner
2. THE Design_System SHALL define Composite_Components (feature-aware compositions of Core_Components): OperatorCard, OperatorDisplay, LoadoutItem, TeamPanel, MapSelector, SideToggle, OAuthButton, StatCounter, and ProgressBar
3. THE Design_System SHALL define Feature_Components (single-use components tied to specific screens): RandomizerWheel, MapAdvisor, ContentGenerator, ThumbnailEditor, and DeploymentModal
4. THE Design_System SHALL require that Core_Components are built and documented before Composite_Components that depend on them

### Requirement 14: Global State Patterns

**User Story:** As a developer, I want shared visual patterns for application-level states, so that empty, loading, error, and success conditions look consistent everywhere.

#### Acceptance Criteria

1. THE Design_System SHALL define an Empty Global_State pattern: border-2 border-dashed border-zinc-800, rounded-xl, centered content with font-mono uppercase tracking-widest text-sm text-zinc-500, minimum height of 300px
2. THE Design_System SHALL define a Loading Global_State pattern: centered spinner (animate-spin, yellow-500 or contextual color), optional shimmer skeleton using bg-zinc-800 with animated gradient overlay, and "Loading..." caption in text-sm text-zinc-400
3. THE Design_System SHALL define an Error Global_State pattern: rounded border border-red-500/30, bg-red-500/10, px-4 py-3, text-sm text-red-400, with role="alert" and optional retry action
4. THE Design_System SHALL define a Success Global_State pattern: rounded border border-green-500/30, bg-green-500/10, px-4 py-3, text-sm text-green-400, with auto-dismiss after 3 seconds for transient confirmations
5. WHEN the application loses network connectivity, THE Design_System SHALL define an Offline Global_State pattern: a persistent top banner with bg-zinc-800, border-b border-zinc-700, text-sm text-zinc-400, and a reconnection indicator

### Requirement 15: Animation and Motion

**User Story:** As a developer, I want defined animation patterns and timing, so that motion feels intentional and consistent rather than arbitrary.

#### Acceptance Criteria

1. THE Design_System SHALL define three animation categories: Micro (200ms ease — hover/focus transitions), Standard (300ms ease-out — element enter/exit), and Dramatic (1-2s ease-out — ken-burns background, shimmer loading)
2. THE Design_System SHALL define entry animations: fade-in (opacity 0→1 with translateY 4px→0), slide-in-left (opacity 0→1 with translateX -8px→0), and slide-in-right (opacity 0→1 with translateX 8px→0)
3. WHEN a user triggers a randomization action, THE Design_System SHALL apply an opacity-50 and blur-sm treatment to the result area during the rolling state
4. THE Design_System SHALL define a shimmer animation for loading skeleton states using translateX(-100%) to translateX(200%) over 1.5s with ease-in-out timing and infinite repetition
5. WHEN the user has prefers-reduced-motion enabled, THE Design_System SHALL disable all non-essential animations (entry transitions, shimmer, ken-burns) while preserving functional state changes (spinner rotation, focus ring appearance)

### Requirement 16: Responsive Design Patterns

**User Story:** As a developer, I want documented responsive breakpoints and adaptation rules, so that the application works well from mobile phones to desktop monitors.

#### Acceptance Criteria

1. THE Design_System SHALL use a mobile-first approach with Tailwind Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
2. WHEN the viewport is below 480px, THE Design_System SHALL constrain card widths to calc(100vw - 32px) with a minimum width of 280px to prevent content overflow
3. THE Design_System SHALL define that grid layouts collapse from multi-column to single-column at the md Breakpoint (768px) for content grids and at sm (640px) for form layouts
4. THE Design_System SHALL ensure that the operator display card, map advisor panel, and auth form each function as self-contained responsive units that adapt independently of page-level layout

### Requirement 17: Gaming Context Colors

**User Story:** As a developer, I want context-aware color application rules for attack/defense scenarios, so that the UI dynamically reinforces game state without manual color decisions.

#### Acceptance Criteria

1. WHEN the application context is set to attack, THE Design_System SHALL apply orange-500 as the contextual accent for borders, headings, and active indicators
2. WHEN the application context is set to defense, THE Design_System SHALL apply blue-500 as the contextual accent for borders, headings, and active indicators
3. THE Design_System SHALL define operator importance tiers with distinct border treatments: Primary picks use border-yellow-500/30, Secondary picks use border-zinc-700, and Niche picks use border-zinc-700/50
4. THE Design_System SHALL define role-specific color badges that map operator roles to distinct background/text color pairs for visual scanning in recommendation lists

### Requirement 18: Data Visualization Rules

**User Story:** As a developer, I want defined styles for charts, stats, and progress indicators, so that data-heavy screens maintain the tactical aesthetic and remain readable.

#### Acceptance Criteria

1. THE Design_System SHALL define progress bar styling: bg-zinc-800 track with rounded-full, colored fill (green-500 for progress, yellow-500 for neutral, red-500 for critical), and h-2 default height
2. THE Design_System SHALL define stat counter styling: large numeric value in font-black text-white, small label in text-[10px] font-bold uppercase tracking-widest text-zinc-500, contained in bg-zinc-800/60 rounded-lg with border border-zinc-700/50
3. THE Design_System SHALL define positive/negative delta indicators: green-400 with upward arrow for positive change, red-400 with downward arrow for negative change, zinc-400 for neutral/unchanged
4. THE Design_System SHALL define tooltip styling for data points: bg-zinc-800 border border-zinc-700 rounded-md shadow-lg, text-xs text-white, px-2.5 py-1.5, with a 4px arrow pointing to the trigger element
5. IF chart or graph components are added in the future, THEN THE Design_System SHALL use the Foundation_Token palette with reduced opacity (30-60%) for fills and full opacity for strokes and labels

### Requirement 19: Content Tone and UI Copy

**User Story:** As a developer, I want defined rules for UI text style and terminology, so that the application speaks consistently in a voice that matches the competitive gaming context.

#### Acceptance Criteria

1. THE Design_System SHALL define UI copy tone as: direct, confident, action-oriented, and gaming-aware — avoiding generic SaaS phrasing (e.g., "Submit" becomes "LOCK IN", "Generate" becomes "ROLL", "Delete" becomes "DROP")
2. THE Design_System SHALL enforce that all button labels and CTAs use uppercase with maximum 2-3 words (e.g., "ROLL AGAIN", "LOCK OPERATOR", "GENERATING LOADOUT")
3. THE Design_System SHALL define error message style as: concise, specific, and solution-oriented (e.g., "Invalid email format" not "The email address you entered does not appear to be valid")
4. THE Design_System SHALL define empty state messaging as: font-mono uppercase with an action-oriented prompt (e.g., "WAITING FOR INTEL..." not "No data available")
5. THE Design_System SHALL maintain a terminology glossary for game-specific terms used in the UI: "Operator" (not "character" or "agent"), "Loadout" (not "equipment" or "gear"), "Roll" (not "randomize" or "generate"), "Side" (not "team" or "faction"), "Intel" (not "data" or "information")

### Requirement 20: Accessibility Beyond Contrast

**User Story:** As a developer, I want comprehensive accessibility requirements beyond color contrast, so that the application is usable by players with diverse abilities and input methods.

#### Acceptance Criteria

1. WHEN the user has prefers-reduced-motion enabled, THE Design_System SHALL respect the preference by disabling decorative animations while maintaining essential state transitions
2. THE Design_System SHALL require that all modal components implement focus trapping: focus cycles within the modal while open, returns to the trigger element on close, and Escape key dismisses the modal
3. THE Design_System SHALL require that dynamic content updates (randomizer results, loading completions, error appearances) use aria-live="polite" for non-urgent updates and aria-live="assertive" for errors
4. THE Design_System SHALL define keyboard navigation flows: Tab moves between interactive elements in DOM order, Enter/Space activates buttons and toggles, Arrow keys navigate within grouped controls (tabs, radio groups, select options)
5. THE Design_System SHALL require that all images and icons have appropriate alt text (descriptive for informational images, empty alt="" with aria-hidden="true" for decorative icons)
