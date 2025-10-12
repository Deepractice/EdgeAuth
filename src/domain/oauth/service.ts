/**
 * OAuth Domain Service
 *
 * Encapsulates OAuth 2.0 business logic
 */

import { errors } from '@deepracticex/error-handling';
import type { User } from '../user/types.js';
import type {
  OAuthClient,
  AuthorizationCode,
  CreateAuthorizationCodeRequest,
  AccessToken,
  RefreshToken,
} from './index.js';
import type {
  OAuthClientRepository,
  AuthorizationCodeRepository,
  TokenRepository,
} from './repository.js';
import { isAllowedRedirectUri } from './client.js';
import { isAuthCodeValid, verifyPKCE } from './authorization-code.js';
import {
  verifyClientSecret,
  validateClientName,
  validateClientRedirectUris,
  validateClientScopes,
  areScopesAllowed,
  isGrantTypeAllowed,
} from './validation.js';
import {
  DEFAULT_ACCESS_TOKEN_EXPIRATION,
  DEFAULT_REFRESH_TOKEN_EXPIRATION,
  isRefreshTokenValid,
} from './token.js';

/**
 * Generate authorization code
 */
function generateAuthorizationCode(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate refresh token
 */
function generateRefreshToken(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate client secret
 */
function generateClientSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * JWT token generator interface
 * Implementation provided by core layer
 */
export interface TokenGenerator {
  generateToken(
    user: User,
    options: { secret: string; expiresIn: number },
  ): Promise<string>;
}

/**
 * OAuth Service Configuration
 */
export interface OAuthServiceConfig {
  jwtSecret: string;
  tokenGenerator: TokenGenerator;
}

/**
 * OAuth Domain Service
 */
export class OAuthService {
  constructor(
    private readonly clientRepository: OAuthClientRepository,
    private readonly authCodeRepository: AuthorizationCodeRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly config: OAuthServiceConfig,
  ) {}

  /**
   * Register a new OAuth client
   */
  async registerClient(data: {
    name: string;
    description?: string;
    redirectUris: string[];
    scopes: string[];
    grantTypes: Array<'authorization_code' | 'client_credentials' | 'refresh_token'>;
  }): Promise<OAuthClient> {
    // Validate
    validateClientName(data.name);
    validateClientRedirectUris(data.redirectUris);
    validateClientScopes(data.scopes);

    const now = Date.now();
    const client: OAuthClient = {
      id: crypto.randomUUID(),
      secret: generateClientSecret(),
      name: data.name,
      description: data.description,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      grantTypes: data.grantTypes,
      createdAt: now,
      updatedAt: now,
    };

    return this.clientRepository.create(client);
  }

  /**
   * Update OAuth client
   */
  async updateClient(
    clientId: string,
    data: {
      name?: string;
      description?: string;
      redirectUris?: string[];
      scopes?: string[];
    },
  ): Promise<OAuthClient> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw errors.notFound('Client not found');
    }

    // Validate if provided
    if (data.name) validateClientName(data.name);
    if (data.redirectUris) validateClientRedirectUris(data.redirectUris);
    if (data.scopes) validateClientScopes(data.scopes);

    return this.clientRepository.update(clientId, {
      ...data,
      updatedAt: Date.now(),
    });
  }

  /**
   * Delete OAuth client
   */
  async deleteClient(clientId: string): Promise<void> {
    const exists = await this.clientRepository.exists(clientId);
    if (!exists) {
      throw errors.notFound('Client not found');
    }

    // Revoke all tokens for this client
    await this.tokenRepository.revokeAllClientTokens(clientId);

    await this.clientRepository.delete(clientId);
  }

  /**
   * Get client by ID
   */
  async getClient(clientId: string): Promise<OAuthClient | null> {
    return this.clientRepository.findById(clientId);
  }

  /**
   * List all clients
   */
  async listClients(): Promise<OAuthClient[]> {
    return this.clientRepository.list();
  }

  /**
   * Create authorization code after user grants consent
   */
  async createAuthorizationCode(
    request: CreateAuthorizationCodeRequest,
    client: OAuthClient,
  ): Promise<AuthorizationCode> {
    // Validate redirect URI
    if (!isAllowedRedirectUri(client, request.redirectUri)) {
      throw errors.validation('Invalid redirect_uri');
    }

    // Validate scopes
    if (!areScopesAllowed(client, request.scopes)) {
      throw errors.validation('Invalid scopes');
    }

    // Check grant type
    if (!isGrantTypeAllowed(client, 'authorization_code')) {
      throw errors.validation('authorization_code grant not allowed for this client');
    }

    const code = generateAuthorizationCode();
    const now = Date.now();

    const authCode: AuthorizationCode = {
      code,
      clientId: request.clientId,
      userId: request.userId,
      redirectUri: request.redirectUri,
      scopes: request.scopes,
      codeChallenge: request.codeChallenge,
      codeChallengeMethod: request.codeChallengeMethod,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      createdAt: now,
      used: false,
    };

    return this.authCodeRepository.create(authCode);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeAuthorizationCode(params: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<{ accessToken: AccessToken; refreshToken: RefreshToken }> {
    const { code, clientId, clientSecret, redirectUri, codeVerifier } = params;

    // Get client
    const client = await this.clientRepository.findByIdWithSecret(clientId);
    if (!client) {
      throw errors.unauthorized('Invalid client');
    }

    // Verify client secret
    if (!verifyClientSecret(client, clientSecret)) {
      throw errors.unauthorized('Invalid client credentials');
    }

    // Get authorization code
    const authCode = await this.authCodeRepository.findByCode(code);
    if (!authCode) {
      throw errors.unauthorized('Invalid authorization code');
    }

    // Verify client matches
    if (authCode.clientId !== clientId) {
      throw errors.unauthorized('Invalid client');
    }

    // Verify authorization code is valid
    if (!isAuthCodeValid(authCode)) {
      throw errors.unauthorized('Invalid or expired authorization code');
    }

    // Verify redirect URI matches
    if (authCode.redirectUri !== redirectUri) {
      throw errors.validation('redirect_uri mismatch');
    }

    // Verify PKCE if used
    if (authCode.codeChallenge) {
      if (!codeVerifier) {
        throw errors.validation('code_verifier required');
      }
      const valid = await verifyPKCE(authCode, codeVerifier);
      if (!valid) {
        throw errors.unauthorized('Invalid code_verifier');
      }
    }

    // Mark code as used
    await this.authCodeRepository.markAsUsed(code);

    // Need user to generate JWT
    // This is a limitation - we need to fetch user from somewhere
    // In a real implementation, we'd pass UserRepository or have a way to get user
    // For now, create minimal user object from stored userId
    const user: User = {
      id: authCode.userId,
      email: '', // Would need to fetch from UserRepository
      username: '', // Would need to fetch from UserRepository
      emailVerified: false,
      emailVerifiedAt: null,
      createdAt: 0,
      updatedAt: 0,
    };

    // Generate access token (JWT)
    const accessTokenJwt = await this.config.tokenGenerator.generateToken(user, {
      secret: this.config.jwtSecret,
      expiresIn: DEFAULT_ACCESS_TOKEN_EXPIRATION,
    });

    const now = Date.now();
    const accessToken: AccessToken = {
      token: accessTokenJwt,
      clientId,
      userId: authCode.userId,
      scopes: authCode.scopes,
      expiresAt: now + DEFAULT_ACCESS_TOKEN_EXPIRATION * 1000,
      createdAt: now,
    };

    // Generate refresh token
    const refreshTokenValue = generateRefreshToken();
    const refreshToken: RefreshToken = {
      token: refreshTokenValue,
      clientId,
      userId: authCode.userId,
      scopes: authCode.scopes,
      expiresAt: now + DEFAULT_REFRESH_TOKEN_EXPIRATION * 1000,
      createdAt: now,
      revoked: false,
    };

    // Store tokens
    await this.tokenRepository.storeAccessToken(accessToken);
    await this.tokenRepository.storeRefreshToken(refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ accessToken: AccessToken }> {
    const { refreshToken: refreshTokenValue, clientId, clientSecret } = params;

    // Get client
    const client = await this.clientRepository.findByIdWithSecret(clientId);
    if (!client) {
      throw errors.unauthorized('Invalid client');
    }

    // Verify client secret
    if (!verifyClientSecret(client, clientSecret)) {
      throw errors.unauthorized('Invalid client credentials');
    }

    // Check grant type
    if (!isGrantTypeAllowed(client, 'refresh_token')) {
      throw errors.validation('refresh_token grant not allowed for this client');
    }

    // Get refresh token
    const refreshToken = await this.tokenRepository.findRefreshToken(refreshTokenValue);
    if (!refreshToken) {
      throw errors.unauthorized('Invalid refresh token');
    }

    // Verify client matches
    if (refreshToken.clientId !== clientId) {
      throw errors.unauthorized('Invalid client');
    }

    // Verify refresh token is valid
    if (!isRefreshTokenValid(refreshToken)) {
      throw errors.unauthorized('Refresh token expired or revoked');
    }

    // Create minimal user object (same limitation as above)
    const user: User = {
      id: refreshToken.userId,
      email: '',
      username: '',
      emailVerified: false,
      emailVerifiedAt: null,
      createdAt: 0,
      updatedAt: 0,
    };

    // Generate new access token
    const accessTokenJwt = await this.config.tokenGenerator.generateToken(user, {
      secret: this.config.jwtSecret,
      expiresIn: DEFAULT_ACCESS_TOKEN_EXPIRATION,
    });

    const now = Date.now();
    const accessToken: AccessToken = {
      token: accessTokenJwt,
      clientId: client.id,
      userId: refreshToken.userId,
      scopes: refreshToken.scopes,
      expiresAt: now + DEFAULT_ACCESS_TOKEN_EXPIRATION * 1000,
      createdAt: now,
    };

    // Store new access token
    await this.tokenRepository.storeAccessToken(accessToken);

    return { accessToken };
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await this.tokenRepository.revokeRefreshToken(token);
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.revokeAllUserTokens(userId);
  }
}
