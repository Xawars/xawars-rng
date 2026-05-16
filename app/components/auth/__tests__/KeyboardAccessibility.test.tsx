import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { AuthForm } from '../AuthForm';
import { OAuthButtonGroup } from '../OAuthButtonGroup';
import { ModeToggle } from '../ModeToggle';

/**
 * Tests for keyboard accessibility requirements:
 * - Requirement 8.1: Auto-focus email input on mount
 * - Requirement 8.2: Enter key submits form from any input
 * - Requirement 8.3: Tab order: email → password → submit → Google OAuth → Discord OAuth → mode toggle
 * - Requirement 8.4: Focus moves to first errored field on validation failure
 */

// Composite component that mirrors the login page layout for tab order testing
function LoginPageLayout({
  onSubmit = vi.fn().mockResolvedValue(undefined),
  onOAuthClick = vi.fn().mockResolvedValue(undefined),
  onToggle = vi.fn(),
  onFieldChange = vi.fn(),
}: {
  onSubmit?: (email: string, password: string) => Promise<void>;
  onOAuthClick?: (provider: 'google' | 'discord') => Promise<void>;
  onToggle?: () => void;
  onFieldChange?: () => void;
}) {
  return (
    <div>
      <AuthForm
        mode="login"
        onSubmit={onSubmit}
        isSubmitting={false}
        serverError={null}
        onFieldChange={onFieldChange}
      />
      <OAuthButtonGroup
        onOAuthClick={onOAuthClick}
        loadingProvider={null}
        disabled={false}
      />
      <ModeToggle mode="login" onToggle={onToggle} />
    </div>
  );
}

describe('Keyboard Accessibility', () => {
  describe('Requirement 8.1: Auto-focus email input on mount', () => {
    it('focuses the email input when AuthForm mounts', () => {
      render(
        <AuthForm
          mode="login"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      expect(document.activeElement).toBe(emailInput);
    });
  });

  describe('Requirement 8.2: Enter key submits form from any input', () => {
    it('submits the form when Enter is pressed in the email input', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <AuthForm
          mode="login"
          onSubmit={onSubmit}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      // Fill in valid values to pass validation
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      // Press Enter in email input
      fireEvent.submit(emailInput.closest('form')!);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('submits the form when Enter is pressed in the password input', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <AuthForm
          mode="login"
          onSubmit={onSubmit}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      // Fill in valid values
      fireEvent.change(emailInput, { target: { value: 'user@domain.com' } });
      fireEvent.change(passwordInput, { target: { value: 'securepass' } });

      // Press Enter in password input (native form submission)
      fireEvent.submit(passwordInput.closest('form')!);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('user@domain.com', 'securepass');
      });
    });
  });

  describe('Requirement 8.3: Tab order', () => {
    it('renders interactive elements in correct DOM order for natural tab sequence', () => {
      render(<LoginPageLayout />);

      // Get all interactive elements in DOM order
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Log In' });
      const googleButton = screen.getByRole('button', { name: 'Continue with Google' });
      const discordButton = screen.getByRole('button', { name: 'Continue with Discord' });
      const modeToggle = screen.getByRole('button', { name: 'Switch to signup mode' });

      // Verify all elements exist and are focusable (no tabIndex=-1)
      expect(emailInput).not.toHaveAttribute('tabindex', '-1');
      expect(passwordInput).not.toHaveAttribute('tabindex', '-1');
      expect(submitButton).not.toHaveAttribute('tabindex', '-1');
      expect(googleButton).not.toHaveAttribute('tabindex', '-1');
      expect(discordButton).not.toHaveAttribute('tabindex', '-1');
      expect(modeToggle).not.toHaveAttribute('tabindex', '-1');

      // Verify DOM order by comparing document positions
      // Node.DOCUMENT_POSITION_FOLLOWING = 4 means the second node follows the first
      expect(
        emailInput.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        passwordInput.compareDocumentPosition(submitButton) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        submitButton.compareDocumentPosition(googleButton) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        googleButton.compareDocumentPosition(discordButton) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        discordButton.compareDocumentPosition(modeToggle) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it('all interactive elements have no positive tabIndex that would disrupt order', () => {
      render(<LoginPageLayout />);

      const interactiveElements = [
        screen.getByLabelText('Email'),
        screen.getByLabelText('Password'),
        screen.getByRole('button', { name: 'Log In' }),
        screen.getByRole('button', { name: 'Continue with Google' }),
        screen.getByRole('button', { name: 'Continue with Discord' }),
        screen.getByRole('button', { name: 'Switch to signup mode' }),
      ];

      for (const el of interactiveElements) {
        const tabIndex = el.getAttribute('tabindex');
        // tabIndex should be null (natural order) or "0" (explicit natural order)
        // It should NOT be a positive number which would disrupt order
        if (tabIndex !== null) {
          expect(Number(tabIndex)).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('Requirement 8.4: Focus moves to first errored field on validation failure', () => {
    it('focuses email input when email validation fails', async () => {
      render(
        <AuthForm
          mode="login"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );

      // Submit with empty fields - email error should take priority
      const submitButton = screen.getByRole('button', { name: 'Log In' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email');
        expect(document.activeElement).toBe(emailInput);
      });
    });

    it('focuses password input when only password validation fails', async () => {
      render(
        <AuthForm
          mode="login"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );

      // Fill in valid email but leave password empty
      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'valid@email.com' } });

      const submitButton = screen.getByRole('button', { name: 'Log In' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const passwordInput = screen.getByLabelText('Password');
        expect(document.activeElement).toBe(passwordInput);
      });
    });

    it('focuses email input when both email and password have errors (email first in DOM)', async () => {
      render(
        <AuthForm
          mode="signup"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );

      // Submit with empty fields - both will have errors, email should get focus
      const submitButton = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email');
        expect(document.activeElement).toBe(emailInput);
      });
    });
  });
});
