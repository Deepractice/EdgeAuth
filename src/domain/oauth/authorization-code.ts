/**
 * OAuth Authorization Code Entity
 *
 * Temporary code issued after user authorization
 * Used to exchange for access token
 */

export interface AuthorizationCode {
  code: string; // The authorization code
  clientId: string; // Which client requested this
  userId: string; // Which user authorized
  redirectUri: string; // Must match when exchanging for token
  scopes: string[]; // Granted scopes
  codeChallenge?: string; // PKCE code challenge
  codeChallengeMethod?: 'S256' | 'plain'; // PKCE method
  expiresAt: number; // Unix timestamp (typically 10 minutes)
  createdAt: number;
  used: boolean; // Authorization codes can only be used once
}

export interface CreateAuthorizationCodeRequest {
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

/**
 * Check if authorization code is expired
 */
export function isAuthCodeExpired(authCode: AuthorizationCode): boolean {
  return Date.now() >= authCode.expiresAt;
}

/**
 * Check if authorization code is valid for use
 */
export function isAuthCodeValid(authCode: AuthorizationCode): boolean {
  return !authCode.used && !isAuthCodeExpired(authCode);
}

/**
 * Verify PKCE code verifier against stored challenge
 */
export async function verifyPKCE(
  authCode: AuthorizationCode,
  codeVerifier: string,
): Promise<boolean> {
  if (!authCode.codeChallenge) {
    return true; // PKCE not used
  }

  if (authCode.codeChallengeMethod === 'plain') {
    return codeVerifier === authCode.codeChallenge;
  }

  // S256 method
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return base64 === authCode.codeChallenge;
}
