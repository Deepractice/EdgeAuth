# EdgeAuth Database Management

## Architecture Overview

EdgeAuth uses a **centralized schema management** approach:

- **Admin Worker** = Single source of truth for all database schemas
- **Other Workers** = Business logic services that bind to databases as needed

## Database Structure

```
edgeauth-users (Managed by Admin Worker)
├── users table
└── Shared by: Admin Worker, SSO Worker

edgeauth-sso (Managed by Admin Worker)
├── sso_sessions table
└── Used by: SSO Worker

edgeauth-oauth (Managed by Admin Worker)
├── oauth_clients table
├── oauth_tokens table
└── Used by: OAuth Worker
```

## Responsibilities

### Admin Worker

**Schema Management** (Exclusive):
- Owns all migration files
- Creates and manages all database tables
- Executes all schema changes
- Handles database initialization

**Database Bindings**:
- `DB` → edgeauth-users
- `SSO_DB` → edgeauth-sso
- `OAUTH_DB` → edgeauth-oauth

**Location**: `/services/admin-worker/migrations/`

**Migrations**:
- `0001_create_users_table.sql` - Users table
- `0002_create_sso_sessions_table.sql` - SSO sessions table
- `0003_create_oauth_tables.sql` - OAuth clients and tokens (future)

### SSO Worker

**Business Logic Only**:
- User authentication
- SSO session management
- Token generation and verification

**Database Bindings** (Read/Write):
- `DB` → edgeauth-users (read users)
- `SSO_DB` → edgeauth-sso (read/write sessions)

**No Migrations**: SSO Worker does not manage schemas

### OAuth Worker

**Business Logic Only**:
- OAuth 2.0 authorization flows
- Client management
- Token management

**Database Bindings** (Read/Write):
- `OAUTH_DB` → edgeauth-oauth (read/write clients and tokens)

**No Migrations**: OAuth Worker does not manage schemas

## Why This Architecture?

### Problem with Distributed Migrations

**Before** (Each worker has migrations):
```
SSO Worker migrations/
  0001_create_users_table.sql
  0002_create_sessions_table.sql

Admin Worker migrations/
  0001_create_users_table.sql  ❌ Conflict!
  0002_manage_users.sql
```

**Issues**:
- Schema conflicts (who creates `users`?)
- Deployment order dependencies
- Inconsistent schema versions
- Migration race conditions

### Solution: Centralized Schema Management

**Now** (Admin Worker owns all migrations):
```
Admin Worker migrations/
  0001_create_users_table.sql
  0002_create_sso_sessions_table.sql
  0003_create_oauth_tables.sql

SSO Worker
  ❌ No migrations directory

OAuth Worker
  ❌ No migrations directory
```

**Benefits**:
- ✅ Single source of truth for schemas
- ✅ No deployment order issues
- ✅ Clear responsibility boundaries
- ✅ Easy to track schema evolution

## Code Reusability

Workers still share domain logic through packages:

```typescript
// All workers can use:
import { UserService } from 'edge-auth-domain';
import { D1UserRepository } from 'edge-auth-core';

// SSO Worker example
const userRepo = new D1UserRepository(c.env.DB);
const userService = new UserService(userRepo);
```

**Key Point**: Workers access databases directly via D1 bindings, not through HTTP APIs. This ensures:
- High performance (no HTTP overhead)
- Code reuse (shared domain/core packages)
- Type safety (TypeScript across all layers)

## Migration Workflow

### 1. Create New Migration

Add migration file to Admin Worker:

```bash
cd services/admin-worker
touch migrations/000X_description.sql
```

### 2. Apply Migration

```bash
# Development (local D1)
wrangler d1 execute edgeauth-users --local --file=migrations/000X_description.sql
wrangler d1 execute edgeauth-sso --local --file=migrations/000X_description.sql

# Production
wrangler d1 execute edgeauth-users --file=migrations/000X_description.sql
wrangler d1 execute edgeauth-sso --file=migrations/000X_description.sql
```

### 3. Deploy Services

Deploy in any order (no dependencies):

```bash
# Admin Worker
cd services/admin-worker && wrangler deploy

# SSO Worker
cd services/sso-worker && wrangler deploy

# OAuth Worker
cd services/oauth-worker && wrangler deploy
```

## Database Initialization

### Local Development

```bash
# Create local D1 databases
wrangler d1 create edgeauth-users --local
wrangler d1 create edgeauth-sso --local
wrangler d1 create edgeauth-oauth --local

# Apply all migrations
cd services/admin-worker
wrangler d1 execute edgeauth-users --local --file=migrations/0001_create_users_table.sql
wrangler d1 execute edgeauth-sso --local --file=migrations/0002_create_sso_sessions_table.sql
```

### Production

```bash
# Create production databases
wrangler d1 create edgeauth-users
wrangler d1 create edgeauth-sso
wrangler d1 create edgeauth-oauth

# Update wrangler.toml with database IDs

# Apply migrations
cd services/admin-worker
wrangler d1 execute edgeauth-users --file=migrations/0001_create_users_table.sql
wrangler d1 execute edgeauth-sso --file=migrations/0002_create_sso_sessions_table.sql
```

## Adding a New Table

### Example: Add `audit_logs` table

1. **Create migration in Admin Worker**:

```sql
-- services/admin-worker/migrations/0004_create_audit_logs_table.sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
```

2. **Apply migration**:

```bash
wrangler d1 execute edgeauth-users --local --file=migrations/0004_create_audit_logs_table.sql
```

3. **Use in any worker**:

```typescript
// In any worker that needs audit logs
const auditRepo = new D1AuditRepository(c.env.DB);
```

No need to modify other workers' migrations!

## Best Practices

1. **All schema changes go through Admin Worker**
   - Even if only one service uses a table
   - Maintains single source of truth

2. **Workers bind to databases they need**
   - SSO Worker: users (read) + sessions (read/write)
   - OAuth Worker: oauth (read/write)
   - Admin Worker: all databases (for management)

3. **Use domain packages for shared logic**
   - `edge-auth-domain`: Business logic
   - `edge-auth-core`: Data access (repositories)
   - All workers import these packages

4. **Never query across databases**
   - D1 doesn't support cross-database joins
   - Keep related data in the same database

5. **Document table ownership**
   - Add comments in migration files
   - Specify which services use each table

## Troubleshooting

### Schema Mismatch

If a worker expects a table that doesn't exist:

1. Check Admin Worker migrations
2. Ensure migration was applied to correct database
3. Verify wrangler.toml database bindings

### Multiple Database Bindings

Workers can bind multiple databases:

```toml
[[d1_databases]]
binding = "DB"
database_name = "edgeauth-users"

[[d1_databases]]
binding = "SSO_DB"
database_name = "edgeauth-sso"
```

Usage in code:

```typescript
const userRepo = new D1UserRepository(c.env.DB);
const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
```

## Summary

| Aspect | Admin Worker | Other Workers |
|--------|-------------|---------------|
| Migrations | ✅ Owns all | ❌ None |
| Schema Management | ✅ Exclusive | ❌ No access |
| Database Binding | ✅ All DBs | ✅ As needed |
| Business Logic | ✅ Management | ✅ Core features |
| Code Reuse | ✅ Via packages | ✅ Via packages |

This architecture ensures:
- Clear separation of concerns
- No schema conflicts
- Flexible deployment
- Efficient data access
- Maximum code reuse
