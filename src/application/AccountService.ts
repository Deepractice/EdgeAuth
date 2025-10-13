/**
 * Account Application Service
 *
 * Orchestrates user account operations including registration, verification, and profile management.
 * This service combines domain logic, infrastructure, and external integrations.
 */

import { errors, AppError } from "@deepracticex/error-handling";
import { createLogger } from "../infrastructure/logger/index.js";
import { UserService } from "../domain/user/service.js";
import { D1UserRepository } from "../infrastructure/persistence/index.js";
import {
  hashPassword,
  verifyPassword,
} from "../infrastructure/crypto/index.js";
import {
  PlunkSender,
  emailVerificationTemplate,
  welcomeEmailTemplate,
} from "../infrastructure/mail/index.js";
import {
  generateVerificationToken,
  verifyVerificationToken,
} from "../domain/verification/index.js";
import type { User } from "../domain/user/types.js";

const logger = createLogger({
  name: "account-service",
  level: "info",
  console: true,
  colors: true,
  environment: "cloudflare-workers",
});

/**
 * Mail Sender Interface
 */
export interface MailSender {
  send(params: { to: string; subject: string; html: string }): Promise<void>;
}

/**
 * Account Service Configuration
 */
export interface AccountServiceConfig {
  db: D1Database;
  jwtSecret: string;
  plunkApiKey: string;
  emailFrom?: string; // Optional: uses Plunk's default verified email if not provided
  emailFromName?: string; // Optional: sender name
  baseUrl: string;
  mailSender?: MailSender; // Optional: for testing
  verificationTokenExpiresIn?: number; // Optional: token expiration in seconds (default: 24 hours)
}

/**
 * Registration Result
 */
export interface RegisterResult {
  message: string;
  email: string;
}

/**
 * Verification Result
 */
export interface VerifyEmailResult {
  message: string;
  verified?: boolean;
  alreadyVerified?: boolean;
}

/**
 * Account Application Service
 */
export class AccountService {
  private readonly userRepository: D1UserRepository;
  private readonly userService: UserService;
  private readonly mailSender: MailSender;
  private readonly config: AccountServiceConfig;

  constructor(config: AccountServiceConfig) {
    this.config = config;
    this.userRepository = new D1UserRepository(config.db);
    this.userService = new UserService(this.userRepository);
    // Use provided mailSender or create PlunkSender
    this.mailSender =
      config.mailSender ||
      new PlunkSender(
        config.plunkApiKey,
        config.emailFrom,
        config.emailFromName,
      );
  }

  /**
   * Register a new user with email verification
   *
   * @param data - Registration data
   * @returns Registration result
   * @throws AppError if registration fails
   */
  async register(data: {
    email: string;
    username: string;
    password: string;
  }): Promise<RegisterResult> {
    try {
      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Register user through domain service
      const user = await this.userService.register(
        {
          email: data.email,
          username: data.username,
          password: data.password,
        },
        passwordHash,
      );

      // Generate verification token
      const verificationToken = await generateVerificationToken(
        user.id,
        user.email,
        this.config.jwtSecret,
        this.config.verificationTokenExpiresIn ?? 86400, // Default: 24 hours
      );

      // Build verification URL
      const verificationUrl = `${this.config.baseUrl}/verify-email?token=${verificationToken}`;

      // Send verification email
      await this.mailSender.send({
        to: user.email,
        subject: "Verify Your Email - EdgeAuth",
        html: emailVerificationTemplate(user.username, verificationUrl),
      });

      logger.info("User registered successfully", {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return {
        message:
          "Registration successful. Please check your email to verify your account.",
        email: user.email,
      };
    } catch (error) {
      if (AppError.isAppError(error)) {
        logger.warn("Registration failed", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      // Log detailed error information
      const errorDetails =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : { raw: String(error) };

      logger.error("Registration error (non-AppError)", errorDetails);
      throw errors.internal(
        `Registration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Verify user's email address
   *
   * @param token - Verification token
   * @returns Verification result
   * @throws AppError if verification fails
   */
  async verifyEmail(token: string): Promise<VerifyEmailResult> {
    try {
      if (!token) {
        throw errors.validation("Verification token is required");
      }

      // Verify JWT token
      const payload = await verifyVerificationToken(
        token,
        this.config.jwtSecret,
        "email_verification",
      );

      // Get user
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw errors.notFound("User not found");
      }

      // Check if already verified
      if (user.emailVerified) {
        logger.info("Email already verified", {
          userId: user.id,
          email: user.email,
        });

        return {
          message: "Email address has already been verified",
          alreadyVerified: true,
        };
      }

      // Update user to verified
      const now = Date.now();
      await this.config.db
        .prepare(
          "UPDATE users SET email_verified = 1, email_verified_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(now, now, user.id)
        .run();

      logger.info("Email verified successfully", {
        userId: user.id,
        email: user.email,
      });

      // Send welcome email
      await this.mailSender.send({
        to: user.email,
        subject: "Welcome to EdgeAuth!",
        html: welcomeEmailTemplate(user.username),
      });

      return {
        message: "Email verified successfully! You can now log in.",
        verified: true,
      };
    } catch (error) {
      if (AppError.isAppError(error)) {
        logger.warn("Email verification failed", {
          code: error.code,
          message: error.message,
        });
        throw error;
      }

      logger.error("Email verification error", { error });
      throw errors.internal("Internal server error");
    }
  }

  /**
   * Get user profile by ID
   *
   * @param userId - User ID
   * @returns User profile or null
   */
  async getProfile(userId: string): Promise<User | null> {
    return this.userService.getUserById(userId);
  }

  /**
   * Update user profile
   *
   * @param userId - User ID
   * @param data - Profile update data
   * @returns Updated user
   */
  async updateProfile(
    userId: string,
    data: { username?: string },
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw errors.notFound("User not found");
    }

    if (data.username) {
      // Check username availability
      const usernameExists = await this.userRepository.usernameExists(
        data.username,
      );
      if (usernameExists) {
        throw errors.conflict("Username already taken");
      }

      // Update username
      const now = Date.now();
      await this.config.db
        .prepare("UPDATE users SET username = ?, updated_at = ? WHERE id = ?")
        .bind(data.username, now, userId)
        .run();

      logger.info("Profile updated", { userId, username: data.username });

      return {
        ...user,
        username: data.username,
        updatedAt: now,
      };
    }

    return user;
  }

  /**
   * Change user password
   *
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Get user with password
    const user = await this.config.db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first<User & { password_hash: string }>();

    if (!user) {
      throw errors.notFound("User not found");
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw errors.unauthorized("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const now = Date.now();
    await this.config.db
      .prepare(
        "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
      )
      .bind(newPasswordHash, now, userId)
      .run();

    logger.info("Password changed", { userId });
  }

  /**
   * Delete user account
   *
   * @param userId - User ID
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw errors.notFound("User not found");
    }

    // TODO: Should also delete related data (tokens, sessions, etc.)
    await this.config.db
      .prepare("DELETE FROM users WHERE id = ?")
      .bind(userId)
      .run();

    logger.info("Account deleted", { userId, email: user.email });
  }
}
