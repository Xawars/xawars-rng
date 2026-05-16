import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  validateLoginForm,
  validateSignupForm,
} from '../form-validator';

describe('form-validator', () => {
  describe('isValidEmail', () => {
    it('returns true for a standard email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('returns true for email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('returns true for email with dots in local part', () => {
      expect(isValidEmail('first.last@domain.org')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('returns false for string without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('returns false for string with multiple @ characters', () => {
      expect(isValidEmail('user@@example.com')).toBe(false);
    });

    it('returns false for email without domain dot', () => {
      expect(isValidEmail('user@localhost')).toBe(false);
    });

    it('returns false for email with empty local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('returns false for email with empty domain label', () => {
      expect(isValidEmail('user@.com')).toBe(false);
    });

    it('returns false for email with trailing dot in domain', () => {
      expect(isValidEmail('user@example.')).toBe(false);
    });
  });

  describe('validateLoginForm', () => {
    it('returns email error when email is empty', () => {
      const errors = validateLoginForm('', 'password123');
      expect(errors.email).toBe('Email is required');
    });

    it('returns email error when email is only whitespace', () => {
      const errors = validateLoginForm('   ', 'password123');
      expect(errors.email).toBe('Email is required');
    });

    it('returns email format error for invalid email', () => {
      const errors = validateLoginForm('notanemail', 'password123');
      expect(errors.email).toBe('Please enter a valid email address');
    });

    it('returns email format error for email missing domain dot', () => {
      const errors = validateLoginForm('user@localhost', 'password123');
      expect(errors.email).toBe('Please enter a valid email address');
    });

    it('returns password error when password is empty', () => {
      const errors = validateLoginForm('user@example.com', '');
      expect(errors.password).toBe('Password is required');
    });

    it('returns no errors for valid login inputs', () => {
      const errors = validateLoginForm('user@example.com', 'pass');
      expect(errors).toEqual({});
    });

    it('does not enforce minimum password length in login mode', () => {
      const errors = validateLoginForm('user@example.com', 'short');
      expect(errors.password).toBeUndefined();
    });

    it('returns both email and password errors simultaneously', () => {
      const errors = validateLoginForm('', '');
      expect(errors.email).toBe('Email is required');
      expect(errors.password).toBe('Password is required');
    });
  });

  describe('validateSignupForm', () => {
    it('returns email error when email is empty', () => {
      const errors = validateSignupForm('', 'password123');
      expect(errors.email).toBe('Email is required');
    });

    it('returns email format error for invalid email', () => {
      const errors = validateSignupForm('bad-email', 'password123');
      expect(errors.email).toBe('Please enter a valid email address');
    });

    it('returns password error when password is empty', () => {
      const errors = validateSignupForm('user@example.com', '');
      expect(errors.password).toBe('Password is required');
    });

    it('returns password length error for short password', () => {
      const errors = validateSignupForm('user@example.com', 'short');
      expect(errors.password).toBe('Password must be at least 8 characters');
    });

    it('returns password length error for 7-character password', () => {
      const errors = validateSignupForm('user@example.com', '1234567');
      expect(errors.password).toBe('Password must be at least 8 characters');
    });

    it('returns no password error for exactly 8-character password', () => {
      const errors = validateSignupForm('user@example.com', '12345678');
      expect(errors.password).toBeUndefined();
    });

    it('returns no errors for valid signup inputs', () => {
      const errors = validateSignupForm('user@example.com', 'longpassword');
      expect(errors).toEqual({});
    });

    it('returns both email and password errors simultaneously', () => {
      const errors = validateSignupForm('', 'short');
      expect(errors.email).toBe('Email is required');
      expect(errors.password).toBe('Password must be at least 8 characters');
    });
  });
});
