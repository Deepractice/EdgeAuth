# Database Migrations

## Overview

EdgeAuth uses a centralized migration management approach. **All database schema changes are managed here in admin-worker**, including schemas for users, SSO sessions, and OAuth tables.

## Migration History

### 0001_create_users_table.sql

- **Database**: `edgeauth-users`
- Created users table with basic fields
- Added indexes for email and username lookups

### 0002_create_sso_sessions_table.sql

- **Database**: `edgeauth-sso`
- Created SSO sessions table
- Added session management fields

### 0003_add_email_verification.sql

- **Database**: `edgeauth-users`
- Added `email_verified` field to users table (default: 0)
- Added `email_verified_at` field to users table (nullable)
- Added indexes for verification status and time

### 0004_create_oauth_tables.sql

- **Database**: `edgeauth-oauth`
- Created oauth_clients table
- Created authorization_codes table
- Created access_tokens table
- Created refresh_tokens table
- Added indexes for all tables

## Running Migrations

### Development

Apply migrations to all three databases:

```bash
# Users database (0001, 0003)
wrangler d1 migrations apply edgeauth-users --local

# SSO sessions database (0002)
wrangler d1 migrations apply edgeauth-sso --local

# OAuth database (0004)
wrangler d1 migrations apply edgeauth-oauth --local
```

### Production

```bash
# Dry run first - check which migrations will be applied
wrangler d1 migrations list edgeauth-users --env production
wrangler d1 migrations list edgeauth-sso --env production
wrangler d1 migrations list edgeauth-oauth --env production

# Apply migrations
wrangler d1 migrations apply edgeauth-users --env production
wrangler d1 migrations apply edgeauth-sso --env production
wrangler d1 migrations apply edgeauth-oauth --env production
```

## Schema After Migration

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0 NOT NULL,  -- NEW
  email_verified_at INTEGER,                   -- NEW
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```
