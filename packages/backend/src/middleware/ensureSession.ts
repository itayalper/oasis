/**
 * Session design — cookie-only, no database table:
 *
 * On login/register the server signs a JWT (HS256, SESSION_SECRET) containing
 * { userId, tenantId, email } and sends it as an HTTP-only Secure SameSite=Strict
 * cookie named "session".
 *
 * On every protected request this middleware verifies the cookie signature and
 * expiry, then attaches the decoded payload to req.user.
 *
 * Revocation model (POC):
 *   Logout clears the cookie client-side (Max-Age=0). The JWT itself is NOT
 *   blacklisted — it expires naturally per its `exp` claim. This is acceptable
 *   for a POC where TTL-based expiry is sufficient.
 *
 * Production upgrade path:
 *   For immediate revocation (forced logout, account deactivation) the product
 *   team must decide between two approaches:
 *     a) Redis token blacklist keyed by `jti` claim — low latency, requires Redis.
 *     b) Opaque session IDs in a session store (Redis + express-session) — standard
 *        but adds a DB read on every request.
 *   This is a product decision: option (a) tolerates up to TTL-duration access
 *   after logout; option (b) provides immediate revocation.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { SessionPayload } from '../types/session';

export function ensureSession(req: Request, res: Response, next: NextFunction): void {
  const token: string | undefined = req.cookies?.session;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.sessionSecret) as SessionPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
