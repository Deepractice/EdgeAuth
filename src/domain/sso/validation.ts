/**
 * SSO validation utilities
 */

import { errors } from '@deepracticex/error-handling';

/**
 * Validate redirect URI
 */
export function validateRedirectUri(redirectUri: string): void {
  if (!redirectUri) {
    throw errors.validation('redirect_uri is required');
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw errors.validation('Invalid redirect_uri format');
  }

  // Security checks
  if (url.protocol === 'javascript:' || url.protocol === 'data:') {
    throw errors.validation('Invalid redirect_uri protocol');
  }

  // For non-localhost HTTP, require HTTPS
  if (url.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw errors.validation('redirect_uri must use https for non-localhost');
  }
}

/**
 * Validate SSO token format
 */
export function validateSSOToken(token: string): void {
  if (!token) {
    throw errors.validation('Token is required');
  }

  if (typeof token !== 'string') {
    throw errors.validation('Token must be a string');
  }

  // JWT format check (3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw errors.validation('Invalid token format');
  }
}
