# EdgeAuth Worker

Cloudflare Workers service for EdgeAuth authentication.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create D1 database

```bash
# Create database
wrangler d1 create edgeauth

# Copy the database_id from output and update wrangler.toml
```

### 3. Run migrations

```bash
wrangler d1 execute edgeauth --file=./migrations/0001_create_users_table.sql
```

### 4. Set JWT secret

```bash
# Set secret for production
wrangler secret put JWT_SECRET

# For local development, create .dev.vars file
echo "JWT_SECRET=your-local-dev-secret" > .dev.vars
```
