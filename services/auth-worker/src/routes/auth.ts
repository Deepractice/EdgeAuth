/**
 * Authentication routes
 */

import { Hono } from 'hono';
import { UserService } from 'edge-auth-domain';
import { D1UserRepository, hashPassword, verifyPassword, generateToken, verifyToken, DEFAULT_JWT_EXPIRATION } from 'edge-auth-core';
import { AppError, errors } from '@deepracticex/error-handling';
import { createLogger } from '@deepracticex/logger';
import type { Env, AuthResponse, UserResponse } from '../types.js';

const logger = createLogger({
  name: 'edge-auth-worker',
  level: 'info',
  console: true,
  colors: true,
});

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/register
 * Register a new user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<{
      email: string;
      username: string;
      password: string;
    }>();

    // Initialize services
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

    // Generate JWT token
    const token = await generateToken(user, {
      secret: c.env.JWT_SECRET,
      expiresIn: DEFAULT_JWT_EXPIRATION,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    };

    logger.info('User registered successfully', { userId: user.id, email: user.email });
    return c.json(response, 201);
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn('Registration failed', { code: error.code, message: error.message });
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('Registration error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * POST /auth/login
 * Login with email or username
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<{
      account: string;
      password: string;
    }>();

    // Initialize services
    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);

    // Authenticate user
    const userWithPassword = await userService.authenticate({
      account: body.account,
      password: body.password,
    });

    // Verify password
    const isValid = await verifyPassword(body.password, userWithPassword.passwordHash);

    if (!isValid) {
      throw errors.unauthorized('Invalid credentials');
    }

    // Generate JWT token
    const user = {
      id: userWithPassword.id,
      email: userWithPassword.email,
      username: userWithPassword.username,
      createdAt: userWithPassword.createdAt,
      updatedAt: userWithPassword.updatedAt,
    };

    const token = await generateToken(user, {
      secret: c.env.JWT_SECRET,
      expiresIn: DEFAULT_JWT_EXPIRATION,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    };

    logger.info('User logged in successfully', { userId: user.id });
    return c.json(response);
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn('Login failed', { code: error.code, message: error.message });
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('Login error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
auth.get('/me', async (c) => {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw errors.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    // Get user
    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);
    const user = await userService.getUserById(payload.sub);

    if (!user) {
      throw errors.notFound('User', payload.sub);
    }

    const response: UserResponse = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    };

    logger.debug('User info retrieved', { userId: user.id });
    return c.json(response);
  } catch (error) {
    if (AppError.isAppError(error)) {
      logger.warn('Get user failed', { code: error.code, message: error.message });
      return c.json(error.toJSON(), error.statusCode);
    }

    logger.error('Get user error', { error });
    return c.json(errors.internal('Internal server error').toJSON(), 500);
  }
});

/**
 * POST /auth/logout (optional, for future use)
 */
auth.post('/logout', async (c) => {
  // Since JWT is stateless, logout is handled client-side
  // This endpoint is for future features like token revocation
  return c.json({ success: true });
});

export default auth;
