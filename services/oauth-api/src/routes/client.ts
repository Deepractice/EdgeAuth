/**
 * OAuth Client Management Routes
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { OAuthService } from '@edge-auth/core';

const clientRoutes = new Hono<{ Bindings: Env }>();

/**
 * Create OAuth service instance
 */
function createOAuthService(env: Env): OAuthService {
  return new OAuthService({
    db: env.DB,
    jwtSecret: env.JWT_SECRET,
  });
}

/**
 * Register a new OAuth client
 * POST /clients
 */
clientRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, redirectUris, scopes, grantTypes } = body;

    const oauthService = createOAuthService(c.env);
    const client = await oauthService.registerClient({
      name,
      description,
      redirectUris,
      scopes,
      grantTypes: grantTypes || ['authorization_code', 'refresh_token'],
    });

    return c.json({
      id: client.id,
      secret: client.secret,
      name: client.name,
      description: client.description,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      grantTypes: client.grantTypes,
      createdAt: client.createdAt,
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: err.message,
      },
      400,
    );
  }
});

/**
 * List all OAuth clients
 * GET /clients
 */
clientRoutes.get('/', async (c) => {
  try {
    const oauthService = createOAuthService(c.env);
    const clients = await oauthService.listClients();

    return c.json({
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        description: client.description,
        redirectUris: client.redirectUris,
        scopes: client.scopes,
        grantTypes: client.grantTypes,
        createdAt: client.createdAt,
        // Don't expose secret
      })),
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'server_error',
        error_description: err.message,
      },
      500,
    );
  }
});

/**
 * Get OAuth client by ID
 * GET /clients/:id
 */
clientRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const oauthService = createOAuthService(c.env);
    const client = await oauthService.getClient(id);

    if (!client) {
      return c.json(
        {
          error: 'not_found',
          error_description: 'Client not found',
        },
        404,
      );
    }

    return c.json({
      id: client.id,
      name: client.name,
      description: client.description,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      grantTypes: client.grantTypes,
      createdAt: client.createdAt,
      // Don't expose secret
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'server_error',
        error_description: err.message,
      },
      500,
    );
  }
});

/**
 * Update OAuth client
 * PUT /clients/:id
 */
clientRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, redirectUris, scopes } = body;

    const oauthService = createOAuthService(c.env);
    const client = await oauthService.updateClient(id, {
      name,
      description,
      redirectUris,
      scopes,
    });

    return c.json({
      id: client.id,
      name: client.name,
      description: client.description,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      grantTypes: client.grantTypes,
      updatedAt: client.updatedAt,
    });
  } catch (err: any) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: err.message,
      },
      400,
    );
  }
});

/**
 * Delete OAuth client
 * DELETE /clients/:id
 */
clientRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const oauthService = createOAuthService(c.env);
    await oauthService.deleteClient(id);

    return c.json({ success: true });
  } catch (err: any) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: err.message,
      },
      400,
    );
  }
});

export default clientRoutes;
