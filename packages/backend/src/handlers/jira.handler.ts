import { Request, Response } from 'express';
import {
  connectJira,
  getConnection,
  disconnectJira,
  getProjects,
  JiraApiError,
} from '../services/jira.service';

export async function handleConnect(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  const { jiraBaseUrl, jiraEmail, apiToken } = req.body as {
    jiraBaseUrl: string;
    jiraEmail: string;
    apiToken: string;
  };

  await connectJira(tenantId, userId, jiraBaseUrl, jiraEmail, apiToken);
  res.status(204).send();
}

export async function handleGetConnection(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  const info = await getConnection(tenantId, userId);
  res.json(info);
}

export async function handleDisconnect(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  await disconnectJira(tenantId, userId);
  res.status(204).send();
}

export async function handleGetProjects(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  const projects = await getProjects(tenantId, userId);
  res.json(projects);
}

export function jiraErrorStatus(err: unknown): number {
  if (err instanceof JiraApiError) {
    if (err.statusCode === 422) return 422;
    if (err.statusCode >= 500) return 502;
  }
  return 500;
}
