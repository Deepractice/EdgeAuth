/**
 * SSO Session Repository Interface
 */

import type { SSOSession } from './types.js';

export interface SSOSessionRepository {
  /**
   * Create new SSO session
   */
  create(session: SSOSession): Promise<SSOSession>;

  /**
   * Find session by session ID
   */
  findBySessionId(sessionId: string): Promise<SSOSession | null>;

  /**
   * Find session by token
   */
  findByToken(token: string): Promise<SSOSession | null>;

  /**
   * Find active sessions by user ID
   */
  findActiveByUserId(userId: string): Promise<SSOSession[]>;

  /**
   * Update session last accessed time
   */
  updateLastAccessed(sessionId: string, timestamp: number): Promise<void>;

  /**
   * Revoke session by session ID
   */
  revokeBySessionId(sessionId: string): Promise<void>;

  /**
   * Revoke all sessions for a user
   */
  revokeAllByUserId(userId: string): Promise<void>;

  /**
   * Delete expired sessions (cleanup)
   */
  deleteExpired(): Promise<number>;
}
