/**
 * SSO Page Routes
 *
 * Handles HTML page rendering for SSO flows
 * IMPORTANT: This layer is separate from API routes
 * - API routes (routes/sso.ts) return JSON
 * - Page routes (this file) return HTML
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import {
  render,
  loginTemplate,
  registerTemplate,
  errorTemplate,
} from "../views/index.js";
import { SSOService } from "@edge-auth/core";

const app = new Hono<{ Bindings: Env }>();

/**
 * SSO Login Page
 * GET /sso/login?redirect_uri=...
 *
 * Renders HTML login form
 * If user already has valid session, redirects immediately
 */
app.get("/sso/login", async (c) => {
  const redirectUri = c.req.query("redirect_uri");

  // Validate redirect_uri
  if (!redirectUri) {
    return c.html(
      render(errorTemplate, {
        error: "Invalid Request",
        message: "redirect_uri parameter is required",
      }),
      400,
    );
  }

  // Initialize SSO service
  const ssoService = new SSOService({
    db: c.env.DB,
    ssoDb: c.env.SSO_DB,
    jwtSecret: c.env.JWT_SECRET,
  });

  // Validate redirect URI
  try {
    await ssoService.validateRedirectUri(redirectUri);
  } catch (error: any) {
    return c.html(
      render(errorTemplate, {
        error: "Invalid Redirect URI",
        message: error.message,
      }),
      400,
    );
  }

  // Check if user already has valid session
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    try {
      // Verify existing token
      await ssoService.verifyToken(token);

      // Redirect with existing token
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set("token", token);

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
app.get("/sso/register", async (c) => {
  const redirectUri = c.req.query("redirect_uri");

  // Validate redirect_uri if provided
  if (redirectUri) {
    // Initialize SSO service
    const ssoService = new SSOService({
      db: c.env.DB,
      ssoDb: c.env.SSO_DB,
      jwtSecret: c.env.JWT_SECRET,
    });

    try {
      await ssoService.validateRedirectUri(redirectUri);
    } catch (error: any) {
      return c.html(
        render(errorTemplate, {
          error: "Invalid Redirect URI",
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
