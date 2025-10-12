/**
 * D1 Token Repository Implementation
 *
 * Cloudflare D1 (SQLite) implementation of TokenRepository
 */

import type { AccessToken, RefreshToken, TokenRepository } from 'edge-auth-domain';

/**
 * D1 Database interface (from Cloudflare Workers)
 */
interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: {
    changed_rows?: number;
    last_row_id?: number;
  };
}

/**
 * Database row types
 */
interface AccessTokenRow {
  token: string;
  client_id: string;
  user_id: string;
  scopes: string; // JSON array
  expires_at: number;
  created_at: number;
}

interface RefreshTokenRow {
  token: string;
  client_id: string;
  user_id: string;
  scopes: string; // JSON array
  expires_at: number;
  created_at: number;
  revoked: number; // SQLite boolean (0 or 1)
}

/**
 * D1 Token Repository
 */
export class D1TokenRepository implements TokenRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Convert database row to AccessToken entity
   */
  private rowToAccessToken(row: AccessTokenRow): AccessToken {
    return {
      token: row.token,
      clientId: row.client_id,
      userId: row.user_id,
      scopes: JSON.parse(row.scopes) as string[],
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  /**
   * Convert database row to RefreshToken entity
   */
  private rowToRefreshToken(row: RefreshTokenRow): RefreshToken {
    return {
      token: row.token,
      clientId: row.client_id,
      userId: row.user_id,
      scopes: JSON.parse(row.scopes) as string[],
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      revoked: row.revoked === 1,
    };
  }

  async storeAccessToken(token: AccessToken): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO access_tokens
        (token, client_id, user_id, scopes, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        token.token,
        token.clientId,
        token.userId,
        JSON.stringify(token.scopes),
        token.expiresAt,
        token.createdAt,
      )
      .run();
  }

  async storeRefreshToken(token: RefreshToken): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO refresh_tokens
        (token, client_id, user_id, scopes, expires_at, created_at, revoked)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        token.token,
        token.clientId,
        token.userId,
        JSON.stringify(token.scopes),
        token.expiresAt,
        token.createdAt,
        token.revoked ? 1 : 0,
      )
      .run();
  }

  async findAccessToken(token: string): Promise<AccessToken | null> {
    const row = await this.db
      .prepare(`SELECT * FROM access_tokens WHERE token = ?`)
      .bind(token)
      .first<AccessTokenRow>();

    return row ? this.rowToAccessToken(row) : null;
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const row = await this.db
      .prepare(`SELECT * FROM refresh_tokens WHERE token = ?`)
      .bind(token)
      .first<RefreshTokenRow>();

    return row ? this.rowToRefreshToken(row) : null;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.db
      .prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`)
      .bind(token)
      .run();
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db
      .prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`)
      .bind(userId)
      .run();
  }

  async revokeAllClientTokens(clientId: string): Promise<void> {
    await this.db
      .prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE client_id = ?`)
      .bind(clientId)
      .run();
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = Date.now();

    // Delete expired access tokens
    await this.db.prepare(`DELETE FROM access_tokens WHERE expires_at < ?`).bind(now).run();

    // Delete expired refresh tokens
    await this.db.prepare(`DELETE FROM refresh_tokens WHERE expires_at < ?`).bind(now).run();
  }
}
