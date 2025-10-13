/**
 * OAuth validation logic
 */

import { errors } from "@deepracticex/error-handling";
import type { OAuthClient } from "./client.js";

/**
 * Allowed redirect URI schemes
 */
const ALLOWED_SCHEMES = ["https:", "http:"];

/**
 * Localhost hostnames (allowed with http)
 */
const LOCALHOST_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/**
 * Validate redirect URI
 *
 * OAuth 2.0 Security Best Practices:
 * - HTTPS required for non-localhost
 * - No javascript:, data:, or other dangerous schemes
 * - Must be absolute URI
 */
export function validateRedirectUri(uri: string): void {
  if (!uri || typeof uri !== "string") {
    throw errors.validation("redirect_uri is required");
  }

  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    throw errors.validation("Invalid redirect_uri format");
  }

  // Check scheme
  if (!ALLOWED_SCHEMES.includes(url.protocol)) {
    throw errors.validation("Invalid redirect_uri scheme");
  }

  // HTTP only allowed for localhost
  if (url.protocol === "http:" && !LOCALHOST_HOSTNAMES.includes(url.hostname)) {
    throw errors.validation("redirect_uri must use https for non-localhost");
  }

  // Reject fragment
  if (url.hash) {
    throw errors.validation("redirect_uri must not contain fragment");
  }
}

// Note: isAllowedRedirectUri is exported from client.ts

/**
 * Validate OAuth scope format
 */
export function validateScope(scope: string): void {
  if (!scope || typeof scope !== "string") {
    throw errors.validation("scope is required");
  }

  // Scopes are space-separated
  const scopes = scope.split(" ");

  if (scopes.length === 0) {
    throw errors.validation("At least one scope is required");
  }

  // Each scope should be alphanumeric with optional colons and underscores
  const scopeRegex = /^[a-zA-Z0-9_:]+$/;
  for (const s of scopes) {
    if (!scopeRegex.test(s)) {
      throw errors.validation(`Invalid scope format: ${s}`);
    }
  }
}

/**
 * Check if requested scopes are allowed for client
 */
export function areScopesAllowed(
  client: OAuthClient,
  requestedScopes: string[],
): boolean {
  return requestedScopes.every((scope) => client.scopes.includes(scope));
}

/**
 * Validate grant type
 */
export function validateGrantType(grantType: string): void {
  const validGrantTypes = [
    "authorization_code",
    "client_credentials",
    "refresh_token",
  ];

  if (!grantType || !validGrantTypes.includes(grantType)) {
    throw errors.validation("Invalid grant_type");
  }
}

/**
 * Check if grant type is allowed for client
 */
export function isGrantTypeAllowed(
  client: OAuthClient,
  grantType: "authorization_code" | "client_credentials" | "refresh_token",
): boolean {
  return client.grantTypes.includes(grantType);
}

// Note: isAuthCodeValid is exported from authorization-code.ts

/**
 * Validate PKCE code challenge
 */
export function validateCodeChallenge(
  codeChallenge: string,
  codeChallengeMethod: "S256" | "plain",
): void {
  if (!codeChallenge) {
    throw errors.validation("code_challenge is required");
  }

  if (!["S256", "plain"].includes(codeChallengeMethod)) {
    throw errors.validation("Invalid code_challenge_method");
  }

  // Base64 URL-encoded string
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  if (!base64UrlRegex.test(codeChallenge)) {
    throw errors.validation("Invalid code_challenge format");
  }

  // Length requirements
  if (codeChallenge.length < 43 || codeChallenge.length > 128) {
    throw errors.validation("code_challenge must be 43-128 characters");
  }
}

// Note: verifyPKCE is exported from authorization-code.ts

/**
 * Validate client credentials
 */
export function validateClientCredentials(
  clientId: string,
  clientSecret: string,
): void {
  if (!clientId || typeof clientId !== "string") {
    throw errors.validation("client_id is required");
  }

  if (!clientSecret || typeof clientSecret !== "string") {
    throw errors.validation("client_secret is required");
  }
}

/**
 * Verify client secret
 */
export function verifyClientSecret(
  client: OAuthClient,
  providedSecret: string,
): boolean {
  return client.secret === providedSecret;
}

/**
 * Validate client name
 */
export function validateClientName(name: string): void {
  if (!name || typeof name !== "string") {
    throw errors.validation("Client name is required");
  }

  if (name.length < 3 || name.length > 100) {
    throw errors.validation("Client name must be 3-100 characters");
  }
}

/**
 * Validate client redirect URIs
 */
export function validateClientRedirectUris(redirectUris: string[]): void {
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    throw errors.validation("At least one redirect_uri is required");
  }

  for (const uri of redirectUris) {
    validateRedirectUri(uri);
  }
}

/**
 * Validate client scopes
 */
export function validateClientScopes(scopes: string[]): void {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw errors.validation("At least one scope is required");
  }

  for (const scope of scopes) {
    const scopeRegex = /^[a-zA-Z0-9_:]+$/;
    if (!scopeRegex.test(scope)) {
      throw errors.validation(`Invalid scope format: ${scope}`);
    }
  }
}
