/**
 * OAuth 2.0 Authorization and Token Routes
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { OAuthService, formatTokenResponse } from 'edge-auth-domain';
import {
  D1OAuthClientRepository,
  D1AuthorizationCodeRepository,
  D1TokenRepository,
  D1UserRepository,
} from 'edge-auth-core';
import { generateToken } from 'edge-auth-core';

const oauthRoutes = new Hono<{ Bindings: Env }>();

/**
 * Create OAuth service instance
 */
function createOAuthService(env: Env): OAuthService {
  const clientRepo = new D1OAuthClientRepository(env.DB);
  const authCodeRepo = new D1AuthorizationCodeRepository(env.DB);
  const tokenRepo = new D1TokenRepository(env.DB);

  return new OAuthService(clientRepo, authCodeRepo, tokenRepo, {
    jwtSecret: env.JWT_SECRET,
    tokenGenerator: { generateToken },
  });
}

/**
 * Authorization endpoint
 * GET /oauth/authorize
 *
 * Query params:
 * - client_id: OAuth client ID
 * - redirect_uri: Callback URI
 * - response_type: "code"
 * - scope: Space-separated scopes
 * - state: CSRF token
 * - code_challenge: PKCE challenge (optional)
 * - code_challenge_method: S256 or plain (optional)
 */
oauthRoutes.get('/authorize', async (c) => {
  try {
    const clientId = c.req.query('client_id');
    const redirectUri = c.req.query('redirect_uri');
    const responseType = c.req.query('response_type');
    const scope = c.req.query('scope');
    const state = c.req.query('state');
    const codeChallenge = c.req.query('code_challenge');
    const codeChallengeMethod = c.req.query('code_challenge_method') as
      | 'S256'
      | 'plain'
      | undefined;

    // Validate required parameters
    if (!clientId || !redirectUri || responseType !== 'code') {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing or invalid required parameters',
        },
        400,
      );
    }

    const oauthService = createOAuthService(c.env);
    const client = await oauthService.getClient(clientId);

    if (!client) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: 'Client not found',
        },
        401,
      );
    }

    // In a real implementation, this would:
    // 1. Show a consent page to the user
    // 2. User grants/denies permission
    // 3. If granted, create authorization code
    // 4. Redirect back to redirect_uri with code

    // For now, return JSON with instructions
    return c.json({
      message: 'Authorization endpoint',
      instructions:
        'In production, this would show a consent page. For testing, use the /oauth/authorize/grant endpoint with a userId.',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: state,
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'server_error',
        error_description: err.message,
      },
      500,
    );
  }
});

/**
 * Grant authorization (for testing)
 * POST /oauth/authorize/grant
 *
 * Body:
 * - client_id
 * - user_id
 * - redirect_uri
 * - scopes: array
 * - code_challenge (optional)
 * - code_challenge_method (optional)
 */
oauthRoutes.post('/authorize/grant', async (c) => {
  try {
    const body = await c.req.json();
    const { client_id, user_id, redirect_uri, scopes, code_challenge, code_challenge_method } =
      body;

    if (!client_id || !user_id || !redirect_uri || !scopes) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        },
        400,
      );
    }

    const oauthService = createOAuthService(c.env);
    const client = await oauthService.getClient(client_id);

    if (!client) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: 'Client not found',
        },
        401,
      );
    }

    const authCode = await oauthService.createAuthorizationCode(
      {
        clientId: client_id,
        userId: user_id,
        redirectUri: redirect_uri,
        scopes: scopes,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
      },
      client,
    );

    return c.json({
      code: authCode.code,
      redirect_uri: redirect_uri,
      expires_in: Math.floor((authCode.expiresAt - Date.now()) / 1000),
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: err.message,
      },
      400,
    );
  }
});

/**
 * Token endpoint
 * POST /oauth/token
 *
 * Body (application/x-www-form-urlencoded):
 * For authorization_code grant:
 * - grant_type: "authorization_code"
 * - code: authorization code
 * - redirect_uri: must match
 * - client_id
 * - client_secret
 * - code_verifier (if PKCE used)
 *
 * For refresh_token grant:
 * - grant_type: "refresh_token"
 * - refresh_token
 * - client_id
 * - client_secret
 */
oauthRoutes.post('/token', async (c) => {
  try {
    // Parse form data
    const body = await c.req.parseBody();
    const grantType = body.grant_type as string;
    const clientId = body.client_id as string;
    const clientSecret = body.client_secret as string;

    if (!grantType || !clientId || !clientSecret) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        },
        400,
      );
    }

    const oauthService = createOAuthService(c.env);

    if (grantType === 'authorization_code') {
      const code = body.code as string;
      const redirectUri = body.redirect_uri as string;
      const codeVerifier = body.code_verifier as string | undefined;

      if (!code || !redirectUri) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: 'Missing code or redirect_uri',
          },
          400,
        );
      }

      const tokens = await oauthService.exchangeAuthorizationCode({
        code,
        clientId,
        clientSecret,
        redirectUri,
        codeVerifier,
      });

      return c.json(formatTokenResponse(tokens.accessToken, tokens.refreshToken));
    } else if (grantType === 'refresh_token') {
      const refreshToken = body.refresh_token as string;

      if (!refreshToken) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: 'Missing refresh_token',
          },
          400,
        );
      }

      const result = await oauthService.refreshAccessToken({
        refreshToken,
        clientId,
        clientSecret,
      });

      return c.json(formatTokenResponse(result.accessToken));
    } else {
      return c.json(
        {
          error: 'unsupported_grant_type',
          error_description: `Grant type ${grantType} is not supported`,
        },
        400,
      );
    }
  } catch (err: any) {
    // Map domain errors to OAuth error responses
    if (err.message.includes('Invalid client') || err.message.includes('credentials')) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: err.message,
        },
        401,
      );
    }

    if (
      err.message.includes('Invalid or expired') ||
      err.message.includes('expired') ||
      err.message.includes('revoked')
    ) {
      return c.json(
        {
          error: 'invalid_grant',
          error_description: err.message,
        },
        400,
      );
    }

    return c.json(
      {
        error: 'invalid_request',
        error_description: err.message,
      },
      400,
    );
  }
});

/**
 * Token revocation endpoint
 * POST /oauth/revoke
 *
 * Body:
 * - token: refresh token to revoke
 * - client_id
 * - client_secret
 */
oauthRoutes.post('/revoke', async (c) => {
  try {
    const body = await c.req.parseBody();
    const token = body.token as string;
    const clientId = body.client_id as string;
    const clientSecret = body.client_secret as string;

    if (!token || !clientId || !clientSecret) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Missing required parameters',
        },
        400,
      );
    }

    // Verify client credentials
    const oauthService = createOAuthService(c.env);
    const client = await oauthService.getClient(clientId);

    if (!client || client.secret !== clientSecret) {
      return c.json(
        {
          error: 'invalid_client',
          error_description: 'Invalid client credentials',
        },
        401,
      );
    }

    await oauthService.revokeRefreshToken(token);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: err.message,
      },
      400,
    );
  }
});

export default oauthRoutes;
