export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 204) return undefined as unknown as T;

  const body = await res.json().catch(() => ({ error: 'Unexpected response from server' }));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (body as { error?: string }).error ?? 'Request failed',
      (body as { details?: string[] }).details
    );
  }

  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserInfo {
  userId: string;
  email: string;
  tenantId: string;
}

export const authApi = {
  register: (body: {
    tenantName: string;
    email: string;
    displayName: string;
    password: string;
  }) => apiFetch<UserInfo>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch<UserInfo>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),

  me: () => apiFetch<UserInfo>('/api/auth/me'),
};

// ── Jira ──────────────────────────────────────────────────────────────────────

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

export const jiraApi = {
  connect: (body: { jiraBaseUrl: string; jiraEmail: string; apiToken: string }) =>
    apiFetch<void>('/api/jira/connect', { method: 'POST', body: JSON.stringify(body) }),

  getConnection: () => apiFetch<JiraConnectionInfo>('/api/jira/connection'),

  disconnect: () => apiFetch<void>('/api/jira/connection', { method: 'DELETE' }),

  getProjects: () => apiFetch<JiraProject[]>('/api/jira/projects'),
};

// ── Tickets ───────────────────────────────────────────────────────────────────

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

export interface CreateTicketBody {
  project: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  labels: string[];
  dueDate?: string;
}

export const ticketsApi = {
  create: (body: CreateTicketBody) =>
    apiFetch<TicketRecord>('/api/tickets', { method: 'POST', body: JSON.stringify(body) }),

  getRecent: (project: string) =>
    apiFetch<TicketRecord[]>(`/api/tickets?project=${encodeURIComponent(project)}`),
};

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKeyInfo {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyCreated extends ApiKeyInfo {
  rawKey: string;
}

export const apiKeysApi = {
  create: (body: { label: string }) =>
    apiFetch<ApiKeyCreated>('/api/apikeys', { method: 'POST', body: JSON.stringify(body) }),

  list: () => apiFetch<ApiKeyInfo[]>('/api/apikeys'),
};
