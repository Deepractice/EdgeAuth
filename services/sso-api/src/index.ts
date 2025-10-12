import { Hono } from "hono";
import { Env } from "./types";
import ssoRoutes from "./routes/sso";
import ssoPages from "./pages/sso-pages";

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "sso-worker" });
});

// Mount SSO Pages (HTML views) - Must be before API routes to handle GET /sso/login
app.route("/", ssoPages);

// Mount SSO API Routes (JSON responses)
app.route("/", ssoRoutes);

export default app;
