/**
 * SSO Worker Types
 */

export interface Env {
  DB: D1Database;        // edgeauth-users database
  SSO_DB: D1Database;    // edgeauth-sso database
  JWT_SECRET: string;
}
