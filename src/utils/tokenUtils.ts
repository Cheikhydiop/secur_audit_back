import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a secure random token (hex string)
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generate a UUID v4 token
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate a numeric OTP code
 */
export function generateOtpCode(length = 6): string {
  const digits = '0123456789';
  let code = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += digits[randomBytes[i] % digits.length];
  }
  return code;
}

/**
 * Hash a token for safe storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
