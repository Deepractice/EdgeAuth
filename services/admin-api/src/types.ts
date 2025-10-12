/**
 * Cloudflare Worker environment types
 */

/**
 * Worker environment bindings
 */
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

/**
 * API Response types
 */
export interface SuccessResponse<T = unknown> {
  data: T;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Auth response types
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    createdAt: number;
  };
}

export interface UserResponse {
  user: {
    id: string;
    email: string;
    username: string;
    createdAt: number;
  };
}
