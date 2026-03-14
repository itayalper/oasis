/**
 * Symmetric encryption utilities for secrets at rest (Jira API tokens).
 * Algorithm: AES-256-GCM — provides both confidentiality and integrity.
 * Key source: JIRA_ENCRYPTION_KEY env var (32 bytes / 64 hex chars).
 *
 * Storage format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * Each call to encryptToken generates a fresh random IV, so encrypting the
 * same plaintext twice produces different ciphertext — no IV reuse.
 */

import crypto from 'crypto';
import { env } from '../config/env';

export const encryptToken = (plaintext: string): string => {
  const key = env.jiraEncryptionKey;
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decryptToken = (stored: string): string => {
  const key = env.jiraEncryptionKey;
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted token');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
};
