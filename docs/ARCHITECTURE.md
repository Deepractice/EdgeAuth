# EdgeAuth Architecture Overview

> Open-source edge authentication service architecture documentation

## 🎯 Project Positioning

**EdgeAuth** is an open-source, serverless authentication service built on Cloudflare Workers, providing globally distributed, low-latency authentication with a clean, layered architecture.

- **License**: Apache 2.0
- **Tech Stack**: TypeScript + Cloudflare Workers + D1 + Hono
- **Build Tools**: pnpm monorepo + Turbo
- **Current Version**: v0.0.1 (Early Development)

## 🏗️ Monorepo Structure

```
EdgeAuth/
├── src/                      # Core Layer (Technical-Oriented)
│   ├── core/                 # Authentication logic (crypto, JWT, persistence)
│   └── domain/               # Domain models (User, OAuth, SSO)
├── services/                 # Edge Services Layer (Cloudflare Workers)
│   ├── admin-api/            # Admin service + Schema management center
│   ├── oauth-api/            # OAuth 2.0 Provider
│   └── sso-api/              # SSO authentication service
├── apps/                     # Application Layer (Future)
└── packages/                 # Shared infrastructure (Future)
```

### Key Design Principles

1. **Layered Architecture**: Domain → Core → Services, clear dependency direction
2. **OOP Programming**: One file per type, interface-first naming
3. **Workspace Dependencies**: Internal packages via `workspace:*`

## 🗄️ Database Architecture

### Centralized Schema Management

EdgeAuth uses an innovative **centralized schema management** approach to avoid distributed database conflicts:

**Three D1 Databases:**
- `edgeauth-users` - User tables
- `edgeauth-sso` - SSO session tables
- `edgeauth-oauth` - OAuth clients and tokens

**Core Principle - Single Source of Truth:**
- ✅ Migrations are centralized in `src/migrations/`
- ❌ Service APIs have NO migrations
- **Benefits**:
  - No schema conflicts
  - No deployment order dependencies
  - No version inconsistencies
  - Clear responsibility boundaries

### Database Bindings

| Service | DB Binding | SSO_DB Binding | OAUTH_DB Binding |
|---------|------------|----------------|------------------|
| Admin API | ✅ (R/W) | ✅ (R/W) | ✅ (R/W) |
| SSO API | ✅ (R) | ✅ (R/W) | ❌ |
| OAuth API | ❌ | ❌ | ✅ (R/W) |

## 📦 Core Packages

### edge-auth-domain (Domain Layer)

Pure business logic, no technical dependencies:

```typescript
// User domain models
import { UserService } from 'edge-auth-domain/user';

// OAuth domain models
import { OAuthClient } from 'edge-auth-domain/oauth';

// SSO domain models
import { SSOSession } from 'edge-auth-domain/sso';
```

**Responsibilities**:
- Domain models and entities
- Business rules and validations
- Domain services

### edge-auth-core (Technical Core)

Technical implementation layer:

```typescript
// Password hashing (PBKDF2)
import { hashPassword, verifyPassword } from 'edge-auth-core/crypto';

// JWT generation and validation (HS256)
import { generateToken, verifyToken } from 'edge-auth-core/jwt';

// D1 Repository implementations
import { D1UserRepository } from 'edge-auth-core/persistence';

// OAuth logic
import { OAuthService } from 'edge-auth-core/oauth';
```

**Module Structure**:
- `/crypto` - Password hashing (Web Crypto API - PBKDF2)
- `/jwt` - JWT token operations (HS256 algorithm)
- `/oauth` - OAuth 2.0 logic
- `/persistence` - D1 database repositories

## 🚀 Services Layer

### admin-api (Management Center)

**Responsibilities**:
- User management APIs
- Admin operations
- System configuration

**Database Bindings**:
- `DB` → edgeauth-users
- `SSO_DB` → edgeauth-sso
- `OAUTH_DB` → edgeauth-oauth

**Testing**: BDD with Vitest + Cucumber

### oauth-api (OAuth Provider)

**Responsibilities**:
- OAuth 2.0 authorization flows
- Client management
- Token management

**Database Bindings**:
- `OAUTH_DB` → edgeauth-oauth

**Status**: Complete BDD test coverage

### sso-api (SSO Service)

**Responsibilities**:
- User authentication
- SSO session management
- Token generation and verification

**Database Bindings**:
- `DB` → edgeauth-users (read)
- `SSO_DB` → edgeauth-sso (read/write)

**Status**: In development

## 🎨 Technology Stack

### Runtime & Framework
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Web Framework**: Hono
- **Language**: TypeScript

### Security
- **Password Hashing**: Web Crypto API (PBKDF2)
- **JWT Algorithm**: HS256

### Development Tools
- **Build**: tsup
- **Test**: Vitest
- **Monorepo**: Turbo
- **Code Quality**: Prettier + ESLint
- **Git Hooks**: Lefthook

### Testing Strategy
- **BDD**: `@deepracticex/vitest-cucumber`
- **Features**: `.feature` files in each service
- **Step Definitions**: Aligned with business specs

### Deepractice Ecosystem
- `@deepracticex/config-preset` - Configuration presets
- `@deepracticex/error-handling` - Error handling utilities
- `@deepracticex/logger` - Logging system

## 🔄 Development Workflow

### Build Pipeline

```bash
# Build all packages (managed by Turbo)
pnpm build

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Development mode
pnpm test:dev
```

### Deployment Workflow

1. **Apply Migrations** (Centralized):
   ```bash
   # Run migrations from src/migrations/
   wrangler d1 execute edgeauth-users --file=src/migrations/000X_xxx.sql
   ```

2. **Deploy Services** (Any order):
   ```bash
   # Admin API
   cd services/admin-api && wrangler deploy

   # OAuth API
   cd services/oauth-api && wrangler deploy

   # SSO API
   cd services/sso-api && wrangler deploy
   ```

## 🎯 Architectural Highlights

### 1. Contradiction Resolution

**Primary Contradiction**: Distributed schema management conflicts in microservices
- Multiple workers trying to create the same tables
- Deployment order dependencies
- Version inconsistencies

**Solution**: Centralized schema management
- Migrations in `src/migrations/` as single source of truth
- Service APIs focus on business logic
- Clear separation of concerns

**Benefits**:
- Deployment order is flexible (migrations run independently)
- Schema changes are tracked in one place
- No coupling between services and schema

### 2. Occam's Razor Principles

**Simplicity Through**:
- Direct D1 access (no HTTP overhead between workers)
- Code sharing via workspace packages (no duplication)
- Flexible deployment (workers can deploy in any order)
- Clear responsibility boundaries (no gray areas)

### 3. Clean Architecture

**Dependency Flow**:
```
Services → Core → Domain
         ↓
    Persistence (D1)
```

- **Domain**: Pure business logic, no technical dependencies
- **Core**: Technical implementation (crypto, JWT, repositories)
- **Services**: Application layer (Cloudflare Workers)

## 📈 Current Status

### ✅ Completed
- Clean layered architecture
- Domain + Core layer implementation
- OAuth Worker with full BDD coverage
- Admin Worker basic framework
- Centralized schema management solution
- Complete development toolchain

### 🚧 In Progress
- SSO Worker implementation
- Admin API routes
- OAuth migrations (0003)

### 📋 Planned (Roadmap)
- Email verification
- Password reset flow
- Admin dashboard (UI)
- SDK development (JavaScript/TypeScript)
- Rate limiting
- Refresh token support

## 🔍 Design Patterns

### Repository Pattern
```typescript
// Domain-agnostic interface
interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// D1-specific implementation in core
class D1UserRepository implements UserRepository {
  constructor(private db: D1Database) {}
  // Implementation details...
}
```

### Service Layer Pattern
```typescript
// Business logic in domain
class UserService {
  constructor(private userRepo: UserRepository) {}

  async registerUser(email: string, password: string) {
    // Business validation
    // Password hashing
    // User creation
  }
}
```

### Worker Pattern
```typescript
// Cloudflare Worker entry point
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Initialize services with D1 bindings
    const userRepo = new D1UserRepository(env.DB);
    const userService = new UserService(userRepo);

    // Route handling with Hono
    return app.fetch(request, env);
  }
}
```

## 🎓 Best Practices

1. **Schema Management**
   - All migrations are centralized in `src/migrations/`
   - Document table ownership in migration files
   - Apply migrations before deploying services

2. **Code Organization**
   - One file per type (OOP style)
   - Interface-first naming (no Hungarian notation)
   - Use `~` for internal imports, `@` for external

3. **Testing**
   - BDD for business logic (feature files)
   - Unit tests for technical logic
   - E2E tests for critical paths

4. **Database Access**
   - Workers bind directly to D1 databases
   - Share logic via workspace packages
   - No cross-database queries (D1 limitation)

## 📚 Related Documentation

- [Database Management](./DATABASE_MANAGEMENT.md) - Detailed database architecture
- [API Documentation](./api/README.md) - API specifications
- [Contributing Guide](../CONTRIBUTING.md) - Development guidelines

## 🔮 Future Considerations

### Scalability
- Multiple database replicas (Cloudflare D1 feature)
- Caching layer (Cloudflare KV/R2)
- Rate limiting per user/IP

### Security
- MFA support
- Session management improvements
- Audit logging

### Developer Experience
- SDK libraries (JS/TS, Python, Go)
- CLI tools for management
- Local development improvements

---

**Last Updated**: 2025-10-12
**Version**: 0.0.1
**Maintained By**: Deepractice Team
