import { errors } from "@deepracticex/error-handling";

export interface VerificationTokenPayload {
  userId: string;
  email: string;
  type: "email_verification" | "password_reset";
}

/**
 * Base64URL encode
 */
function base64UrlEncode(data: ArrayBuffer | string): string {
  const base64 =
    typeof data === "string"
      ? btoa(data)
      : btoa(String.fromCharCode(...new Uint8Array(data)));

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + padding;

  const binary = atob(base64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Create JWT crypto key from secret
 */
async function createKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Generate verification token
 */
async function generateToken(
  payload: VerificationTokenPayload,
  secret: string,
  expiresIn: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(tokenPayload));

  const data = `${headerEncoded}.${payloadEncoded}`;
  const encoder = new TextEncoder();
  const key = await createKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureEncoded = base64UrlEncode(signature);

  return `${data}.${signatureEncoded}`;
}

/**
 * Verify verification token
 */
async function verifyToken(
  token: string,
  secret: string,
): Promise<VerificationTokenPayload & { iat: number; exp: number }> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw errors.unauthorized("Invalid token format");
  }

  const [headerEncoded, payloadEncoded, signatureEncoded] = parts;

  const data = `${headerEncoded}.${payloadEncoded}`;
  const encoder = new TextEncoder();
  const key = await createKey(secret);
  const signature = base64UrlDecode(signatureEncoded!);

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature.buffer as ArrayBuffer,
    encoder.encode(data),
  );

  if (!isValid) {
    throw errors.unauthorized("Invalid token signature");
  }

  const payloadJson = new TextDecoder().decode(
    base64UrlDecode(payloadEncoded!),
  );
  const payload = JSON.parse(payloadJson) as VerificationTokenPayload & {
    iat: number;
    exp: number;
  };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw errors.unauthorized("Token has expired");
  }

  return payload;
}

/**
 * Generate email verification token
 *
 * @param userId - User ID
 * @param email - User email
 * @param secret - JWT secret
 * @param expiresIn - Token expiration in seconds (default: 24 hours)
 * @returns Verification token
 */
export async function generateVerificationToken(
  userId: string,
  email: string,
  secret: string,
  expiresIn: number = 86400, // 24 hours
): Promise<string> {
  const payload: VerificationTokenPayload = {
    userId,
    email,
    type: "email_verification",
  };

  return await generateToken(payload, secret, expiresIn);
}

/**
 * Generate password reset token
 *
 * @param userId - User ID
 * @param email - User email
 * @param secret - JWT secret
 * @param expiresIn - Token expiration in seconds (default: 1 hour)
 * @returns Reset token
 */
export async function generatePasswordResetToken(
  userId: string,
  email: string,
  secret: string,
  expiresIn: number = 3600, // 1 hour
): Promise<string> {
  const payload: VerificationTokenPayload = {
    userId,
    email,
    type: "password_reset",
  };

  return await generateToken(payload, secret, expiresIn);
}

/**
 * Verify verification token
 *
 * @param token - Token to verify
 * @param secret - JWT secret
 * @param expectedType - Expected token type
 * @returns Token payload
 * @throws UnauthorizedError if token is invalid or expired
 */
export async function verifyVerificationToken(
  token: string,
  secret: string,
  expectedType: "email_verification" | "password_reset",
): Promise<VerificationTokenPayload> {
  try {
    const payload = await verifyToken(token, secret);

    if (payload.type !== expectedType) {
      throw errors.unauthorized("Invalid token type");
    }

    return payload;
  } catch (error) {
    throw errors.unauthorized("Invalid or expired verification token");
  }
}
