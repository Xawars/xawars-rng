import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthForm } from '../AuthForm';

function renderAuthForm(overrides: Partial<React.ComponentProps<typeof AuthForm>> = {}) {
  const defaultProps = {
    mode: 'login' as const,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    serverError: null,
    onFieldChange: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  return { ...render(<AuthForm {...props} />), props };
}

describe('AuthForm', () => {
  describe('rendering of inputs, labels, and submit button', () => {
    it('renders an email input with type email', () => {
      renderAuthForm();
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('renders a password input with type password', () => {
      renderAuthForm();
      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('renders labels associated with inputs via htmlFor', () => {
      renderAuthForm();
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
    });

    it('renders a submit button', () => {
      renderAuthForm();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });
  });

  describe('submit button label changes with mode', () => {
    it('shows "Log In" in login mode', () => {
      renderAuthForm({ mode: 'login' });
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('shows "Sign Up" in signup mode', () => {
      renderAuthForm({ mode: 'signup' });
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });
  });

  describe('loading state disables button and shows spinner', () => {
    it('disables the submit button when isSubmitting is true', () => {
      renderAuthForm({ isSubmitting: true });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('shows a loading spinner when isSubmitting is true', () => {
      const { container } = render(
        <AuthForm
          mode="login"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          isSubmitting={true}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );
      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows "Please wait..." text when isSubmitting is true', () => {
      renderAuthForm({ isSubmitting: true });
      expect(screen.getByRole('button')).toHaveTextContent('Please wait...');
    });

    it('does not show spinner when isSubmitting is false', () => {
      const { container } = render(
        <AuthForm
          mode="login"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
          isSubmitting={false}
          serverError={null}
          onFieldChange={vi.fn()}
        />
      );
      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('server error displays in alert area', () => {
    it('displays server error message in a role="alert" element', () => {
      renderAuthForm({ serverError: 'Invalid credentials' });
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Invalid credentials');
    });

    it('does not render alert area when serverError is null', () => {
      renderAuthForm({ serverError: null });
      // There should be no alert role for server errors (validation errors have their own alerts)
      const alerts = screen.queryAllByRole('alert');
      expect(alerts.length).toBe(0);
    });
  });

  describe('server error clears on field change', () => {
    it('calls onFieldChange when email input changes', async () => {
      const onFieldChange = vi.fn();
      renderAuthForm({ serverError: 'Some error', onFieldChange });
      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'a' } });
      expect(onFieldChange).toHaveBeenCalled();
    });

    it('calls onFieldChange when password input changes', async () => {
      const onFieldChange = vi.fn();
      renderAuthForm({ serverError: 'Some error', onFieldChange });
      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'x' } });
      expect(onFieldChange).toHaveBeenCalled();
    });
  });

  describe('form submission calls onSubmit with email and password', () => {
    it('calls onSubmit with the entered email and password on valid submission', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderAuthForm({ mode: 'login', onSubmit });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('user@example.com', 'password123');
      });
    });

    it('does not call onSubmit when validation fails', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderAuthForm({ mode: 'login', onSubmit });

      // Submit with empty fields
      fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('validation errors display adjacent to fields', () => {
    it('displays email validation error when email is empty on submit', async () => {
      renderAuthForm({ mode: 'login' });

      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('displays password validation error when password is empty on submit', async () => {
      renderAuthForm({ mode: 'login' });

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('links validation error to input via aria-describedby', async () => {
      renderAuthForm({ mode: 'login' });

      fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

      await waitFor(() => {
        const emailInput = screen.getByLabelText('Email');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('displays both email and password errors simultaneously', async () => {
      renderAuthForm({ mode: 'login' });

      fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('displays signup-specific password length error', async () => {
      renderAuthForm({ mode: 'signup' });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'short' } });
      fireEvent.submit(screen.getByRole('button', { name: /sign up/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });
  });

  describe('auto-focus on email input', () => {
    it('focuses the email input on mount', () => {
      renderAuthForm();
      const emailInput = screen.getByLabelText('Email');
      expect(document.activeElement).toBe(emailInput);
    });
  });
});
