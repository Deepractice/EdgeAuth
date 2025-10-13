/**
 * Admin Application Service
 *
 * Orchestrates administrative operations including user management, system monitoring, and configuration.
 */

import { errors, AppError } from "@deepracticex/error-handling";
import { createLogger } from "../infrastructure/logger/index.js";
import { UserService } from "../domain/user/service.js";
import { D1UserRepository } from "../infrastructure/persistence/index.js";
import { hashPassword } from "../infrastructure/crypto/index.js";
import type { User } from "../domain/user/types.js";

const logger = createLogger({
  name: "admin-service",
  level: "info",
  console: true,
  colors: true,
  environment: "cloudflare-workers",
});

/**
 * Admin Service Configuration
 */
export interface AdminServiceConfig {
  db: D1Database;
}

/**
 * User List Result
 */
export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Admin Application Service
 */
export class AdminService {
  private readonly userRepository: D1UserRepository;
  private readonly userService: UserService;
  private readonly config: AdminServiceConfig;

  constructor(config: AdminServiceConfig) {
    this.config = config;
    this.userRepository = new D1UserRepository(config.db);
    this.userService = new UserService(this.userRepository);
  }

  /**
   * List all users with pagination
   */
  async listUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<UserListResult> {
    try {
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      const offset = (page - 1) * pageSize;

      let query = "SELECT * FROM users";
      const bindings: any[] = [];

      if (params.search) {
        query += " WHERE email LIKE ? OR username LIKE ?";
        bindings.push(`%${params.search}%`, `%${params.search}%`);
      }

      query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
      bindings.push(pageSize, offset);

      const result = await this.config.db
        .prepare(query)
        .bind(...bindings)
        .all<User>();

      const countQuery = params.search
        ? "SELECT COUNT(*) as count FROM users WHERE email LIKE ? OR username LIKE ?"
        : "SELECT COUNT(*) as count FROM users";
      const countBindings = params.search
        ? [`%${params.search}%`, `%${params.search}%`]
        : [];
      const countResult = await this.config.db
        .prepare(countQuery)
        .bind(...countBindings)
        .first<{ count: number }>();

      return {
        users: result.results || [],
        total: countResult?.count || 0,
        page,
        pageSize,
      };
    } catch (error) {
      logger.error("List users error", { error });
      throw errors.internal("Internal server error");
    }
  }

  /**
   * Get user details by ID
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      return await this.userService.getUserById(userId);
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error("Get user error", { error });
      throw errors.internal("Internal server error");
    }
  }

  /**
   * Create a new user (admin operation)
   */
  async createUser(data: {
    email: string;
    username: string;
    password: string;
    emailVerified?: boolean;
  }): Promise<User> {
    try {
      const passwordHash = await hashPassword(data.password);
      const user = await this.userService.register(
        {
          email: data.email,
          username: data.username,
          password: data.password,
        },
        passwordHash,
      );

      // If admin wants user pre-verified
      if (data.emailVerified) {
        const now = Date.now();
        await this.config.db
          .prepare(
            "UPDATE users SET email_verified = 1, email_verified_at = ?, updated_at = ? WHERE id = ?",
          )
          .bind(now, now, user.id)
          .run();

        logger.info("User created and verified by admin", { userId: user.id });
        return { ...user, emailVerified: true, emailVerifiedAt: now };
      }

      logger.info("User created by admin", { userId: user.id });
      return user;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error("Create user error", { error });
      throw errors.internal("Internal server error");
    }
  }

  /**
   * Update user (admin operation)
   */
  async updateUser(
    userId: string,
    data: {
      email?: string;
      username?: string;
      emailVerified?: boolean;
    },
  ): Promise<User> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw errors.notFound("User not found");
      }

      const updates: string[] = [];
      const bindings: any[] = [];

      if (data.email) {
        updates.push("email = ?");
        bindings.push(data.email.toLowerCase());
      }

      if (data.username) {
        updates.push("username = ?");
        bindings.push(data.username);
      }

      if (data.emailVerified !== undefined) {
        updates.push("email_verified = ?");
        bindings.push(data.emailVerified ? 1 : 0);
        if (data.emailVerified) {
          updates.push("email_verified_at = ?");
          bindings.push(Date.now());
        }
      }

      if (updates.length > 0) {
        const now = Date.now();
        updates.push("updated_at = ?");
        bindings.push(now, userId);

        await this.config.db
          .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
          .bind(...bindings)
          .run();

        logger.info("User updated by admin", { userId });
      }

      return (await this.userRepository.findById(userId)) as User;
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error("Update user error", { error });
      throw errors.internal("Internal server error");
    }
  }

  /**
   * Delete user (admin operation)
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw errors.notFound("User not found");
      }

      await this.config.db
        .prepare("DELETE FROM users WHERE id = ?")
        .bind(userId)
        .run();

      logger.info("User deleted by admin", { userId, email: user.email });
    } catch (error) {
      if (AppError.isAppError(error)) {
        throw error;
      }
      logger.error("Delete user error", { error });
      throw errors.internal("Internal server error");
    }
  }

  /**
   * Get system statistics
   */
  async getStatistics(): Promise<{
    totalUsers: number;
    verifiedUsers: number;
    unverifiedUsers: number;
  }> {
    try {
      const totalResult = await this.config.db
        .prepare("SELECT COUNT(*) as count FROM users")
        .first<{ count: number }>();

      const verifiedResult = await this.config.db
        .prepare("SELECT COUNT(*) as count FROM users WHERE email_verified = 1")
        .first<{ count: number }>();

      const totalUsers = totalResult?.count || 0;
      const verifiedUsers = verifiedResult?.count || 0;

      return {
        totalUsers,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
      };
    } catch (error) {
      logger.error("Get statistics error", { error });
      throw errors.internal("Internal server error");
    }
  }
}
