const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const;
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

export type Severity = (typeof SEVERITIES)[number];
export type Priority = (typeof PRIORITIES)[number];

export const createTicketSchema = {
  type: 'object',
  properties: {
    project: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', minLength: 1 },
    severity: { type: 'string', enum: [...SEVERITIES] },
    priority: { type: 'string', enum: [...PRIORITIES] },
    labels: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 50 },
      default: [],
    },
    dueDate: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      nullable: true,
    },
  },
  required: ['project', 'title', 'description', 'severity', 'priority'],
  additionalProperties: false,
} as const;

export const connectJiraSchema = {
  type: 'object',
  properties: {
    jiraBaseUrl: { type: 'string', format: 'uri', minLength: 1 },
    jiraEmail: { type: 'string', format: 'email' },
    apiToken: { type: 'string', minLength: 1 },
  },
  required: ['jiraBaseUrl', 'jiraEmail', 'apiToken'],
  additionalProperties: false,
} as const;

export const createApiKeySchema = {
  type: 'object',
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 100 },
  },
  required: ['label'],
  additionalProperties: false,
} as const;
