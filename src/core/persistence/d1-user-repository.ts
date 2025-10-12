/**
 * D1 User Repository Implementation
 *
 * Cloudflare D1 (SQLite) implementation of UserRepository
 */

import type { User, UserRepository, UserWithPassword } from 'EdgeAuth-domain';

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
interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
}

/**
 * D1 User Repository
 */
export class D1UserRepository implements UserRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Convert database row to User entity
   */
  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert database row to UserWithPassword entity
   */
  private rowToUserWithPassword(row: UserRow): UserWithPassword {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(user: UserWithPassword): Promise<User> {
    await this.db
      .prepare(
        `INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(user.id, user.email, user.username, user.passwordHash, user.createdAt, user.updatedAt)
      .run();

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>();

    return row ? this.rowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<UserRow>();

    return row ? this.rowToUser(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first<UserRow>();

    return row ? this.rowToUser(row) : null;
  }

  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<UserRow>();

    return row ? this.rowToUserWithPassword(row) : null;
  }

  async findByUsernameWithPassword(username: string): Promise<UserWithPassword | null> {
    const row = await this.db.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first<UserRow>();

    return row ? this.rowToUserWithPassword(row) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db
      .prepare(`SELECT 1 FROM users WHERE email = ? LIMIT 1`)
      .bind(email)
      .first<{ '1': number }>();

    return result !== null;
  }

  async usernameExists(username: string): Promise<boolean> {
    const result = await this.db
      .prepare(`SELECT 1 FROM users WHERE username = ? LIMIT 1`)
      .bind(username)
      .first<{ '1': number }>();

    return result !== null;
  }
}
