/**
 * User domain types
 */

/**
 * User entity representing a registered user
 */
export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * User with password hash (internal use only)
 */
export interface UserWithPassword extends User {
  passwordHash: string;
}

/**
 * User data for registration
 */
export interface CreateUserData {
  email: string;
  username: string;
  password: string;
}

/**
 * User data for login
 */
export interface LoginData {
  account: string; // email or username
  password: string;
}

/**
 * Public user data (safe to expose via API)
 */
export type PublicUser = Omit<User, 'updatedAt'>;
