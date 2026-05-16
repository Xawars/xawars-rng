/**
 * Design Token Validation Utilities
 *
 * Provides typed registries of foundation and semantic tokens,
 * along with utility functions for token validation, resolution,
 * and gaming-context color lookups.
 *
 * These registries mirror the CSS custom properties defined in globals.css
 * and are used for component logic and property-based testing.
 */

// Foundation token registry — raw color values from the base palette
export const foundationTokens: Record<string, string> = {
  'black': '#000000',
  'zinc-900': '#18181b',
  'zinc-800': '#27272a',
  'zinc-700': '#3f3f46',
  'zinc-600': '#52525b',
  'zinc-500': '#71717a',
  'zinc-400': '#a1a1aa',
  'white': '#ffffff',
  'yellow-500': '#eab308',
  'yellow-400': '#facc15',
  'orange-500': '#f97316',
  'orange-600': '#ea580c',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'green-500': '#22c55e',
  'green-400': '#4ade80',
  'red-500': '#ef4444',
  'red-400': '#f87171',
  'red-600': '#dc2626',
};

// Semantic token registry — purpose-driven mappings to foundation token names
export const semanticTokens: Record<string, string> = {
  // Surfaces
  'bg-primary': 'black',
  'bg-surface': 'zinc-900',
  'bg-elevated': 'zinc-800',
  'bg-overlay': 'zinc-700',
  // Text
  'text-primary': 'white',
  'text-secondary': 'zinc-400',
  'text-muted': 'zinc-500',
  'text-disabled': 'zinc-600',
  // Accent
  'accent': 'yellow-500',
  'accent-hover': 'yellow-400',
  // Borders
  'border-default': 'zinc-700',
  'border-hover': 'zinc-500',
  'border-focus': 'yellow-500',
  // States
  'success': 'green-500',
  'error': 'red-500',
  'info': 'blue-500',
  'error-text': 'red-400',
  // Gaming Context
  'attack': 'orange-500',
  'attack-active': 'orange-600',
  'defense': 'blue-500',
  'defense-active': 'blue-600',
};

/**
 * Checks whether a given value is a valid foundation token name.
 */
export function isValidToken(value: string): boolean {
  return value in foundationTokens;
}

/**
 * Resolves a semantic token name to its foundation hex value.
 * Returns null if the semantic token or its referenced foundation token doesn't exist.
 */
export function resolveToken(semanticName: string): string | null {
  const foundationName = semanticTokens[semanticName];
  if (!foundationName) return null;
  return foundationTokens[foundationName] ?? null;
}

/**
 * Returns the foundation token name for a given gaming context side.
 * - 'attack' → 'orange-500'
 * - 'defense' → 'blue-500'
 */
export function getContextColor(side: 'attack' | 'defense'): string {
  const contextMap: Record<'attack' | 'defense', string> = {
    attack: 'orange-500',
    defense: 'blue-500',
  };
  return contextMap[side];
}

/**
 * Returns the Tailwind border class for a given operator importance tier.
 * - 'primary' → 'border-yellow-500/30'
 * - 'secondary' → 'border-zinc-700'
 * - 'niche' → 'border-zinc-700/50'
 */
export function getImportanceBorder(tier: 'primary' | 'secondary' | 'niche'): string {
  const borderMap: Record<'primary' | 'secondary' | 'niche', string> = {
    primary: 'border-yellow-500/30',
    secondary: 'border-zinc-700',
    niche: 'border-zinc-700/50',
  };
  return borderMap[tier];
}

// Aggregate DesignTokens object matching the interface from the design document
export const designTokens: DesignTokens = {
  foundation: foundationTokens,
  semantic: semanticTokens,
  isValidToken,
  resolveToken,
  getContextColor,
  getImportanceBorder,
};

/** Design token validation and access utilities interface */
export interface DesignTokens {
  foundation: Record<string, string>;
  semantic: Record<string, string>;
  isValidToken(value: string): boolean;
  resolveToken(semanticName: string): string | null;
  getContextColor(side: 'attack' | 'defense'): string;
  getImportanceBorder(tier: 'primary' | 'secondary' | 'niche'): string;
}
