#!/usr/bin/env node

/**
 * EdgeAuth Development Server Manager
 *
 * Start all or selected services for local development
 *
 * Usage:
 *   node scripts/dev.js                    # Start all services
 *   node scripts/dev.js --services=account,sso  # Start specific services
 *   node scripts/dev.js --backend          # Start all backend services only
 *   node scripts/dev.js --frontend         # Start frontend only
 *   node scripts/dev.js --no-frontend      # Start all backend, skip frontend
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Service configurations
const SERVICES = {
  account: {
    name: "account-api",
    port: 8788,
    path: "services/account-api",
    color: colors.cyan,
    label: "Account API",
  },
  admin: {
    name: "admin-api",
    port: 8789,
    path: "services/admin-api",
    color: colors.magenta,
    label: "Admin API",
  },
  oauth: {
    name: "oauth-api",
    port: 8790,
    path: "services/oauth-api",
    color: colors.blue,
    label: "OAuth API",
  },
  sso: {
    name: "sso-api",
    port: 8791,
    path: "services/sso-api",
    color: colors.yellow,
    label: "SSO API",
  },
};

const FRONTEND = {
  name: "account-portal",
  port: 5173,
  path: "apps/account-portal",
  color: colors.green,
  label: "Account Portal",
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logService(service, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    `${colors.reset}[${timestamp}] ${service.color}[${service.label}]${colors.reset} ${message}`,
  );
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    services: null, // null means all
    frontend: true,
  };

  for (const arg of args) {
    if (arg.startsWith("--services=")) {
      const serviceList = arg.split("=")[1].split(",");
      options.services = serviceList;
    } else if (arg === "--backend") {
      options.frontend = false;
    } else if (arg === "--frontend") {
      options.services = [];
      options.frontend = true;
    } else if (arg === "--no-frontend") {
      options.frontend = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${colors.green}EdgeAuth Development Server Manager${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/dev.js [options]

${colors.yellow}Options:${colors.reset}
  --services=<list>    Start specific services (comma-separated)
                       Available: account, admin, oauth, sso
                       Example: --services=account,sso

  --backend            Start all backend services only (no frontend)
  --frontend           Start frontend only (no backend services)
  --no-frontend        Start all backend services, skip frontend
  --help, -h           Show this help message

${colors.yellow}Examples:${colors.reset}
  node scripts/dev.js                      # Start everything
  node scripts/dev.js --services=account   # Start account-api only
  node scripts/dev.js --backend            # Start all backend services
  node scripts/dev.js --frontend           # Start frontend only
  node scripts/dev.js --no-frontend        # Backend only

${colors.yellow}Service Ports:${colors.reset}
  Account API:    http://localhost:8788
  Admin API:      http://localhost:8789
  OAuth API:      http://localhost:8790
  SSO API:        http://localhost:8791
  Account Portal: http://localhost:5173
`);
}

// Check if local DB needs setup
async function checkDatabase() {
  const dbPath = join(ROOT_DIR, ".wrangler/state/v3/d1");
  if (!existsSync(dbPath)) {
    log("\n⚠️  Local database not found.", colors.yellow);
    log("Creating and initializing database...\n", colors.blue);
    return await initializeDatabase();
  }
  return true;
}

// Initialize database with migrations
async function initializeDatabase() {
  try {
    log("Running database migrations...", colors.blue);
    // Run from project root, same as production deployment
    await execa(
      "wrangler",
      ["d1", "migrations", "apply", "edgeauth-db", "--local"],
      {
        cwd: ROOT_DIR,
        stdio: "inherit",
      },
    );

    log("\n✓ Database initialized successfully!\n", colors.green);
    return true;
  } catch (error) {
    log(`\n✗ Failed to initialize database: ${error.message}`, colors.red);
    log("\nPlease run manually:", colors.yellow);
    log("  wrangler d1 migrations apply edgeauth-db --local\n", colors.yellow);
    return false;
  }
}

// Start a service
function startService(service, type = "backend") {
  return new Promise((resolve, reject) => {
    const cwd = join(ROOT_DIR, service.path);

    logService(service, "Starting...");

    const cmd = type === "backend" ? "wrangler" : "vite";
    const args = type === "backend" ? ["dev"] : [];

    const process = spawn(cmd, args, {
      cwd,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    let started = false;
    let actualPort = service.port; // Track actual port

    process.stdout.on("data", (data) => {
      const output = data.toString();

      // Extract actual port from output
      const portMatch = output.match(/localhost:(\d+)/);
      if (portMatch) {
        actualPort = parseInt(portMatch[1]);
      }

      // Check if service is ready
      if (!started) {
        if (
          output.includes("Ready on") ||
          output.includes("Local:") ||
          output.includes("server running")
        ) {
          started = true;
          service.actualPort = actualPort; // Store actual port
          logService(
            service,
            `${colors.green}✓${colors.reset} Ready on http://localhost:${actualPort}`,
          );
          resolve(process);
        }
      }

      // Log service output with prefix
      output.split("\n").forEach((line) => {
        if (line.trim()) {
          logService(service, line);
        }
      });
    });

    process.stderr.on("data", (data) => {
      const output = data.toString();
      output.split("\n").forEach((line) => {
        if (line.trim()) {
          logService(service, `${colors.red}${line}${colors.reset}`);
        }
      });
    });

    process.on("error", (error) => {
      logService(
        service,
        `${colors.red}Failed to start: ${error.message}${colors.reset}`,
      );
      reject(error);
    });

    process.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        logService(
          service,
          `${colors.red}Exited with code ${code}${colors.reset}`,
        );
      }
    });

    // Timeout if service doesn't start in 30 seconds
    setTimeout(() => {
      if (!started) {
        logService(service, `${colors.yellow}Still starting...${colors.reset}`);
      }
    }, 30000);
  });
}

// Main function
async function main() {
  console.clear();
  log(
    "\n╔════════════════════════════════════════════════════════════╗",
    colors.green,
  );
  log(
    "║           EdgeAuth Development Server Manager             ║",
    colors.green,
  );
  log(
    "╚════════════════════════════════════════════════════════════╝\n",
    colors.green,
  );

  const options = parseArgs();

  // Check database
  const dbReady = await checkDatabase();
  if (!dbReady && (options.services === null || options.services.length > 0)) {
    process.exit(1);
  }

  // Determine which services to start
  const servicesToStart = [];
  if (options.services === null) {
    // Start all backend services
    servicesToStart.push(...Object.values(SERVICES));
  } else if (options.services.length > 0) {
    // Start specific services
    for (const serviceKey of options.services) {
      if (SERVICES[serviceKey]) {
        servicesToStart.push(SERVICES[serviceKey]);
      } else {
        log(`Unknown service: ${serviceKey}`, colors.red);
        log(
          `Available services: ${Object.keys(SERVICES).join(", ")}`,
          colors.yellow,
        );
        process.exit(1);
      }
    }
  }

  // Summary
  log(`${colors.blue}Starting services:${colors.reset}`);
  servicesToStart.forEach((service) => {
    log(
      `  • ${service.label} - http://localhost:${service.port}`,
      service.color,
    );
  });
  if (options.frontend) {
    log(
      `  • ${FRONTEND.label} - http://localhost:${FRONTEND.port}`,
      FRONTEND.color,
    );
  }
  log("");

  // Start all services
  const processes = [];

  try {
    // Start backend services
    for (const service of servicesToStart) {
      const proc = await startService(service, "backend");
      processes.push(proc);
      // Stagger starts to avoid port conflicts
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Start frontend
    if (options.frontend) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const proc = await startService(FRONTEND, "frontend");
      processes.push(proc);
    }

    log(
      `\n${colors.green}✓ All services started successfully!${colors.reset}\n`,
    );

    // Print final URL summary
    log(`${colors.blue}${"=".repeat(60)}${colors.reset}`);
    log(`${colors.green}Running Services:${colors.reset}\n`);
    servicesToStart.forEach((service) => {
      const port = service.actualPort || service.port;
      log(
        `  ${service.color}●${colors.reset} ${service.label.padEnd(20)} ${colors.cyan}http://localhost:${port}${colors.reset}`,
      );
    });
    if (options.frontend) {
      const port = FRONTEND.actualPort || FRONTEND.port;
      log(
        `  ${FRONTEND.color}●${colors.reset} ${FRONTEND.label.padEnd(20)} ${colors.cyan}http://localhost:${port}${colors.reset}`,
      );
    }
    log(`${colors.blue}${"=".repeat(60)}${colors.reset}\n`);
    log(`${colors.yellow}Press Ctrl+C to stop all services${colors.reset}\n`);

    // Handle graceful shutdown
    const shutdown = () => {
      log(`\n${colors.yellow}Shutting down services...${colors.reset}`);
      processes.forEach((proc) => {
        try {
          proc.kill("SIGTERM");
        } catch (err) {
          // Ignore errors during shutdown
        }
      });
      setTimeout(() => {
        log(`${colors.green}✓ All services stopped${colors.reset}\n`);
        process.exit(0);
      }, 1000);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    log(
      `\n${colors.red}Failed to start services: ${error.message}${colors.reset}\n`,
    );
    processes.forEach((proc) => proc.kill());
    process.exit(1);
  }
}

// Run
main();
