import { getPool, query } from '../db/client';

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

/**
 * Finds a user by email across all tenants.
 * Safe in this POC because email is globally unique (see migration comments).
 */
export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const result = await query(
    'SELECT id, tenant_id, email, password_hash, display_name FROM users WHERE email = $1',
    [email]
  );
  return (result.rows as UserRow[])[0] ?? null;
};

/**
 * Creates a tenant and its first user atomically in a single transaction.
 * Returns the generated IDs.
 */
export const createUserWithTenant = async (params: {
  tenantName: string;
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<{ tenantId: string; userId: string }> => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenantResult = await client.query(
      'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
      [params.tenantName]
    );
    const tenantId = (tenantResult.rows[0] as { id: string }).id;

    const userResult = await client.query(
      `INSERT INTO users (tenant_id, email, display_name, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tenantId, params.email, params.displayName, params.passwordHash]
    );
    const userId = (userResult.rows[0] as { id: string }).id;

    await client.query('COMMIT');
    return { tenantId, userId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
