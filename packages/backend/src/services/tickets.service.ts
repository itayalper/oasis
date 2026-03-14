/**
 * Ticket service — orchestrates Jira issue creation and local record storage.
 *
 * Recent ticket retrieval (A5 — POC decision):
 *   Tickets are stored in PostgreSQL at creation time and fetched directly.
 *
 *   Production upgrade path: memoize GET /api/tickets in Redis using
 *   sha256(tenantId + projectKey) as the cache key with a configurable TTL
 *   (30s–5min). On cache miss fall back to the DAL query. Invalidate the
 *   cache entry on every successful createTicket for the same (tenant, project).
 */

import { insertTicket, findRecentTickets, type TicketRow } from '../dal/tickets.dal';
import { createIssue, type CreateIssueInput } from './jira.service';

export interface TicketInput extends CreateIssueInput {
  project: string;
}

export interface TicketRecord {
  id: string;
  jiraProjectKey: string;
  jiraIssueKey: string;
  title: string;
  severity: string;
  priority: string;
  jiraUrl: string;
  createdAt: string;
}

const toRecord = (row: TicketRow): TicketRecord => ({
  id: row.id,
  jiraProjectKey: row.jira_project_key,
  jiraIssueKey: row.jira_issue_key,
  title: row.title,
  severity: row.severity,
  priority: row.priority,
  jiraUrl: row.jira_url,
  createdAt: row.created_at,
});

export const createTicket = async (
  tenantId: string,
  userId: string,
  input: TicketInput
): Promise<TicketRecord> => {
  const { jiraIssueKey, jiraIssueId, jiraUrl } = await createIssue(tenantId, userId, input);

  const row = await insertTicket({
    tenantId,
    userId,
    jiraProjectKey: input.project,
    jiraIssueKey,
    jiraIssueId,
    title: input.title,
    description: input.description,
    severity: input.severity,
    priority: input.priority,
    labels: input.labels,
    dueDate: input.dueDate ?? null,
    jiraUrl,
  });

  return toRecord(row);
};

export const getRecentTickets = async (
  tenantId: string,
  projectKey: string
): Promise<TicketRecord[]> => {
  const rows = await findRecentTickets(tenantId, projectKey);
  return rows.map(toRecord);
};
