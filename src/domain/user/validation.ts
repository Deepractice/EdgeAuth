/**
 * User validation logic
 */

/**
 * Email validation regex (basic RFC 5322 compliant)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Username validation rules:
 * - 3-20 characters
 * - Alphanumeric, hyphens, underscores only
 * - Must start with alphanumeric
 */
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$/;

/**
 * Password validation rules:
 * - Minimum 8 characters
 * - Maximum 128 characters (to prevent DoS)
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

import { errors } from '@deepracticex/error-handling';

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw errors.validation('Email is required');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw errors.validation('Invalid email format');
  }

  if (email.length > 255) {
    throw errors.validation('Email is too long');
  }
}

/**
 * Validate username format
 */
export function validateUsername(username: string): void {
  if (!username || typeof username !== 'string') {
    throw errors.validation('Username is required');
  }

  if (!USERNAME_REGEX.test(username)) {
    throw errors.validation(
      'Username must be 3-20 characters, start with alphanumeric, and contain only letters, numbers, hyphens, or underscores',
    );
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw errors.validation('Password is required');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw errors.validation(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw errors.validation(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }
}

/**
 * Check if account identifier is email or username
 */
export function isEmail(account: string): boolean {
  return account.includes('@');
}
