/**
 * Logger Infrastructure
 * 
 * Provides unified logging interface for EdgeAuth.
 * Platform-specific logger is configured here.
 */
import { createLogger as createCloudflareLogger } from '@deepracticex/logger/cloudflare-workers';
import type { Logger, LoggerConfig } from '@deepracticex/logger/cloudflare-workers';

/**
 * Create logger instance for EdgeAuth
 * Uses Cloudflare Workers console adapter
 */
export function createLogger(config?: LoggerConfig): Logger {
  return createCloudflareLogger(config);
}

export type { Logger, LoggerConfig };
