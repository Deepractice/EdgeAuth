/**
 * EdgeAuth OAuth 2.0 Provider
 *
 * Provides OAuth 2.0 authentication services for third-party applications
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import type { Env } from "./types";
import clientRoutes from "./routes/client";
import oauthRoutes from "./routes/oauth";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", honoLogger());
app.use("*", cors());

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "oauth-worker",
    timestamp: new Date().toISOString(),
  });
});

// OAuth 2.0 endpoints
app.route("/oauth", oauthRoutes);

// Client management endpoints
app.route("/clients", clientRoutes);

// Error handling
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "internal_server_error",
      error_description: "An unexpected error occurred",
    },
    500,
  );
});

export default app;
