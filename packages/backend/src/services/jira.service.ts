/**
 * Jira integration service.
 *
 * Authentication strategy (A2 — POC decision):
 *   API token + Basic Auth (email:token base64-encoded).
 *   Credentials encrypted at rest via AES-256-GCM (see utils/crypto.ts).
 *
 *   Production upgrade path: OAuth 2.0 three-legged flow. The connect/
 *   disconnect/getConnection API surface stays the same; only the credential
 *   storage format and Jira auth header change.
 *
 * Connection limit (A3 — future guard rail):
 *   Each user has one Jira connection (UNIQUE tenant_id, user_id in DB).
 *   Production: enforce MAX_JIRA_CONNECTIONS_PER_TENANT before upsert — see TODO.
 *
 * Tenant fairness (future guard rail — not implemented):
 *   A per-tenant semaphore should wrap all outbound Jira calls to prevent
 *   one high-volume tenant from starving others.
 */

import {
  findJiraConnection,
  upsertJiraConnection,
  deleteJiraConnection,
  type JiraConnectionRow,
} from '../dal/jira-connections.dal';
import { encryptToken, decryptToken } from '../utils/crypto';
import { env } from '../config/env';

// ── Helpers ───────────────────────────────────────────────────────────────────

const basicAuthHeader = (jiraEmail: string, apiToken: string): string =>
  `Basic ${Buffer.from(`${jiraEmail}:${apiToken}`).toString('base64')}`;

const validateJiraUrl = (url: string): void => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Jira base URL must use HTTPS');
    if (!parsed.hostname.endsWith('.atlassian.net'))
      throw new Error('Jira base URL must be an Atlassian Cloud URL (*.atlassian.net)');
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Jira')) throw err;
    throw new Error('Invalid Jira base URL');
  }
};

const requireConnection = async (
  tenantId: string,
  userId: string
): Promise<JiraConnectionRow> => {
  const conn = await findJiraConnection(tenantId, userId);
  if (!conn) throw new Error('No Jira connection found. Please connect your Jira account first.');
  return conn;
};

// ── Public types ──────────────────────────────────────────────────────────────

export interface JiraConnectionInfo {
  connected: boolean;
  jiraBaseUrl?: string;
  jiraEmail?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface CreateIssueInput {
  project: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  labels: string[];
  dueDate?: string | null;
}

export interface CreatedIssue {
  jiraIssueKey: string;
  jiraIssueId: string;
  jiraUrl: string;
}

export class JiraApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

// ── Service functions ─────────────────────────────────────────────────────────

export const connectJira = async (
  tenantId: string,
  userId: string,
  jiraBaseUrl: string,
  jiraEmail: string,
  apiToken: string
): Promise<void> => {
  validateJiraUrl(jiraBaseUrl);

  // TODO (A3 — production guard): Count existing connections for this tenant.
  //   If count >= env.maxJiraConnectionsPerTenant throw a 429 error.
  void env.maxJiraConnectionsPerTenant;

  const cleanUrl = jiraBaseUrl.replace(/\/$/, '');

  // Verify credentials against Jira before storing them
  const testRes = await fetch(`${cleanUrl}/rest/api/3/myself`, {
    headers: { Authorization: basicAuthHeader(jiraEmail, apiToken), Accept: 'application/json' },
  });

  if (testRes.status === 401)
    throw new Error('Jira credentials are invalid. Please check your email and API token.');
  if (!testRes.ok)
    throw new Error(`Jira returned an unexpected error (${testRes.status}). Please try again.`);

  await upsertJiraConnection({
    tenantId,
    userId,
    jiraBaseUrl: cleanUrl,
    jiraEmail: jiraEmail.toLowerCase(),
    encryptedToken: encryptToken(apiToken),
  });
};

export const getConnection = async (
  tenantId: string,
  userId: string
): Promise<JiraConnectionInfo> => {
  const conn = await findJiraConnection(tenantId, userId);
  if (!conn) return { connected: false };
  return { connected: true, jiraBaseUrl: conn.jira_base_url, jiraEmail: conn.jira_email };
};

export const disconnectJira = async (tenantId: string, userId: string): Promise<void> => {
  await deleteJiraConnection(tenantId, userId);
};

export const getProjects = async (tenantId: string, userId: string): Promise<JiraProject[]> => {
  const conn = await requireConnection(tenantId, userId);
  const apiToken = decryptToken(conn.encrypted_token);

  const res = await fetch(`${conn.jira_base_url}/rest/api/3/project`, {
    headers: { Authorization: basicAuthHeader(conn.jira_email, apiToken), Accept: 'application/json' },
  });

  if (res.status === 401)
    throw new Error('Jira credentials have expired. Please reconnect your Jira account.');
  if (!res.ok) throw new JiraApiError(res.status, `Failed to fetch Jira projects (${res.status})`);

  const data = (await res.json()) as Array<{ id: string; key: string; name: string }>;
  return data.map(({ id, key, name }) => ({ id, key, name }));
};

export const createIssue = async (
  tenantId: string,
  userId: string,
  input: CreateIssueInput
): Promise<CreatedIssue> => {
  const conn = await requireConnection(tenantId, userId);
  const apiToken = decryptToken(conn.encrypted_token);

  // Severity stored as Jira label since custom fields require paid plans.
  // JQL-filterable: labels = "severity:HIGH"
  const allLabels = [`severity:${input.severity}`, ...input.labels];

  const body = {
    fields: {
      project: { key: input.project },
      summary: input.title,
      // Jira Cloud API v3 requires description in Atlassian Document Format (ADF)
      description: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: input.description }] }],
      },
      // Issue type: Bug (A4) — NHI findings are discovered security defects, not planned work.
      // If Bug is unavailable in the project, a 422 is returned with an actionable message.
      issuetype: { name: 'Bug' },
      priority: { name: input.priority },
      labels: allLabels,
      ...(input.dueDate ? { duedate: input.dueDate } : {}),
    },
  };

  const res = await fetch(`${conn.jira_base_url}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(conn.jira_email, apiToken),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401)
    throw new Error('Jira credentials have expired. Please reconnect your Jira account.');

  if (res.status === 400 || res.status === 422) {
    const err = (await res.json().catch(() => ({}))) as { errors?: Record<string, string> };
    if (JSON.stringify(err).toLowerCase().includes('issuetype')) {
      throw new JiraApiError(
        422,
        `Issue type 'Bug' is not available in project ${input.project}. ` +
          `Please add 'Bug' to the project's issue types, or contact your Jira admin.`
      );
    }
    const detail = err.errors ? JSON.stringify(err.errors) : `HTTP ${res.status}`;
    throw new JiraApiError(res.status, `Jira rejected the request: ${detail}`);
  }

  if (!res.ok) throw new JiraApiError(res.status, `Jira returned an unexpected error (${res.status})`);

  const created = (await res.json()) as { id: string; key: string };
  return {
    jiraIssueKey: created.key,
    jiraIssueId: created.id,
    jiraUrl: `${conn.jira_base_url}/browse/${created.key}`,
  };
};
