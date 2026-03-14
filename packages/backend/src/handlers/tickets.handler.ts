import { Request, Response } from 'express';
import { createTicket, getRecentTickets } from '../services/tickets.service';

export async function handleCreateTicket(req: Request, res: Response): Promise<void> {
  const { userId, tenantId } = req.user!;
  const { project, title, description, severity, priority, labels = [], dueDate } = req.body as {
    project: string;
    title: string;
    description: string;
    severity: string;
    priority: string;
    labels?: string[];
    dueDate?: string;
  };

  const ticket = await createTicket(tenantId, userId, {
    project,
    title,
    description,
    severity,
    priority,
    labels,
    dueDate,
  });

  res.status(201).json(ticket);
}

export async function handleGetRecentTickets(req: Request, res: Response): Promise<void> {
  const { tenantId } = req.user!;
  const project = req.query['project'] as string | undefined;

  if (!project) {
    res.status(400).json({ error: 'Query parameter "project" is required' });
    return;
  }

  const tickets = await getRecentTickets(tenantId, project);
  res.json(tickets);
}
