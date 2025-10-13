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
} from "@edge-auth/core";
import { AppError } from "@deepracticex/error-handling";
import type { User } from "@edge-auth/core";

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
            } else if (query.includes("SELECT * FROM users WHERE email")) {
              const [email] = params;
              const user = self.usersByEmail.get(email.toLowerCase());
              return user ? (user as T) : null;
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

// Mock email sender
const mockEmailSender = {
  send: vi.fn().mockResolvedValue(undefined),
};

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
}

setWorldConstructor(function (): TestWorld {
  const db = new MockD1Database();

  // Mock the mail sender module
  vi.mock("@edge-auth/core", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@edge-auth/core")>();
    return {
      ...actual,
      PlunkSender: vi.fn().mockImplementation(() => mockEmailSender),
    };
  });

  const config: AccountServiceConfig = {
    db: db as unknown as D1Database,
    jwtSecret: "test-secret-key-for-testing",
    plunkApiKey: "test-api-key",
    emailFrom: "test@example.com",
    emailFromName: "Test",
    baseUrl: "http://localhost:3000",
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
    const { hashPassword } = await import("@edge-auth/core");
    const passwordHash = await hashPassword("SecurePass123");
    const userId = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        "INSERT INTO users (id, email, username, password_hash, email_verified, email_verified_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(userId, email, "testuser", passwordHash, 0, null, now, now)
      .run();

    this.currentUserId = userId;
    this.currentUser = {
      id: userId,
      email,
      username: "testuser",
      emailVerified: false,
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
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
    const { generateToken } = await import("@edge-auth/core");

    if (this.currentUser) {
      this.verificationToken = await generateToken(
        {
          userId: this.currentUser.id,
          email: this.currentUser.email,
          type: "email_verification",
        },
        {
          secret: "test-secret-key-for-testing",
          expiresIn: 86400,
        },
      );
    }
  },
);

Given("my verification token expired", async function (this: TestWorld) {
  const { generateToken } = await import("@edge-auth/core");

  if (this.currentUser) {
    this.verificationToken = await generateToken(
      {
        userId: this.currentUser.id,
        email: this.currentUser.email,
        type: "email_verification",
      },
      {
        secret: "test-secret-key-for-testing",
        expiresIn: -3600, // Expired 1 hour ago
      },
    );
  }
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
  expect(this.verifyResult!.verified).toBe(true);
});

Then(
  "the verification should fail with validation error",
  function (this: TestWorld) {
    expect(this.error).not.toBeNull();
    expect(AppError.isAppError(this.error)).toBe(true);
    if (AppError.isAppError(this.error)) {
      expect(this.error.statusCode).toBe(400);
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
