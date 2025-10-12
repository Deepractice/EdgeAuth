/**
 * OAuth Repository Interfaces
 *
 * Defines contracts for OAuth data persistence.
 * Implementation details are in the infrastructure layer (core/persistence).
 */

import type { OAuthClient } from './client.js';
import type { AuthorizationCode } from './authorization-code.js';
import type { AccessToken, RefreshToken } from './token.js';

/**
 * OAuth Client Repository
 */
export interface OAuthClientRepository {
  /**
   * Create a new OAuth client
   */
  create(client: OAuthClient): Promise<OAuthClient>;

  /**
   * Find client by ID
   */
  findById(id: string): Promise<OAuthClient | null>;

  /**
   * Find client by ID with secret
   */
  findByIdWithSecret(id: string): Promise<OAuthClient | null>;

  /**
   * Update client configuration
   */
  update(id: string, data: Partial<OAuthClient>): Promise<OAuthClient>;

  /**
   * Delete client
   */
  delete(id: string): Promise<void>;

  /**
   * List all clients
   */
  list(): Promise<OAuthClient[]>;

  /**
   * Check if client exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Authorization Code Repository
 */
export interface AuthorizationCodeRepository {
  /**
   * Store authorization code
   */
  create(authCode: AuthorizationCode): Promise<AuthorizationCode>;

  /**
   * Find authorization code by code value
   */
  findByCode(code: string): Promise<AuthorizationCode | null>;

  /**
   * Mark code as used
   */
  markAsUsed(code: string): Promise<void>;

  /**
   * Delete expired codes (cleanup)
   */
  deleteExpired(): Promise<void>;
}

/**
 * Token Repository
 */
export interface TokenRepository {
  /**
   * Store access token
   */
  storeAccessToken(token: AccessToken): Promise<void>;

  /**
   * Store refresh token
   */
  storeRefreshToken(token: RefreshToken): Promise<void>;

  /**
   * Find access token
   */
  findAccessToken(token: string): Promise<AccessToken | null>;

  /**
   * Find refresh token
   */
  findRefreshToken(token: string): Promise<RefreshToken | null>;

  /**
   * Revoke refresh token
   */
  revokeRefreshToken(token: string): Promise<void>;

  /**
   * Revoke all tokens for a user
   */
  revokeAllUserTokens(userId: string): Promise<void>;

  /**
   * Revoke all tokens for a client
   */
  revokeAllClientTokens(clientId: string): Promise<void>;

  /**
   * Delete expired tokens (cleanup)
   */
  deleteExpiredTokens(): Promise<void>;
}
