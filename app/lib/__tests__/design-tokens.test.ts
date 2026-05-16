import { describe, it, expect } from 'vitest';
import {
  foundationTokens,
  semanticTokens,
  isValidToken,
  resolveToken,
  getContextColor,
  getImportanceBorder,
  designTokens,
} from '../design-tokens';

describe('design-tokens', () => {
  describe('foundationTokens', () => {
    it('contains all neutral scale tokens', () => {
      expect(foundationTokens['black']).toBe('#000000');
      expect(foundationTokens['zinc-900']).toBe('#18181b');
      expect(foundationTokens['zinc-800']).toBe('#27272a');
      expect(foundationTokens['zinc-700']).toBe('#3f3f46');
      expect(foundationTokens['zinc-600']).toBe('#52525b');
      expect(foundationTokens['zinc-500']).toBe('#71717a');
      expect(foundationTokens['zinc-400']).toBe('#a1a1aa');
      expect(foundationTokens['white']).toBe('#ffffff');
    });

    it('contains brand yellow tokens', () => {
      expect(foundationTokens['yellow-500']).toBe('#eab308');
      expect(foundationTokens['yellow-400']).toBe('#facc15');
    });

    it('contains attack orange tokens', () => {
      expect(foundationTokens['orange-500']).toBe('#f97316');
      expect(foundationTokens['orange-600']).toBe('#ea580c');
    });

    it('contains defense blue tokens', () => {
      expect(foundationTokens['blue-500']).toBe('#3b82f6');
      expect(foundationTokens['blue-600']).toBe('#2563eb');
    });

    it('contains success green tokens', () => {
      expect(foundationTokens['green-500']).toBe('#22c55e');
      expect(foundationTokens['green-400']).toBe('#4ade80');
    });

    it('contains error red tokens', () => {
      expect(foundationTokens['red-500']).toBe('#ef4444');
      expect(foundationTokens['red-400']).toBe('#f87171');
      expect(foundationTokens['red-600']).toBe('#dc2626');
    });
  });

  describe('isValidToken', () => {
    it('returns true for valid foundation token names', () => {
      expect(isValidToken('yellow-500')).toBe(true);
      expect(isValidToken('zinc-900')).toBe(true);
      expect(isValidToken('black')).toBe(true);
    });

    it('returns false for invalid token names', () => {
      expect(isValidToken('purple-500')).toBe(false);
      expect(isValidToken('not-a-token')).toBe(false);
      expect(isValidToken('')).toBe(false);
    });
  });

  describe('resolveToken', () => {
    it('resolves semantic tokens to hex values', () => {
      expect(resolveToken('accent')).toBe('#eab308');
      expect(resolveToken('bg-primary')).toBe('#000000');
      expect(resolveToken('text-primary')).toBe('#ffffff');
      expect(resolveToken('error')).toBe('#ef4444');
    });

    it('returns null for unknown semantic tokens', () => {
      expect(resolveToken('nonexistent')).toBeNull();
      expect(resolveToken('')).toBeNull();
    });
  });

  describe('getContextColor', () => {
    it('returns orange-500 for attack', () => {
      expect(getContextColor('attack')).toBe('orange-500');
    });

    it('returns blue-500 for defense', () => {
      expect(getContextColor('defense')).toBe('blue-500');
    });
  });

  describe('getImportanceBorder', () => {
    it('returns border-yellow-500/30 for primary tier', () => {
      expect(getImportanceBorder('primary')).toBe('border-yellow-500/30');
    });

    it('returns border-zinc-700 for secondary tier', () => {
      expect(getImportanceBorder('secondary')).toBe('border-zinc-700');
    });

    it('returns border-zinc-700/50 for niche tier', () => {
      expect(getImportanceBorder('niche')).toBe('border-zinc-700/50');
    });
  });

  describe('designTokens aggregate object', () => {
    it('exposes foundation and semantic registries', () => {
      expect(designTokens.foundation).toBe(foundationTokens);
      expect(designTokens.semantic).toBe(semanticTokens);
    });

    it('exposes utility functions', () => {
      expect(designTokens.isValidToken('yellow-500')).toBe(true);
      expect(designTokens.resolveToken('accent')).toBe('#eab308');
      expect(designTokens.getContextColor('attack')).toBe('orange-500');
      expect(designTokens.getImportanceBorder('primary')).toBe('border-yellow-500/30');
    });
  });
});
