import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = process.env.ENCRYPTION_KEY;

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: iv:encryptedContent:authTag
 */
export const encrypt = (text: string): string => {
  if (!text) return '';
  if (!KEY) throw new Error('ENCRYPTION_KEY is not defined in environment variables');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
};

/**
 * Decrypts a string previously encrypted with encrypt().
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  if (!KEY) throw new Error('ENCRYPTION_KEY is not defined in environment variables');

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // If not in our encrypted format, return as is (to handle legacy or plain data if any)
    return encryptedText;
  }

  const [ivHex, encrypted, tagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);
  
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
