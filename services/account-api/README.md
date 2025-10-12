# EdgeAuth Account Worker

User Account Self-Service Worker for EdgeAuth authentication service.

## Description

The Account Worker provides user-facing self-service endpoints for account management, including registration, email verification, profile management, and password operations.

## Features

- User self-registration with email verification
- Email verification workflow
- Password reset and forgot password flows
- User profile management (view, update)
- Password change functionality
- Account deletion

## API Endpoints

### Public Endpoints (No Authentication Required)

- `POST /account/register` - Register a new user account
- `GET /account/verify-email` - Verify email address with token
- `POST /account/forgot-password` - Request password reset
- `POST /account/reset-password` - Reset password with token

### Protected Endpoints (JWT Authentication Required)

- `GET /account/profile` - Get current user profile
- `PATCH /account/profile` - Update user profile
- `PATCH /account/change-password` - Change password
- `DELETE /account` - Delete user account

### System Endpoints

- `GET /health` - Health check endpoint

## Environment Variables

### Required Variables

- `JWT_SECRET` - Secret key for JWT token signing and verification
- `PLUNK_API_KEY` - API key for Plunk email service
- `EMAIL_FROM` - Sender email address for system emails
- `EMAIL_FROM_NAME` - Display name for sender
- `BASE_URL` - Base URL for email verification links

### Development Variables (wrangler.toml)

```toml
JWT_SECRET = "dev-secret-key-change-in-production-use-wrangler-secret"
PLUNK_API_KEY = "dev-plunk-api-key-change-in-production"
EMAIL_FROM = "noreply@example.com"
EMAIL_FROM_NAME = "EdgeAuth"
BASE_URL = "http://localhost:8787"
```

### Production Setup

Use Wrangler secrets for production:

```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put PLUNK_API_KEY --env production
```

## Database Bindings

This service requires access to:

- `DB` - EdgeAuth users database (D1)

## Development

### Install Dependencies

From the project root:

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Development Server

```bash
pnpm dev
```

The service will be available at `http://localhost:8787`

### Type Checking

```bash
pnpm typecheck
```

### Testing

Run BDD tests:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

UI mode:

```bash
pnpm test:ui
```

## Deployment

### Deploy to Development

```bash
pnpm deploy
```

### Deploy to Production

```bash
wrangler deploy --env production
```

## Architecture

### Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Email**: Plunk API
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Vitest + Cucumber (BDD)

### Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- Email verification required for new accounts
- Rate limiting should be implemented in production
- CORS configured for production origins

### Email Verification Flow

1. User registers with email and password
2. System generates verification token
3. Verification email sent via Plunk
4. User clicks link in email
5. Account activated upon successful verification

### Password Reset Flow

1. User requests password reset
2. System generates reset token
3. Reset email sent via Plunk
4. User clicks link and provides new password
5. Password updated upon successful verification

## Related Services

- `admin-worker` - Admin user management backend
- `sso-worker` - SSO single sign-on service
- `oauth-worker` - OAuth authorization service

## Dependencies

- `edgeauth` - Core domain logic and utilities (workspace package)
- `hono` - Web framework
- `@deepracticex/error-handling` - Error handling utilities
- `@deepracticex/logger` - Logging utilities

## License

Apache-2.0
