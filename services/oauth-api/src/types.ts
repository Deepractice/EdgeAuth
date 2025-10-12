/**
 * OAuth Worker Types
 */

export interface Env {
  // Cloudflare D1 Database
  DB: D1Database;

  // Environment variables
  JWT_SECRET: string;
  OAUTH_ISSUER: string;

  // Optional: KV for token storage
  TOKENS?: KVNamespace;
}

export interface OAuthConfig {
  issuer: string;
  jwtSecret: string;
}
