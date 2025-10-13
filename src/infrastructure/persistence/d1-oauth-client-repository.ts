/**
 * D1 OAuth Client Repository Implementation
 *
 * Cloudflare D1 (SQLite) implementation of OAuthClientRepository
 */

import type {
  OAuthClient,
  OAuthClientRepository,
  GrantType,
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
interface OAuthClientRow {
  id: string;
  secret: string;
  name: string;
  description: string | null;
  redirect_uris: string; // JSON array
  scopes: string; // JSON array
  grant_types: string; // JSON array
  created_at: number;
  updated_at: number;
}

/**
 * D1 OAuth Client Repository
 */
export class D1OAuthClientRepository implements OAuthClientRepository {
  constructor(private readonly db: D1Database) {}

  /**
   * Convert database row to OAuthClient entity
   */
  private rowToClient(row: OAuthClientRow): OAuthClient {
    return {
      id: row.id,
      secret: row.secret,
      name: row.name,
      description: row.description || undefined,
      redirectUris: JSON.parse(row.redirect_uris) as string[],
      scopes: JSON.parse(row.scopes) as string[],
      grantTypes: JSON.parse(row.grant_types) as GrantType[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(client: OAuthClient): Promise<OAuthClient> {
    await this.db
      .prepare(
        `INSERT INTO oauth_clients
        (id, secret, name, description, redirect_uris, scopes, grant_types, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        client.id,
        client.secret,
        client.name,
        client.description || null,
        JSON.stringify(client.redirectUris),
        JSON.stringify(client.scopes),
        JSON.stringify(client.grantTypes),
        client.createdAt,
        client.updatedAt,
      )
      .run();

    return client;
  }

  async findById(id: string): Promise<OAuthClient | null> {
    const row = await this.db
      .prepare(
        `SELECT id, '' as secret, name, description, redirect_uris, scopes, grant_types, created_at, updated_at
         FROM oauth_clients WHERE id = ?`,
      )
      .bind(id)
      .first<OAuthClientRow>();

    return row ? this.rowToClient(row) : null;
  }

  async findByIdWithSecret(id: string): Promise<OAuthClient | null> {
    const row = await this.db
      .prepare(`SELECT * FROM oauth_clients WHERE id = ?`)
      .bind(id)
      .first<OAuthClientRow>();

    return row ? this.rowToClient(row) : null;
  }

  async update(id: string, data: Partial<OAuthClient>): Promise<OAuthClient> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      values.push(data.description || null);
    }
    if (data.redirectUris !== undefined) {
      updates.push("redirect_uris = ?");
      values.push(JSON.stringify(data.redirectUris));
    }
    if (data.scopes !== undefined) {
      updates.push("scopes = ?");
      values.push(JSON.stringify(data.scopes));
    }
    if (data.grantTypes !== undefined) {
      updates.push("grant_types = ?");
      values.push(JSON.stringify(data.grantTypes));
    }
    if (data.updatedAt !== undefined) {
      updates.push("updated_at = ?");
      values.push(data.updatedAt);
    }

    if (updates.length === 0) {
      // No updates, just fetch and return
      const client = await this.findByIdWithSecret(id);
      if (!client) throw new Error("Client not found");
      return client;
    }

    values.push(id); // For WHERE clause

    await this.db
      .prepare(`UPDATE oauth_clients SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await this.findByIdWithSecret(id);
    if (!updated) throw new Error("Client not found after update");

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM oauth_clients WHERE id = ?`)
      .bind(id)
      .run();
  }

  async list(): Promise<OAuthClient[]> {
    const result = await this.db
      .prepare(
        `SELECT id, '' as secret, name, description, redirect_uris, scopes, grant_types, created_at, updated_at
         FROM oauth_clients ORDER BY created_at DESC`,
      )
      .all<OAuthClientRow>();

    return (result.results || []).map((row) => this.rowToClient(row));
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .prepare(`SELECT 1 FROM oauth_clients WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<{ "1": number }>();

    return result !== null;
  }
}
