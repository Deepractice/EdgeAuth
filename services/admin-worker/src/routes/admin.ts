/**
 * Admin Management Routes
 *
 * User management APIs for administrators
 */

import { Hono } from 'hono';
import { UserService } from 'edge-auth-domain';
import { D1UserRepository, hashPassword, verifyToken } from 'edge-auth-core';
import { AppError, errors } from '@deepracticex/error-handling';
import { createLogger } from '@deepracticex/logger';
import type { Env } from '../types.js';

const logger = createLogger({
  name: 'edge-auth-admin-worker',
  level: 'info',
  console: true,
  colors: true,
});

const admin = new Hono<{ Bindings: Env }>();

/**
 * Admin authentication middleware
 * Verifies JWT token from Authorization header
 */
const requireAdmin = async (c: any, next: () => Promise<void>) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    // Store user info in context
    c.set('userId', payload.sub);
    c.set('userEmail', payload.email);

    await next();
  } catch (error) {
    if (AppError.isAppError(error)) {
      return c.json(error.toJSON(), error.statusCode);
    }
    return c.json(errors.unauthorized('Invalid token').toJSON(), 401);
  }
};

/**
 * POST /admin/users
 * Create a new user (admin only)
 */
admin.post('/users', requireAdmin, async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      username: string;
      password: string;
    }>();

    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Register user
    const user = await userService.register(
      {
        email: body.email,
        username: body.username,
        password: body.password,
      },
      passwordHash,
    );

    logger.info('User created by admin', {
      userId: user.id,
      email: user.email,
      createdBy: c.get('userEmail'),
    });

    return c.json(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      201,
    );
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn('User creation failed', { code: error.code, message: error.message });
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('User creation error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * GET /admin/users
 * List all users (admin only)
 */
admin.get('/users', requireAdmin, async (c) => {
  try {
    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);

    const users = await userService.listUsers();

    logger.debug('Users listed', { count: users.length, by: c.get('userEmail') });

    return c.json({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      total: users.length,
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('List users error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * GET /admin/users/:id
 * Get user by ID (admin only)
 */
admin.get('/users/:id', requireAdmin, async (c) => {
  try {
    const userId = c.req.param('id');

    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);

    const user = await userService.getUserById(userId);

    if (!user) {
      throw errors.notFound('User', userId);
    }

    logger.debug('User retrieved', { userId, by: c.get('userEmail') });

    return c.json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('Get user error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * PATCH /admin/users/:id
 * Update user (admin only)
 */
admin.patch('/users/:id', requireAdmin, async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json<{
      email?: string;
      username?: string;
      password?: string;
    }>();

    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);

    // Check user exists
    const existingUser = await userService.getUserById(userId);
    if (!existingUser) {
      throw errors.notFound('User', userId);
    }

    // Update user
    const updateData: any = {};
    if (body.email) updateData.email = body.email;
    if (body.username) updateData.username = body.username;
    if (body.password) {
      updateData.passwordHash = await hashPassword(body.password);
    }

    const updatedUser = await userService.updateUser(userId, updateData);

    logger.info('User updated', {
      userId,
      updatedBy: c.get('userEmail'),
      fields: Object.keys(updateData),
    });

    return c.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn('User update failed', { code: error.code, message: error.message });
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('User update error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * DELETE /admin/users/:id
 * Delete user (admin only)
 */
admin.delete('/users/:id', requireAdmin, async (c) => {
  try {
    const userId = c.req.param('id');

    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);

    // Check user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      throw errors.notFound('User', userId);
    }

    await userService.deleteUser(userId);

    logger.info('User deleted', {
      userId,
      email: user.email,
      deletedBy: c.get('userEmail'),
    });

    return c.json({ message: 'User deleted successfully' }, 200);
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn('User deletion failed', { code: error.code, message: error.message });
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('User deletion error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

export default admin;
