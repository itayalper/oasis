/**
 * Schema for POST /api/v1/tickets — the external REST API.
 * Identical fields to the UI ticket form; all required fields are explicit.
 */
export const externalCreateTicketSchema = {
  type: 'object',
  properties: {
    project: { type: 'string', minLength: 1, maxLength: 50 },
    title: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', minLength: 1 },
    severity: {
      type: 'string',
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'],
    },
    priority: {
      type: 'string',
      enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'],
    },
    labels: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 50 },
      default: [],
    },
    due_date: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      nullable: true,
    },
  },
  required: ['project', 'title', 'description', 'severity', 'priority'],
  additionalProperties: false,
} as const;
