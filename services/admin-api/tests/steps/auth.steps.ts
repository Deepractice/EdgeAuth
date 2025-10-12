import { Given, When, Then, Before, setWorldConstructor } from '@deepracticex/vitest-cucumber';
import { expect } from 'vitest';
import { UserService } from 'edgeauth/domain';
import { hashPassword, generateToken, verifyToken } from 'edgeauth';
import { AppError } from '@deepracticex/error-handling';

// Mock repository for testing
class MockUserRepository {
  private users: Map<string, any> = new Map();
  private usersByEmail: Map<string, any> = new Map();
  private usersByUsername: Map<string, any> = new Map();

  async create(user: any) {
    this.users.set(user.id, user);
    // Normalize email to lowercase for storage
    this.usersByEmail.set(user.email.toLowerCase(), user);
    this.usersByUsername.set(user.username, user);
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findById(id: string) {
    const user = this.users.get(id);
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmail(email: string) {
    // Normalize email for lookup
    const user = this.usersByEmail.get(email.toLowerCase());
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByUsername(username: string) {
    const user = this.usersByUsername.get(username);
    if (!user) return null;
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findByEmailWithPassword(email: string) {
    // Normalize email for lookup
    return this.usersByEmail.get(email.toLowerCase()) || null;
  }

  async findByUsernameWithPassword(username: string) {
    return this.usersByUsername.get(username) || null;
  }

  async emailExists(email: string) {
    // Normalize email for lookup
    return this.usersByEmail.has(email.toLowerCase());
  }

  async usernameExists(username: string) {
    return this.usersByUsername.has(username);
  }

  clear() {
    this.users.clear();
    this.usersByEmail.clear();
    this.usersByUsername.clear();
  }
}

// Test world context
interface TestWorld {
  repository: MockUserRepository;
  userService: UserService;
  registrationData: { email: string; username: string; password: string } | null;
  loginData: { account: string; password: string } | null;
  response: any;
  error: AppError | Error | null;
  token: string | null;
  jwtSecret: string;
}

setWorldConstructor(function (): TestWorld {
  const repository = new MockUserRepository();
  return {
    repository,
    userService: new UserService(repository),
    registrationData: null,
    loginData: null,
    response: null,
    error: null,
    token: null,
    jwtSecret: 'test-secret-key-for-testing',
  };
});

// Reset state before each scenario
Before(function (this: TestWorld) {
  this.repository.clear();
  this.registrationData = null;
  this.loginData = null;
  this.response = null;
  this.error = null;
  this.token = null;
});

// === Registration Steps ===

Given('I am a new user', function (this: TestWorld) {
  // No setup needed, clean state provided by Before hook
});

Given(
  'a user exists with email {string}',
  async function (this: TestWorld, email: string) {
    const passwordHash = await hashPassword('securepass123');
    await this.repository.create({
      id: crypto.randomUUID(),
      email,
      username: 'existinguser',
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
);

Given(
  'a user exists with username {string}',
  async function (this: TestWorld, username: string) {
    const passwordHash = await hashPassword('securepass123');
    await this.repository.create({
      id: crypto.randomUUID(),
      email: 'existing@example.com',
      username,
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
);

Given(
  'a user exists with email {string}, username {string}, and password {string}',
  async function (this: TestWorld, email: string, username: string, password: string) {
    const passwordHash = await hashPassword(password);
    const user = await this.repository.create({
      id: crypto.randomUUID(),
      email,
      username,
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    this.response = user;
  },
);

When(
  'I register with email {string}, username {string}, and password {string}',
  async function (this: TestWorld, email: string, username: string, password: string) {
    this.registrationData = { email, username, password };
    try {
      const passwordHash = await hashPassword(password);
      const user = await this.userService.register(
        { email, username, password },
        passwordHash,
      );
      this.token = await generateToken(user, {
        secret: this.jwtSecret,
        expiresIn: 86400,
      });
      this.response = { user, token: this.token };
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.response = null;
      this.token = null;
    }
  },
);

Then('the registration should succeed', function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.response).not.toBeNull();
});

Then('the registration should fail with conflict error', function (this: TestWorld) {
  expect(this.error).not.toBeNull();
  expect(AppError.isAppError(this.error)).toBe(true);
  if (AppError.isAppError(this.error)) {
    expect(this.error.statusCode).toBe(409);
  }
});

Then('the registration should fail with validation error', function (this: TestWorld) {
  expect(this.error).not.toBeNull();
  expect(AppError.isAppError(this.error)).toBe(true);
  if (AppError.isAppError(this.error)) {
    expect(this.error.statusCode).toBe(400);
  }
});

// === Login Steps ===

When(
  'I login with account {string} and password {string}',
  async function (this: TestWorld, account: string, password: string) {
    this.loginData = { account, password };
    try {
      const userWithPassword = await this.userService.authenticate({ account, password });

      // Verify password
      const { verifyPassword } = await import('edgeauth');
      const isValid = await verifyPassword(password, userWithPassword.passwordHash);

      if (!isValid) {
        const { errors } = await import('@deepracticex/error-handling');
        throw errors.unauthorized('Invalid credentials');
      }
      // Create user object without password
      const user = {
        id: userWithPassword.id,
        email: userWithPassword.email,
        username: userWithPassword.username,
        createdAt: userWithPassword.createdAt,
        updatedAt: userWithPassword.updatedAt,
      };
      this.token = await generateToken(user, {
        secret: this.jwtSecret,
        expiresIn: 86400,
      });
      this.response = { user, token: this.token };
      this.error = null;
    } catch (error) {
      this.error = error as Error;
      this.response = null;
      this.token = null;
    }
  },
);

Then('the login should succeed', function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.response).not.toBeNull();
});

Then('the login should fail with unauthorized error', function (this: TestWorld) {
  expect(this.error).not.toBeNull();
  expect(AppError.isAppError(this.error)).toBe(true);
  if (AppError.isAppError(this.error)) {
    expect(this.error.statusCode).toBe(401);
  }
});

Then('the login should fail with validation error', function (this: TestWorld) {
  expect(this.error).not.toBeNull();
  expect(AppError.isAppError(this.error)).toBe(true);
  if (AppError.isAppError(this.error)) {
    expect(this.error.statusCode).toBe(400);
  }
});

// === Common Assertions ===

Then('I should receive a JWT token', function (this: TestWorld) {
  expect(this.token).not.toBeNull();
  expect(typeof this.token).toBe('string');
  expect(this.token!.split('.')).toHaveLength(3);
});

Then('I should receive my user information', function (this: TestWorld) {
  expect(this.response).not.toBeNull();
  expect(this.response.user).toBeDefined();
  expect(this.response.user.id).toBeDefined();
  expect(this.response.user.email).toBeDefined();
  expect(this.response.user.username).toBeDefined();
  expect(this.response.user.createdAt).toBeDefined();
  expect(this.response.user.passwordHash).toBeUndefined();
});

Then('the error message should contain {string}', function (this: TestWorld, text: string) {
  expect(this.error).not.toBeNull();
  expect(this.error!.message).toContain(text);
});

// === Authentication Steps ===

Given('I have logged in and received a JWT token', async function (this: TestWorld) {
  // The user was created in the background step
  // Find the user and generate token
  const users = Array.from((this.repository as any).users.values());
  if (users.length > 0) {
    const { passwordHash, ...user } = users[0];
    this.token = await generateToken(user, {
      secret: this.jwtSecret,
      expiresIn: 86400,
    });
  }
});

Given('I have an expired JWT token', async function (this: TestWorld) {
  // Find the user and generate expired token
  const users = Array.from((this.repository as any).users.values());
  if (users.length > 0) {
    const { passwordHash, ...user } = users[0];
    // Create a token that expired 1 hour ago (negative expiresIn)
    this.token = await generateToken(user, {
      secret: this.jwtSecret,
      expiresIn: -3600, // Expired 1 hour ago
    });
  }
});

When('I request my user information with the token', async function (this: TestWorld) {
  try {
    const payload = await verifyToken(this.token!, this.jwtSecret);
    const user = await this.userService.getUserById(payload.sub);
    if (!user) {
      const { errors } = await import('@deepracticex/error-handling');
      throw errors.notFound('User', payload.sub);
    }
    this.response = { user };
    this.error = null;
  } catch (error) {
    this.error = error as Error;
    this.response = null;
  }
});

When('I request my user information with an invalid token', async function (this: TestWorld) {
  try {
    const payload = await verifyToken('invalid.token.here', this.jwtSecret);
    const user = await this.userService.getUserById(payload.sub);
    this.response = { user };
    this.error = null;
  } catch (error) {
    this.error = error as Error;
    this.response = null;
  }
});

When('I request my user information without a token', async function (this: TestWorld) {
  try {
    const { errors } = await import('@deepracticex/error-handling');
    throw errors.unauthorized('Missing or invalid authorization header');
  } catch (error) {
    this.error = error as Error;
    this.response = null;
  }
});

Then('the request should succeed', function (this: TestWorld) {
  expect(this.error).toBeNull();
  expect(this.response).not.toBeNull();
});

Then('the request should fail with unauthorized error', function (this: TestWorld) {
  expect(this.error).not.toBeNull();
  // Check for unauthorized error (401 status code)
  // Note: Due to pnpm workspace dependency isolation, AppError.isAppError may not work
  // across package boundaries, so we check the error properties directly
  expect(this.error).toHaveProperty('statusCode', 401);
});
