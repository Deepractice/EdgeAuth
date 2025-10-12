#!/usr/bin/env node

/**
 * EdgeAuth Production Deployment Script
 *
 * This script handles:
 * 1. D1 database creation
 * 2. Database ID configuration
 * 3. Migration execution
 * 4. Worker deployment
 */

import { execSync, exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

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
      cwd: ROOT_DIR,
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
async function checkRequirements() {
  logInfo('Checking requirements...');

  // Check wrangler
  try {
    execCommand('wrangler --version', { silent: true });
  } catch {
    logError('wrangler not found. Install it with: npm install -g wrangler');
    process.exit(1);
  }

  // Check if we can parse JSON (native in Node.js, no need for jq)
  logSuccess('All requirements met');
}

// Get list of D1 databases
async function listDatabases() {
  try {
    const output = execCommand('wrangler d1 list --json', { silent: true });
    return JSON.parse(output);
  } catch (error) {
    return [];
  }
}

// Create D1 databases
async function createDatabases() {
  logInfo('Creating D1 databases...');

  const databases = await listDatabases();
  const dbIds = {};

  // Create or get users database
  const usersDb = databases.find((db) => db.name === 'edgeauth-users');
  if (usersDb) {
    logWarn("Database 'edgeauth-users' already exists, skipping creation");
    dbIds.users = usersDb.uuid;
  } else {
    logInfo('Creating edgeauth-users database...');
    const output = execCommand('wrangler d1 create edgeauth-users --json', {
      silent: true,
    });
    dbIds.users = JSON.parse(output).uuid;
    logSuccess(`Created edgeauth-users (ID: ${dbIds.users})`);
  }

  // Create or get SSO database
  const ssoDb = databases.find((db) => db.name === 'edgeauth-sso');
  if (ssoDb) {
    logWarn("Database 'edgeauth-sso' already exists, skipping creation");
    dbIds.sso = ssoDb.uuid;
  } else {
    logInfo('Creating edgeauth-sso database...');
    const output = execCommand('wrangler d1 create edgeauth-sso --json', {
      silent: true,
    });
    dbIds.sso = JSON.parse(output).uuid;
    logSuccess(`Created edgeauth-sso (ID: ${dbIds.sso})`);
  }

  // Create or get OAuth database
  const oauthDb = databases.find((db) => db.name === 'edgeauth-oauth');
  if (oauthDb) {
    logWarn("Database 'edgeauth-oauth' already exists, skipping creation");
    dbIds.oauth = oauthDb.uuid;
  } else {
    logInfo('Creating edgeauth-oauth database...');
    const output = execCommand('wrangler d1 create edgeauth-oauth --json', {
      silent: true,
    });
    dbIds.oauth = JSON.parse(output).uuid;
    logSuccess(`Created edgeauth-oauth (ID: ${dbIds.oauth})`);
  }

  logSuccess('All databases ready');
  return dbIds;
}

// Update wrangler.toml files with database IDs
function updateWranglerConfigs(dbIds) {
  logInfo('Updating wrangler.toml files with database IDs...');

  const services = [
    {
      path: 'services/admin-api/wrangler.toml',
      replacements: [
        { find: /database_id = "placeholder".*# Replace.*users/, replace: `database_id = "${dbIds.users}"` },
        { find: /database_id = "placeholder".*# Replace.*sso/, replace: `database_id = "${dbIds.sso}"` },
        { find: /database_id = "placeholder".*# Replace.*oauth/, replace: `database_id = "${dbIds.oauth}"` },
      ],
    },
    {
      path: 'services/account-api/wrangler.toml',
      replacements: [
        { find: /database_id = "placeholder".*# Replace.*/, replace: `database_id = "${dbIds.users}"` },
      ],
    },
    {
      path: 'services/sso-api/wrangler.toml',
      replacements: [
        { find: /database_id = "placeholder".*# Replace.*users/, replace: `database_id = "${dbIds.users}"` },
        { find: /database_id = "placeholder".*# Replace.*sso/, replace: `database_id = "${dbIds.sso}"` },
      ],
    },
    {
      path: 'services/oauth-api/wrangler.toml',
      replacements: [
        { find: /database_id = "placeholder".*# Replace.*users/, replace: `database_id = "${dbIds.users}"` },
        { find: /database_id = "placeholder".*# Replace.*oauth/, replace: `database_id = "${dbIds.oauth}"` },
      ],
    },
  ];

  for (const service of services) {
    const filePath = join(ROOT_DIR, service.path);
    logInfo(`Updating ${service.path}...`);

    let content = readFileSync(filePath, 'utf-8');

    for (const replacement of service.replacements) {
      content = content.replace(replacement.find, replacement.replace);
    }

    writeFileSync(filePath, content, 'utf-8');
  }

  logSuccess('Wrangler configs updated');
}

// Execute migrations
function runMigrations() {
  logInfo('Running database migrations...');

  // Users database migrations
  logInfo('Applying migrations to edgeauth-users...');
  execCommand(
    'wrangler d1 execute edgeauth-users --file=src/migrations/0001_create_users_table.sql'
  );
  execCommand(
    'wrangler d1 execute edgeauth-users --file=src/migrations/0003_add_email_verification.sql'
  );
  logSuccess('Users database migrations completed');

  // SSO database migrations
  logInfo('Applying migrations to edgeauth-sso...');
  execCommand(
    'wrangler d1 execute edgeauth-sso --file=src/migrations/0002_create_sso_sessions_table.sql'
  );
  logSuccess('SSO database migrations completed');

  // OAuth database migrations
  logInfo('Applying migrations to edgeauth-oauth...');
  execCommand(
    'wrangler d1 execute edgeauth-oauth --file=src/migrations/0004_create_oauth_tables.sql'
  );
  logSuccess('OAuth database migrations completed');

  logSuccess('All migrations completed');
}

// Deploy workers
function deployWorkers() {
  logInfo('Deploying workers...');

  // Build all packages first
  logInfo('Building packages...');
  execCommand('pnpm build');
  logSuccess('Build completed');

  const services = ['admin-api', 'account-api', 'sso-api', 'oauth-api'];

  for (const service of services) {
    logInfo(`Deploying ${service}...`);
    execCommand('wrangler deploy', {
      cwd: join(ROOT_DIR, 'services', service),
    });
    logSuccess(`${service} deployed`);
  }

  logSuccess('All workers deployed');
}

// Main deployment flow
async function main() {
  console.log('');
  console.log('======================================');
  console.log('  EdgeAuth Deployment Script');
  console.log('======================================');
  console.log('');

  // Check if we're in the right directory
  if (!existsSync(join(ROOT_DIR, 'package.json')) || !existsSync(join(ROOT_DIR, 'services'))) {
    logError('Please run this script from the EdgeAuth root directory');
    process.exit(1);
  }

  try {
    await checkRequirements();
    console.log('');

    logInfo('Starting deployment process...');
    console.log('');

    // Step 1: Create databases
    const dbIds = await createDatabases();
    console.log('');

    // Step 2: Update configs
    updateWranglerConfigs(dbIds);
    console.log('');

    // Step 3: Run migrations
    runMigrations();
    console.log('');

    // Step 4: Deploy workers
    deployWorkers();
    console.log('');

    logSuccess('Deployment completed successfully!');
    console.log('');
    logInfo('Database IDs:');
    console.log(`  edgeauth-users: ${dbIds.users}`);
    console.log(`  edgeauth-sso:   ${dbIds.sso}`);
    console.log(`  edgeauth-oauth: ${dbIds.oauth}`);
    console.log('');
    logInfo('Next steps:');
    console.log('  1. Set production secrets: wrangler secret put JWT_SECRET --env production');
    console.log('  2. Set Plunk API key: wrangler secret put PLUNK_API_KEY --env production');
    console.log('  3. Test your deployed APIs');
    console.log('');
  } catch (error) {
    console.error('');
    logError('Deployment failed!');
    logError(error.message);
    process.exit(1);
  }
}

// Run main function
main();
