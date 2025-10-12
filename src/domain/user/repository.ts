/**
 * User Repository Interface
 *
 * Defines the contract for user data persistence.
 * Implementation details are in the infrastructure layer.
 */

import type { User, UserWithPassword } from './types.js';

/**
 * User repository interface
 */
export interface UserRepository {
  /**
   * Create a new user
   */
  create(user: UserWithPassword): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user with password hash by email
   */
  findByEmailWithPassword(email: string): Promise<UserWithPassword | null>;

  /**
   * Find user with password hash by username
   */
  findByUsernameWithPassword(username: string): Promise<UserWithPassword | null>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Check if username exists
   */
  usernameExists(username: string): Promise<boolean>;
}
