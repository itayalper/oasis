import argon2 from 'argon2';
import { findUserByEmail, createUserWithTenant } from '../dal/users.dal';
import type { SessionPayload } from '../types/session';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

/**
 * Creates a new tenant and its first user atomically.
 *
 * Assumption (A1): self-service registration creates a (tenant, user) pair.
 * Production replacement: invite flow where the tenant pre-exists and the
 * user joins via a signed email link.
 */
export const register = async (
  tenantName: string,
  email: string,
  displayName: string,
  password: string
): Promise<SessionPayload> => {
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  try {
    const { tenantId, userId } = await createUserWithTenant({
      tenantName,
      email: email.toLowerCase(),
      displayName,
      passwordHash,
    });
    return { userId, tenantId, email: email.toLowerCase() };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === '23505'
    ) {
      throw new Error('An account with this email already exists');
    }
    throw err;
  }
};

/**
 * Validates credentials and returns the session payload.
 *
 * Email is searched globally because in this POC each registration creates a
 * unique tenant — emails are de facto globally unique.
 * See migration comments for the production multi-user-per-tenant design note.
 *
 * Uses the same error message for missing user and wrong password to prevent
 * email enumeration.
 */
export const login = async (email: string, password: string): Promise<SessionPayload> => {
  const invalidMsg = 'Invalid email or password';
  const user = await findUserByEmail(email.toLowerCase());

  if (!user) throw new Error(invalidMsg);

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) throw new Error(invalidMsg);

  return { userId: user.id, tenantId: user.tenant_id, email: user.email };
};
