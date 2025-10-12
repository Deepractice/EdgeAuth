-- EdgeAuth SSO Sessions Database Schema
-- Cloudflare D1 (SQLite)
-- Database: edgeauth-sso

-- SSO Sessions table
CREATE TABLE IF NOT EXISTS sso_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,        -- Reference to users table in edgeauth-users database
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  revoked_at INTEGER
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_token ON sso_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at ON sso_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_active ON sso_sessions(user_id, revoked_at, expires_at);
