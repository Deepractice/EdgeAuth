/**
 * OAuth Token Entities
 *
 * Access Token and Refresh Token
 */

export interface AccessToken {
  token: string; // The access token (JWT)
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: number; // Unix timestamp
  createdAt: number;
}

export interface RefreshToken {
  token: string; // The refresh token
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: number; // Unix timestamp (typically 30 days)
  createdAt: number;
  revoked: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number; // Seconds until expiration
  refresh_token?: string;
  scope?: string; // Space-separated scopes
}

export interface CreateAccessTokenRequest {
  clientId: string;
  userId: string;
  scopes: string[];
  expiresIn?: number; // Seconds (default: 3600 = 1 hour)
}

export interface CreateRefreshTokenRequest {
  clientId: string;
  userId: string;
  scopes: string[];
  expiresIn?: number; // Seconds (default: 2592000 = 30 days)
}

/**
 * Default token expiration times
 */
export const DEFAULT_ACCESS_TOKEN_EXPIRATION = 3600; // 1 hour
export const DEFAULT_REFRESH_TOKEN_EXPIRATION = 2592000; // 30 days

/**
 * Check if access token is expired
 */
export function isAccessTokenExpired(token: AccessToken): boolean {
  return Date.now() >= token.expiresAt;
}

/**
 * Check if refresh token is expired
 */
export function isRefreshTokenExpired(token: RefreshToken): boolean {
  return Date.now() >= token.expiresAt;
}

/**
 * Check if refresh token is valid for use
 */
export function isRefreshTokenValid(token: RefreshToken): boolean {
  return !token.revoked && !isRefreshTokenExpired(token);
}

/**
 * Format token response for OAuth 2.0 spec
 */
export function formatTokenResponse(
  accessToken: AccessToken,
  refreshToken?: RefreshToken,
): TokenResponse {
  const expiresIn = Math.floor((accessToken.expiresAt - Date.now()) / 1000);

  return {
    access_token: accessToken.token,
    token_type: "Bearer",
    expires_in: Math.max(0, expiresIn),
    refresh_token: refreshToken?.token,
    scope: accessToken.scopes.join(" "),
  };
}
