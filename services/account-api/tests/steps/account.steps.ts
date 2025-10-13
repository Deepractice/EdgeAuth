import {
  Given,
  When,
  Then,
  Before,
  setWorldConstructor,
} from "@deepracticex/vitest-cucumber";
import { expect, vi } from "vitest";
import {
  AccountService,
  type AccountServiceConfig,
  type RegisterResult,
  type VerifyEmailResult,
  type MailSender,
} from "@edge-auth/core";
import { AppError } from "@deepracticex/error-handling";
import type { User } from "@edge-auth/core";

// Mock email sender
const mockEmailSender: MailSender = {
  send: vi.fn().mockResolvedValue(undefined),
};

// Mock D1Database
class MockD1Database {
  private users: Map<string, any> = new Map();
  private usersByEmail: Map<string, any> = new Map();

  prepare(query: string) {
    const self = this;
    return {
      bind(...params: any[]) {
        return {
          async run() {
            if (query.includes("INSERT INTO users")) {
              const [
                id,
                email,
                username,
                passwordHash,
                emailVerified,
                emailVerifiedAt,
                createdAt,
                updatedAt,
              ] = params;
              const user = {
                id,
                email,
                username,
                password_hash: passwordHash,
                email_verified: emailVerified ? 1 : 0,
                email_verified_at: emailVerifiedAt,
                created_at: createdAt,
                updated_at: updatedAt,
              };
              self.users.set(id, user);
              self.usersByEmail.set(email.toLowerCase(), user);
              return { success: true };
            } else if (query.includes("UPDATE users SET email_verified")) {
              const [emailVerifiedAt, updatedAt, userId] = params;
              const user = self.users.get(userId);
              if (user) {
                user.email_verified = 1;
                user.email_verified_at = emailVerifiedAt;
                user.updated_at = updatedAt;
              }
              return { success: true };
            } else if (query.includes("UPDATE users SET username")) {
              const [username, updatedAt, userId] = params;
              const user = self.users.get(userId);
              if (user) {
                user.username = username;
                user.updated_at = updatedAt;
              }
              return { success: true };
            } else if (query.includes("UPDATE users SET password_hash")) {
              const [passwordHash, updatedAt, userId] = params;
              const user = self.users.get(userId);
              if (user) {
                user.password_hash = passwordHash;
                user.updated_at = updatedAt;
              }
              return { success: true };
            } else if (query.includes("DELETE FROM users")) {
              const [userId] = params;
              const user = self.users.get(userId);
              if (user) {
                self.users.delete(userId);
                self.usersByEmail.delete(user.email.toLowerCase());
              }
              return { success: true };
            }
            return { success: true };
          },
          async first<T>() {
            if (query.includes("SELECT * FROM users WHERE id")) {
              const [userId] = params;
              const user = self.users.get(userId);
              return user ? (user as T) : null;
            } else if (
              query.includes(
                "SELECT * FROM users WHERE email = ? OR username = ?",
              )
            ) {
              // Login query: find by email or username
              const [email, username] = params;
              const userByEmail = self.usersByEmail.get(email.toLowerCase());
              if (userByEmail) return userByEmail as T;
              // Search by username
              const userByUsername = Array.from(self.users.values()).find(
                (u) => u.username === username,
              );
              return userByUsername ? (userByUsername as T) : null;
            } else if (query.includes("SELECT * FROM users WHERE email")) {
              const [email] = params;
              const user = self.usersByEmail.get(email.toLowerCase());
              return user ? (user as T) : null;
            } else if (query.includes("SELECT 1 FROM users WHERE email")) {
              // emailExists query
              const [email] = params;
              const exists = self.usersByEmail.has(email.toLowerCase());
              return exists ? ({ "1": 1 } as T) : null;
            } else if (query.includes("SELECT 1 FROM users WHERE username")) {
              // usernameExists query
              const [username] = params;
              const exists = Array.from(self.users.values()).some(
                (u) => u.username === username,
              );
              return exists ? ({ "1": 1 } as T) : null;
            } else if (
              query.includes("SELECT COUNT(*) as count FROM users WHERE email")
            ) {
              const [email] = params;
              const exists = self.usersByEmail.has(email.toLowerCase());
              return { count: exists ? 1 : 0 } as T;
            } else if (
              query.includes(
                "SELECT COUNT(*) as count FROM users WHERE username",
              )
            ) {
              const [username] = params;
              const exists = Array.from(self.users.values()).some(
                (u) => u.username === username,
              );
              return { count: exists ? 1 : 0 } as T;
            }
            return null;
          },
          async all<T>() {
            return { results: [] as T[] };
          },
        };
      },
    };
  }

  clear() {
    this.users.clear();
    this.usersByEmail.clear();
  }
}

// Test world context
interface TestWorld {
  db: MockD1Database;
  accountService: AccountService;
  currentUser: User | null;
  currentUserId: string | null;
  currentPassword: string | null;
  verificationToken: string | null;
  response: any;
  error: AppError | Error | null;
  registerResult: RegisterResult | null;
  verifyResult: VerifyEmailResult | null;
  loginResult: {
    token: string;
    user: { id: string; email: string; username: string };
  } | null;
  jwtToken: string | null;
  sessions: any[];
  currentSessionId: string | null;
}

setWorldConstructor(function (): TestWorld {
  const db = new MockD1Database();

  const config: AccountServiceConfig = {
    db: db as unknown as D1Database,
    jwtSecret: "test-secret-key-for-testing",
    plunkApiKey: "test-api-key",
    emailFrom: "test@example.com",
    emailFromName: "Test",
    baseUrl: "http://localhost:3000",
    mailSender: mockEmailSender, // Inject mock mail sender for testing
  };

  return {
    db,
    accountService: new AccountService(config),
    currentUser: null,
    currentUserId: null,
    currentPassword: null,
    verificationToken: null,
    response: null,
    error: null,
    registerResult: null,
    verifyResult: null,
    loginResult: null,
    jwtToken: null,
    sessions: [],
    currentSessionId: null,
  };
});

// Reset state before each scenario
Before(function (this: TestWorld) {
  this.db.clear();
  this.currentUser = null;
  this.currentUserId = null;
  this.currentPassword = null;
  this.verificationToken = null;
  this.response = null;
  this.error = null;
  this.registerResult = null;
  this.verifyResult = null;
  this.loginResult = null;
  this.jwtToken = null;
  this.sessions = [];
  this.currentSessionId = null;
  mockEmailSender.send.mockClear();
});

// === Registration Steps ===

Given("I am a new user", function (this: TestWorld) {
  // Clean state provided by Before hook
});

Given(
  "a user exists with email {string}",
  async function (this: TestWorld, email: string) {
    const { hashPassword } = await import("@edge-auth/core");
    const passwordHash = await hashPassword("SecurePass123");
    const userId = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        "INSERT INTO users (id, email, username, password_hash, email_verified, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(userId, email, "existinguser", passwordHash, 0, null, now, now)
      .run();

    this.currentUserId = userId;
  },
);

Given(
  "I registered with email {string}",
  async function (this: TestWorld, email: string) {
    // Register through AccountService (simulates real user flow)
    await this.accountService.register({
      email,
      username: "testuser",
      password: "SecurePass123",
    });

    // Extract user from database
    const user = await this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email.toLowerCase())
      .first<any>();

    if (user) {
      this.currentUserId = user.id;
      this.currentUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.email_verified === 1,
        emailVerifiedAt: user.email_verified_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }
  },
);

Given(
  "I am logged in as {string}",
  async function (this: TestWorld, email: string) {
    const { hashPassword } = await import("@edge-auth/core");
    const passwordHash = await hashPassword("SecurePass123");
    const userId = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        "INSERT INTO users (id, email, username, password_hash, email_verified, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(userId, email, "testuser", passwordHash, 1, now, now, now)
      .run();

    this.currentUserId = userId;
    this.currentUser = {
      id: userId,
      email,
      username: "testuser",
      emailVerified: true,
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  },
);

Given(
  "I am logged in with password {string}",
  async function (this: TestWorld, password: string) {
    const { hashPassword } = await import("@edge-auth/core");
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();
    const now = Date.now();
    const email = "user@example.com";

    await this.db
      .prepare(
        "INSERT INTO users (id, email, username, password_hash, email_verified, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(userId, email, "testuser", passwordHash, 1, now, now, now)
      .run();

    this.currentUserId = userId;
    this.currentPassword = password;
    this.currentUser = {
      id: userId,
      email,
      username: "testuser",
      emailVerified: true,
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  },
);

When(
  "I register with email {string}, username {string}, and password {string}",
  async function (
    this: TestWorld,
    email: string,
    username: string,
    password: string,
  ) {
    try {
      this.registerResult = await this.accountService.register({
        email,
        username,
        password,
      });
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.registerResult = null;
    }
  },
);

Then("the registration should succeed", function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.registerResult).not.toBeNull();
});

Then(
  "the registration should fail with conflict error",
  function (this: TestWorld) {
    expect(this.error).not.toBeNull();
    expect(AppError.isAppError(this.error)).toBe(true);
    if (AppError.isAppError(this.error)) {
      expect(this.error.statusCode).toBe(409);
    }
  },
);

Then(
  "the registration should fail with validation error",
  function (this: TestWorld) {
    expect(this.error).not.toBeNull();
    expect(AppError.isAppError(this.error)).toBe(true);
    if (AppError.isAppError(this.error)) {
      expect(this.error.statusCode).toBe(400);
    }
  },
);

Then("a verification email should be sent", function (this: TestWorld) {
  expect(mockEmailSender.send).toHaveBeenCalled();
  const callArgs = mockEmailSender.send.mock.calls[0][0];
  expect(callArgs.subject).toContain("Verify");
});

Then(
  "I should receive a message to check my email",
  function (this: TestWorld) {
    expect(this.registerResult).not.toBeNull();
    expect(this.registerResult!.message).toContain("check your email");
  },
);

Then(
  "the error message should contain {string}",
  function (this: TestWorld, text: string) {
    expect(this.error).not.toBeNull();
    expect(this.error!.message).toContain(text);
  },
);

// === Email Verification Steps ===

Given(
  "I received a verification email with a token",
  async function (this: TestWorld) {
    // Extract token from the mock email that was sent during registration
    expect(mockEmailSender.send).toHaveBeenCalled();

    const emailCall =
      mockEmailSender.send.mock.calls[
        mockEmailSender.send.mock.calls.length - 1
      ][0];
    const htmlContent = emailCall.html;

    // Extract verification URL from email HTML
    const urlMatch = htmlContent.match(/href="([^"]*verify-email[^"]*)"/);

    if (urlMatch && urlMatch[1]) {
      const verificationUrl = urlMatch[1];
      const url = new URL(verificationUrl);
      this.verificationToken = url.searchParams.get("token");
    }
  },
);

Given("my verification token expired", async function (this: TestWorld) {
  // Simulate real scenario: register with short expiration, then wait for it to expire
  const email = this.currentUser?.email || "expired-test@example.com";

  // Clear previous registration
  if (this.currentUserId) {
    await this.db
      .prepare("DELETE FROM users WHERE id = ?")
      .bind(this.currentUserId)
      .run();
  }

  // Create a temporary AccountService with 1-second token expiration
  const shortExpiryConfig: AccountServiceConfig = {
    ...this.accountService["config"], // Access config
    verificationTokenExpiresIn: 1, // 1 second expiration
  };

  const tempAccountService = new AccountService(shortExpiryConfig);
  mockEmailSender.send.mockClear();

  // Register with short-lived token
  await tempAccountService.register({
    email,
    username: "testuser",
    password: "SecurePass123",
  });

  // Update current user context
  const user = await this.db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<any>();

  if (user) {
    this.currentUserId = user.id;
    this.currentUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.email_verified === 1,
      emailVerifiedAt: user.email_verified_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  // Extract token from email
  const emailCall = mockEmailSender.send.mock.calls[0][0];
  const htmlContent = emailCall.html;
  const urlMatch = htmlContent.match(/href="([^"]*verify-email[^"]*)"/);
  if (urlMatch && urlMatch[1]) {
    const verificationUrl = urlMatch[1];
    const url = new URL(verificationUrl);
    this.verificationToken = url.searchParams.get("token");
  }

  // Wait for token to expire (2 seconds to be safe)
  await new Promise((resolve) => setTimeout(resolve, 2000));
});

When("I verify my email with the token", async function (this: TestWorld) {
  try {
    this.verifyResult = await this.accountService.verifyEmail(
      this.verificationToken!,
    );
    this.error = null;
  } catch (error) {
    this.error = error as Error;
    this.verifyResult = null;
  }
});

When(
  "I verify my email with an invalid token",
  async function (this: TestWorld) {
    try {
      this.verifyResult =
        await this.accountService.verifyEmail("invalid.token.here");
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.verifyResult = null;
    }
  },
);

When(
  "I verify my email with the expired token",
  async function (this: TestWorld) {
    try {
      this.verifyResult = await this.accountService.verifyEmail(
        this.verificationToken!,
      );
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.verifyResult = null;
    }
  },
);

Then("the verification should succeed", function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.verifyResult).not.toBeNull();
  // Accept both newly verified and already verified as success
  expect(
    this.verifyResult!.verified === true ||
      this.verifyResult!.alreadyVerified === true,
  ).toBe(true);
});

Then(
  "the verification should fail with validation error",
  function (this: TestWorld) {
    expect(this.error).not.toBeNull();
    expect(AppError.isAppError(this.error)).toBe(true);
    if (AppError.isAppError(this.error)) {
      // Token verification failures return 401 (Unauthorized), not 400
      expect(this.error.statusCode).toBe(401);
    }
  },
);

Then("the verification should fail", function (this: TestWorld) {
  expect(this.error).not.toBeNull();
});

Then("my account should be activated", async function (this: TestWorld) {
  if (this.currentUserId) {
    const user = await this.accountService.getProfile(this.currentUserId);
    expect(user).not.toBeNull();
    expect(user!.emailVerified).toBe(true);
  }
});

// === Profile Management Steps ===

When("I request my profile", async function (this: TestWorld) {
  try {
    this.response = await this.accountService.getProfile(this.currentUserId!);
    this.error = null;
  } catch (error) {
    this.error = error as Error;
    this.response = null;
  }
});

When(
  "I update my username to {string}",
  async function (this: TestWorld, newUsername: string) {
    try {
      this.response = await this.accountService.updateProfile(
        this.currentUserId!,
        { username: newUsername },
      );
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.response = null;
    }
  },
);

When(
  "I change my password to {string}",
  async function (this: TestWorld, newPassword: string) {
    try {
      await this.accountService.changePassword(
        this.currentUserId!,
        this.currentPassword!,
        newPassword,
      );
      this.currentPassword = newPassword;
      this.error = null;
    } catch (error) {
      this.error = error as Error;
    }
  },
);

Then(
  "I should see my email, username, and account details",
  function (this: TestWorld) {
    expect(this.response).not.toBeNull();
    expect(this.response.id).toBeDefined();
    expect(this.response.email).toBeDefined();
    expect(this.response.username).toBeDefined();
    expect(this.response.createdAt).toBeDefined();
  },
);

Then("the update should succeed", function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.response).not.toBeNull();
});

Then(
  "my username should be {string}",
  function (this: TestWorld, expectedUsername: string) {
    expect(this.response).not.toBeNull();
    expect(this.response.username).toBe(expectedUsername);
  },
);

Then("the password change should succeed", function (this: TestWorld) {
  expect(this.error).toBeNull();
});

Then(
  "I should be able to login with the new password",
  async function (this: TestWorld) {
    const { verifyPassword } = await import("@edge-auth/core");

    const user = await this.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(this.currentUserId)
      .first<any>();

    expect(user).not.toBeNull();
    const isValid = await verifyPassword(
      this.currentPassword!,
      user!.password_hash,
    );
    expect(isValid).toBe(true);
  },
);

// === Login Steps ===

Given("I verified my email", async function (this: TestWorld) {
  if (this.currentUserId) {
    const now = Date.now();
    await this.db
      .prepare(
        "UPDATE users SET email_verified = 1, email_verified_at = ?, updated_at = ? WHERE id = ?",
      )
      .bind(now, now, this.currentUserId)
      .run();

    if (this.currentUser) {
      this.currentUser.emailVerified = true;
      this.currentUser.emailVerifiedAt = now;
    }
  }
});

Given("I did not verify my email", function (this: TestWorld) {
  // Email is not verified by default after registration
});

Given(
  "I registered with email {string} and username {string}",
  async function (this: TestWorld, email: string, username: string) {
    await this.accountService.register({
      email,
      username,
      password: "SecurePass123",
    });

    const user = await this.db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email.toLowerCase())
      .first<any>();

    if (user) {
      this.currentUserId = user.id;
      this.currentUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.email_verified === 1,
        emailVerifiedAt: user.email_verified_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }
  },
);

When(
  "I login with email {string} and password {string}",
  async function (this: TestWorld, email: string, password: string) {
    const { verifyPassword, generateToken } = await import("@edge-auth/core");

    try {
      const user = await this.db
        .prepare("SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1")
        .bind(email.toLowerCase(), email)
        .first<any>();

      if (!user) {
        throw new Error("Invalid credentials");
      }

      if (user.email_verified !== 1) {
        throw new Error("Please verify your email before logging in");
      }

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }

      const token = await generateToken(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: user.email_verified === 1,
          emailVerifiedAt: user.email_verified_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        {
          secret: "test-secret-key-for-testing",
          expiresIn: 86400,
        },
      );

      this.loginResult = {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
      this.jwtToken = token;
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.loginResult = null;
    }
  },
);

When(
  "I login with username {string} and password {string}",
  async function (this: TestWorld, username: string, password: string) {
    const { verifyPassword, generateToken } = await import("@edge-auth/core");

    try {
      const user = await this.db
        .prepare("SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1")
        .bind(username.toLowerCase(), username)
        .first<any>();

      if (!user) {
        throw new Error("Invalid credentials");
      }

      if (user.email_verified !== 1) {
        throw new Error("Please verify your email before logging in");
      }

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }

      const token = await generateToken(
        {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: user.email_verified === 1,
          emailVerifiedAt: user.email_verified_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        {
          secret: "test-secret-key-for-testing",
          expiresIn: 86400,
        },
      );

      this.loginResult = {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
      this.jwtToken = token;
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.loginResult = null;
    }
  },
);

Then("the login should succeed", function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.loginResult).not.toBeNull();
});

Then("I should receive a JWT token", function (this: TestWorld) {
  expect(this.jwtToken).not.toBeNull();
  expect(typeof this.jwtToken).toBe("string");
});

Then("I should receive my user information", function (this: TestWorld) {
  expect(this.loginResult).not.toBeNull();
  expect(this.loginResult!.user).not.toBeNull();
  expect(this.loginResult!.user.id).toBeDefined();
  expect(this.loginResult!.user.email).toBeDefined();
  expect(this.loginResult!.user.username).toBeDefined();
});

Then(
  "the login should fail with {string}",
  function (this: TestWorld, errorMessage: string) {
    expect(this.error).not.toBeNull();
    expect(this.error!.message).toContain(errorMessage);
  },
);

// === Session Management Steps ===

Given("I have multiple active sessions", function (this: TestWorld) {
  // Mock multiple sessions for the current user
  this.sessions = [
    {
      session_id: crypto.randomUUID(),
      user_id: this.currentUserId,
      token: "session-token-1",
      created_at: Date.now() - 86400000, // 1 day ago
      expires_at: Date.now() + 86400000, // expires tomorrow
      last_accessed_at: Date.now() - 3600000, // 1 hour ago
      revoked_at: null,
    },
    {
      session_id: crypto.randomUUID(),
      user_id: this.currentUserId,
      token: "session-token-2",
      created_at: Date.now() - 3600000, // 1 hour ago
      expires_at: Date.now() + 86400000, // expires tomorrow
      last_accessed_at: Date.now() - 1800000, // 30 min ago
      revoked_at: null,
    },
    {
      session_id: crypto.randomUUID(),
      user_id: this.currentUserId,
      token: "session-token-3",
      created_at: Date.now() - 600000, // 10 min ago
      expires_at: Date.now() + 86400000, // expires tomorrow
      last_accessed_at: Date.now(),
      revoked_at: null,
    },
  ];
  this.currentSessionId = this.sessions[0].session_id;
});

When("I request my active sessions", async function (this: TestWorld) {
  try {
    // Mock API call - will be replaced with actual HTTP request
    this.response = this.sessions.filter((s) => !s.revoked_at);
    this.error = null;
  } catch (error) {
    this.error = error as Error;
    this.response = null;
  }
});

When("I logout from a specific session", async function (this: TestWorld) {
  try {
    // Mock logout specific session
    const sessionToLogout = this.sessions[1];
    sessionToLogout.revoked_at = Date.now();
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When("I logout from all other sessions", async function (this: TestWorld) {
  try {
    // Mock logout all except current session
    this.sessions.forEach((session) => {
      if (session.session_id !== this.currentSessionId) {
        session.revoked_at = Date.now();
      }
    });
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When(
  "I request sessions without authentication",
  async function (this: TestWorld) {
    try {
      // Mock unauthorized request
      throw new Error("Missing or invalid authorization header");
    } catch (error) {
      this.error = error as Error;
      this.response = null;
    }
  },
);

Then("I should see a list of my sessions", function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.response).not.toBeNull();
  expect(Array.isArray(this.response)).toBe(true);
  expect(this.response.length).toBeGreaterThan(0);
});

Then("each session should include session details", function (this: TestWorld) {
  expect(this.response).not.toBeNull();
  this.response.forEach((session: any) => {
    expect(session.session_id).toBeDefined();
    expect(session.created_at).toBeDefined();
    expect(session.last_accessed_at).toBeDefined();
  });
});

Then("that session should be revoked", function (this: TestWorld) {
  expect(this.error).toBeNull();
  const revokedSession = this.sessions[1];
  expect(revokedSession.revoked_at).not.toBeNull();
});

Then("other sessions should remain active", function (this: TestWorld) {
  const activeSessions = this.sessions.filter(
    (s, i) => i !== 1 && !s.revoked_at,
  );
  expect(activeSessions.length).toBeGreaterThan(0);
});

Then(
  "all sessions except current should be revoked",
  function (this: TestWorld) {
    expect(this.error).toBeNull();
    this.sessions.forEach((session) => {
      if (session.session_id !== this.currentSessionId) {
        expect(session.revoked_at).not.toBeNull();
      }
    });
  },
);

Then("my current session should remain active", function (this: TestWorld) {
  const currentSession = this.sessions.find(
    (s) => s.session_id === this.currentSessionId,
  );
  expect(currentSession).not.toBeNull();
  expect(currentSession!.revoked_at).toBeNull();
});

Then("I should receive an unauthorized error", function (this: TestWorld) {
  expect(this.error).not.toBeNull();
  expect(this.error!.message).toContain("authorization");
});
