<div align="center">
  <h1>EdgeAuth · Edge-Native Authentication Service</h1>
  <h2>🌍 Authentication at the Speed of Light - Globally distributed, zero-latency auth built on Cloudflare's edge</h2>
  <p><strong>Core Capabilities:</strong> JWT Authentication | OAuth 2.0 Provider | SSO Sessions | Admin Management</p>
  <p>Serverless authentication service that runs on Cloudflare Workers - simple, secure, and globally fast</p>

  <!-- Badges -->
  <p>
    <a href="https://github.com/Deepractice/EdgeAuth"><img src="https://img.shields.io/github/stars/Deepractice/EdgeAuth?style=social" alt="Stars"/></a>
    <img src="https://komarev.com/ghpvc/?username=EdgeAuth&label=views&color=0e75b6&style=flat&abbreviated=true" alt="Views"/>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Deepractice/EdgeAuth?color=blue" alt="License"/></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-5.9+-blue?logo=typescript&logoColor=white" alt="TypeScript"/>
    <img src="https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare&logoColor=white" alt="Cloudflare Workers"/>
    <img src="https://img.shields.io/badge/Database-D1-green?logo=sqlite&logoColor=white" alt="D1 Database"/>
    <img src="https://img.shields.io/badge/Framework-Hono-red?logo=hono&logoColor=white" alt="Hono"/>
  </p>

  <p>
    <a href="docs/ARCHITECTURE.md">Architecture</a> |
    <a href="docs/DATABASE_MANAGEMENT.md">Schema</a> |
    <a href="docs/api/README.md">API</a>
  </p>
</div>

---

## 🚀 Why EdgeAuth?

### ⚡ **Edge-First Architecture**
Built on Cloudflare Workers, your authentication runs in 300+ cities worldwide. Users get sub-10ms response times, no matter where they are.

### 🎯 **Simple by Design**
No complex setup. No infrastructure management. Just deploy and use.

```typescript
// That's it. Authentication in 3 lines.
const token = await auth.login(email, password);
const user = await auth.verify(token);
const session = await sso.createSession(user);
```

### 🏗️ **Clean Architecture**
Built with Domain-Driven Design and clean architecture principles:
- **Domain Layer**: Pure business logic
- **Core Layer**: Technical implementation (crypto, JWT, persistence)
- **Services Layer**: Edge-native workers

### 🔐 **Security First**
- PBKDF2 password hashing with Web Crypto API
- HS256 JWT tokens
- Secure session management
- Built-in rate limiting (coming soon)

---

## ⚡ Quick Start

### 📦 Installation

```bash
# Clone the repository
git clone https://github.com/Deepractice/EdgeAuth.git
cd EdgeAuth

# Install dependencies
pnpm install
```

### 🚀 Production Deployment

**One-command deployment:**

```bash
# Automated deployment (creates databases, runs migrations, deploys workers)
pnpm deploy
```

After deployment, configure production secrets:

```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put PLUNK_API_KEY --env production
```

### 💻 Local Development

**One-command setup:**

```bash
# Set up local environment (creates local DBs, runs migrations)
pnpm setup:local

# Start a worker
cd services/account-api && wrangler dev
```

📖 **[Full Deployment Guide →](docs/DEPLOYMENT.md)**

---

## 🎨 Features

### ✅ **Current (v0.1)**
- ✨ Email/Username + Password Authentication
- 🔑 JWT Token Generation & Validation
- 🔐 Secure Password Hashing (PBKDF2)
- 🌍 Edge-Native Performance
- 📦 Cloudflare D1 Persistence
- 🎯 Clean REST API
- 📚 Full TypeScript Support

### 🚧 **In Progress**
- 🔄 SSO Session Management
- 👨‍💼 Admin Management API
- 🔌 OAuth 2.0 Provider (complete)

### 📋 **Planned**
- 📧 Email Verification
- 🔄 Password Reset Flow
- 🎨 Admin Dashboard (UI)
- 📦 SDK Libraries (JS/TS, Python, Go)
- ⚡ Refresh Token Support
- 🚦 Rate Limiting
- 🔗 OAuth Providers (GitHub, Google, etc.)

---

## 📐 Architecture

EdgeAuth uses a **centralized schema management** approach that eliminates the complexity of distributed microservices:

```
┌─────────────────────────────────────────────────────┐
│              Admin Worker (Schema Owner)            │
│  • Manages ALL database migrations                  │
│  • User management APIs                             │
│  • Binds: users + sso + oauth databases            │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SSO Worker  │  │ OAuth Worker │  │ Other Workers│
│  • Auth flow │  │  • OAuth 2.0 │  │  • Business  │
│  • Sessions  │  │  • Clients   │  │    logic     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 🗄️ **Three Databases**
- `edgeauth-users` - User accounts
- `edgeauth-sso` - SSO sessions
- `edgeauth-oauth` - OAuth clients and tokens

### ✨ **Key Benefits**
- ✅ No schema conflicts
- ✅ No deployment dependencies
- ✅ Clear responsibility boundaries
- ✅ Easy to track schema evolution

📖 **[Read Full Architecture Docs →](docs/ARCHITECTURE.md)**

---

## 🛠️ API Examples

### Register New User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "account": "user@example.com",  // email or username
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <token>
```

---

## 🧪 Development

### Run Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:dev

# Coverage
pnpm test:ci
```

### Type Checking

```bash
pnpm typecheck
```

### Format Code

```bash
# Format all files
pnpm format

# Check formatting
pnpm format:check
```

---

## 📚 Technology Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite) |
| **Framework** | Hono |
| **Language** | TypeScript 5.9+ |
| **Build** | tsup, Turbo |
| **Test** | Vitest + BDD (Cucumber) |
| **Security** | Web Crypto API (PBKDF2), JWT (HS256) |
| **Monorepo** | pnpm workspaces |

---

## 🎓 Project Structure

```
EdgeAuth/
├── src/
│   ├── core/              # Technical core (crypto, JWT, persistence)
│   └── domain/            # Business logic (User, OAuth, SSO)
├── services/
│   ├── admin-worker/      # Admin API + Schema management
│   ├── oauth-worker/      # OAuth 2.0 Provider
│   └── sso-worker/        # SSO authentication
├── docs/
│   ├── ARCHITECTURE.md    # Detailed architecture guide
│   ├── DATABASE_MANAGEMENT.md  # Database strategy
│   └── api/               # API specifications
└── package.json           # Monorepo root
```

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🏢 About

<div align="center">

**Proudly brought to you by [Deepractice](https://github.com/Deepractice)**

*Making AI your professional partner*

🌐 [Official Site](https://deepractice.ai) | 🔧 [GitHub](https://github.com/Deepractice) | 📚 [Documentation](https://docs.deepractice.ai) | 💬 [Forum](https://x.deepractice.ai) | 🎮 [Discord](https://discord.gg/rdmPr54K)

### Connect with Founder

<img src="https://brands.deepractice.ai/images/sean-wechat-qrcode.jpg" alt="Sean's WeChat" width="200"/>

*Scan to connect with Sean (Founder & CEO) on WeChat*

</div>

---

## 📞 Support

- 📚 [Documentation](https://docs.deepractice.ai)
- 🐛 [GitHub Issues](https://github.com/Deepractice/EdgeAuth/issues)
- 💬 [Discord Community](https://discord.gg/rdmPr54K)
- 🌐 [Deepractice](https://deepractice.ai)
