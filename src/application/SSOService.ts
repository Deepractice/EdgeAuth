/**
 * SSO Application Service
 *
 * Orchestrates Single Sign-On session management operations.
 * Handles user SSO sessions, token verification, and logout flows.
 */

import { errors, AppError } from '@deepracticex/error-handling';
import { createLogger } from '../infrastructure/logger/index.js';
import { SSOService as DomainSSOService } from '../domain/sso/service.js';
import { D1SSOSessionRepository } from '../infrastructure/persistence/index.js';
import type { SSOSession, SSOTokenPayload, SSOLoginRequest, SSOLoginResult, SSOTokenVerification } from '../domain/sso/types.js';
import type { User } from '../domain/user/types.js';

const logger = createLogger({
  name: 'sso-service',
  level: 'info',
  console: true,
  colors: true,
  environment: 'cloudflare-workers',
});

/**
 * SSO Service Configuration
 */
export interface SSOServiceConfig {
  db: D1Database;
}

/**
 * SSO Application Service
 */
export class SSOService {
  private readonly domainService: DomainSSOService;
  private readonly config: SSOServiceConfig;

  constructor(config: SSOServiceConfig) {
    this.config = config;
    const sessionRepository = new D1SSOSessionRepository(config.db);
    this.domainService = new DomainSSOService(sessionRepository);
  }

  /**
   * Create SSO session
   */
  async createSession(data: {
    userId: string;
    token: string;
    expiresIn: number;
  }): Promise<SSOSession> {
    try {
      const session = await this.domainService.createSession(data);
      logger.info('SSO session created', { sessionId: session.sessionId, userId: data.userId });
      return session;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Session creation error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Handle SSO login
   */
  async handleLogin(request: SSOLoginRequest, user: User, token: string): Promise<SSOLoginResult> {
    try {
      const result = await this.domainService.handleLogin(request, user, token);
      logger.info('SSO login successful', { userId: user.id, redirectUri: request.redirectUri });
      return result;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('SSO login error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Verify SSO token
   */
  async verifyToken(token: string, payload: SSOTokenPayload): Promise<SSOTokenVerification> {
    try {
      const verification = await this.domainService.verifyToken(token, payload);
      logger.info('SSO token verified', { sessionId: verification.sessionId, userId: verification.userId });
      return verification;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Token verification error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Logout from session
   */
  async logout(sessionId: string): Promise<void> {
    try {
      await this.domainService.logout(sessionId);
      logger.info('SSO logout successful', { sessionId });
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Logout error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Logout from all sessions
   */
  async logoutAll(userId: string): Promise<void> {
    try {
      await this.domainService.logoutAll(userId);
      logger.info('SSO logout all successful', { userId });
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error('Logout all error', { error });
      throw errors.internal('Internal server error');
    }
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<SSOSession[]> {
    return this.domainService.getActiveSessions(userId);
  }

  /**
   * Check if user has valid session
   */
  async hasValidSession(userId: string): Promise<SSOSession | null> {
    return this.domainService.hasValidSession(userId);
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpired(): Promise<number> {
    try {
      const count = await this.domainService.cleanupExpired();
      logger.info('Expired SSO sessions cleaned up', { count });
      return count;
    } catch (error) {
      logger.error('Cleanup error', { error });
      throw errors.internal('Internal server error');
    }
  }
}
