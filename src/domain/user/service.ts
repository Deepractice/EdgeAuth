/**
 * User Domain Service
 *
 * Encapsulates user authentication business logic
 */

import { errors } from '@deepracticex/error-handling';
import type { UserRepository } from './repository.js';
import type { CreateUserData, LoginData, User } from './types.js';
import { isEmail, validateEmail, validatePassword, validateUsername } from './validation.js';

/**
 * User Domain Service
 */
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Register a new user
   *
   * @param data - User registration data
   * @param passwordHash - Hashed password (from crypto layer)
   * @returns Created user
   * @throws AuthError if email or username already exists
   * @throws ValidationError if data is invalid
   */
  async register(data: CreateUserData, passwordHash: string): Promise<User> {
    // Validate input
    validateEmail(data.email);
    validateUsername(data.username);
    validatePassword(data.password);

    // Check uniqueness
    const [emailExists, usernameExists] = await Promise.all([
      this.userRepository.emailExists(data.email),
      this.userRepository.usernameExists(data.username),
    ]);

    if (emailExists) {
      throw errors.conflict('Email already registered');
    }

    if (usernameExists) {
      throw errors.conflict('Username already taken');
    }

    // Create user
    const now = Date.now();
    const user = await this.userRepository.create({
      id: crypto.randomUUID(),
      email: data.email.toLowerCase(), // normalize email
      username: data.username,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    return user;
  }

  /**
   * Authenticate user by email or username
   *
   * @param data - Login credentials
   * @returns User with password hash for verification
   * @throws AuthError if user not found
   * @throws ValidationError if data is invalid
   */
  async authenticate(data: LoginData) {
    const { account, password } = data;

    // Determine if account is email or username
    const isEmailAccount = isEmail(account);

    // Validate
    if (isEmailAccount) {
      validateEmail(account);
    } else {
      validateUsername(account);
    }
    validatePassword(password);

    // Find user with password
    const user = isEmailAccount
      ? await this.userRepository.findByEmailWithPassword(account.toLowerCase())
      : await this.userRepository.findByUsernameWithPassword(account);

    if (!user) {
      throw errors.unauthorized('Invalid credentials');
    }

    return user;
  }

  /**
   * Get user by ID
   *
   * @param id - User ID
   * @returns User or null
   */
  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /**
   * Get user by email
   *
   * @param email - User email
   * @returns User or null
   */
  async getUserByEmail(email: string): Promise<User | null> {
    validateEmail(email);
    return this.userRepository.findByEmail(email.toLowerCase());
  }

  /**
   * Get user by username
   *
   * @param username - Username
   * @returns User or null
   */
  async getUserByUsername(username: string): Promise<User | null> {
    validateUsername(username);
    return this.userRepository.findByUsername(username);
  }
}
