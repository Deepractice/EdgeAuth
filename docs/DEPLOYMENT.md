# EdgeAuth Deployment Guide

This guide covers both production deployment and local development setup.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Production Deployment](#production-deployment)
- [Local Development](#local-development)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **wrangler** (Cloudflare CLI)
- **jq** (JSON processor, for automated scripts)

### Install Tools

```bash
# Install pnpm
npm install -g pnpm

# Install wrangler
npm install -g wrangler

# Install jq (macOS)
brew install jq

# Install jq (Linux)
apt-get install jq
```

### Cloudflare Account Setup

1. Create a Cloudflare account at https://dash.cloudflare.com
2. Log in with wrangler:
   ```bash
   wrangler login
   ```

## Production Deployment

### Automated Deployment (Recommended)

Use the deployment script for a complete automated setup:

```bash
# From EdgeAuth root directory
pnpm deploy

# Or directly run the script
node scripts/deploy.js
```

This script will:
1. Check requirements (wrangler)
2. Create D1 databases (if not exists)
3. Update all wrangler.toml files with database IDs
4. Execute migrations
5. Build and deploy all workers

**Note**: This is a Node.js script, so it works cross-platform (Windows, macOS, Linux) without requiring bash or external tools like `jq`.

### Post-Deployment Configuration

After deployment, set production secrets:

```bash
# Set JWT secret
wrangler secret put JWT_SECRET --env production
# Enter your secure secret when prompted

# Set Plunk API key (for email)
wrangler secret put PLUNK_API_KEY --env production
```

### Verify Deployment

Check deployed workers:

```bash
wrangler deployments list edgeauth-admin
wrangler deployments list edgeauth-account
wrangler deployments list edgeauth-sso
wrangler deployments list edgeauth-oauth
```

Test the API:

```bash
# Get worker URL from wrangler
curl https://edgeauth-account.<your-subdomain>.workers.dev/health
```

## Local Development

### Automated Setup (Recommended)

Use the local setup script:

```bash
# From EdgeAuth root directory
pnpm setup:local

# Or directly run the script
node scripts/setup-local.js
```

This script will:
1. Install dependencies
2. Build packages
3. Create local D1 databases
4. Execute migrations locally
5. Create .dev.vars files with default values

### Start Development Server

Start any worker locally:

```bash
# Account API
cd services/account-api
wrangler dev

# Admin API
cd services/admin-api
wrangler dev --port 8788

# SSO API
cd services/sso-api
wrangler dev --port 8789

# OAuth API
cd services/oauth-api
wrangler dev --port 8790
```

### Run Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:dev

# Coverage
pnpm test:ci
```

### Local Database Location

Local D1 databases are stored in:
```
.wrangler/state/v3/d1/
```

To reset local databases, delete this directory and run `./scripts/setup-local.sh` again.

## Manual Deployment

If you prefer to deploy manually without scripts:

### Step 1: Create D1 Databases

```bash
wrangler d1 create edgeauth-users
wrangler d1 create edgeauth-sso
wrangler d1 create edgeauth-oauth
```

Save the database IDs from the output.

### Step 2: Update wrangler.toml Files

Update the following files with your database IDs:

- `services/admin-api/wrangler.toml` (all 3 databases)
- `services/account-api/wrangler.toml` (users only)
- `services/sso-api/wrangler.toml` (users + sso)
- `services/oauth-api/wrangler.toml` (users + oauth)

Replace `database_id = "placeholder"` with your actual IDs.

### Step 3: Execute Migrations

```bash
# Users database
wrangler d1 execute edgeauth-users --file=src/migrations/0001_create_users_table.sql
wrangler d1 execute edgeauth-users --file=src/migrations/0003_add_email_verification.sql

# SSO database
wrangler d1 execute edgeauth-sso --file=src/migrations/0002_create_sso_sessions_table.sql

# OAuth database
wrangler d1 execute edgeauth-oauth --file=src/migrations/0004_create_oauth_tables.sql
```

### Step 4: Build and Deploy

```bash
# Build all packages
pnpm build

# Deploy each worker
cd services/admin-api && wrangler deploy
cd services/account-api && wrangler deploy
cd services/sso-api && wrangler deploy
cd services/oauth-api && wrangler deploy
```

## Database Management

### View Database Schema

```bash
# List tables in a database
wrangler d1 execute edgeauth-users --command "SELECT name FROM sqlite_master WHERE type='table';"

# Describe a table
wrangler d1 execute edgeauth-users --command "PRAGMA table_info(users);"
```

### Query Database

```bash
# Production
wrangler d1 execute edgeauth-users --command "SELECT * FROM users LIMIT 10;"

# Local
wrangler d1 execute edgeauth-users --local --command "SELECT * FROM users LIMIT 10;"
```

### Backup Database

```bash
# Export database to SQL file
wrangler d1 export edgeauth-users --output=backup.sql

# Restore from backup
wrangler d1 execute edgeauth-users --file=backup.sql
```

## Troubleshooting

### Database Already Exists

If you see "database already exists" error:

```bash
# List existing databases
wrangler d1 list

# Get database ID
wrangler d1 list --json | jq -r '.[] | select(.name == "edgeauth-users") | .uuid'
```

### Migration Already Applied

D1 doesn't track migration history. If you try to apply a migration twice, you may see errors. Use `CREATE TABLE IF NOT EXISTS` in migrations to avoid this.

### Worker Deployment Failed

Check logs:

```bash
wrangler tail edgeauth-account
```

View deployment errors:

```bash
wrangler deployments list edgeauth-account
```

### Local Database Issues

Reset local databases:

```bash
# Delete local state
rm -rf .wrangler/state

# Re-run setup
./scripts/setup-local.sh
```

### Secret Not Set

If you see JWT validation errors, ensure secrets are set:

```bash
# List secrets
wrangler secret list

# Set missing secret
wrangler secret put JWT_SECRET
```

## Architecture Notes

### Centralized Migration Management

All database migrations are stored in `/src/migrations`, not in individual service directories. This follows the **centralized schema management** principle where:

- Admin API is responsible for managing all database schemas
- Other services consume the databases but don't manage schema
- All migrations are version-controlled in one place
- Clear ownership and evolution tracking

### Database Bindings

Different workers have different database bindings:

| Worker | Users DB | SSO DB | OAuth DB |
|--------|----------|--------|----------|
| admin-api | ✅ | ✅ | ✅ |
| account-api | ✅ | ❌ | ❌ |
| sso-api | ✅ | ✅ | ❌ |
| oauth-api | ✅ | ❌ | ✅ |

This follows the principle of **least privilege** - each worker only has access to databases it needs.

## Next Steps

- [API Documentation](./api/README.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Database Schema Details](./DATABASE_MANAGEMENT.md)
- [Contributing Guide](../CONTRIBUTING.md)
