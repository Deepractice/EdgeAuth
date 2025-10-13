/**
 * D1 Authorization Code Repository Implementation
 *
 * Cloudflare D1 (SQLite) implementation of AuthorizationCodeRepository
 */

import type {
  AuthorizationCode,
  AuthorizationCodeRepository,
} from "~/domain/index.js";

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
 * Database row type
 */
interface AuthorizationCodeRow {
  code: string;
  client_id: string;
  user_id: string;
  redirect_uri: string;
  scopes: string; // JSON array
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: number;
  created_at: number;
  used: number; // SQLite boolean (0 or 1)
}

/**
 * D1 Authorization Code Repository
 */
export class D1AuthorizationCodeRepository
  implements AuthorizationCodeRepository
{
  constructor(private readonly db: D1Database) {}

  /**
   * Convert database row to AuthorizationCode entity
   */
  private rowToAuthCode(row: AuthorizationCodeRow): AuthorizationCode {
    return {
      code: row.code,
      clientId: row.client_id,
      userId: row.user_id,
      redirectUri: row.redirect_uri,
      scopes: JSON.parse(row.scopes) as string[],
      codeChallenge: row.code_challenge || undefined,
      codeChallengeMethod:
        (row.code_challenge_method as "S256" | "plain") || undefined,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      used: row.used === 1,
    };
  }

  async create(authCode: AuthorizationCode): Promise<AuthorizationCode> {
    await this.db
      .prepare(
        `INSERT INTO authorization_codes
        (code, client_id, user_id, redirect_uri, scopes, code_challenge, code_challenge_method, expires_at, created_at, used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        authCode.code,
        authCode.clientId,
        authCode.userId,
        authCode.redirectUri,
        JSON.stringify(authCode.scopes),
        authCode.codeChallenge || null,
        authCode.codeChallengeMethod || null,
        authCode.expiresAt,
        authCode.createdAt,
        authCode.used ? 1 : 0,
      )
      .run();

    return authCode;
  }

  async findByCode(code: string): Promise<AuthorizationCode | null> {
    const row = await this.db
      .prepare(`SELECT * FROM authorization_codes WHERE code = ?`)
      .bind(code)
      .first<AuthorizationCodeRow>();

    return row ? this.rowToAuthCode(row) : null;
  }

  async markAsUsed(code: string): Promise<void> {
    await this.db
      .prepare(`UPDATE authorization_codes SET used = 1 WHERE code = ?`)
      .bind(code)
      .run();
  }

  async deleteExpired(): Promise<void> {
    const now = Date.now();
    await this.db
      .prepare(`DELETE FROM authorization_codes WHERE expires_at < ?`)
      .bind(now)
      .run();
  }
}
