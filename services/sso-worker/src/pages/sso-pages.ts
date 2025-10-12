/**
 * SSO Page Routes
 *
 * Handles HTML page rendering for SSO flows
 * IMPORTANT: This layer is separate from API routes
 * - API routes (routes/sso.ts) return JSON
 * - Page routes (this file) return HTML
 */

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { render, loginTemplate, registerTemplate, errorTemplate } from '../views/index.js';
import { validateSSORedirectUri } from 'edge-auth-domain';
import { verifyToken as verifyJWT } from 'edge-auth-core';
import { D1SSOSessionRepository } from 'edge-auth-core';
import { SSOService, type SSOTokenPayload } from 'edge-auth-domain';

const app = new Hono<{ Bindings: Env }>();

/**
 * SSO Login Page
 * GET /sso/login?redirect_uri=...
 *
 * Renders HTML login form
 * If user already has valid session, redirects immediately
 */
app.get('/sso/login', async (c) => {
  const redirectUri = c.req.query('redirect_uri');

  // Validate redirect_uri
  if (!redirectUri) {
    return c.html(
      render(errorTemplate, {
        error: 'Invalid Request',
        message: 'redirect_uri parameter is required',
      }),
      400,
    );
  }

  try {
    validateSSORedirectUri(redirectUri);
  } catch (error: any) {
    return c.html(
      render(errorTemplate, {
        error: 'Invalid Redirect URI',
        message: error.message,
      }),
      400,
    );
  }

  // Check if user already has valid session
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    try {
      // Verify existing token
      const payload = await verifyJWT(token, c.env.JWT_SECRET);
      const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
      const ssoService = new SSOService(sessionRepo);

      // Check if session is still valid
      await ssoService.verifyToken(token, payload as unknown as SSOTokenPayload);

      // Redirect with existing token
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('token', token);

      return c.redirect(redirectUrl.toString(), 302);
    } catch {
      // Invalid/expired token, continue to login page
    }
  }

  // Render login page
  return c.html(
    render(loginTemplate, {
      redirectUri,
    }),
  );
});

/**
 * SSO Registration Page
 * GET /sso/register?redirect_uri=...
 *
 * Renders HTML registration form
 * Optional redirect_uri parameter for auto-login after registration
 */
app.get('/sso/register', async (c) => {
  const redirectUri = c.req.query('redirect_uri');

  // Validate redirect_uri if provided
  if (redirectUri) {
    try {
      validateSSORedirectUri(redirectUri);
    } catch (error: any) {
      return c.html(
        render(errorTemplate, {
          error: 'Invalid Redirect URI',
          message: error.message,
        }),
        400,
      );
    }
  }

  // Render registration page
  return c.html(
    render(registerTemplate, {
      redirectUri,
    }),
  );
});

export default app;
