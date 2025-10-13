/**
 * JWT types and configuration
 */

/**
 * JWT payload for EdgeAuth
 */
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  username: string;
  sessionId?: string; // SSO session ID (optional, for session tracking)
  iat: number; // issued at (Unix timestamp)
  exp: number; // expiration (Unix timestamp)
}

/**
 * JWT configuration
 */
export interface JWTConfig {
  secret: string;
  expiresIn: number; // seconds (default: 30 days)
}

/**
 * Default JWT expiration: 30 days
 */
export const DEFAULT_JWT_EXPIRATION = 30 * 24 * 60 * 60; // 30 days in seconds
