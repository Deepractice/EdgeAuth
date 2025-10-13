#!/usr/bin/env node

/**
 * EdgeAuth Local Development Setup Script
 *
 * This script sets up local development environment using Wrangler's local mode
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Helper functions
function log(message, color = colors.blue) {
  console.log(`${color}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || ROOT_DIR,
      ...options,
    });
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

// Check required tools
function checkRequirements() {
  logInfo('Checking requirements...');

  try {
    execCommand('wrangler --version', { silent: true });
  } catch {
    logError('wrangler not found. Install it with: npm install -g wrangler');
    process.exit(1);
  }

  logSuccess('All requirements met');
}

// Setup local database with migrations using Cloudflare's native system
function setupLocalDatabase() {
  logInfo('Setting up local D1 database...');

  try {
    // Use Cloudflare's native migration system
    logInfo('Applying migrations using wrangler migrations...');
    execCommand('wrangler d1 migrations apply edgeauth-db --local');
    logSuccess('All migrations applied successfully');
  } catch (error) {
    logWarn('Some migrations may have already been applied');
  }

  logSuccess('Local database configured');
}

// Create .dev.vars files
function createDevVars() {
  logInfo('Setting up .dev.vars files...');

  const services = [
    {
      name: 'admin-api',
      content: `JWT_SECRET=dev-secret-key-for-local-development-only
`,
    },
    {
      name: 'account-api',
      content: `JWT_SECRET=dev-secret-key-for-local-development-only
PLUNK_API_KEY=dev-plunk-api-key
EMAIL_FROM=noreply@localhost.test
EMAIL_FROM_NAME=EdgeAuth Local
BASE_URL=http://localhost:8787
`,
    },
    {
      name: 'sso-api',
      content: `JWT_SECRET=dev-secret-key-for-local-development-only
`,
    },
    {
      name: 'oauth-api',
      content: `JWT_SECRET=dev-secret-key-for-local-development-only
`,
    },
  ];

  for (const service of services) {
    const filePath = join(ROOT_DIR, 'services', service.name, '.dev.vars');

    if (existsSync(filePath)) {
      logWarn(`.dev.vars already exists for ${service.name}`);
    } else {
      writeFileSync(filePath, service.content, 'utf-8');
      logSuccess(`Created services/${service.name}/.dev.vars`);
    }
  }
}

// Main setup flow
async function main() {
  console.log('');
  console.log('======================================');
  console.log('  EdgeAuth Local Setup');
  console.log('======================================');
  console.log('');

  // Check if we're in the right directory
  if (!existsSync(join(ROOT_DIR, 'package.json')) || !existsSync(join(ROOT_DIR, 'services'))) {
    logError('Please run this script from the EdgeAuth root directory');
    process.exit(1);
  }

  try {
    checkRequirements();
    console.log('');

    // Install dependencies
    logInfo('Installing dependencies...');
    execCommand('pnpm install');
    logSuccess('Dependencies installed');
    console.log('');

    // Build packages
    logInfo('Building packages...');
    execCommand('pnpm build');
    logSuccess('Build completed');
    console.log('');

    // Setup local database
    setupLocalDatabase();
    console.log('');

    // Create .dev.vars files
    createDevVars();
    console.log('');

    logSuccess('Local development environment ready!');
    console.log('');
    logInfo('Next steps:');
    console.log('  1. Start a worker locally:');
    console.log('     cd services/account-api && wrangler dev');
    console.log('');
    console.log('  2. Run tests:');
    console.log('     pnpm test');
    console.log('');
    console.log('  3. Local database location:');
    console.log('     .wrangler/state/v3/d1/');
    console.log('');
  } catch (error) {
    console.error('');
    logError('Setup failed!');
    logError(error.message);
    process.exit(1);
  }
}

// Run main function
main();
