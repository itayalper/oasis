import { Request, Response } from 'express';
import { createApiKey, listApiKeys } from '../services/apikeys.service';

export async function handleCreateApiKey(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  const { label } = req.body as { label: string };

  const created = await createApiKey(tenantId, userId, label);

  // The raw key is returned once and never stored.
  // The client must copy it immediately — it cannot be retrieved again.
  res.status(201).json(created);
}

export async function handleListApiKeys(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  const keys = await listApiKeys(tenantId, userId);
  res.json(keys);
}
