import { Request, Response } from 'express';
import { createTicket } from '../services/tickets.service';
import { JiraApiError } from '../services/jira.service';

/**
 * POST /api/v1/tickets — external REST API for programmatic NHI ticket creation.
 *
 * Authenticated via API key (ensureApiKey middleware).
 * The key is associated with a specific user; that user's Jira connection is
 * used to create the issue.
 */
export async function handleExternalCreateTicket(req: Request, res: Response): Promise<void> {
  const tenantId = req.tenantId!;
  const userId = req.apiKeyUserId!;

  const {
    project,
    title,
    description,
    severity,
    priority,
    labels = [],
    due_date: dueDate,
  } = req.body as {
    project: string;
    title: string;
    description: string;
    severity: string;
    priority: string;
    labels?: string[];
    due_date?: string;
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

  res.status(201).json({
    jiraIssueKey: ticket.jiraIssueKey,
    jiraUrl: ticket.jiraUrl,
  });
}

export function externalErrorStatus(err: unknown): number {
  if (err instanceof JiraApiError) {
    if (err.statusCode === 422) return 422;
    if (err.statusCode >= 500) return 502;
  }
  return 500;
}
