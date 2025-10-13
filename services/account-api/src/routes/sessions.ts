import { Hono } from "hono";
import { verifyToken, SSOService } from "@edge-auth/core";
import { AppError, errors } from "@deepracticex/error-handling";
import { createLogger } from "@edge-auth/core";
import type { Env } from "../types.js";

const logger = createLogger({
  name: "edge-auth-sessions-api",
  level: "info",
  console: true,
  colors: true,
  environment: "cloudflare-workers",
});

const sessions = new Hono<{ Bindings: Env }>();

/**
 * Helper function to verify JWT and extract user ID
 */
async function authenticateRequest(
  authHeader: string | undefined,
  jwtSecret: string,
): Promise<string> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw errors.unauthorized("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = await verifyToken(token, jwtSecret);

  if (!payload.sub) {
    throw errors.unauthorized("Invalid token payload");
  }

  return payload.sub;
}

/**
 * GET /sessions
 * Get active sessions for current user (from JWT)
 */
sessions.get("/sessions", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await authenticateRequest(authHeader, c.env.JWT_SECRET);

    // Get active sessions using SSOService
    const ssoService = new SSOService({ db: c.env.DB });
    const activeSessions = await ssoService.getActiveSessions(userId);

    logger.info("Retrieved active sessions", {
      userId,
      count: activeSessions.length,
    });

    return c.json({
      sessions: activeSessions.map((session) => ({
        session_id: session.sessionId,
        created_at: session.createdAt,
        last_accessed_at: session.lastAccessedAt,
        expires_at: session.expiresAt,
      })),
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Failed to retrieve sessions", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Sessions retrieval error", { error });
    return c.json(
      errors.internal("Internal server error").toJSON(),
      500 as any,
    );
  }
});

/**
 * DELETE /sessions/:id
 * Logout specific session
 */
sessions.delete("/sessions/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await authenticateRequest(authHeader, c.env.JWT_SECRET);
    const sessionId = c.params.id;

    if (!sessionId) {
      throw errors.badRequest("Session ID is required");
    }

    // Logout from specific session
    const ssoService = new SSOService({ db: c.env.DB });
    await ssoService.logout(sessionId);

    logger.info("Session logged out", {
      userId,
      sessionId,
    });

    return c.json({
      success: true,
      message: "Session logged out successfully",
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Failed to logout session", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Session logout error", { error });
    return c.json(
      errors.internal("Internal server error").toJSON(),
      500 as any,
    );
  }
});

/**
 * DELETE /sessions
 * Logout all other sessions (keep current)
 */
sessions.delete("/sessions", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await authenticateRequest(authHeader, c.env.JWT_SECRET);

    // Logout from all sessions
    const ssoService = new SSOService({ db: c.env.DB });
    await ssoService.logoutAll(userId);

    logger.info("All sessions logged out", {
      userId,
    });

    return c.json({
      success: true,
      message: "All other sessions logged out successfully",
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Failed to logout all sessions", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Logout all error", { error });
    return c.json(
      errors.internal("Internal server error").toJSON(),
      500 as any,
    );
  }
});

export default sessions;
