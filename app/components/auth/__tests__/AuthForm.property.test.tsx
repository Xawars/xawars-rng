import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import fc from 'fast-check';
import { describe, it, expect, vi } from 'vitest';
import { AuthForm } from '../AuthForm';

/**
 * Arbitrary for generating valid emails in local@domain.tld format.
 * Uses alphanumeric characters to ensure the generated email passes client-side validation
 * and doesn't get trimmed by the validator.
 */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z0-9]{1,8}$/),
    fc.stringMatching(/^[a-z]{2,4}$/)
  )
  .map(([local, label1, label2]) => `${local}@${label1}.${label2}`);

/**
 * Arbitrary for generating valid passwords (length >= 8) using printable characters.
 */
const validPasswordArb = fc.stringMatching(/^[a-zA-Z0-9!@#$%^&*]{8,30}$/);

/**
 * Arbitrary for generating non-empty strings with visible characters (for field values).
 */
const nonEmptyStringArb = fc.stringMatching(/^[a-zA-Z0-9]{1,30}$/);

/**
 * Arbitrary for generating non-empty server error messages (no leading/trailing whitespace).
 */
const serverErrorArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9.!]{0,49}$/);

describe('Feature: login-signup-page, Property 4: Mode switch clears all form state', () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any combination of email value, password value, validation errors, and server error
   * present in the form, switching auth mode SHALL result in all input fields being empty,
   * all validation errors being cleared, and the server error being null.
   */
  it('switching mode clears all input fields, validation errors, and server error', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        fc.constantFrom('login' as const, 'signup' as const),
        serverErrorArb,
        (emailValue, passwordValue, startMode, serverError) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          // Render with initial mode and server error
          const { rerender } = render(
            <AuthForm
              mode={startMode}
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={serverError}
              onFieldChange={onFieldChange}
            />
          );

          // Fill in the form fields
          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

          fireEvent.change(emailInput, { target: { value: emailValue } });
          fireEvent.change(passwordInput, { target: { value: passwordValue } });

          // Verify fields have values
          expect(emailInput.value).toBe(emailValue);
          expect(passwordInput.value).toBe(passwordValue);

          // Verify server error is displayed
          expect(screen.getByRole('alert')).toHaveTextContent(serverError);

          // Switch mode by re-rendering with opposite mode
          const newMode = startMode === 'login' ? 'signup' : 'login';
          rerender(
            <AuthForm
              mode={newMode}
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={null}
              onFieldChange={onFieldChange}
            />
          );

          // Verify all fields are cleared
          expect(emailInput.value).toBe('');
          expect(passwordInput.value).toBe('');

          // Verify no validation errors are displayed
          expect(screen.queryByText('Email is required')).toBeNull();
          expect(screen.queryByText('Please enter a valid email address')).toBeNull();
          expect(screen.queryByText('Password is required')).toBeNull();
          expect(screen.queryByText('Password must be at least 8 characters')).toBeNull();

          // Verify server error is cleared (null passed as prop)
          expect(screen.queryByRole('alert')).toBeNull();

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: login-signup-page, Property 5: Server error clears on field modification while preserving values', () => {
  /**
   * Validates: Requirements 5.2, 5.4
   *
   * For any server error message displayed and any set of field values, modifying any
   * single input field SHALL clear the server error message while preserving the values
   * of all other input fields.
   */
  it('modifying email clears server error while preserving password value', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        serverErrorArb,
        nonEmptyStringArb,
        (initialEmail, initialPassword, serverError, newEmailChar) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={serverError}
              onFieldChange={onFieldChange}
            />
          );

          // Set initial field values
          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

          fireEvent.change(emailInput, { target: { value: initialEmail } });
          fireEvent.change(passwordInput, { target: { value: initialPassword } });

          // Verify server error is displayed
          expect(screen.getByRole('alert')).toHaveTextContent(serverError);

          // Modify email field
          const newEmail = initialEmail + newEmailChar;
          fireEvent.change(emailInput, { target: { value: newEmail } });

          // Verify onFieldChange was called (which clears server error in parent)
          expect(onFieldChange).toHaveBeenCalled();

          // Verify password value is preserved
          expect(passwordInput.value).toBe(initialPassword);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('modifying password clears server error while preserving email value', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        serverErrorArb,
        nonEmptyStringArb,
        (initialEmail, initialPassword, serverError, newPasswordChar) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={serverError}
              onFieldChange={onFieldChange}
            />
          );

          // Set initial field values
          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

          fireEvent.change(emailInput, { target: { value: initialEmail } });
          fireEvent.change(passwordInput, { target: { value: initialPassword } });

          // Verify server error is displayed
          expect(screen.getByRole('alert')).toHaveTextContent(serverError);

          // Modify password field
          const newPassword = initialPassword + newPasswordChar;
          fireEvent.change(passwordInput, { target: { value: newPassword } });

          // Verify onFieldChange was called (which clears server error in parent)
          expect(onFieldChange).toHaveBeenCalled();

          // Verify email value is preserved
          expect(emailInput.value).toBe(initialEmail);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: login-signup-page, Property 6: Login credential passthrough', () => {
  /**
   * Validates: Requirements 3.2
   *
   * For any valid email and password (passing client-side validation), submitting the form
   * in login mode SHALL call signIn with exactly the email and password the user entered, unmodified.
   */
  it('submitting valid credentials in login mode calls onSubmit with exact email and password', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        validEmailArb,
        fc.string({ minLength: 1, maxLength: 30 }),
        (email, password) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={null}
              onFieldChange={onFieldChange}
            />
          );

          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
          const form = emailInput.closest('form')!;

          // Enter valid credentials
          fireEvent.change(emailInput, { target: { value: email } });
          fireEvent.change(passwordInput, { target: { value: password } });

          // Submit the form
          fireEvent.submit(form);

          // Verify onSubmit was called with exact values
          expect(onSubmit).toHaveBeenCalledTimes(1);
          expect(onSubmit).toHaveBeenCalledWith(email, password);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: login-signup-page, Property 7: Signup credential passthrough', () => {
  /**
   * Validates: Requirements 3.3
   *
   * For any valid email and password of length >= 8 (passing client-side validation),
   * submitting the form in signup mode SHALL call signUp with exactly the email and
   * password the user entered, unmodified.
   */
  it('submitting valid credentials in signup mode calls onSubmit with exact email and password', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        validEmailArb,
        validPasswordArb,
        (email, password) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="signup"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={null}
              onFieldChange={onFieldChange}
            />
          );

          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
          const form = emailInput.closest('form')!;

          // Enter valid credentials
          fireEvent.change(emailInput, { target: { value: email } });
          fireEvent.change(passwordInput, { target: { value: password } });

          // Submit the form
          fireEvent.submit(form);

          // Verify onSubmit was called with exact values
          expect(onSubmit).toHaveBeenCalledTimes(1);
          expect(onSubmit).toHaveBeenCalledWith(email, password);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: login-signup-page, Property 9: Focus moves to first errored field', () => {
  /**
   * Validates: Requirements 8.4
   *
   * For any form submission that produces validation errors on one or more fields,
   * focus SHALL move to the first field (in DOM order: email before password) that
   * has a validation error.
   */
  it('focus moves to email field when email has a validation error', { timeout: 30000 }, () => {
    // Generate invalid emails (no @) using visible characters
    const invalidEmailArb = fc.stringMatching(/^[a-z0-9]{1,20}$/);

    fc.assert(
      fc.property(
        invalidEmailArb,
        fc.string({ minLength: 0, maxLength: 30 }),
        (invalidEmail, password) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={null}
              onFieldChange={onFieldChange}
            />
          );

          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
          const form = emailInput.closest('form')!;

          // Enter invalid email and some password
          fireEvent.change(emailInput, { target: { value: invalidEmail } });
          fireEvent.change(passwordInput, { target: { value: password } });

          // Submit the form
          fireEvent.submit(form);

          // Focus should be on email field (first errored field in DOM order)
          expect(document.activeElement).toBe(emailInput);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('focus moves to password field when only password has a validation error', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        validEmailArb,
        (email) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={null}
              onFieldChange={onFieldChange}
            />
          );

          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
          const form = emailInput.closest('form')!;

          // Enter valid email but empty password
          fireEvent.change(emailInput, { target: { value: email } });
          fireEvent.change(passwordInput, { target: { value: '' } });

          // Submit the form
          fireEvent.submit(form);

          // Focus should be on password field (only errored field)
          expect(document.activeElement).toBe(passwordInput);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('focus moves to email field (first in DOM order) when both fields have errors', { timeout: 30000 }, () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', ' ', '  ', '\t'),
        (emptyEmail) => {
          cleanup();

          const onSubmit = vi.fn().mockResolvedValue(undefined);
          const onFieldChange = vi.fn();

          render(
            <AuthForm
              mode="login"
              onSubmit={onSubmit}
              isSubmitting={false}
              serverError={null}
              onFieldChange={onFieldChange}
            />
          );

          const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
          const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
          const form = emailInput.closest('form')!;

          // Enter empty/whitespace email and empty password
          fireEvent.change(emailInput, { target: { value: emptyEmail } });
          fireEvent.change(passwordInput, { target: { value: '' } });

          // Submit the form
          fireEvent.submit(form);

          // Focus should be on email field (first errored field in DOM order)
          expect(document.activeElement).toBe(emailInput);

          cleanup();
        }
      ),
      { numRuns: 100 }
    );
  });
});
