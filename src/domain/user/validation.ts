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

/**
 * Validation error types
 */
export enum ValidationErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_USERNAME = 'INVALID_USERNAME',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
}

export class ValidationError extends Error {
  constructor(
    public code: ValidationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError(ValidationErrorCode.INVALID_EMAIL, 'Email is required');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(ValidationErrorCode.INVALID_EMAIL, 'Invalid email format');
  }

  if (email.length > 255) {
    throw new ValidationError(ValidationErrorCode.INVALID_EMAIL, 'Email is too long');
  }
}

/**
 * Validate username format
 */
export function validateUsername(username: string): void {
  if (!username || typeof username !== 'string') {
    throw new ValidationError(ValidationErrorCode.INVALID_USERNAME, 'Username is required');
  }

  if (!USERNAME_REGEX.test(username)) {
    throw new ValidationError(
      ValidationErrorCode.INVALID_USERNAME,
      'Username must be 3-20 characters, start with alphanumeric, and contain only letters, numbers, hyphens, or underscores',
    );
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError(ValidationErrorCode.INVALID_PASSWORD, 'Password is required');
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new ValidationError(
      ValidationErrorCode.INVALID_PASSWORD,
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new ValidationError(
      ValidationErrorCode.INVALID_PASSWORD,
      `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`,
    );
  }
}

/**
 * Check if account identifier is email or username
 */
export function isEmail(account: string): boolean {
  return account.includes('@');
}
