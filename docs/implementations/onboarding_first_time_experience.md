# Onboarding & First-Time User Experience (FTUE)

## Overview

This document outlines the strategy for transforming the first-time experience from "I landed on a tool" to "I just entered my tactical command center." The goal is to create emotional connection, provide guidance, and make the product feel immersive and polished from the very first interaction.

---

## The Current Problem

After signup/login, the user hits the full roulette interface immediately. There's no:

- Recognition that they're new
- Explanation of what anything does
- Sense of identity or ownership
- Emotional buildup before the first interaction

It's like being dropped into a cockpit with no briefing.

---

## What Should Happen: The First-Time Flow

### Phase 1: The Entry (0–3 seconds)

**Tactical intro animation** — After login, instead of instantly rendering the full UI, show a brief cinematic-style entry:

- Black screen → XAWARS logo fades in with a subtle pulse
- A line like "OPERATOR STANDING BY" or "WELCOME, AGENT" types out
- The UI elements slide/fade in from the edges (staggered, 100ms apart)
- Total duration: 2–3 seconds. Fast enough to not annoy, slow enough to feel intentional.

This sets the tone: you're entering a tactical environment, not opening a spreadsheet.

**Implementation notes:**

- Create a `<TacticalEntry />` wrapper component
- Use CSS keyframes for staggered fade-ins
- Store a session flag so it only plays once per browser session (not every page load)
- Respect `prefers-reduced-motion` media query

---

### Phase 2: Welcome Modal (first visit only)

A focused modal that appears once, covering three things:

**Panel 1 — Identity**

> "Welcome to XAWARS, [display_name or 'Agent']"
> Brief tagline: "Your R6 Siege operator roulette and stat tracker"

**Panel 2 — What you can do** (3 icons + one-liners)

- 🎲 Roll random operators with loadouts
- 📊 Track your kills, deaths, and streaks
- 🗺️ Get map-specific operator advice

**Panel 3 — First action prompt**

> "Ready for your first deployment?"
> [Deploy Now] button that closes the modal and triggers the first roll

This is a 3-step carousel (dots at the bottom, skip button in corner). No more than 3 panels — respect their time.

**Implementation notes:**

- Create a `<WelcomeModal />` component with carousel state
- Detect first visit via localStorage flag or empty deployments
- Show after the entry animation completes
- "Skip" button always visible in the top-right corner
- Mark onboarding as complete when modal is dismissed (skip or finish)

---

### Phase 3: Guided First Action

After the modal closes, highlight the "Deploy Operator" button with a subtle pulse animation and a tooltip:

> "Tap here to roll your first operator"

Once they roll, the tooltip disappears forever. This is a one-shot nudge, not a tutorial system.

**Implementation notes:**

- Use a `<FirstActionTooltip />` component that checks a localStorage flag
- CSS pulse animation on the deploy button (ring-based, like `animate-ping` but subtler)
- Dismiss on first roll (listen for operator state change)

---

### Phase 4: Empty States That Invite Action

Replace blank space with meaningful placeholders:

**Operator card area (empty):**

> A silhouette outline with "?" and text: "No operator deployed yet — roll to begin"

**History panel (empty):**

> "Your deployment history will appear here"
> Small icon of a clipboard or timeline

**Stats (0/0):**

> These are fine at zero, but add a subtle "First blood awaits" label under the kills counter until the first kill is recorded.

**Implementation notes:**

- Create empty state variants for `OperatorDisplay`, `HistoryList`, and `StatCounter`
- Use the existing `EmptyState` UI component as a base
- Conditionally render based on whether data exists

---

## Personalization & Identity

### Display Name in the UI

Add the user's name (or "Agent") to the header area:

> "Xawars RNG" on the left, "Agent [name] ▾" on the right (with a dropdown for settings/logout)

This small touch makes the user feel recognized every time they open the app.

### Profile-Aware Elements

- If the user signed up with Discord/Google, pull their avatar and show it in the header
- Even a 28px circle avatar next to their name creates ownership
- Use the `profiles` table data (`display_name`, `avatar_url`)

### Guest Mode Differentiation

- Guest users see a slightly muted version — no avatar, name shows as "Guest"
- The guest banner reminds them to sign in
- When they sign in, the transition should feel like an "upgrade":
  - Their name appears
  - Avatar loads
  - Banner disappears
  - Brief "Welcome back, [name]" toast

---

## Progressive Onboarding (Beyond Day 1)

Don't front-load everything. Reveal features as they become relevant:

| Trigger | What to Show |
|---------|-------------|
| First roll | "Nice! Track your kills below ↓" (one-time tooltip on stat counters) |
| 3rd deployment | "Pro tip: Pin a side to only roll attackers or defenders" (tooltip on SideSelector) |
| 5 kills in one deployment | "🔥 You hit the target! Achievement unlocked" (if gamification is active) |
| First time opening Map Advisor | Brief overlay: "Select a map to get operator recommendations" |
| 10th session | "You've been deploying for a while — check your stats" (nudge toward OperatorStatsModal) |

**Implementation notes:**

- Store milestone flags in localStorage (guests) or `gamification` table (authenticated)
- Create a `<ProgressiveTip />` component that accepts a `tipId` and `trigger` condition
- Tips never repeat once dismissed
- Respect a global "disable tips" setting for power users

---

## Gaming/Tactical Atmosphere

### Visual Language

- Use military/tactical terminology: "Deploy" not "Roll", "Operator" not "Character", "Mission" not "Session"
- The yellow + black + zinc palette already feels tactical — lean into it
- Consider adding a subtle scan-line or grid texture overlay (very low opacity, ~3%) to the background for a HUD feel
- Use monospace or condensed fonts for data/stats to feel more "readout"-like

### Audio Cues

- The roll sound and reveal sound are great — make sure the first-time experience includes them
- Consider a subtle "boot up" sound on the intro animation (optional, respect the mute toggle)
- Achievement unlock: short, satisfying chime
- Streak milestone: escalating tone

### Micro-Interactions

- **Stat counters:** when incrementing, flash the number briefly (scale up 110% for 100ms)
- **Achievement unlocks:** brief gold particle burst around the notification
- **Streak milestones:** the streak counter glows brighter as it increases
- **Operator reveal:** slight camera shake or zoom effect on the card
- **Button presses:** tactile feedback via `active:translate-y-0.5` (already implemented on some buttons)

---

## The Emotional Arc

The goal is this feeling progression:

| Step | User Feeling |
|------|-------------|
| Login | "I'm entering something" |
| Intro animation | "This feels premium" |
| Welcome modal | "They know I'm new, they're guiding me" |
| First roll | "That was satisfying, I want to do it again" |
| Stats tracking | "This is MY data, MY progress" |
| Return visit | "It remembers me, I'm building something here" |

---

## How to Detect "First Time"

```typescript
// Simple approach: localStorage flag
const ONBOARDING_KEY = 'xawars_onboarding_complete';

function isFirstVisit(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) !== 'true';
}

function completeOnboarding(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}
```

For authenticated users, you could also check if their `deployments` table is empty (no history = new user), but the localStorage flag is simpler and works for guests too.

**Session-based entry animation:**

```typescript
// Only play once per browser session
const ENTRY_PLAYED_KEY = 'xawars_entry_played';

function shouldPlayEntry(): boolean {
  return sessionStorage.getItem(ENTRY_PLAYED_KEY) !== 'true';
}

function markEntryPlayed(): void {
  sessionStorage.setItem(ENTRY_PLAYED_KEY, 'true');
}
```

---

## Implementation Priority

Ordered by impact-to-effort ratio:

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Welcome modal (3-panel carousel) | Medium | High |
| 2 | Entry animation (staggered fade-ins) | Low | High |
| 3 | Empty states (inviting placeholders) | Low | Medium |
| 4 | User identity in header (name + avatar) | Low | Medium |
| 5 | First-action tooltip (pulse on deploy button) | Low | Medium |
| 6 | Progressive tips (milestone-based) | Medium | Medium |
| 7 | Tactical atmosphere (textures, micro-interactions) | Medium | Low-Medium |
| 8 | Audio enhancements (boot-up sound, chimes) | Low | Low |

---

## Component Architecture

```
app/
├── components/
│   ├── onboarding/
│   │   ├── TacticalEntry.tsx        # Cinematic entry animation wrapper
│   │   ├── WelcomeModal.tsx         # 3-panel first-visit carousel
│   │   ├── FirstActionTooltip.tsx   # One-shot pulse + tooltip on deploy button
│   │   ├── ProgressiveTip.tsx       # Reusable milestone-based tip component
│   │   └── OnboardingProvider.tsx   # Context for onboarding state management
│   └── ...
├── hooks/
│   └── useOnboarding.ts            # Hook for checking/updating onboarding state
└── ...
```

---

## Design Tokens for Onboarding

```css
/* Entry animation timing */
--entry-duration: 2.5s;
--entry-stagger: 100ms;

/* Welcome modal */
--modal-max-width: 420px;
--carousel-transition: 300ms ease-out;

/* Tooltip */
--tooltip-bg: theme('colors.zinc.800');
--tooltip-border: theme('colors.yellow.500/30');
--pulse-color: theme('colors.yellow.500/40');

/* Progressive tips */
--tip-duration: 5000ms; /* auto-dismiss after 5s */
--tip-fade: 200ms;
```

---

## Accessibility Considerations

- Entry animation respects `prefers-reduced-motion` (skip or reduce to simple fade)
- Welcome modal is keyboard-navigable (arrow keys for panels, Escape to close)
- Tooltips have proper `role="tooltip"` and `aria-describedby` associations
- Progressive tips use `aria-live="polite"` for screen reader announcements
- All animations have reasonable durations (no seizure-inducing flashes)
- Skip/dismiss buttons are always reachable via keyboard

---

## Metrics to Track (Future)

If analytics are added later, track:

- Onboarding completion rate (% who finish all 3 panels vs skip)
- Time to first roll (how long after login before first deployment)
- Day-1 retention (do users who see onboarding come back more?)
- Progressive tip engagement (which tips get clicked vs dismissed)
- Guest-to-auth conversion (do guided guests sign up more?)
