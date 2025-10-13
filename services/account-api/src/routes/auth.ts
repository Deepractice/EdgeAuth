import { Hono } from "hono";
import {
  verifyPassword,
  generateToken,
  verifyToken,
  SSOService,
} from "@edge-auth/core";
import { AppError, errors } from "@deepracticex/error-handling";
import { createLogger } from "@edge-auth/core";
import type { Env } from "../types.js";

const logger = createLogger({
  name: "edge-auth-auth-api",
  level: "info",
  console: true,
  colors: true,
  environment: "cloudflare-workers",
});

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/login
 * User login with email/username and password
 */
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json<{
      account: string; // email or username
      password: string;
    }>();

    // Find user by email or username
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
    )
      .bind(body.account.toLowerCase(), body.account)
      .first<any>();

    if (!user) {
      throw errors.unauthorized("Invalid credentials");
    }

    // Check if email is verified (skip check in local dev environment)
    const isLocalDev =
      !c.env.PLUNK_API_KEY || c.env.PLUNK_API_KEY.startsWith("dev-");
    if (!user.email_verified && !isLocalDev) {
      throw errors.unauthorized("Please verify your email before logging in");
    }

    // Verify password
    const isValid = await verifyPassword(body.password, user.password_hash);
    if (!isValid) {
      throw errors.unauthorized("Invalid credentials");
    }

    // Create user object
    const userObj = {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.email_verified === 1,
      emailVerifiedAt: user.email_verified_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    // Generate JWT token first (without sessionId)
    const tempToken = await generateToken(userObj, {
      secret: c.env.JWT_SECRET,
      expiresIn: 86400, // 24 hours
    });

    // Create SSO session
    const ssoService = new SSOService({ db: c.env.DB });
    const session = await ssoService.createSession({
      userId: user.id,
      token: tempToken,
      expiresIn: 86400,
    });

    // Regenerate JWT token with sessionId
    const token = await generateToken(
      userObj,
      {
        secret: c.env.JWT_SECRET,
        expiresIn: 86400, // 24 hours
      },
      session.sessionId,
    );

    // Update session with new token
    await c.env.DB.prepare(
      "UPDATE sso_sessions SET token = ? WHERE session_id = ?",
    )
      .bind(token, session.sessionId)
      .run();

    logger.info("User logged in", {
      userId: user.id,
      email: user.email,
      sessionId: session.sessionId,
    });

    return c.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Login failed", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Login error", { error });
    return c.json(
      errors.internal("Internal server error").toJSON(),
      500 as any,
    );
  }
});

/**
 * GET /auth/me
 * Get current user info from JWT token
 */
auth.get("/me", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw errors.unauthorized("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    // Get user from database
    const user = await c.env.DB.prepare(
      "SELECT id, email, username, email_verified, created_at FROM users WHERE id = ?",
    )
      .bind(payload.sub)
      .first<any>();

    if (!user) {
      throw errors.unauthorized("User not found");
    }

    return c.json({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Token verification failed", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Token verification error", { error });
    return c.json(errors.unauthorized("Invalid token").toJSON(), 401 as any);
  }
});

export default auth;
