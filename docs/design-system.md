# XAWARS Design System

A comprehensive design system for the XAWARS Rainbow Six Siege operator randomizer and content creation tool. Built on Next.js, Tailwind CSS v4, and a dark-mode-only tactical gaming aesthetic.

---

## Design Philosophy

1. **Fast tactical readability over visual decoration** — Every element earns its place by communicating information.
2. **Competitive-game-inspired hierarchy** — Critical data is large, bold, and high-contrast; supporting data recedes.
3. **High information density without clutter** — Tight spacing and small labels pack data efficiently, generous padding between sections prevents overload.
4. **Motion used for feedback, not entertainment** — Animations confirm actions and guide attention. They never delay the user.
5. **Minimal cognitive friction** — Consistent patterns mean users learn the interface once.
6. **Strong contextual awareness** — The UI adapts its color language to game state (attack/defense) without requiring explicit mode switches.

---

## Color Tokens

### Foundation Tokens

Raw color values defined as CSS custom properties in `:root`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-black` | `#000000` | Page background |
| `--color-zinc-900` | `#18181b` | Card/panel surfaces |
| `--color-zinc-800` | `#27272a` | Elevated surfaces, inputs |
| `--color-zinc-700` | `#3f3f46` | Borders, overlays |
| `--color-zinc-600` | `#52525b` | Disabled text |
| `--color-zinc-500` | `#71717a` | Muted text, placeholders |
| `--color-zinc-400` | `#a1a1aa` | Secondary text |
| `--color-white` | `#ffffff` | Primary text |
| `--color-yellow-500` | `#eab308` | Brand accent, CTAs |
| `--color-yellow-400` | `#facc15` | Accent hover |
| `--color-orange-500` | `#f97316` | Attack context |
| `--color-orange-600` | `#ea580c` | Attack active |
| `--color-blue-500` | `#3b82f6` | Defense context |
| `--color-blue-600` | `#2563eb` | Defense active |
| `--color-green-500` | `#22c55e` | Success state |
| `--color-green-400` | `#4ade80` | Positive delta |
| `--color-red-500` | `#ef4444` | Error state |
| `--color-red-400` | `#f87171` | Error text |
| `--color-red-600` | `#dc2626` | Danger actions |

### Semantic Tokens

Purpose-driven mappings from foundation tokens to UI roles.

| Token | Maps To | Purpose |
|-------|---------|---------|
| `--color-bg-primary` | black | Page background |
| `--color-bg-surface` | zinc-900 | Cards, panels |
| `--color-bg-elevated` | zinc-800 | Modals, dropdowns |
| `--color-bg-overlay` | zinc-700 | Overlays |
| `--color-text-primary` | white | Primary text |
| `--color-text-secondary` | zinc-400 | Secondary text |
| `--color-text-muted` | zinc-500 | Muted/helper text |
| `--color-text-disabled` | zinc-600 | Disabled text |
| `--color-accent` | yellow-500 | Primary accent |
| `--color-accent-hover` | yellow-400 | Accent hover state |
| `--color-border-default` | zinc-700 | Default borders |
| `--color-border-hover` | zinc-500 | Hover borders |
| `--color-border-focus` | yellow-500 | Focus borders |
| `--color-success` | green-500 | Success state |
| `--color-error` | red-500 | Error state |
| `--color-warning` | `#f59e0b` | Warning state |
| `--color-info` | blue-500 | Info state |
| `--color-attack` | orange-500 | Attack context |
| `--color-defense` | blue-500 | Defense context |

### Gaming Context Colors

| Context | Accent | Active | Glow Shadow |
|---------|--------|--------|-------------|
| Attack | `orange-500` | `orange-600` | `shadow-orange-600/20` |
| Defense | `blue-500` | `blue-600` | `shadow-blue-600/20` |

### Operator Importance Tiers

| Tier | Border Class |
|------|-------------|
| Primary | `border-yellow-500/30` |
| Secondary | `border-zinc-700` |
| Niche | `border-zinc-700/50` |

---

## Typography

| Role | Size | Weight | Transform | Tracking | Font | Usage |
|------|------|--------|-----------|----------|------|-------|
| Display | text-3xl / text-4xl | font-black | uppercase | tracking-tighter | Geist Sans | Operator names, hero headings |
| Heading | text-xl / text-2xl | font-bold | uppercase | — | Geist Sans | Section titles |
| Label | text-xs / text-[10px] | font-bold | uppercase | tracking-widest | Geist Sans | Field labels, categories |
| Body | text-sm / text-base | font-medium | none | — | Geist Sans | Descriptions, content |
| Caption | text-xs | font-medium | none | — | Geist Sans | Helper text, timestamps |
| Data | text-sm / text-xl | font-black | none | tracking-tight | Geist Mono | Stats, codes, loadouts |

### Typography Rules

- All interactive labels (buttons, tabs, navigation) use **uppercase + tracking-wider**
- All category labels and captions use **uppercase + tracking-widest**
- Plain uppercase without tracking adjustment is **prohibited**
- Text overflow: truncate with ellipsis (single-line) or line-clamp (multi-line)

---

## Spacing

Based on Tailwind's 4px grid. No arbitrary spacing values allowed.

| Token | Value | Usage |
|-------|-------|-------|
| 1 | 4px | Icon-text gap (small) |
| 1.5 | 6px | Icon-text gap (buttons) |
| 2 | 8px | Icon-text gap (medium), inline spacing |
| 3 | 12px | Small padding, tight gaps |
| 4 | 16px | Standard padding (mobile), section gaps |
| 5 | 20px | Card padding (compact) |
| 6 | 24px | Card padding (standard), section spacing |
| 8 | 32px | Large section gaps |
| 10 | 40px | Page-level spacing |
| 12 | 48px | Major section breaks |
| 16 | 64px | Hero spacing |

---

## Elevation & Shadows

| Level | Background | Border | Shadow | Z-Index | Usage |
|-------|-----------|--------|--------|---------|-------|
| 0 | black | none | none | z-0 | Page background |
| 1 | zinc-900 | zinc-700 | shadow-md | z-0 | Cards, panels |
| 2 | zinc-800 | zinc-700 | shadow-lg | z-20–50 | Modals, dropdowns |
| 3 | zinc-800 | zinc-600 | shadow-2xl | z-30–60 | Floating elements, toasts |

### Colored Glow Shadows

| Context | Shadow |
|---------|--------|
| Primary action | `shadow-yellow-500/20` |
| Attack action | `shadow-orange-600/20` |
| Defense action | `shadow-blue-600/20` |
| Danger action | `shadow-red-600/20` |

---

## Z-Index Layers

| Layer | Value | Elements |
|-------|-------|----------|
| Base | `z-0` | Page content, cards, panels |
| Sticky | `z-10` | Sticky headers, navigation |
| Dropdown | `z-20` | Dropdowns, popovers |
| Float | `z-30` | Floating action buttons |
| Backdrop | `z-40` | Modal backdrops |
| Modal | `z-50` | Modal content |
| Toast | `z-[60]` | Toast notifications |

Arbitrary z-index values outside this scale are prohibited.

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| none | 0 | Sharp tactical elements |
| sm | 4px | Small badges |
| md | 6px | Buttons, inputs |
| lg | 8px | Select dropdowns |
| xl | 12px | Cards, panels |
| full | 9999px | Pills, avatars |

---

## Animation & Motion

### Timing Categories

| Category | Duration | Easing | Usage |
|----------|----------|--------|-------|
| Micro | 200ms | ease | Hover, focus, color transitions |
| Standard | 300ms | ease-out | Element enter/exit, layout shifts |
| Dramatic | 1–2s | ease-out / ease-in-out | Ken-burns, shimmer loading |

### Keyframe Animations

| Animation | Class | Duration | Description |
|-----------|-------|----------|-------------|
| Fade In | `.animate-fade-in` | 300ms ease-out | opacity 0→1, translateY 4px→0 |
| Slide In Left | `.animate-slide-in-left` | 300ms ease-out | opacity 0→1, translateX -8px→0 |
| Slide In Right | `.animate-slide-in-right` | 300ms ease-out | opacity 0→1, translateX 8px→0 |
| Shimmer | `.animate-shimmer` | 1.5s ease-in-out infinite | translateX -100%→200% |
| Ken Burns | `.animate-ken-burns` | 15s ease-out forwards | scale 1.0→1.15 |
| Button Press | `.animate-button-press` | 200ms ease | scale 1→0.95→1 |

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:
- All decorative animations are disabled (fade-in, slide-in, ken-burns, shimmer, button-press)
- Functional animations are preserved (spinner rotation with 1s duration)

---

## Responsive Breakpoints

| Name | Width | Layout Behavior |
|------|-------|-----------------|
| Base | 0–639px | Single column, p-4, stacked layouts |
| sm | 640px+ | Form layouts expand |
| md | 768px+ | Content grids go multi-column |
| lg | 1024px+ | Full desktop layout, sidebars |
| xl | 1280px+ | Maximum content width |

### Mobile Constraints

- Cards below 480px: `width: calc(100vw - 32px)`, `min-width: 280px`
- Touch targets: minimum 44×44px for all interactive elements below 640px
- Auth forms: `max-w-sm` (384px)
- Main content: `max-w-4xl` (896px)

---

## Components

All components are located in `app/components/ui/` and exported from `app/components/ui/index.ts`.

Import:
```tsx
import { Button, Input, Select, Modal, Badge, Card, Spinner, Divider, EmptyState, ErrorBanner, StatCounter, DeltaIndicator, ProgressBar } from '@/app/components/ui';
```

---

### Button

Interactive button with variants, sizes, loading state, and icon support.

```tsx
interface ButtonProps {
  variant?: 'primary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}
```

#### Variants

| Variant | Background | Text | Shadow | Hover |
|---------|-----------|------|--------|-------|
| primary | `bg-yellow-500` | `text-black` | `shadow-yellow-500/20` | `bg-yellow-400` |
| danger | `bg-red-600` | `text-white` | `shadow-red-600/20` | `bg-red-500` |
| outline | transparent | `text-white` | — | `border-white/50` |
| ghost | transparent | `text-white/60` | — | `text-white` |

#### Sizes

| Size | Padding | Text | Gap |
|------|---------|------|-----|
| sm | `px-3 py-1.5` | `text-xs` | `gap-1.5` |
| md | `px-6 py-3` | `text-sm` | `gap-2` |
| lg | `px-8 py-4` | `text-base` | `gap-3` |

#### States

- **Hover**: Transition to hover color within 200ms
- **Active**: `translate-y-0.5` (primary/danger) or background change (outline/ghost)
- **Focus**: `ring-2 ring-yellow-500 ring-offset-2 ring-offset-zinc-900`
- **Disabled**: `opacity-50`, `cursor-not-allowed`
- **Loading**: Animated spinner + "Please wait..." text, interaction disabled

#### Usage

```tsx
<Button variant="primary" size="md" icon={Zap}>ROLL OPERATOR</Button>
<Button variant="danger" size="sm">DROP</Button>
<Button variant="outline" loading>GENERATING...</Button>
<Button variant="ghost" disabled>LOCKED</Button>
```

---

### Input

Text input with label, error state, and helper text.

```tsx
interface InputProps {
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}
```

#### Styling

- Background: `bg-zinc-800/50`
- Border: `border-2 border-zinc-700`
- Radius: `rounded-md`
- Padding: `px-4 py-3`
- Text: `text-sm text-white`
- Placeholder: `placeholder-zinc-500`

#### States

- **Focus**: `border-yellow-500` + `ring-2 ring-yellow-500 ring-offset-2 ring-offset-zinc-900`
- **Error**: `border-red-500`, error message with `role="alert"`, `aria-invalid="true"`, `aria-describedby`
- **Disabled**: `opacity-50`, `cursor-not-allowed`

#### Usage

```tsx
<Input label="Callsign" placeholder="Enter your callsign" />
<Input label="Email" error="Invalid email format" />
<Input helperText="Used for notifications" disabled />
```

---

### Select

Dropdown select with label and error state.

```tsx
interface SelectProps {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}
```

#### Styling

- Background: `bg-zinc-800`
- Border: `border border-zinc-700`
- Radius: `rounded-lg`
- Padding: `px-4 py-3`
- Focus/Error/Disabled: Same patterns as Input

#### Usage

```tsx
<Select
  label="Platform"
  options={[
    { value: 'pc', label: 'PC' },
    { value: 'ps5', label: 'PlayStation 5' },
    { value: 'xbox', label: 'Xbox Series X' },
  ]}
/>
```

---

### Modal

Dialog overlay with focus trapping, Escape dismissal, and backdrop click.

```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}
```

#### Features

- Backdrop: `z-40`, `bg-black/60`, `backdrop-blur-sm`
- Content: `z-50`, `bg-zinc-800`, `border-zinc-700`, `rounded-xl`, `shadow-lg`
- Focus trap: cycles Tab/Shift+Tab within modal
- Returns focus to trigger element on close
- Escape key dismisses
- Backdrop click dismisses
- `aria-modal="true"`, `role="dialog"`, `aria-labelledby`

#### Usage

```tsx
<Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Operator Details">
  <p>Content here</p>
</Modal>
```

---

### Badge

Small label for categorization with gaming-context variants.

```tsx
interface BadgeProps {
  variant?: 'default' | 'attack' | 'defense' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}
```

#### Variants

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| default | `bg-zinc-800` | `text-zinc-300` | `border-zinc-700` |
| attack | `bg-orange-500/10` | `text-orange-400` | `border-orange-500/30` |
| defense | `bg-blue-500/10` | `text-blue-400` | `border-blue-500/30` |
| success | `bg-green-500/10` | `text-green-400` | `border-green-500/30` |
| error | `bg-red-500/10` | `text-red-400` | `border-red-500/30` |
| warning | `bg-amber-500/10` | `text-amber-400` | `border-amber-500/30` |

#### Sizes

| Size | Padding | Text |
|------|---------|------|
| sm | `px-1.5 py-0.5` | `text-[10px]` |
| md | `px-2 py-1` | `text-xs` |

#### Usage

```tsx
<Badge variant="attack">ATTACKER</Badge>
<Badge variant="defense" size="sm">DEFENDER</Badge>
<Badge variant="success">ACTIVE</Badge>
```

---

### Card

Container with elevation variants.

```tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}
```

#### Variants

| Variant | Background | Shadow | Extras |
|---------|-----------|--------|--------|
| default | `bg-zinc-900` | `shadow-md` | — |
| elevated | `bg-zinc-800` | `shadow-lg` | — |
| interactive | `bg-zinc-900` | `shadow-md` | `hover:border-zinc-500`, `cursor-pointer` |

#### Padding

| Size | Class |
|------|-------|
| sm | `p-4` |
| md | `p-5` |
| lg | `p-6` |

#### Usage

```tsx
<Card variant="interactive" padding="lg">
  <h3>Operator Card</h3>
</Card>
```

---

### Spinner

Loading indicator with consistent SVG pattern.

```tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'contextual';
  className?: string;
}
```

| Size | Dimensions |
|------|-----------|
| sm | `w-4 h-4` |
| md | `w-5 h-5` |
| lg | `w-8 h-8` |

| Color | Class |
|-------|-------|
| primary | `text-yellow-500` |
| white | `text-white` |
| contextual | `text-current` |

#### Usage

```tsx
<Spinner size="lg" color="primary" />
<Spinner size="sm" color="white" />
```

---

### Divider

Horizontal rule with optional centered text.

```tsx
interface DividerProps {
  text?: string;
  className?: string;
}
```

#### Usage

```tsx
<Divider />
<Divider text="or" />
```

---

### EmptyState

Placeholder for empty content areas.

```tsx
interface EmptyStateProps {
  message?: string;        // Default: "WAITING FOR INTEL..."
  action?: React.ReactNode;
  minHeight?: string;      // Default: "300px"
  className?: string;
}
```

#### Styling

- Container: `border-2 border-dashed border-zinc-800 rounded-xl`
- Message: `font-mono uppercase tracking-widest text-sm text-zinc-500`

#### Usage

```tsx
<EmptyState />
<EmptyState message="NO OPERATORS FOUND" action={<Button size="sm">ROLL AGAIN</Button>} />
```

---

### ErrorBanner

Inline error display with retry and dismiss actions.

```tsx
interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}
```

#### Styling

- Container: `rounded border border-red-500/30 bg-red-500/10 px-4 py-3`
- Message: `text-sm text-red-400`
- Has `role="alert"` for screen reader announcement

#### Usage

```tsx
<ErrorBanner message="Failed to load operators" onRetry={refetch} onDismiss={dismiss} />
```

---

### StatCounter

Data display for numeric stats with optional delta.

```tsx
interface StatCounterProps {
  value: string | number;
  label: string;
  delta?: number;
  className?: string;
}
```

#### Styling

- Container: `bg-zinc-800/60 rounded-lg border border-zinc-700/50 p-3`
- Value: `font-black text-white text-xl font-mono`
- Label: `text-[10px] font-bold uppercase tracking-widest text-zinc-500`

#### Usage

```tsx
<StatCounter value={42} label="WINS" delta={3} />
<StatCounter value="87%" label="WIN RATE" delta={-2} />
```

---

### DeltaIndicator

Shows positive/negative/neutral change.

```tsx
interface DeltaIndicatorProps {
  value: number;
  className?: string;
}
```

| Value | Color | Indicator |
|-------|-------|-----------|
| Positive | `text-green-400` | ▲ +{value} |
| Negative | `text-red-400` | ▼ {value} |
| Zero | `text-zinc-400` | — |

#### Usage

```tsx
<DeltaIndicator value={5} />   // ▲ +5 (green)
<DeltaIndicator value={-3} />  // ▼ -3 (red)
<DeltaIndicator value={0} />   // — (neutral)
```

---

### ProgressBar

Horizontal progress indicator.

```tsx
interface ProgressBarProps {
  value: number;           // 0-100, clamped
  color?: 'green' | 'yellow' | 'red';
  className?: string;
}
```

#### Styling

- Track: `bg-zinc-800 rounded-full h-2`
- Fill: `rounded-full`, colored by prop, `transition-all duration-300`
- Has `role="progressbar"` with aria-valuenow/min/max

#### Usage

```tsx
<ProgressBar value={75} color="green" />
<ProgressBar value={30} color="yellow" />
<ProgressBar value={90} color="red" />
```

---

## Global State Patterns

| State | Visual Treatment |
|-------|-----------------|
| **Empty** | `border-2 border-dashed border-zinc-800 rounded-xl`, centered `font-mono uppercase tracking-widest text-sm text-zinc-500`, min-height 300px |
| **Loading** | Centered `Spinner` (yellow-500 or contextual), optional shimmer skeleton, "Loading..." caption |
| **Error** | `rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400`, `role="alert"`, optional retry |
| **Success** | `rounded border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400`, auto-dismiss 3s |
| **Offline** | Persistent top banner: `bg-zinc-800 border-b border-zinc-700 text-sm text-zinc-400` |

---

## Accessibility

### Focus Indicators

All interactive elements: `focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-900`

### Form Accessibility

- Labels use `htmlFor` linking to input `id`
- Errors use `role="alert"` with `aria-describedby` on the input
- Invalid inputs have `aria-invalid="true"`

### Modal Accessibility

- `aria-modal="true"`, `role="dialog"`, `aria-labelledby`
- Focus trapped within modal
- Escape key dismisses
- Focus returns to trigger on close

### Icon Accessibility

- Decorative icons (with text): `aria-hidden="true"`
- Icon-only buttons: parent has `aria-label`

### Reduced Motion

- `prefers-reduced-motion: reduce` disables decorative animations
- Functional animations (spinners) are preserved

---

## Iconography

- **UI Icons**: Lucide React (sole library)
- **Operator Icons**: r6operators library (via `dangerouslySetInnerHTML` with `drop-shadow-lg`)

### Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| Small | `w-3 h-3` / `w-3.5 h-3.5` | Inline with text |
| Medium | `w-4 h-4` | Buttons, labels |
| Large | `w-5 h-5` | Section headers |
| XL | `w-8 h-8` | Empty states, loading |

---

## UI Copy Rules

- **Tone**: Direct, confident, action-oriented, gaming-aware
- **Button labels**: Uppercase, max 2–3 words (e.g., "ROLL AGAIN", "LOCK OPERATOR")
- **Error messages**: Concise and solution-oriented (e.g., "Invalid email format")
- **Empty states**: `font-mono uppercase` with action prompt (e.g., "WAITING FOR INTEL...")

### Terminology

| Use | Don't Use |
|-----|-----------|
| Operator | character, agent |
| Loadout | equipment, gear |
| Roll | randomize, generate |
| Side | team, faction |
| Intel | data, information |

---

## Prohibitions

- Pure white (`#ffffff`) backgrounds on any surface
- Arbitrary spacing values not in the 4px scale
- New accent colors without semantic token definition
- Layout-shift animations exceeding 300ms
- Mixed border-radius styles within a single component
- Inline style attributes for values expressible as Tailwind utilities
- Arbitrary z-index values outside the defined scale
- Plain uppercase without `tracking-wider` or `tracking-widest`
- Arbitrary hex values in component code (must reference tokens)

---

## File Structure

```
app/
├── globals.css                    # Tokens, @theme, animations, responsive rules
├── components/
│   └── ui/
│       ├── index.ts               # Barrel export
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       ├── Card.tsx
│       ├── Spinner.tsx
│       ├── Divider.tsx
│       ├── EmptyState.tsx
│       ├── ErrorBanner.tsx
│       ├── StatCounter.tsx
│       ├── DeltaIndicator.tsx
│       └── ProgressBar.tsx
└── lib/
    └── design-tokens.ts           # Token validation utilities
```

---

## Token Utilities

Available from `app/lib/design-tokens.ts`:

```tsx
import { isValidToken, resolveToken, getContextColor, getImportanceBorder } from '@/app/lib/design-tokens';

isValidToken('yellow-500');           // true
resolveToken('accent');               // '#eab308'
getContextColor('attack');            // 'orange-500'
getContextColor('defense');           // 'blue-500'
getImportanceBorder('primary');       // 'border-yellow-500/30'
getImportanceBorder('secondary');     // 'border-zinc-700'
getImportanceBorder('niche');         // 'border-zinc-700/50'
```
