export const registerSchema = {
  type: 'object',
  properties: {
    tenantName: { type: 'string', minLength: 1, maxLength: 100 },
    email: { type: 'string', format: 'email' },
    displayName: { type: 'string', minLength: 1, maxLength: 100 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
  required: ['tenantName', 'email', 'displayName', 'password'],
  additionalProperties: false,
} as const;

export const loginSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
  required: ['email', 'password'],
  additionalProperties: false,
} as const;
