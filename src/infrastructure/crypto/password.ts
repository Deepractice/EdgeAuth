/**
 * Password hashing using Web Crypto API (PBKDF2)
 *
 * PBKDF2 parameters:
 * - Algorithm: SHA-256
 * - Iterations: 100,000 (OWASP recommendation)
 * - Salt: 16 bytes (128 bits)
 * - Hash length: 32 bytes (256 bits)
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

/**
 * Hash a password using PBKDF2
 *
 * @param password - Plain text password
 * @returns Password hash in format: salt:hash (both base64 encoded)
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import password as crypto key
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  // Derive hash using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    HASH_LENGTH * 8, // bits
  );

  // Convert to base64 and format as salt:hash
  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  return `${saltBase64}:${hashBase64}`;
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password to verify
 * @param storedHash - Stored hash in format: salt:hash
 * @returns True if password matches
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Parse stored hash
  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) {
    throw new Error('Invalid password hash format');
  }

  // Decode salt
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

  // Import password as crypto key
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  // Derive hash using same parameters
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    HASH_LENGTH * 8,
  );

  // Compare hashes using constant-time comparison
  const computedHashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // Constant-time string comparison to prevent timing attacks
  return constantTimeEqual(computedHashBase64, hashBase64);
}

/**
 * Constant-time string comparison
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
