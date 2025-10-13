# SSO Worker API

The SSO Worker provides Single Sign-On authentication for internal applications and end users.

**Base URL:** `http://localhost:8790` (dev) | `https://sso.edgeauth.com` (prod)

**Database:** `edgeauth-users` (user accounts), `edgeauth-sso` (sessions)

## Overview

SSO Worker serves two audiences:

1. **End Users** - HTML pages for registration and login
2. **Applications** - API endpoints for token verification

## User-Facing Endpoints (HTML)

### Registration Page

Display user registration form.

**Endpoint:** `GET /sso/register`

**Response:** HTML page with registration form

**Features:**

- Email and username input
- Password requirements display
- Form validation
- Beautiful gradient UI

---

### Login Page

Display SSO login form with session detection.

**Endpoint:** `GET /sso/login?redirect_uri={callback_url}`

**Query Parameters:**

- `redirect_uri` (required) - URL to redirect after successful login

**Behavior:**

1. If user has valid session → redirect immediately with token
2. Otherwise → show login form

**Response:** HTML page with login form

**Example:**

```text
GET /sso/login?redirect_uri=https://app.example.com/callback
```

---

## API Endpoints (JSON)

### Register User

Create a new user account.

**Endpoint:** `POST /sso/register`

**Content-Type:**

- `application/json` (API)
- `application/x-www-form-urlencoded` (HTML form)

**Request Body (JSON):**

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "secure-password-123"
}
```

**Request Body (Form):**

```http
email=user@example.com&username=johndoe&password=secure-password-123&redirectUri=https://app.example.com/callback
```

**Validation:**

- `email`: Valid email format, unique
- `username`: 3-20 characters, alphanumeric + underscore, unique
- `password`: Minimum 8 characters

**Success Response:** `302 Found` (redirect) or `201 Created` (JSON)

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Email already registered"
}
```

---

### Login (Submit Credentials)

Authenticate user and create SSO session.

**Endpoint:** `POST /sso/login`

**Content-Type:**

- `application/json` (API)
- `application/x-www-form-urlencoded` (HTML form)

**Request Body (JSON):**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "redirectUri": "https://app.example.com/callback"
}
```

**Request Body (Form):**

```http
email=user@example.com&password=password123&redirectUri=https://app.example.com/callback
```

**Success Response:** `302 Found`

Redirects to:

```text
https://app.example.com/callback?token=eyJhbGciOiJIUzI1NiIs...
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Invalid credentials"
}
```

---

### Verify Token

Verify SSO token validity and get user information.

**Endpoint:** `POST /sso/verify`

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response:** `200 OK`

```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

**Error Response:** `401 Unauthorized`

```json
{
  "error": "Invalid token"
}
```

---

### Get User Info

Get authenticated user information using token.

**Endpoint:** `GET /sso/userinfo`

**Headers:**

```http
Authorization: Bearer <sso_token>
```

**Success Response:** `200 OK`

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "username": "johndoe"
}
```

**Error Response:** `401 Unauthorized`

```json
{
  "error": "Missing or invalid authorization header"
}
```

---

### Logout

Logout from current SSO session.

**Endpoint:** `POST /sso/logout`

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "redirect_uri": "https://app.example.com"
}
```

**Success Response:** `302 Found` (redirect) or `200 OK` (JSON)

```json
{
  "message": "Logged out successfully"
}
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Invalid token"
}
```

---

### Logout All Sessions

Logout from all devices/sessions.

**Endpoint:** `POST /sso/logout-all`

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Success Response:** `200 OK`

```json
{
  "message": "Logged out from all devices"
}
```

---

## Data Models

### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  updatedAt: number;
}
```

### SSO Session

```typescript
interface SSOSession {
  sessionId: string;
  userId: string;
  token: string; // JWT
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  revokedAt: number | null;
}
```

### SSO Token Payload (JWT)

```typescript
interface SSOTokenPayload {
  sessionId: string;
  userId: string;
  email: string;
  username: string;
  iat: number; // issued at
  exp: number; // expires at
}
```

---

## SSO Integration Guide

### For Application Developers

#### Step 1: Redirect to SSO Login

```javascript
const redirectUri = "https://your-app.com/callback";
const ssoUrl = `https://sso.edgeauth.com/sso/login?redirect_uri=${encodeURIComponent(redirectUri)}`;

window.location.href = ssoUrl;
```

#### Step 2: Handle Callback

```javascript
// Extract token from URL
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (token) {
  // Verify token with SSO server
  const response = await fetch("https://sso.edgeauth.com/sso/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();

  if (data.valid) {
    // Store token and user info
    localStorage.setItem("sso_token", token);
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirect to app home
    window.location.href = "/dashboard";
  }
}
```

#### Step 3: Use Token for API Calls

```javascript
const token = localStorage.getItem("sso_token");

const response = await fetch("https://api.your-app.com/data", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

#### Step 4: Verify Token on Backend

```javascript
// Your application backend
app.get("/api/data", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  // Verify with SSO
  const ssoResponse = await fetch("https://sso.edgeauth.com/sso/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const ssoData = await ssoResponse.json();

  if (!ssoData.valid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Token is valid, user is authenticated
  const user = ssoData.user;

  // Return protected data
  res.json({ data: "protected data", user });
});
```

---

## Security

### Token Security

- SSO tokens are JWT signed with HS256
- Default expiration: 24 hours
- Tokens are validated on every request
- Sessions can be individually revoked

### Redirect URI Validation

- Only whitelisted redirect URIs are allowed
- Prevents open redirect vulnerabilities
- Configure allowed domains in production

### Password Security

- Passwords hashed using cryptographic algorithms
- Minimum 8 characters enforced
- Consider adding password strength requirements

---

## Examples

### Complete SSO Flow (cURL)

```bash
# 1. Register new user
curl -X POST http://localhost:8790/sso/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "username": "demo",
    "password": "password123",
    "redirectUri": "https://app.example.com/callback"
  }'

# 2. Login (get token)
curl -X POST http://localhost:8790/sso/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "password123",
    "redirectUri": "https://app.example.com/callback"
  }'
# Returns: 302 redirect to app with token parameter

# 3. Verify token
curl -X POST http://localhost:8790/sso/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGc..."
  }'

# 4. Get user info
curl -X GET http://localhost:8790/sso/userinfo \
  -H "Authorization: Bearer eyJhbGc..."

# 5. Logout
curl -X POST http://localhost:8790/sso/logout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGc..."
  }'
```

---

## Multi-Application SSO

SSO Worker supports multiple applications sharing the same authentication:

```
User logs in once → Redirected to App A with token
User visits App B → Redirected to SSO (already authenticated) → Immediately redirected back to App B with same token
```

This provides seamless single sign-on across all your applications.

---

## Database Schema

### Users Table (edgeauth-users)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### SSO Sessions Table (edgeauth-sso)

```sql
CREATE TABLE sso_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  revoked_at INTEGER
);
```
