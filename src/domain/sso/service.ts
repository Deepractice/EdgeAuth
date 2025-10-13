/**
 * SSO Domain Service
 *
 * Encapsulates Single Sign-On business logic
 */

import { errors } from "@deepracticex/error-handling";
import type { User } from "../user/types.js";
import type { SSOSessionRepository } from "./repository.js";
import type {
  CreateSSOSessionData,
  SSOLoginRequest,
  SSOLoginResult,
  SSOSession,
  SSOTokenPayload,
  SSOTokenVerification,
} from "./types.js";
import { validateRedirectUri, validateSSOToken } from "./validation.js";

export class SSOService {
  constructor(private readonly sessionRepository: SSOSessionRepository) {}

  /**
   * Create SSO session after successful authentication
   */
  async createSession(data: CreateSSOSessionData): Promise<SSOSession> {
    const now = Date.now();
    const sessionId = crypto.randomUUID();

    const session: SSOSession = {
      sessionId,
      userId: data.userId,
      token: data.token,
      createdAt: now,
      expiresAt: now + data.expiresIn * 1000,
      lastAccessedAt: now,
      revokedAt: null,
    };

    return await this.sessionRepository.create(session);
  }

  /**
   * Handle SSO login
   */
  async handleLogin(
    request: SSOLoginRequest,
    user: User,
    token: string,
  ): Promise<SSOLoginResult> {
    // Validate redirect URI
    validateRedirectUri(request.redirectUri);

    // Create SSO session
    await this.createSession({
      userId: user.id,
      token,
      expiresIn: 86400, // 24 hours
    });

    return {
      token,
      redirectUri: request.redirectUri,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  /**
   * Verify SSO token
   */
  async verifyToken(
    token: string,
    payload: SSOTokenPayload,
  ): Promise<SSOTokenVerification> {
    validateSSOToken(token);

    // Find session
    const session = await this.sessionRepository.findByToken(token);

    if (!session) {
      throw errors.unauthorized("Invalid token");
    }

    // Check if revoked
    if (session.revokedAt !== null) {
      throw errors.unauthorized("Token has been revoked");
    }

    // Check expiration
    const now = Date.now();
    if (session.expiresAt < now) {
      throw errors.unauthorized("Token expired");
    }

    // Update last accessed
    await this.sessionRepository.updateLastAccessed(session.sessionId, now);

    return {
      valid: true,
      sessionId: session.sessionId,
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
    };
  }

  /**
   * Logout - revoke session
   */
  async logout(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findBySessionId(sessionId);

    if (!session) {
      throw errors.notFound("Session not found");
    }

    if (session.revokedAt !== null) {
      throw errors.validation("Already logged out");
    }

    await this.sessionRepository.revokeBySessionId(sessionId);
  }

  /**
   * Logout from all sessions (all devices)
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllByUserId(userId);
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<SSOSession[]> {
    return await this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Check if user has existing valid session
   */
  async hasValidSession(userId: string): Promise<SSOSession | null> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);

    if (sessions.length === 0) {
      return null;
    }

    // Return the most recent non-revoked, non-expired session
    const now = Date.now();
    const validSession = sessions.find(
      (s) => s.revokedAt === null && s.expiresAt > now,
    );

    return validSession || null;
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpired(): Promise<number> {
    return await this.sessionRepository.deleteExpired();
  }
}
