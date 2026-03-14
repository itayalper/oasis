import type { SessionPayload } from './session';

declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by ensureSession middleware.
       * Contains the decoded JWT payload for the current user.
       */
      user?: SessionPayload;
      /**
       * Populated by ensureApiKey middleware.
       * Set when the request is authenticated via an API key rather than a session cookie.
       */
      tenantId?: string;
      /**
       * Populated by ensureApiKey middleware.
       * The user whose Jira connection should be used for API key requests.
       */
      apiKeyUserId?: string;
    }
  }
}

export {};
