/**
 * SSO domain types
 */

/**
 * SSO Session entity
 */
export interface SSOSession {
  sessionId: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  revokedAt: number | null;
}

/**
 * SSO Token payload (embedded in JWT)
 */
export interface SSOTokenPayload {
  sessionId: string;
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * Data for creating SSO session
 */
export interface CreateSSOSessionData {
  userId: string;
  token: string;
  expiresIn: number; // seconds
}

/**
 * SSO login request
 */
export interface SSOLoginRequest {
  email: string;
  password: string;
  redirectUri: string;
}

/**
 * SSO login result
 */
export interface SSOLoginResult {
  token: string;
  redirectUri: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * SSO token verification result
 */
export interface SSOTokenVerification {
  valid: boolean;
  sessionId: string;
  userId: string;
  email: string;
  username: string;
}
