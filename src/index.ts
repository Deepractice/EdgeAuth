/**
 * EdgeAuth - Open-source authentication service
 *
 * Main entry point for EdgeAuth library
 */

// Application Services - Public API
export * from './application/index.js';

// Types that API layer needs
export type { User } from './domain/user/types.js';

// Infrastructure utilities (for middleware, etc.)
export { verifyToken, generateToken } from './infrastructure/jwt/index.js';
export { hashPassword, verifyPassword } from './infrastructure/crypto/index.js';

// Logger infrastructure
export { createLogger } from './infrastructure/logger/index.js';
export type { Logger, LoggerConfig } from './infrastructure/logger/index.js';
