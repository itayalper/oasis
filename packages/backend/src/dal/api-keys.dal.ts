import { query } from '../db/client';

export interface ApiKeyRow {
  id: string;
  tenant_id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

export const insertApiKey = async (params: {
  tenantId: string;
  userId: string;
  label: string;
  keyHash: string;
  keyPrefix: string;
}): Promise<{ id: string; created_at: string }> => {
  const result = await query(
    `INSERT INTO api_keys (tenant_id, user_id, label, key_hash, key_prefix)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [params.tenantId, params.userId, params.label, params.keyHash, params.keyPrefix]
  );
  return result.rows[0] as { id: string; created_at: string };
};

/** Finds all keys sharing the given prefix — used to narrow argon2 verification candidates. */
export const findApiKeysByPrefix = async (prefix: string): Promise<ApiKeyRow[]> => {
  const result = await query(
    'SELECT id, tenant_id, user_id, key_hash, key_prefix, label FROM api_keys WHERE key_prefix = $1',
    [prefix]
  );
  return result.rows as ApiKeyRow[];
};

/** Fire-and-forget last_used_at update; non-blocking by design. */
export const touchApiKeyLastUsed = async (id: string): Promise<void> => {
  await query('UPDATE api_keys SET last_used_at = now() WHERE id = $1', [id]);
};

export const findApiKeysByUser = async (
  tenantId: string,
  userId: string
): Promise<ApiKeyRow[]> => {
  const result = await query(
    `SELECT id, label, key_prefix, created_at, last_used_at
     FROM api_keys
     WHERE tenant_id = $1 AND user_id = $2
     ORDER BY created_at DESC`,
    [tenantId, userId]
  );
  return result.rows as ApiKeyRow[];
};
