import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { findApiKeysByPrefix, touchApiKeyLastUsed } from '../dal/api-keys.dal';

export const ensureApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('ApiKey ')) {
    res
      .status(401)
      .json({ error: 'Missing or malformed API key. Expected: Authorization: ApiKey <key>' });
    return;
  }

  const rawKey = header.slice('ApiKey '.length).trim();
  if (rawKey.length < 8) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Narrow the lookup by key prefix before running the expensive argon2 verify
  const prefix = rawKey.slice(0, 8);
  const candidates = await findApiKeysByPrefix(prefix);

  if (candidates.length === 0) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  let matchedId: string | null = null;
  let matchedTenantId: string | null = null;
  let matchedUserId: string | null = null;

  for (const candidate of candidates) {
    try {
      if (await argon2.verify(candidate.key_hash, rawKey)) {
        matchedId = candidate.id;
        matchedTenantId = candidate.tenant_id;
        matchedUserId = candidate.user_id;
        break;
      }
    } catch {
      // argon2 verification errors treated as no-match
    }
  }

  if (!matchedId || !matchedTenantId || !matchedUserId) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Update last_used_at without blocking the response
  touchApiKeyLastUsed(matchedId).catch(() => {});

  req.tenantId = matchedTenantId;
  req.apiKeyUserId = matchedUserId;
  next();
};
