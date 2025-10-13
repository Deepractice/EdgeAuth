/**
 * OAuth Client Entity
 *
 * Represents a third-party application that wants to use OAuth 2.0
 */

export interface OAuthClient {
  id: string; // Client ID (public)
  secret: string; // Client Secret (confidential)
  name: string; // Display name
  description?: string;
  redirectUris: string[]; // Allowed redirect URIs
  scopes: string[]; // Allowed scopes
  grantTypes: GrantType[]; // Allowed grant types
  createdAt: number; // Unix timestamp
  updatedAt: number;
}

export type GrantType =
  | "authorization_code"
  | "client_credentials"
  | "refresh_token";

export interface CreateOAuthClientRequest {
  name: string;
  description?: string;
  redirectUris: string[];
  scopes?: string[];
  grantTypes?: GrantType[];
}

/**
 * Validate redirect URI
 */
export function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    // Must be https in production (allow http for localhost in dev)
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return false;
    }
    // Cannot have fragments
    if (url.hash) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if client is allowed to use a specific redirect URI
 */
export function isAllowedRedirectUri(
  client: OAuthClient,
  uri: string,
): boolean {
  return client.redirectUris.includes(uri);
}

/**
 * Check if client is allowed to use a specific grant type
 */
export function isAllowedGrantType(
  client: OAuthClient,
  grantType: GrantType,
): boolean {
  return client.grantTypes.includes(grantType);
}
