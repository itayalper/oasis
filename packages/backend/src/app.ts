import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import jiraRoutes from './routes/jira.routes';
import ticketRoutes from './routes/tickets.routes';
import apiKeyRoutes from './routes/apikeys.routes';
import externalRoutes from './routes/external.routes';
import { JiraApiError } from './services/jira.service';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// In development, the Vite dev server runs on port 5173.
// In production, the frontend is served by nginx which proxies /api to this
// server — same origin, so CORS is not needed.
app.use(
  cors({
    origin: process.env['NODE_ENV'] === 'production' ? false : 'http://localhost:5173',
    credentials: true,
  })
);

// ── Body parsing + cookies ────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/apikeys', apiKeyRoutes);
app.use('/api/v1', externalRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof JiraApiError) {
    const status = err.statusCode === 422 ? 422 : 502;
    res.status(status).json({ error: err.message });
    return;
  }

  if (err instanceof Error) {
    // Don't leak stack traces in production
    const message = process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message;
    res.status(500).json({ error: message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
});

export default app;
