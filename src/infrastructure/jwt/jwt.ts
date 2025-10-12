/**
 * JWT implementation using Web Crypto API (HS256)
 */

import { errors, AppError } from '@deepracticex/error-handling';
import type { User } from '../../domain/user/types.js';
import { DEFAULT_JWT_EXPIRATION, type JWTConfig, type JWTPayload } from './types.js';

/**
 * Base64URL encode
 */
function base64UrlEncode(data: ArrayBuffer | string): string {
  const base64 = typeof data === 'string' ? btoa(data) : btoa(String.fromCharCode(...new Uint8Array(data)));

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;

  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Create JWT crypto key from secret
 */
async function createKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

/**
 * Generate JWT token
 */
export async function generateToken(user: User, config: JWTConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = config.expiresIn || DEFAULT_JWT_EXPIRATION;

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
    iat: now,
    exp: now + expiresIn,
  };

  // Create header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Encode header and payload
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

  // Create signature
  const data = `${headerEncoded}.${payloadEncoded}`;
  const encoder = new TextEncoder();
  const key = await createKey(config.secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureEncoded = base64UrlEncode(signature);

  return `${data}.${signatureEncoded}`;
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw errors.unauthorized('Invalid token format');
    }

    const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

    // Verify signature
    const data = `${headerEncoded}.${payloadEncoded}`;
    const encoder = new TextEncoder();
    const key = await createKey(secret);
    const signature = base64UrlDecode(signatureEncoded!);

    const isValid = await crypto.subtle.verify('HMAC', key, signature.buffer as ArrayBuffer, encoder.encode(data));

    if (!isValid) {
      throw errors.unauthorized('Invalid token signature');
    }

    // Decode payload
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadEncoded!));
    const payload = JSON.parse(payloadJson) as JWTPayload;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw errors.unauthorized('Token has expired');
    }

    return payload;
  } catch (error) {
    // Convert any error to AppError
    if (AppError.isAppError(error)) {
      throw error;
    }
    // Native errors (DOMException, JSON parse errors, etc.)
    throw errors.unauthorized('Invalid token');
  }
}

/**
 * Decode JWT token without verification (use with caution)
 */
export function decodeToken(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw errors.unauthorized('Invalid token format');
  }

  const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]!));
  return JSON.parse(payloadJson) as JWTPayload;
}
