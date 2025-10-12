/**
 * SSO Routes
 */

import { Hono } from 'hono';
import { errors } from '@deepracticex/error-handling';
import type { Env } from '../types';
import {
  UserService,
  SSOService,
  type SSOLoginRequest,
  type SSOTokenPayload,
  validateSSORedirectUri,
  validateSSOToken,
} from 'edge-auth-domain';
import { D1UserRepository, D1SSOSessionRepository, hashPassword, verifyPassword, generateToken, verifyToken as verifyJWT } from 'edge-auth-core';

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

    // Validate redirect URI if provided
    if (redirectUri) {
      validateSSORedirectUri(redirectUri);
    }

    // Initialize services
    const userRepo = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepo);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await userService.createUser({
      email,
      username,
      passwordHash,
    });

    // If redirect URI provided, auto-login and redirect
    if (redirectUri) {
      const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
      const ssoService = new SSOService(sessionRepo);

      // Generate SSO token
      const token = await generateToken(user, {
        secret: c.env.JWT_SECRET,
        expiresIn: 86400, // 24 hours
      });

      // Create SSO session
      await ssoService.handleLogin(
        { email, password, redirectUri },
        { ...user, passwordHash },
        token,
      );

      // Redirect with token
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('token', token);
      return c.redirect(redirectUrl.toString(), 302);
    }

    // Return JSON response for API clients
    return c.json(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
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
      const body = await c.req.json<SSOLoginRequest>();
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

    // Validate
    validateSSORedirectUri(redirectUri);

    // Initialize services
    const userRepo = new D1UserRepository(c.env.DB);
    const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
    const userService = new UserService(userRepo);
    const ssoService = new SSOService(sessionRepo);

    // Authenticate user
    const userWithPassword = await userService.authenticate({
      account: email,
      password,
    });

    // Verify password
    const isValid = await verifyPassword(password, userWithPassword.passwordHash);
    if (!isValid) {
      throw errors.unauthorized('Invalid credentials');
    }

    // Generate SSO token (JWT)
    const token = await generateToken(userWithPassword, {
      secret: c.env.JWT_SECRET,
      expiresIn: 86400, // 24 hours
    });

    // Create SSO session
    const result = await ssoService.handleLogin(
      { email, password, redirectUri },
      userWithPassword,
      token,
    );

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

    validateSSOToken(token);

    // Verify JWT
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    // Verify session
    const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
    const ssoService = new SSOService(sessionRepo);

    const verification = await ssoService.verifyToken(token, payload as unknown as SSOTokenPayload);

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

    validateSSOToken(token);

    // Verify and decode token
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    // Logout
    const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
    const ssoService = new SSOService(sessionRepo);

    await ssoService.logout((payload as unknown as SSOTokenPayload).sessionId);

    if (redirect_uri) {
      validateSSORedirectUri(redirect_uri);
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

    validateSSOToken(token);

    // Verify token
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    // Logout all
    const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
    const ssoService = new SSOService(sessionRepo);

    await ssoService.logoutAll((payload as unknown as SSOTokenPayload).userId);

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
    validateSSOToken(token);

    // Verify JWT
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    // Verify session
    const sessionRepo = new D1SSOSessionRepository(c.env.SSO_DB);
    const ssoService = new SSOService(sessionRepo);

    const verification = await ssoService.verifyToken(token, payload as unknown as SSOTokenPayload);

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
