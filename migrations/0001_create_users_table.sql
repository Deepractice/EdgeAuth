-- Create users table
-- Migration: 0001_create_users_table
-- Database: edgeauth-db (single database)
-- Date: 2025-10-12

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0 NOT NULL,  -- 0 = false, 1 = true
  email_verified_at INTEGER,                   -- Unix timestamp in milliseconds
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
