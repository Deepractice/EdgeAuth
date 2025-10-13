# OAuth Worker API

The OAuth Worker implements OAuth 2.0 authorization server for third-party application integration.

**Base URL:** `http://localhost:8788` (dev) | `https://oauth.edgeauth.com` (prod)

**Database:** `edgeauth-oauth`

## OAuth 2.0 Flow Overview

EdgeAuth supports the Authorization Code Grant flow with PKCE (Proof Key for Code Exchange).

```
1. Client redirects user to /oauth/authorize
2. User authorizes the application
3. Server redirects back with authorization code
4. Client exchanges code for access token via /oauth/token
5. Client uses access token to access protected resources
```

## Endpoints

### Health Check

**Endpoint:** `GET /health`

**Response:**

```json
{
  "status": "ok",
  "service": "oauth-worker"
}
```

---

### Register OAuth Client

Register a new OAuth client application.

**Endpoint:** `POST /oauth/clients`

**Headers:**

```http
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**

```json
{
  "name": "My Application",
  "description": "Application description",
  "redirectUris": [
    "https://myapp.com/callback",
    "http://localhost:3000/callback"
  ],
  "scopes": ["read", "write"],
  "grantTypes": ["authorization_code", "refresh_token"]
}
```

**Success Response:** `201 Created`

```json
{
  "id": "client-uuid",
  "secret": "client-secret-abc123",
  "name": "My Application",
  "description": "Application description",
  "redirectUris": ["https://myapp.com/callback"],
  "scopes": ["read", "write"],
  "grantTypes": ["authorization_code", "refresh_token"],
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
```

**Important:** Save the `client_secret` - it cannot be retrieved later.

---

### Get OAuth Client

Retrieve OAuth client information.

**Endpoint:** `GET /oauth/clients/:clientId`

**Headers:**

```http
Authorization: Bearer <admin_jwt_token>
```

**Success Response:** `200 OK`

```json
{
  "id": "client-uuid",
  "name": "My Application",
  "description": "Application description",
  "redirectUris": ["https://myapp.com/callback"],
  "scopes": ["read", "write"],
  "grantTypes": ["authorization_code"],
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
```

**Note:** Client secret is never returned in GET requests.

---

### List OAuth Clients

List all registered OAuth clients.

**Endpoint:** `GET /oauth/clients`

**Headers:**

```http
Authorization: Bearer <admin_jwt_token>
```

**Success Response:** `200 OK`

```json
{
  "clients": [
    {
      "id": "client-uuid-1",
      "name": "App 1",
      "scopes": ["read"],
      "createdAt": 1234567890000
    },
    {
      "id": "client-uuid-2",
      "name": "App 2",
      "scopes": ["read", "write"],
      "createdAt": 1234567891000
    }
  ]
}
```

---

### Update OAuth Client

Update OAuth client configuration.

**Endpoint:** `PATCH /oauth/clients/:clientId`

**Headers:**

```http
Authorization: Bearer <admin_jwt_token>
```

**Request Body:**

```json
{
  "name": "Updated App Name",
  "redirectUris": ["https://newdomain.com/callback"],
  "scopes": ["read", "write", "admin"]
}
```

**Success Response:** `200 OK`

---

### Delete OAuth Client

Delete an OAuth client and revoke all its tokens.

**Endpoint:** `DELETE /oauth/clients/:clientId`

**Headers:**

```http
Authorization: Bearer <admin_jwt_token>
```

**Success Response:** `204 No Content`

---

### Authorization Endpoint

Initiate OAuth authorization flow.

**Endpoint:** `GET /oauth/authorize`

**Query Parameters:**

```
response_type=code          (required)
client_id=<client_id>       (required)
redirect_uri=<callback>     (required)
scope=read write            (optional, space-separated)
state=<random_string>       (recommended)
code_challenge=<challenge>  (required for PKCE)
code_challenge_method=S256  (required for PKCE)
```

**Example:**

```
GET /oauth/authorize?response_type=code&client_id=abc123&redirect_uri=https://app.com/callback&scope=read&state=xyz&code_challenge=E9Melhoa...&code_challenge_method=S256
```

**Flow:**

1. User is redirected to login (if not authenticated)
2. User sees authorization consent screen
3. User approves/denies access
4. Server redirects to `redirect_uri` with authorization code

**Success Redirect:**

```
https://app.com/callback?code=auth_code_xyz&state=xyz
```

**Error Redirect:**

```
https://app.com/callback?error=access_denied&error_description=User denied access
```

---

### Token Exchange Endpoint

Exchange authorization code for access token.

**Endpoint:** `POST /oauth/token`

**Request Body (Authorization Code Grant):**

```http
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<authorization_code>&
client_id=<client_id>&
client_secret=<client_secret>&
redirect_uri=<redirect_uri>&
code_verifier=<verifier>
```

**Success Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_xyz",
  "scope": "read write"
}
```

**Request Body (Refresh Token Grant):**

```http
grant_type=refresh_token&
refresh_token=<refresh_token>&
client_id=<client_id>&
client_secret=<client_secret>
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code expired"
}
```

---

### Token Revocation

Revoke an access or refresh token.

**Endpoint:** `POST /oauth/revoke`

**Request Body:**

```http
Content-Type: application/x-www-form-urlencoded

token=<token_to_revoke>&
client_id=<client_id>&
client_secret=<client_secret>
```

**Success Response:** `200 OK`

```json
{
  "revoked": true
}
```

---

## PKCE Flow

PKCE (Proof Key for Code Exchange) adds security for public clients.

### 1. Generate Code Verifier and Challenge

```javascript
// Generate code verifier (random string)
const codeVerifier = generateRandomString(128);

// Generate code challenge (SHA256 hash)
const codeChallenge = base64UrlEncode(sha256(codeVerifier));
```

### 2. Authorization Request

```
GET /oauth/authorize?
  response_type=code&
  client_id=abc123&
  redirect_uri=https://app.com/callback&
  code_challenge=E9Melhoa...&
  code_challenge_method=S256
```

### 3. Token Exchange

```http
POST /oauth/token

grant_type=authorization_code&
code=<authorization_code>&
client_id=abc123&
redirect_uri=https://app.com/callback&
code_verifier=<original_verifier>
```

---

## Data Models

### OAuth Client

```typescript
interface OAuthClient {
  id: string;
  secret: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: ("authorization_code" | "client_credentials" | "refresh_token")[];
  createdAt: number;
  updatedAt: number;
}
```

### Authorization Code

```typescript
interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge?: string;
  codeChallengeMethod?: "S256" | "plain";
  expiresAt: number;
  createdAt: number;
  used: boolean;
}
```

### Access Token

```typescript
interface AccessToken {
  token: string; // JWT
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: number;
  createdAt: number;
}
```

### Refresh Token

```typescript
interface RefreshToken {
  token: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: number;
  createdAt: number;
  revoked: boolean;
}
```

---

## Security Best Practices

1. **Always use PKCE** for public clients (mobile, SPA)
2. **Validate redirect URIs** strictly
3. **Use HTTPS** in production
4. **Store client secrets** securely
5. **Rotate refresh tokens** periodically
6. **Implement rate limiting** on token endpoint
7. **Use short-lived access tokens** (1 hour default)
8. **Validate state parameter** to prevent CSRF

---

## Error Codes

OAuth 2.0 standard error codes:

| Error                       | Description                               |
| --------------------------- | ----------------------------------------- |
| `invalid_request`           | Missing or invalid parameter              |
| `unauthorized_client`       | Client not authorized for this grant type |
| `access_denied`             | User denied authorization                 |
| `unsupported_response_type` | Server doesn't support response type      |
| `invalid_scope`             | Requested scope invalid or unknown        |
| `server_error`              | Internal server error                     |
| `invalid_grant`             | Authorization code invalid/expired        |
| `invalid_client`            | Client authentication failed              |

---

## Examples

### Complete Authorization Code Flow

```bash
# 1. Register OAuth client
curl -X POST http://localhost:8788/oauth/clients \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "redirectUris": ["http://localhost:3000/callback"],
    "scopes": ["read", "write"],
    "grantTypes": ["authorization_code", "refresh_token"]
  }'

# Save client_id and client_secret

# 2. Generate PKCE challenge
# code_verifier = random_string_128_chars
# code_challenge = base64url(sha256(code_verifier))

# 3. Redirect user to authorization endpoint
# Browser: GET /oauth/authorize?response_type=code&client_id=...&redirect_uri=...&code_challenge=...&code_challenge_method=S256

# 4. After user authorizes, exchange code for token
curl -X POST http://localhost:8788/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&redirect_uri=http://localhost:3000/callback&code_verifier=VERIFIER"

# 5. Use access token
curl -X GET http://localhost:8789/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"

# 6. Refresh token when expired
curl -X POST http://localhost:8788/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=REFRESH_TOKEN&client_id=CLIENT_ID&client_secret=CLIENT_SECRET"
```
