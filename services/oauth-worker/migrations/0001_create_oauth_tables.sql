-- EdgeAuth OAuth 2.0 Database Schema
-- Cloudflare D1 (SQLite)
-- Database: edgeauth-oauth

-- OAuth Clients table
CREATE TABLE IF NOT EXISTS oauth_clients (
  id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  redirect_uris TEXT NOT NULL, -- JSON array
  scopes TEXT NOT NULL,         -- JSON array
  grant_types TEXT NOT NULL,    -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_oauth_clients_created_at ON oauth_clients(created_at);

-- Authorization Codes table
CREATE TABLE IF NOT EXISTS authorization_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,        -- Reference to users table in edgeauth-users database
  redirect_uri TEXT NOT NULL,
  scopes TEXT NOT NULL,         -- JSON array
  code_challenge TEXT,
  code_challenge_method TEXT,   -- 'S256' or 'plain'
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0        -- Boolean: 0 = false, 1 = true
);

CREATE INDEX idx_authorization_codes_client_id ON authorization_codes(client_id);
CREATE INDEX idx_authorization_codes_user_id ON authorization_codes(user_id);
CREATE INDEX idx_authorization_codes_expires_at ON authorization_codes(expires_at);

-- Access Tokens table
CREATE TABLE IF NOT EXISTS access_tokens (
  token TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,        -- Reference to users table in edgeauth-users database
  scopes TEXT NOT NULL,         -- JSON array
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_access_tokens_client_id ON access_tokens(client_id);
CREATE INDEX idx_access_tokens_user_id ON access_tokens(user_id);
CREATE INDEX idx_access_tokens_expires_at ON access_tokens(expires_at);

-- Refresh Tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,        -- Reference to users table in edgeauth-users database
  scopes TEXT NOT NULL,         -- JSON array
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked INTEGER DEFAULT 0     -- Boolean: 0 = false, 1 = true
);

CREATE INDEX idx_refresh_tokens_client_id ON refresh_tokens(client_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked);
