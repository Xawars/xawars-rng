import fc from 'fast-check';
import { isValidEmail, validateLoginForm, validateSignupForm } from '../form-validator';

describe('Feature: login-signup-page, Property 1: Email validation correctness', () => {
  it('returns true iff the string contains exactly one @ followed by a domain with at least one . with non-empty labels', () => {
    /**
     * Validates: Requirements 4.2
     *
     * For any string, isValidEmail SHALL return true iff the string contains
     * exactly one `@` followed by a domain with at least one `.` with non-empty labels.
     */
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = isValidEmail(input);

        // Compute expected result based on the specification
        const atIndex = input.indexOf('@');
        const hasExactlyOneAt = atIndex !== -1 && input.lastIndexOf('@') === atIndex;

        if (!hasExactlyOneAt) {
          expect(result).toBe(false);
          return;
        }

        const local = input.slice(0, atIndex);
        const domain = input.slice(atIndex + 1);

        if (local.length === 0) {
          expect(result).toBe(false);
          return;
        }

        if (!domain.includes('.')) {
          expect(result).toBe(false);
          return;
        }

        const labels = domain.split('.');
        const allLabelsNonEmpty = labels.every((label) => label.length > 0);

        if (!allLabelsNonEmpty) {
          expect(result).toBe(false);
          return;
        }

        // All conditions met — should be valid
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns true for well-formed emails generated from valid parts', () => {
    /**
     * Validates: Requirements 4.2
     *
     * For any non-empty local part and domain with at least two non-empty labels,
     * isValidEmail SHALL return true.
     */
    const validEmailArb = fc
      .tuple(
        fc.string({ minLength: 1 }).filter((s) => !s.includes('@')),
        fc.string({ minLength: 1 }).filter((s) => !s.includes('.') && !s.includes('@')),
        fc.string({ minLength: 1 }).filter((s) => !s.includes('.') && !s.includes('@'))
      )
      .map(([local, label1, label2]) => `${local}@${label1}.${label2}`);

    fc.assert(
      fc.property(validEmailArb, (email) => {
        expect(isValidEmail(email)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returns false for strings without exactly one @', () => {
    /**
     * Validates: Requirements 4.2
     *
     * For any string that does not contain exactly one @, isValidEmail SHALL return false.
     */
    const noAtArb = fc.string().filter((s) => !s.includes('@'));
    const multipleAtArb = fc
      .tuple(fc.string(), fc.string(), fc.string())
      .map(([a, b, c]) => `${a}@${b}@${c}`);

    fc.assert(
      fc.property(noAtArb, (input) => {
        expect(isValidEmail(input)).toBe(false);
      }),
      { numRuns: 100 }
    );

    fc.assert(
      fc.property(multipleAtArb, (input) => {
        expect(isValidEmail(input)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: login-signup-page, Property 2: Password length validation in signup mode', () => {
  it('returns a password error for any password shorter than 8 characters, and no length error for passwords of 8+ characters', () => {
    /**
     * Validates: Requirements 4.4
     *
     * For any string of length < 8, validateSignupForm SHALL return a password error.
     * For length >= 8, SHALL NOT return the length error.
     */
    const validEmail = 'test@example.com';
    const shortPasswordArb = fc.string({ minLength: 1, maxLength: 7 });
    const longPasswordArb = fc.string({ minLength: 8 });

    // Short passwords must produce a password error
    fc.assert(
      fc.property(shortPasswordArb, (password) => {
        const errors = validateSignupForm(validEmail, password);
        expect(errors.password).toBe('Password must be at least 8 characters');
      }),
      { numRuns: 100 }
    );

    // Passwords of length >= 8 must NOT produce the length error
    fc.assert(
      fc.property(longPasswordArb, (password) => {
        const errors = validateSignupForm(validEmail, password);
        expect(errors.password).not.toBe('Password must be at least 8 characters');
      }),
      { numRuns: 100 }
    );
  });

  it('does not enforce password length in login mode', () => {
    /**
     * Validates: Requirements 4.4
     *
     * Password length validation only applies to signup mode.
     * In login mode, any non-empty password should not produce a length error.
     */
    const validEmail = 'test@example.com';
    const shortPasswordArb = fc.string({ minLength: 1, maxLength: 7 });

    fc.assert(
      fc.property(shortPasswordArb, (password) => {
        const errors = validateLoginForm(validEmail, password);
        expect(errors.password).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: login-signup-page, Property 3: Simultaneous validation errors', () => {
  it('returns error messages for ALL invalid fields simultaneously in login mode', () => {
    /**
     * Validates: Requirements 4.6
     *
     * For any form submission with multiple invalid fields, validators SHALL return
     * error messages for ALL invalid fields simultaneously.
     */
    // Generate invalid email (empty after trim) and empty password
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\t', '\n'),
        (whitespaceEmail) => {
          const errors = validateLoginForm(whitespaceEmail, '');
          expect(errors.email).toBeDefined();
          expect(errors.password).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );

    // Generate invalid email format and empty password
    const invalidEmailArb = fc
      .string({ minLength: 1 })
      .filter((s) => !s.includes('@') && s.trim().length > 0);

    fc.assert(
      fc.property(invalidEmailArb, (invalidEmail) => {
        const errors = validateLoginForm(invalidEmail, '');
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('returns error messages for ALL invalid fields simultaneously in signup mode', () => {
    /**
     * Validates: Requirements 4.6
     *
     * For any form submission with multiple invalid fields in signup mode,
     * validateSignupForm SHALL return error messages for ALL invalid fields simultaneously.
     */
    // Invalid email + short password: both errors present
    const invalidEmailArb = fc
      .string({ minLength: 1 })
      .filter((s) => !s.includes('@') && s.trim().length > 0);
    const shortPasswordArb = fc.string({ minLength: 1, maxLength: 7 });

    fc.assert(
      fc.property(invalidEmailArb, shortPasswordArb, (invalidEmail, shortPassword) => {
        const errors = validateSignupForm(invalidEmail, shortPassword);
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
      }),
      { numRuns: 100 }
    );

    // Empty email + empty password: both errors present
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  '),
        (whitespaceEmail) => {
          const errors = validateSignupForm(whitespaceEmail, '');
          expect(errors.email).toBeDefined();
          expect(errors.password).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('never short-circuits: valid email with invalid password still reports password error only', () => {
    /**
     * Validates: Requirements 4.6
     *
     * When only one field is invalid, only that field's error is returned.
     * This confirms the validator checks all fields independently.
     */
    const validEmail = 'user@domain.com';

    fc.assert(
      fc.property(fc.constant(validEmail), () => {
        const errors = validateLoginForm(validEmail, '');
        expect(errors.email).toBeUndefined();
        expect(errors.password).toBeDefined();
      }),
      { numRuns: 100 }
    );

    // Invalid email with valid password: only email error
    const invalidEmailArb = fc
      .string({ minLength: 1 })
      .filter((s) => !s.includes('@') && s.trim().length > 0);

    fc.assert(
      fc.property(invalidEmailArb, (invalidEmail) => {
        const errors = validateLoginForm(invalidEmail, 'validpass');
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});
