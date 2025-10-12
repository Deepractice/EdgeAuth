/**
 * OAuth Application Service
 *
 * Orchestrates OAuth 2.0 flows including client management, authorization, and token operations.
 */

import { errors, AppError } from '@deepracticex/error-handling';
import { createLogger } from '@deepracticex/logger';
import { OAuthService as DomainOAuthService } from '../domain/oauth/service.js';
import {
  D1OAuthClientRepository,
  D1AuthorizationCodeRepository,
  D1TokenRepository
} from '../infrastructure/persistence/index.js';
import { generateToken } from '../infrastructure/jwt/index.js';
import type {
  OAuthClient,
  AuthorizationCode,
  AccessToken,
  RefreshToken,
  CreateAuthorizationCodeRequest
} from '../domain/oauth/index.js';
import type { User } from '../domain/user/types.js';

const logger = createLogger({
  name: 'oauth-service',
  level: 'info',
  console: true,
  colors: true,
});

/**
 * OAuth Service Configuration
 */
export interface OAuthServiceConfig {
  db: D1Database;
  jwtSecret: string;
}

/**
 * OAuth Application Service
 */
export class OAuthService {
  private readonly domainService: DomainOAuthService;
  private readonly config: OAuthServiceConfig;

  constructor(config: OAuthServiceConfig) {
    this.config = config;

    const clientRepository = new D1OAuthClientRepository(config.db);
    const authCodeRepository = new D1AuthorizationCodeRepository(config.db);
    const tokenRepository = new D1TokenRepository(config.db);

    this.domainService = new DomainOAuthService(
      clientRepository,
      authCodeRepository,
      tokenRepository,
      {
        jwtSecret: config.jwtSecret,
        tokenGenerator: {
          generateToken: async (user: User, options: { secret: string; expiresIn: number }) => {
            return generateToken(user, {
              secret: options.secret,
              expiresIn: options.expiresIn,
            });
          },
        },
      },
    );
  }

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
    try {
      const client = await this.domainService.registerClient(data);
      logger.info('OAuth client registered', { clientId: client.id, name: client.name });
      return client;
    } catch (error) {
      if (AppError.isAppError(error)) {
        logger.warn('Client registration failed', { code: error.code, message: error.message });
        throw error;
      }
      logger.error('Client registration error', { error });
      throw errors.internal('Internal server error');
    }
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
    try {
      const client = await this.domainService.updateClient(clientId, data);
      logger.info('OAuth client updated', { clientId });
      return client;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Client update error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Delete OAuth client
   */
  async deleteClient(clientId: string): Promise<void> {
    try {
      await this.domainService.deleteClient(clientId);
      logger.info('OAuth client deleted', { clientId });
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Client deletion error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Get client by ID
   */
  async getClient(clientId: string): Promise<OAuthClient | null> {
    return this.domainService.getClient(clientId);
  }

  /**
   * List all clients
   */
  async listClients(): Promise<OAuthClient[]> {
    return this.domainService.listClients();
  }

  /**
   * Create authorization code
   */
  async createAuthorizationCode(
    request: CreateAuthorizationCodeRequest,
    client: OAuthClient,
  ): Promise<AuthorizationCode> {
    try {
      const authCode = await this.domainService.createAuthorizationCode(request, client);
      logger.info('Authorization code created', { clientId: client.id, userId: request.userId });
      return authCode;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Authorization code creation error', { error });
      throw errors.internal('Internal server error');
    }
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
    try {
      const tokens = await this.domainService.exchangeAuthorizationCode(params);
      logger.info('Authorization code exchanged', { clientId: params.clientId });
      return tokens;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Token exchange error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<{ accessToken: AccessToken }> {
    try {
      const result = await this.domainService.refreshAccessToken(params);
      logger.info('Access token refreshed', { clientId: params.clientId });
      return result;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Token refresh error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      await this.domainService.revokeRefreshToken(token);
      logger.info('Refresh token revoked');
    } catch (error) {
      logger.error('Token revocation error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.domainService.revokeAllUserTokens(userId);
      logger.info('All user tokens revoked', { userId });
    } catch (error) {
      logger.error('User tokens revocation error', { error });
      throw errors.internal('Internal server error');
    }
  }
}
