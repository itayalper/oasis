/**
 * Typed, lazy environment loader.
 *
 * Each property is a getter; the value is read and validated on first access,
 * not at import time. This prevents crashes on import in contexts where a
 * variable is not yet needed (e.g. running tests for a single module).
 *
 * dotenv is loaded once when this module is first imported.
 */

import { config } from 'dotenv';
import path from 'path';

// Resolve .env from the monorepo root (two levels up from packages/backend/src/config/)
config({ path: path.resolve(__dirname, '../../../../.env') });

function requireString(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function requireHex(key: string, byteLength: number): Buffer {
  const val = requireString(key);
  const expectedHexLen = byteLength * 2;
  if (val.length !== expectedHexLen || !/^[0-9a-fA-F]+$/.test(val)) {
    throw new Error(
      `${key} must be exactly ${byteLength} bytes encoded as ${expectedHexLen} hex characters`
    );
  }
  return Buffer.from(val, 'hex');
}

export const env = Object.freeze({
  get databaseUrl(): string {
    return requireString('DATABASE_URL');
  },
  get sessionSecret(): string {
    const secret = requireString('SESSION_SECRET');
    if (secret.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters');
    }
    return secret;
  },
  /**
   * 32-byte key for AES-256-GCM encryption of Jira API tokens.
   * Returned as a Buffer ready for use with Node's crypto module.
   */
  get jiraEncryptionKey(): Buffer {
    return requireHex('JIRA_ENCRYPTION_KEY', 32);
  },
  get port(): number {
    return parseInt(process.env['PORT'] ?? '3001', 10);
  },
  get nodeEnv(): string {
    return process.env['NODE_ENV'] ?? 'development';
  },
  get isProduction(): boolean {
    return process.env['NODE_ENV'] === 'production';
  },
  get sessionTtlSeconds(): number {
    return parseInt(process.env['SESSION_TTL_SECONDS'] ?? '86400', 10);
  },
  /**
   * Maximum number of Jira connections per tenant.
   * Not enforced in this POC — present as a documented hook for future use.
   * See: packages/backend/src/services/jira.service.ts
   */
  get maxJiraConnectionsPerTenant(): number {
    return parseInt(process.env['MAX_JIRA_CONNECTIONS_PER_TENANT'] ?? '10', 10);
  },
});
