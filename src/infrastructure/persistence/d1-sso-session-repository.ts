/**
 * D1 SSO Session Repository Implementation
 */

import type { SSOSession, SSOSessionRepository } from "~/domain/index.js";

export class D1SSOSessionRepository implements SSOSessionRepository {
  constructor(private readonly db: D1Database) {}

  async create(session: SSOSession): Promise<SSOSession> {
    await this.db
      .prepare(
        `INSERT INTO sso_sessions (
          session_id, user_id, token, created_at, expires_at, last_accessed_at, revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        session.sessionId,
        session.userId,
        session.token,
        session.createdAt,
        session.expiresAt,
        session.lastAccessedAt,
        session.revokedAt,
      )
      .run();

    return session;
  }

  async findBySessionId(sessionId: string): Promise<SSOSession | null> {
    const row = await this.db
      .prepare("SELECT * FROM sso_sessions WHERE session_id = ?")
      .bind(sessionId)
      .first<SSOSession>();

    return row ? this.mapRow(row) : null;
  }

  async findByToken(token: string): Promise<SSOSession | null> {
    const row = await this.db
      .prepare("SELECT * FROM sso_sessions WHERE token = ?")
      .bind(token)
      .first<SSOSession>();

    return row ? this.mapRow(row) : null;
  }

  async findActiveByUserId(userId: string): Promise<SSOSession[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM sso_sessions
         WHERE user_id = ?
         AND revoked_at IS NULL
         AND expires_at > ?
         ORDER BY created_at DESC`,
      )
      .bind(userId, Date.now())
      .all<SSOSession>();

    return result.results.map((row: SSOSession) => this.mapRow(row));
  }

  async updateLastAccessed(
    sessionId: string,
    timestamp: number,
  ): Promise<void> {
    await this.db
      .prepare(
        "UPDATE sso_sessions SET last_accessed_at = ? WHERE session_id = ?",
      )
      .bind(timestamp, sessionId)
      .run();
  }

  async revokeBySessionId(sessionId: string): Promise<void> {
    await this.db
      .prepare("UPDATE sso_sessions SET revoked_at = ? WHERE session_id = ?")
      .bind(Date.now(), sessionId)
      .run();
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.db
      .prepare(
        "UPDATE sso_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL",
      )
      .bind(Date.now(), userId)
      .run();
  }

  async deleteExpired(): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM sso_sessions WHERE expires_at < ?")
      .bind(Date.now())
      .run();

    return result.meta.changes || 0;
  }

  /**
   * Map database row to domain entity
   */
  private mapRow(row: any): SSOSession {
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      token: row.token,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      lastAccessedAt: row.last_accessed_at,
      revokedAt: row.revoked_at,
    };
  }
}
