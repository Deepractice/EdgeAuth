/**
 * Authentication routes
 */

import { Hono } from 'hono';
import { UserService, ValidationError, AuthError } from 'EdgeAuth-domain';
import { D1UserRepository, hashPassword, verifyPassword, generateToken, verifyToken, JWTError, DEFAULT_JWT_EXPIRATION } from 'EdgeAuth-core';
import type { Env, AuthResponse, UserResponse } from '../types.js';

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

    return c.json(response, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        },
        400,
      );
    }

    if (error instanceof AuthError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        400,
      );
    }

    console.error('Registration error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      500,
    );
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
      return c.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials',
          },
        },
        401,
      );
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

    return c.json(response);
  } catch (error) {
    if (error instanceof ValidationError) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        },
        400,
      );
    }

    if (error instanceof AuthError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: 'Invalid credentials',
          },
        },
        401,
      );
    }

    console.error('Login error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      500,
    );
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
      return c.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Missing or invalid authorization header',
          },
        },
        401,
      );
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    // Get user
    const userRepository = new D1UserRepository(c.env.DB);
    const userService = new UserService(userRepository);
    const user = await userService.getUserById(payload.sub);

    if (!user) {
      return c.json(
        {
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        404,
      );
    }

    const response: UserResponse = {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
    };

    return c.json(response);
  } catch (error) {
    if (error instanceof JWTError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        401,
      );
    }

    console.error('Get user error:', error);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      },
      500,
    );
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
