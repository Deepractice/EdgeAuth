/**
 * User Reference Validator
 *
 * Provides referential integrity validation for user_id references
 * across different bounded contexts in a distributed database architecture.
 *
 * Since we use separate D1 databases (edgeauth-users, edgeauth-oauth, edgeauth-sso),
 * we cannot rely on foreign key constraints and must validate user references
 * at the domain layer.
 */

import { errors } from "@deepracticex/error-handling";

/**
 * User existence checker interface
 * Each service must implement this to validate user references
 */
export interface UserExistenceChecker {
  /**
   * Check if a user exists by ID
   * @param userId - User ID to check
   * @returns true if user exists, false otherwise
   */
  exists(userId: string): Promise<boolean>;
}

/**
 * User Reference Validator
 *
 * Validates that user_id references point to existing users
 */
export class UserReferenceValidator {
  constructor(private readonly userChecker: UserExistenceChecker) {}

  /**
   * Validate that a user exists
   * @throws NotFoundError if user does not exist
   */
  async validateUserExists(userId: string): Promise<void> {
    const exists = await this.userChecker.exists(userId);
    if (!exists) {
      throw errors.notFound(`User not found: ${userId}`);
    }
  }

  /**
   * Validate multiple user IDs
   * @throws NotFoundError if any user does not exist
   */
  async validateUsersExist(userIds: string[]): Promise<void> {
    const uniqueUserIds = Array.from(new Set(userIds));
    const results = await Promise.all(
      uniqueUserIds.map(async (userId) => ({
        userId,
        exists: await this.userChecker.exists(userId),
      })),
    );

    const missing = results.filter((r) => !r.exists).map((r) => r.userId);
    if (missing.length > 0) {
      throw errors.notFound(`Users not found: ${missing.join(", ")}`);
    }
  }
}
