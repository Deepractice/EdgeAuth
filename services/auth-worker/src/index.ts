/**
 * EdgeAuth Cloudflare Worker
 *
 * Main entry point for the authentication service
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types.js';
import auth from './routes/auth.js';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(
  '/*',
  cors({
    origin: '*', // Configure allowed origins in production
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  }),
);

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    service: 'EdgeAuth',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Mount auth routes
app.route('/auth', auth);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
      },
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    500,
  );
});

export default app;
