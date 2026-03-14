import fetch from 'node-fetch';
import { SummaryResult } from './summariser';

export interface CreatedTicket {
  jiraIssueKey: string;
  jiraUrl: string;
}

export async function createDigestTicket(
  post: { url: string; title: string },
  summary: SummaryResult
): Promise<CreatedTicket> {
  const backendUrl = process.env['DIGEST_BACKEND_URL'];
  const apiKey = process.env['DIGEST_API_KEY'];
  const project = process.env['DIGEST_JIRA_PROJECT'];

  if (!backendUrl) throw new Error('DIGEST_BACKEND_URL is not set');
  if (!apiKey) throw new Error('DIGEST_API_KEY is not set');
  if (!project) throw new Error('DIGEST_JIRA_PROJECT is not set');

  const body = {
    project,
    title: `[NHI Digest] ${post.title}`,
    description: `${summary.summary}\n\n---\n\n**Source:** ${post.url}`,
    severity: summary.severity,
    priority: summary.priority,
    labels: summary.labels,
  };

  const res = await fetch(`${backendUrl}/api/v1/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ticket creation failed: ${res.status} ${res.statusText} — ${text}`);
  }

  const data = (await res.json()) as { jiraIssueKey: string; jiraUrl: string };
  return { jiraIssueKey: data.jiraIssueKey, jiraUrl: data.jiraUrl };
}
