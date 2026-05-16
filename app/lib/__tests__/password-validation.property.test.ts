import fc from 'fast-check';
import { vi } from 'vitest';

// Mock supabase module to avoid requiring env vars
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

import { validatePassword } from '../../context/AuthContext';

describe('Feature: auth-persistence-gamification, Property 1: Password Validation Boundary', () => {
  it('rejects any string shorter than 8 characters', () => {
    /**
     * Validates: Requirements 1.3
     *
     * Property 1: For any string of length less than 8, the password validator
     * SHALL reject it.
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 7 }),
        (password) => {
          expect(validatePassword(password)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts any string of 8 or more characters', () => {
    /**
     * Validates: Requirements 1.3
     *
     * Property 1: For any string of length 8 or greater, the password validator
     * SHALL accept it (assuming no other constraints).
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 8 }),
        (password) => {
          expect(validatePassword(password)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
