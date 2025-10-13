# EdgeAuth Deployment Guide

This guide covers production deployment via GitHub Actions and local development setup.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Production Deployment](#production-deployment)
- [Local Development](#local-development)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** >= 20.0.0
- **pnpm** >= 8.0.0
- **wrangler** (Cloudflare CLI)

### Install Tools

```bash
# Install pnpm
npm install -g pnpm

# Install wrangler
npm install -g wrangler

# Or use pnpm
pnpm add -g wrangler
```

### Cloudflare Account Setup

1. Create a Cloudflare account at https://dash.cloudflare.com
2. Generate an API Token with D1 and Workers permissions
3. Log in with wrangler (for local development):
   ```bash
   wrangler login
   ```

## Production Deployment

### Automated Deployment via GitHub Actions

EdgeAuth uses GitHub Actions for automated deployments. No manual deployment scripts needed!

#### Setup

**Configure GitHub Secrets** (Repository Settings → Secrets and variables → Actions):

1. **CLOUDFLARE_API_TOKEN** - Cloudflare API token with D1 and Workers permissions

   How to get:
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create Token → Use template: "Edit Cloudflare Workers"
   - Add permissions: Account.Cloudflare D1 (Edit), Account.Workers Scripts (Edit)

2. **GH_PAT** - GitHub Personal Access Token

   How to get:
   - GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` and `workflow` permissions

3. **JWT_SECRET** - Secret key for JWT token signing

   Generate:

   ```bash
   openssl rand -base64 32
   ```

4. **PLUNK_API_KEY** - Plunk email service API key

   Get from: https://www.useplunk.com/dashboard

**Add all secrets to GitHub:**

```
Repository Settings → Secrets and variables → Actions → New repository secret
```

#### Deployment Workflow

```
1. Create release branch
   └─ git checkout -b release/v0.1.0

2. Update version in package.json
   └─ "version": "0.1.0"

3. Create PR to main
   └─ Opens PR for review

4. Merge PR
   └─ Triggers Release workflow
      ├─ Creates Git tag (v0.1.0)
      └─ Creates GitHub Release

5. Release published
   └─ Triggers Deploy workflow
      ├─ Creates/gets D1 database
      ├─ Applies migrations
      └─ Deploys 4 workers
```

#### What Happens During Deployment

The `deploy.yml` workflow automatically:

1. **Creates Database** (if doesn't exist)
   - Database name: `edgeauth-db`
   - Checks if already exists before creating

2. **Applies Migrations**

   ```bash
   wrangler d1 migrations apply edgeauth-db --remote
   ```

   - Uses Cloudflare's native migration system
   - Automatically tracks applied migrations
   - Idempotent (safe to run multiple times)

3. **Deploys Workers**
   - `edgeauth-admin` - Admin API
   - `edgeauth-account` - User registration & login
   - `edgeauth-sso` - SSO sessions
   - `edgeauth-oauth` - OAuth 2.0 provider

#### Manual Deployment

You can manually trigger deployment:

1. Go to Actions tab in GitHub
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Choose branch and run

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

### Automated Setup

Use the setup script for complete local environment:

```bash
# From EdgeAuth root directory
pnpm setup:local
```

This script will:

1. Install dependencies
2. Build packages
3. Create local D1 database
4. Apply migrations using Cloudflare's native system
5. Create `.dev.vars` files with default values

### Start Development Server

Start any worker locally:

```bash
# Account API (default port 8787)
cd services/account-api
wrangler dev

# Admin API (port 8788)
cd services/admin-api
wrangler dev --port 8788

# SSO API (port 8789)
cd services/sso-api
wrangler dev --port 8789

# OAuth API (port 8790)
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

To reset local database:

```bash
rm -rf .wrangler/state
pnpm setup:local
```

## Database Management

### Single Database Architecture

EdgeAuth uses a single database (`edgeauth-db`) containing all tables:

- `users` - User accounts
- `sso_sessions` - SSO sessions
- `oauth_clients` - OAuth clients
- `authorization_codes` - OAuth authorization codes
- `access_tokens` - OAuth access tokens
- `refresh_tokens` - OAuth refresh tokens

### Migrations

Migrations are stored in `/migrations` and managed by Cloudflare's native system:

```
migrations/
├── 0001_create_users_table.sql
├── 0002_create_sso_sessions_table.sql
└── 0003_create_oauth_tables.sql
```

**Key Features:**

- Automatic tracking in `d1_migrations` table
- Idempotent (safe to run multiple times)
- Sequential execution by filename

### View Database Schema

```bash
# List tables
wrangler d1 execute edgeauth-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# Describe a table
wrangler d1 execute edgeauth-db --command "PRAGMA table_info(users);"

# Check applied migrations
wrangler d1 execute edgeauth-db --command "SELECT * FROM d1_migrations;"
```

### Query Database

```bash
# Production
wrangler d1 execute edgeauth-db --command "SELECT * FROM users LIMIT 10;"

# Local
wrangler d1 execute edgeauth-db --local --command "SELECT * FROM users LIMIT 10;"
```

### Backup Database

```bash
# Export database to SQL file
wrangler d1 export edgeauth-db --output=backup.sql

# Restore from backup
wrangler d1 execute edgeauth-db --file=backup.sql
```

### Create New Migration

```bash
# Create new migration file
wrangler d1 migrations create edgeauth-db <migration_name>

# This creates: migrations/XXXX_<migration_name>.sql
# Edit the file and add your SQL

# Apply locally
wrangler d1 migrations apply edgeauth-db --local

# Apply to production (via GitHub Actions)
# Commit and push - deployment workflow handles it
```

## Troubleshooting

### Migration Issues

**Problem:** Migration already applied

**Solution:** Cloudflare tracks migrations automatically. If you see this error, the migration was already applied. Use `IF NOT EXISTS` in your SQL to make migrations idempotent.

**Check migration status:**

```bash
wrangler d1 migrations list edgeauth-db
```

### Worker Deployment Failed

**Check logs:**

```bash
wrangler tail edgeauth-account
```

**View deployment errors:**

```bash
wrangler deployments list edgeauth-account
```

### Local Database Issues

**Reset local database:**

```bash
# Delete local state
rm -rf .wrangler/state

# Re-run setup
pnpm setup:local
```

### Secret Not Set

If you see JWT validation errors, ensure secrets are set:

```bash
# List secrets
wrangler secret list

# Set missing secret
wrangler secret put JWT_SECRET
```

### GitHub Actions Fails

**Common issues:**

1. **Missing CLOUDFLARE_API_TOKEN**
   - Add in Repository Settings → Secrets

2. **Insufficient permissions**
   - API token needs D1 and Workers permissions

3. **Migration fails**
   - Check migration SQL syntax
   - Ensure `IF NOT EXISTS` for idempotency

**View workflow logs:**

- Go to Actions tab in GitHub
- Click on failed workflow
- Check individual step logs

## CI/CD Workflows

### CI Workflow (`ci.yml`)

Runs on every PR and push to main:

- Lint
- Type check
- Tests
- Build verification

### Release Workflow (`release.yml`)

Runs when `release/*` branch PR is merged:

- Extracts version from package.json
- Creates Git tag
- Creates GitHub Release
- Deletes release branch

### Deploy Workflow (`deploy.yml`)

Runs when GitHub Release is published:

- Creates/gets D1 database
- Updates wrangler configs with database ID
- Applies migrations
- Deploys all workers to production

## Architecture Notes

### Why Single Database?

Previously used 3 separate databases, but consolidated to single database because:

1. **Simpler Migration Management** - Use Cloudflare's native migration system
2. **No Performance Impact** - SQLite has table-level isolation
3. **Easier to Manage** - One database to backup, monitor, query
4. **Idempotent Deployments** - Automatic migration tracking

### Migration Tracking

Cloudflare automatically creates a `d1_migrations` table:

```sql
CREATE TABLE d1_migrations (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE,
  applied_at INTEGER
);
```

Every migration is recorded, preventing duplicate execution.

## Next Steps

- [API Documentation](./api/README.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)
