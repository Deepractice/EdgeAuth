import { Hono } from "hono";
import { AccountService, NoMailSender } from "@edge-auth/core";
import { AppError, errors } from "@deepracticex/error-handling";
import { createLogger } from "@edge-auth/core";
import type { Env } from "../types.js";

const logger = createLogger({
  name: "edge-auth-account-api",
  level: "info",
  console: true,
  colors: true,
  environment: "cloudflare-workers", // Force edge runtime logger
});

const account = new Hono<{ Bindings: Env }>();

/**
 * POST /register
 * User self-registration with email verification
 */
account.post("/register", async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      username: string;
      password: string;
    }>();

    // Use NoMailSender for local dev if PLUNK_API_KEY is not set
    const mailSender =
      !c.env.PLUNK_API_KEY || c.env.PLUNK_API_KEY.startsWith("dev-")
        ? new NoMailSender()
        : undefined; // Use default PlunkSender

    const accountService = new AccountService({
      db: c.env.DB,
      jwtSecret: c.env.JWT_SECRET,
      plunkApiKey: c.env.PLUNK_API_KEY || "not-used",
      emailFrom: c.env.EMAIL_FROM,
      emailFromName: c.env.EMAIL_FROM_NAME,
      baseUrl: c.env.BASE_URL,
      mailSender,
    });

    const result = await accountService.register({
      email: body.email,
      username: body.username,
      password: body.password,
    });

    return c.json(result, 201);
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Registration failed", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Registration error", { error });
    return c.json(
      errors.internal("Internal server error").toJSON(),
      500 as any,
    );
  }
});

/**
 * GET /verify-email?token=xxx
 * Verify user's email address
 */
account.get("/verify-email", async (c) => {
  try {
    const token = c.req.query("token");

    if (!token) {
      throw errors.validation("Verification token is required");
    }

    // Use NoMailSender for local dev if PLUNK_API_KEY is not set
    const mailSender =
      !c.env.PLUNK_API_KEY || c.env.PLUNK_API_KEY.startsWith("dev-")
        ? new NoMailSender()
        : undefined;

    const accountService = new AccountService({
      db: c.env.DB,
      jwtSecret: c.env.JWT_SECRET,
      plunkApiKey: c.env.PLUNK_API_KEY || "not-used",
      emailFrom: c.env.EMAIL_FROM,
      emailFromName: c.env.EMAIL_FROM_NAME,
      baseUrl: c.env.BASE_URL,
      mailSender,
    });

    const result = await accountService.verifyEmail(token);

    return c.json(result);
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn("Email verification failed", {
        code: error.code,
        message: error.message,
      });
      return c.json(error.toJSON(), error.statusCode as any);
    }

    logger.error("Email verification error", { error });
    return c.json(
      errors.internal("Internal server error").toJSON(),
      500 as any,
    );
  }
});

// TODO: Implement other routes:
// POST   /forgot-password
// POST   /reset-password
// GET    /profile (requires JWT)
// PATCH  /profile (requires JWT)
// PATCH  /change-password (requires JWT)
// DELETE /account (requires JWT)

export default account;
