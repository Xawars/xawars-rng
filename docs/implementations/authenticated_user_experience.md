# Authenticated User Experience & Account Visibility

## Overview

This document outlines how to make authenticated users feel recognized, in control, and immersed in their session. The goal is to transform the post-login experience from "anonymous tool user" to "this is my tactical command center."

---

## The Current Problem

After login, the user sees:

- The XAWARS RNG logo
- View mode tabs
- A mute button and reset button
- No indication of who they are
- No way to sign out without clearing browser data
- No avatar, name, email, or account menu
- No sense of session ownership

The result: users feel like they're using someone else's tool, not their own account.

---

## What Authenticated Users Expect

After logging in to any modern app, users expect:

1. **Visual confirmation they're logged in** — their name, avatar, or email visible at all times
2. **A way to sign out** — always accessible, never buried
3. **Account access** — settings, profile, or at minimum a dropdown with options
4. **Session awareness** — the app should feel different when authenticated vs. guest
5. **Personalization** — their identity reflected in the UI (name, avatar, colors)
6. **Trust signals** — knowing their data is saved, synced, and tied to their account

---

## Placement Strategy

### Where to Put the Account Area

**Top-right corner of the header** — this is the universal convention. Users instinctively look there for account controls.

Current header layout:
```
[XAWARS RNG] [Roulette | Map Advisor]          [🔇] [Reset Run]
```

Proposed header layout:
```
[XAWARS RNG] [Roulette | Map Advisor]          [🔇] [Reset Run] [👤 Agent Name ▾]
```

The account indicator sits at the far right of the header, after the utility buttons. It's always visible, never hidden behind a hamburger menu.

---

## Component Architecture

```
app/
├── components/
│   ├── account/
│   │   ├── AccountMenu.tsx          # Dropdown menu with account options
│   │   ├── AccountIndicator.tsx     # Avatar + name trigger button
│   │   ├── UserAvatar.tsx           # Reusable avatar component (image or initials)
│   │   └── AccountPanel.tsx         # Optional: expanded settings panel/modal
│   └── ...
```

---

## Design Specification

### AccountIndicator (Trigger Button)

The always-visible element in the header:

```
┌─────────────────────────────┐
│  [Avatar] Agent Name  ▾     │
└─────────────────────────────┘
```

**Authenticated user:**
- 28px circular avatar (from `avatarUrl` if available, otherwise initials)
- Display name (truncated to ~12 chars if needed)
- Chevron-down icon indicating dropdown
- Subtle border glow on hover

**Guest user:**
- Generic user icon (no avatar)
- "Guest" label in muted text
- No dropdown — clicking navigates to login

### UserAvatar Component

A reusable avatar that handles all states:

| State | Render |
|-------|--------|
| Has `avatarUrl` (OAuth) | `<img>` with the URL, rounded-full, object-cover |
| Has `displayName` only | Initials (first letter, uppercase) in a colored circle |
| Has `email` only | First letter of email in a colored circle |
| Guest / no data | Generic user silhouette icon |

**Sizing:** Support `sm` (24px), `md` (28px), `lg` (36px) variants.

**Color:** The initials background should use a deterministic color based on the user's ID or email (hash to a palette index) so it's consistent across sessions.

### AccountMenu (Dropdown)

Opens below the AccountIndicator on click. Closes on outside click or Escape.

```
┌──────────────────────────────────┐
│  [Avatar]                        │
│  Agent DisplayName               │
│  agent@email.com                 │
│  ─────────────────────────────── │
│  ⚙️  Settings          (future) │
│  📊  My Stats                    │
│  🔑  Change Password   (future) │
│  ─────────────────────────────── │
│  🚪  Sign Out                    │
└──────────────────────────────────┘
```

**Menu sections:**

1. **Identity header** — larger avatar, full display name, email (not clickable, just informational)
2. **Actions** — navigable menu items with icons
3. **Sign out** — always last, visually distinct (red text or separated by divider)

**Keyboard navigation:**
- Arrow keys to move between items
- Enter/Space to select
- Escape to close
- Focus trapped within the menu while open

### Tactical/Gaming Styling

To match the XAWARS aesthetic:

- Menu background: `bg-zinc-900` with `border border-zinc-700`
- Items on hover: `bg-white/5` with left yellow accent bar
- Typography: uppercase labels, monospace for email, tracking-wider
- Avatar ring: `ring-2 ring-yellow-500/30` when menu is open
- Subtle scan-line texture overlay on the menu (optional, very low opacity)
- Menu header could include a "rank badge" or "agent status" line for flavor

---

## Implementation Details

### AccountIndicator.tsx

```tsx
interface AccountIndicatorProps {
  className?: string;
}
```

- Uses `useAuth()` to get `user` and `isGuest`
- Renders the avatar + name + chevron
- On click: toggles the AccountMenu dropdown
- Guest mode: renders a "Sign In" button instead

### AccountMenu.tsx

```tsx
interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onOpenStats?: () => void;
}
```

- Positioned absolutely below the trigger (use a ref for alignment)
- Uses `useAuth()` for user data
- Calls `signOut()` from AuthContext
- After sign out: redirect to `/login`
- Animated entry: fade-in + slight translateY

### UserAvatar.tsx

```tsx
interface UserAvatarProps {
  user: { displayName?: string; email?: string; avatarUrl?: string; id?: string } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

- Pure presentational component
- Deterministic color from user ID: `hsl(hash % 360, 60%, 45%)`
- Fallback chain: avatarUrl → initials → generic icon

---

## Sign-Out Flow

The sign-out experience should feel intentional, not abrupt:

1. User clicks "Sign Out" in the dropdown
2. Brief confirmation isn't needed for sign-out (it's easily reversible by signing back in)
3. Call `signOut()` from AuthContext
4. Redirect to `/login`
5. Clear any session-specific state (entry animation flag, etc.)
6. Show a brief toast or the login page with a "Signed out successfully" message (optional)

**Important:** Don't clear localStorage data on sign-out. The user might sign back in and expect their local data to still be there (especially if cloud sync hasn't completed).

---

## Session Awareness & Personalization

### Visual Differences: Authenticated vs. Guest

| Element | Guest | Authenticated |
|---------|-------|---------------|
| Header right | "Sign In" button | Avatar + Name + Dropdown |
| Guest banner | Visible (top bar) | Hidden |
| Data sync indicator | None | Subtle "synced" icon or green dot |
| Welcome greeting | "Guest" | Display name |
| Stats ownership | "Local only" label | No label (implied cloud) |

### Personalization Touches

- **Greeting on return:** After the entry animation, a subtle "Welcome back, [Name]" toast (one per session, not every page load)
- **Avatar in operator card:** Small avatar badge in the corner of the operator display (optional, for "this is YOUR deployment" feel)
- **Stats attribution:** "Agent [Name]'s Stats" as a subtle label above the stat counters
- **Session indicator:** A tiny green dot on the avatar indicating active session (like Discord online status)

---

## Guest-to-Authenticated Transition

When a guest signs in, the transition should feel like an upgrade:

1. Guest banner disappears (already implemented)
2. Avatar + name appears in the header (smooth fade-in)
3. Brief "Welcome, [Name]" toast notification
4. If they had local data, trigger the migration prompt (already in DataContext)

This creates a satisfying "level up" moment.

---

## Mobile Considerations

On smaller screens (< 640px):

- The account indicator collapses to just the avatar (no name text)
- The dropdown becomes a bottom sheet or full-width panel
- Touch targets remain 44px minimum
- The menu items get more vertical padding for thumb-friendly tapping

---

## Accessibility Requirements

- AccountIndicator: `aria-haspopup="menu"`, `aria-expanded` state
- AccountMenu: `role="menu"`, items have `role="menuitem"`
- Focus management: focus moves into menu on open, returns to trigger on close
- Screen reader: avatar has `alt` text with user's name
- Color contrast: all text meets WCAG AA (4.5:1 ratio)
- Keyboard: full arrow-key navigation within menu

---

## Integration with Existing Components

### Header Modification

The current header in `page.tsx` needs the AccountIndicator added to the right side:

```tsx
<header className="flex items-center justify-between py-4 border-b border-white/10">
  <div className="flex items-center gap-4">
    {/* Logo + View Mode Tabs (unchanged) */}
  </div>
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" onClick={toggleMute} ... />
    {!isStreamerMode && viewMode === 'roulette' && (
      <Button variant="ghost" size="sm" onClick={handleReset} ... />
    )}
    {/* NEW: Account Indicator */}
    <AccountIndicator />
  </div>
</header>
```

### Interaction with Onboarding

- The WelcomeModal already uses `user.displayName` — the account area reinforces this
- After onboarding completes, the account indicator is immediately visible
- The "Welcome back" toast on return visits ties into the onboarding progressive system

### Interaction with Guest Mode

- The existing `GuestModeBanner` stays as-is
- The AccountIndicator shows "Sign In" for guests (replaces the need for a separate CTA)
- Consider removing the guest banner entirely once the AccountIndicator handles the sign-in prompt

---

## Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | UserAvatar component | Low | Medium |
| 2 | AccountIndicator in header | Low | High |
| 3 | AccountMenu dropdown (sign out + identity) | Medium | High |
| 4 | Guest vs. authenticated visual differentiation | Low | Medium |
| 5 | "Welcome back" toast on return | Low | Low-Medium |
| 6 | Mobile-responsive account area | Medium | Medium |
| 7 | Settings panel (future) | High | Low (for now) |

---

## Design Tokens

```css
/* Account Menu */
--account-menu-width: 240px;
--account-menu-bg: var(--color-zinc-900);
--account-menu-border: var(--color-zinc-700);
--account-menu-item-hover: rgb(255 255 255 / 0.05);
--account-menu-item-active: rgb(234 179 8 / 0.1);

/* Avatar */
--avatar-ring-active: rgb(234 179 8 / 0.3);
--avatar-size-sm: 24px;
--avatar-size-md: 28px;
--avatar-size-lg: 36px;

/* Transitions */
--menu-enter-duration: 150ms;
--menu-exit-duration: 100ms;
```

---

## The Emotional Goal

| State | User Should Feel |
|-------|-----------------|
| Sees their name in header | "This is MY space" |
| Sees their avatar | "The app knows me" |
| Opens account menu | "I'm in control" |
| Signs out cleanly | "I can leave and come back safely" |
| Returns and sees greeting | "It remembers me" |
| Guest sees "Sign In" | "There's more if I commit" |

The account area isn't just functional — it's the persistent reminder that this is a personalized experience, not a public kiosk.
