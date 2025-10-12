-- Add email verification fields to users table
-- Migration: 0003_add_email_verification
-- Created: 2025-01-12

-- Add email_verified column (0 = false, 1 = true)
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0 NOT NULL;

-- Add email_verified_at column (Unix timestamp in milliseconds)
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;

-- Create index for faster lookups by verification status
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Create index for filtering by verification time
CREATE INDEX IF NOT EXISTS idx_users_email_verified_at ON users(email_verified_at);

-- Optional: Update existing users to verified (for development/migration)
-- Uncomment if you want all existing users to be marked as verified
-- UPDATE users SET email_verified = 1, email_verified_at = strftime('%s', 'now') * 1000 WHERE email_verified = 0;
