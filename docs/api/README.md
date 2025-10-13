# EdgeAuth API Documentation

EdgeAuth is a distributed authentication and authorization platform built on Cloudflare Workers, providing SSO and OAuth 2.0 capabilities.

## Architecture Overview

EdgeAuth consists of multiple API services:

- **SSO API** - Single Sign-On service for users (login, registration, authentication)
- **OAuth API** - OAuth 2.0 authorization server for third-party applications

**Admin API** is an internal management service (not publicly documented).

Each service runs independently with its own D1 database following Domain-Driven Design principles.

## Base URLs

### Development

```text
SSO API:   http://localhost:8790
OAuth API: http://localhost:8788
```

### Production

```text
SSO API:   https://sso.edgeauth.com
OAuth API: https://oauth.edgeauth.com
```

## Authentication

Most endpoints require JWT token authentication via Bearer token:

```http
Authorization: Bearer <jwt_token>
```

## API Services

- **[SSO API](./sso-api.md)** - User login, registration, and Single Sign-On
- **[OAuth API](./oauth-api.md)** - OAuth 2.0 authorization flows for third-party apps

## Quick Start

### 1. Register a User (Browser)

Visit the SSO registration page:

```text
http://localhost:8790/sso/register
```

Or use API:

```bash
curl -X POST http://localhost:8790/sso/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "user",
    "password": "secure-password"
  }'
```

### 2. Login via SSO (Browser)

Visit the SSO login page:

```text
http://localhost:8790/sso/login?redirect_uri=https://your-app.com/callback
```

Enter credentials and you'll be redirected with an SSO token.

### 3. Verify SSO Token (API)

```bash
curl -X POST http://localhost:8790/sso/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<sso_token>"
  }'
```

## Error Handling

All APIs return errors in consistent JSON format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:

- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid or expired token)
- `404` - Not Found
- `500` - Internal Server Error

## Database Architecture

EdgeAuth uses separate D1 databases for each service:

- `edgeauth-users` - User accounts (shared by SSO and Admin)
- `edgeauth-oauth` - OAuth clients and tokens (OAuth API)
- `edgeauth-sso` - SSO sessions (SSO API)

This separation provides:

- Horizontal scalability (following Cloudflare D1 best practices)
- Service isolation
- Independent deployment

## Security

- All passwords are hashed using cryptographically secure algorithms
- JWT tokens are signed and verified
- Redirect URIs are validated against whitelists
- HTTPS enforced in production
- CORS properly configured

## Rate Limiting

Production endpoints are rate-limited:

- SSO endpoints: 50 requests/minute per IP
- OAuth endpoints: 100 requests/minute per client

## Support

For issues and questions:

- GitHub Issues: https://github.com/your-org/EdgeAuth/issues
- Documentation: https://docs.edgeauth.com
