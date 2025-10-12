# EdgeAuth

> Open-source authentication service built on Cloudflare's edge infrastructure

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## Overview

EdgeAuth is a simple, serverless authentication service that runs on Cloudflare Workers, providing globally distributed, low-latency authentication with JWT tokens. Built with TypeScript and designed for developers who want straightforward auth without complex setup.

## Features (v1)

- **Email/Username + Password Authentication**: Simple credential-based auth
- **JWT Tokens**: Secure, stateless authentication with HS256
- **Edge-First**: Built on Cloudflare Workers for global distribution
- **Serverless**: Zero infrastructure management required
- **REST API**: Clean, RESTful endpoints
- **TypeScript**: Full type safety throughout

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Deepractice/EdgeAuth.git
cd EdgeAuth

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your JWT secret and D1 database configuration

# Initialize database
pnpm db:init

# Deploy to Cloudflare Workers
wrangler deploy
```

## API Endpoints

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "account": "user@example.com",  // email or username
  "password": "password"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

## Architecture

EdgeAuth uses a clean, layered architecture:

- **`src/core/`**: Authentication core logic (password hashing, JWT, validation)
- **`src/domain/`**: User domain models and business rules
- **`services/auth-worker/`**: Cloudflare Worker service implementation

Built with [NodeSpec](https://github.com/Deepractice/NodeSpec) for standardized TypeScript development.

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Framework**: Hono
- **Password Hashing**: Web Crypto API (PBKDF2)
- **JWT**: HS256 algorithm
- **Language**: TypeScript
- **Build**: tsup
- **Test**: Vitest

## Roadmap

### v1 (Current)
- Email/Username + Password authentication
- JWT token generation and validation
- REST API

### Future Versions
- OAuth providers (GitHub, Google, etc.)
- Email verification
- Password reset flow
- Admin dashboard
- SDK libraries (JavaScript/TypeScript)
- Refresh token support
- Rate limiting

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Format code
pnpm format

# Build all packages
pnpm build
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Copyright 2025 Deepractice

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Support

- [Documentation](https://docs.deepractice.ai)
- [GitHub Issues](https://github.com/Deepractice/EdgeAuth/issues)
- [Deepractice](https://deepractice.ai)
