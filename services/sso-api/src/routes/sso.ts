/**
 * SSO Routes
 */

import { Hono } from 'hono';
import { errors } from '@deepracticex/error-handling';
import type { Env } from '../types';
import { SSOService } from '@edge-auth/core';

const app = new Hono<{ Bindings: Env }>();

/**
 * NOTE: GET /sso/login and GET /sso/register are handled by pages/sso-pages.ts
 * This ensures separation between API (JSON) and Pages (HTML)
 */

/**
 * SSO Registration Handler
 * POST /sso/register
 *
 * Supports both:
 * - application/json (API clients)
 * - application/x-www-form-urlencoded (HTML forms)
 */
app.post('/sso/register', async (c) => {
  try {
    // Parse request body based on content type
    const contentType = c.req.header('content-type') || '';
    let email: string;
    let username: string;
    let password: string;
    let redirectUri: string | undefined;

    if (contentType.includes('application/json')) {
      // API request
      const body = await c.req.json<{
        email: string;
        username: string;
        password: string;
        redirectUri?: string;
      }>();
      email = body.email;
      username = body.username;
      password = body.password;
      redirectUri = body.redirectUri;
    } else {
      // Form submission
      const formData = await c.req.parseBody();
      email = formData.email as string;
      username = formData.username as string;
      password = formData.password as string;
      redirectUri = formData.redirectUri as string | undefined;
    }

    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    // Register user
    const result = await ssoService.register({
      email,
      username,
      password,
      redirectUri,
    });

    // If redirect URI provided, redirect with token
    if (redirectUri && result.token) {
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('token', result.token);
      return c.redirect(redirectUrl.toString(), 302);
    }

    // Return JSON response for API clients
    return c.json(
      {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        createdAt: result.user.createdAt,
      },
      201,
    );
  } catch (error: any) {
    return c.json({ error: error.message }, error.status || 400);
  }
});

/**
 * SSO Login Handler
 * POST /sso/login
 *
 * Supports both:
 * - application/json (API clients)
 * - application/x-www-form-urlencoded (HTML forms)
 */
app.post('/sso/login', async (c) => {
  try {
    // Parse request body based on content type
    const contentType = c.req.header('content-type') || '';
    let email: string;
    let password: string;
    let redirectUri: string;

    if (contentType.includes('application/json')) {
      // API request
      const body = await c.req.json<{
        email: string;
        password: string;
        redirectUri: string;
      }>();
      email = body.email;
      password = body.password;
      redirectUri = body.redirectUri;
    } else {
      // Form submission
      const formData = await c.req.parseBody();
      email = formData.email as string;
      password = formData.password as string;
      redirectUri = formData.redirectUri as string;
    }

    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    // Login user
    const result = await ssoService.login({
      email,
      password,
      redirectUri,
    });

    // Redirect to application with token
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('token', result.token);

    return c.redirect(redirectUrl.toString(), 302);
  } catch (error: any) {
    return c.json({ error: error.message }, error.status || 400);
  }
});

/**
 * SSO Token Verification
 * POST /sso/verify
 */
app.post('/sso/verify', async (c) => {
  try {
    const body = await c.req.json<{ token: string }>();
    const { token } = body;

    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    // Verify token
    const verification = await ssoService.verifyToken(token);

    return c.json({
      valid: verification.valid,
      user: {
        id: verification.userId,
        email: verification.email,
        username: verification.username,
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

/**
 * SSO Logout
 * POST /sso/logout
 */
app.post('/sso/logout', async (c) => {
  try {
    const body = await c.req.json<{ token: string; redirect_uri?: string }>();
    const { token, redirect_uri } = body;

    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    // Logout
    await ssoService.logout(token);

    if (redirect_uri) {
      return c.redirect(redirect_uri, 302);
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, error.status || 400);
  }
});

/**
 * SSO Logout All Sessions
 * POST /sso/logout-all
 */
app.post('/sso/logout-all', async (c) => {
  try {
    const body = await c.req.json<{ token: string }>();
    const { token } = body;

    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    // Logout all
    await ssoService.logoutAll(token);

    return c.json({ message: 'Logged out from all devices' });
  } catch (error: any) {
    return c.json({ error: error.message }, error.status || 400);
  }
});

/**
 * Get User Info
 * GET /sso/userinfo
 */
app.get('/sso/userinfo', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    // Verify token
    const verification = await ssoService.verifyToken(token);

    return c.json({
      userId: verification.userId,
      email: verification.email,
      username: verification.username,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 401);
  }
});

export default app;
