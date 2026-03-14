import { query } from '../db/client';

export interface JiraConnectionRow {
  jira_base_url: string;
  jira_email: string;
  encrypted_token: string;
}

export const findJiraConnection = async (
  tenantId: string,
  userId: string
): Promise<JiraConnectionRow | null> => {
  const result = await query(
    `SELECT jira_base_url, jira_email, encrypted_token
     FROM jira_connections
     WHERE tenant_id = $1 AND user_id = $2`,
    [tenantId, userId]
  );
  return (result.rows as JiraConnectionRow[])[0] ?? null;
};

export const upsertJiraConnection = async (params: {
  tenantId: string;
  userId: string;
  jiraBaseUrl: string;
  jiraEmail: string;
  encryptedToken: string;
}): Promise<void> => {
  await query(
    `INSERT INTO jira_connections (tenant_id, user_id, jira_base_url, jira_email, encrypted_token)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, user_id)
     DO UPDATE SET
       jira_base_url   = EXCLUDED.jira_base_url,
       jira_email      = EXCLUDED.jira_email,
       encrypted_token = EXCLUDED.encrypted_token`,
    [params.tenantId, params.userId, params.jiraBaseUrl, params.jiraEmail, params.encryptedToken]
  );
};

export const deleteJiraConnection = async (tenantId: string, userId: string): Promise<void> => {
  await query(
    'DELETE FROM jira_connections WHERE tenant_id = $1 AND user_id = $2',
    [tenantId, userId]
  );
};
