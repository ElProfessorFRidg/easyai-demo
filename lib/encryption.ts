import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES-GCM, IV is typically 12 bytes, but 16 bytes is also common.
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // For AES-256

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== KEY_LENGTH * 2) { // Key is hex encoded
  throw new Error('Invalid ENCRYPTION_KEY. Must be a 64-character hex string (32 bytes).');
}

const key = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * Encrypts a text string.
 * @param text The text to encrypt.
 * @returns A string in the format "iv:encryptedText:authTag" (all hex encoded), or null if encryption fails.
 */
export function encrypt(text: string): string | null {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
}

/**
 * Decrypts a string that was encrypted with the encrypt function.
 * @param encryptedText The encrypted text in "iv:encryptedText:authTag" format.
 * @returns The decrypted text, or null if decryption fails.
 */
export function decrypt(encryptedText: string): string | null {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      console.error('Decryption failed: Invalid encrypted text format.');
      return null;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

// Helper for API keys specifically, as they might have different requirements
// or if we want to use a different salt/iv strategy per key (though GCM handles IV well).

/**
 * Encrypts an API key.
 * @param apiKey The API key to encrypt.
 * @returns Encrypted string or null.
 */
export function encryptApiKey(apiKey: string): string | null {
  // For API keys, we can use the same robust encryption as general text.
  return encrypt(apiKey);
}

/**
 * Decrypts an API key.
 * @param encryptedKey The encrypted API key.
 * @returns Decrypted API key or null.
 */
export function decryptApiKey(encryptedKey: string): string | null {
  return decrypt(encryptedKey);
}