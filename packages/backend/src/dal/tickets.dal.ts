import { query } from '../db/client';

export interface TicketRow {
  id: string;
  jira_project_key: string;
  jira_issue_key: string;
  title: string;
  severity: string;
  priority: string;
  jira_url: string;
  created_at: string;
}

export interface InsertTicketParams {
  tenantId: string;
  userId: string;
  jiraProjectKey: string;
  jiraIssueKey: string;
  jiraIssueId: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  labels: string[];
  dueDate: string | null;
  jiraUrl: string;
}

export const insertTicket = async (params: InsertTicketParams): Promise<TicketRow> => {
  const result = await query(
    `INSERT INTO tickets
       (tenant_id, user_id, jira_project_key, jira_issue_key, jira_issue_id,
        title, description, severity, priority, labels, due_date, jira_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id, jira_project_key, jira_issue_key, title, severity, priority, jira_url, created_at`,
    [
      params.tenantId,
      params.userId,
      params.jiraProjectKey,
      params.jiraIssueKey,
      params.jiraIssueId,
      params.title,
      params.description,
      params.severity,
      params.priority,
      params.labels,
      params.dueDate,
      params.jiraUrl,
    ]
  );
  return (result.rows as TicketRow[])[0];
};

/**
 * Returns the 10 most recent tickets for a given tenant + project.
 * Scoped strictly by tenant_id — cross-tenant access is structurally impossible
 * since tenantId is always sourced from the verified session or API key.
 */
export const findRecentTickets = async (
  tenantId: string,
  projectKey: string
): Promise<TicketRow[]> => {
  const result = await query(
    `SELECT id, jira_project_key, jira_issue_key, title, severity, priority, jira_url, created_at
     FROM tickets
     WHERE tenant_id = $1 AND jira_project_key = $2
     ORDER BY created_at DESC
     LIMIT 10`,
    [tenantId, projectKey]
  );
  return result.rows as TicketRow[];
};
