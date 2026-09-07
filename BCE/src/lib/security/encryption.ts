import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM

function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || 
                 process.env.SUPABASE_SERVICE_ROLE_KEY || 
                 process.env.NEXTAUTH_SECRET || 
                 'smart-learn-byok-master-key-default-salt-2026';
  
  // Use SHA-256 to ensure a 32-byte (256-bit) key
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts plain text string using AES-256-GCM.
 * Output format: ivHex:authTagHex:ciphertextHex
 */
export function encryptKey(plainKey: string): string {
  if (!plainKey || typeof plainKey !== 'string') {
    throw new Error('Invalid key provided for encryption');
  }
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext hex string back to plain text.
 */
export function decryptKey(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.includes(':')) {
    throw new Error('Invalid ciphertext format');
  }
  
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload structure');
  }
  
  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Masks an API key for safe UI display (e.g. ••••••••abcd).
 */
export function maskKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 4) {
    return '••••' + trimmed;
  }
  const lastFour = trimmed.slice(-4);
  return '••••••••' + lastFour;
}
