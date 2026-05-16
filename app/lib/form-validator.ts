/**
 * Pure form validation utilities for the login/signup page.
 * No DOM dependencies — suitable for unit and property-based testing.
 */

export interface ValidationErrors {
  email?: string;
  password?: string;
  callsign?: string;
}

/**
 * Returns true if the email contains exactly one `@` followed by a domain
 * with at least one `.` and non-empty labels on each side.
 *
 * Valid structure: <local>@<label>.<label>[.<label>...]
 * - local part must be non-empty
 * - domain must have at least two labels separated by `.`
 * - each label must be non-empty
 */
export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf('@');

  // Must contain exactly one @
  if (atIndex === -1 || email.lastIndexOf('@') !== atIndex) {
    return false;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  // Local part must be non-empty
  if (local.length === 0) {
    return false;
  }

  // Domain must contain at least one dot
  if (!domain.includes('.')) {
    return false;
  }

  // All domain labels must be non-empty
  const labels = domain.split('.');
  return labels.every((label) => label.length > 0);
}

/**
 * Validates login form fields. Returns ALL errors simultaneously (no short-circuiting).
 * Checks: email required, email format, password required.
 */
export function validateLoginForm(email: string, password: string): ValidationErrors {
  const errors: ValidationErrors = {};

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(trimmedEmail)) {
    errors.email = 'Please enter a valid email address';
  }

  if (password.length === 0) {
    errors.password = 'Password is required';
  }

  return errors;
}

/**
 * Validates signup form fields. Same as login plus password minimum 8 characters
 * and callsign validation.
 * Returns ALL errors simultaneously (no short-circuiting).
 */
export function validateSignupForm(email: string, password: string, callsign?: string): ValidationErrors {
  const errors: ValidationErrors = {};

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(trimmedEmail)) {
    errors.email = 'Please enter a valid email address';
  }

  if (password.length === 0) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (callsign !== undefined) {
    const callsignError = validateCallsign(callsign);
    if (callsignError) {
      errors.callsign = callsignError;
    }
  }

  return errors;
}

/**
 * Validates a callsign string.
 * Rules: 3–20 characters, alphanumeric + underscores + hyphens only.
 * Returns an error message or undefined if valid.
 */
export function validateCallsign(callsign: string): string | undefined {
  const trimmed = callsign.trim();
  if (trimmed.length === 0) {
    return 'Callsign is required';
  }
  if (trimmed.length < 3) {
    return 'Callsign must be at least 3 characters';
  }
  if (trimmed.length > 20) {
    return 'Callsign must be 20 characters or less';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Only letters, numbers, underscores, and hyphens allowed';
  }
  return undefined;
}
