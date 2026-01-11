import * as crypto from 'crypto';

/**
 * Generate SHA256 hash of input string and return as hex string
 */
export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
