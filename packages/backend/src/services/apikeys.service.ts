import crypto from 'crypto';
import argon2 from 'argon2';
import { insertApiKey, findApiKeysByUser } from '../dal/api-keys.dal';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

export interface ApiKeyCreated {
  id: string;
  label: string;
  keyPrefix: string;
  /** Raw key — returned once and never stored. User must copy immediately. */
  rawKey: string;
  createdAt: string;
}

export interface ApiKeyInfo {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Generates a new API key, stores its argon2id hash, and returns the raw key.
 * The raw key is never persisted — if lost the user must generate a new one.
 */
export const createApiKey = async (
  tenantId: string,
  userId: string,
  label: string
): Promise<ApiKeyCreated> => {
  const rawKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = await argon2.hash(rawKey, ARGON2_OPTIONS);

  const row = await insertApiKey({ tenantId, userId, label, keyHash, keyPrefix });

  return { id: row.id, label, keyPrefix, rawKey, createdAt: row.created_at };
};

export const listApiKeys = async (tenantId: string, userId: string): Promise<ApiKeyInfo[]> => {
  const rows = await findApiKeysByUser(tenantId, userId);
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    keyPrefix: r.key_prefix,
    createdAt: r.created_at,
    lastUsedAt: r.last_used_at,
  }));
};
