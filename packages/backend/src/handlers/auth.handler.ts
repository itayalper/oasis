import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { register, login } from '../services/auth.service';
import { env } from '../config/env';

function setSessionCookie(res: Response, payload: { userId: string; tenantId: string; email: string }): void {
  const token = jwt.sign(payload, env.sessionSecret, {
    expiresIn: env.sessionTtlSeconds,
  });

  res.cookie('session', token, {
    httpOnly: true,
    // In development, secure:false allows the cookie to work over plain HTTP.
    // In production (behind HTTPS), this must be true.
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: env.sessionTtlSeconds * 1000,
    path: '/',
  });
}

export async function handleRegister(req: Request, res: Response): Promise<void> {
  const { tenantName, email, displayName, password } = req.body as {
    tenantName: string;
    email: string;
    displayName: string;
    password: string;
  };

  const payload = await register(tenantName, email, displayName, password);
  setSessionCookie(res, payload);
  res.status(201).json({ userId: payload.userId, email: payload.email, tenantId: payload.tenantId });
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const payload = await login(email, password);
  setSessionCookie(res, payload);
  res.json({ userId: payload.userId, email: payload.email, tenantId: payload.tenantId });
}

export function handleLogout(_req: Request, res: Response): void {
  // Clear the cookie. The JWT itself is not blacklisted — it will expire
  // naturally. See ensureSession.ts for the full session design rationale.
  res.clearCookie('session', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  res.status(204).send();
}

export function handleMe(req: Request, res: Response): void {
  // req.user is guaranteed by ensureSession middleware
  const { userId, email, tenantId } = req.user!;
  res.json({ userId, email, tenantId });
}
