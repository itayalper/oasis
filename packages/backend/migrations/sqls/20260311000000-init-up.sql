-- Migration 20260311000000 — initial schema (UP)
--
-- Multi-tenancy: every data table carries tenant_id.
-- All application queries must include WHERE tenant_id = $n.
-- The service/DAL layers enforce this — tenant_id is always sourced from
-- the verified session or API key, never from the request body.

CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email uniqueness is enforced globally (not just per-tenant) for this POC.
-- Rationale: self-service registration creates one tenant per user, so
-- per-tenant uniqueness would be functionally equivalent. In a production
-- system with an invite flow (multiple users per tenant), this constraint
-- would change to UNIQUE(tenant_id, email) and login would require the user
-- to identify their workspace (e.g. via subdomain routing).
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  password_hash TEXT NOT NULL,  -- argon2id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

-- Jira API credentials, encrypted at rest (AES-256-GCM).
-- One connection per user enforced by the UNIQUE constraint.
-- Production guard: the DAL should check MAX_JIRA_CONNECTIONS_PER_TENANT
-- before INSERT — see jira.service.ts TODO comment.
CREATE TABLE IF NOT EXISTS jira_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jira_base_url   TEXT NOT NULL,
  jira_email      TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,  -- format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

-- Tickets created through this application.
-- Severity is stored as a Jira label (e.g. severity:HIGH) because custom
-- fields require paid Jira plans and cannot be assumed to exist.
CREATE TABLE IF NOT EXISTS tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jira_project_key TEXT NOT NULL,
  jira_issue_key   TEXT NOT NULL,
  jira_issue_id    TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  severity         TEXT NOT NULL,  -- CRITICAL|HIGH|MEDIUM|LOW|INFORMATIONAL
  priority         TEXT NOT NULL,  -- Highest|High|Medium|Low|Lowest
  labels           TEXT[] NOT NULL DEFAULT '{}',
  due_date         DATE,
  jira_url         TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API keys for external systems (CI/CD pipelines, scanners).
-- Only the argon2id hash is stored; the raw key is returned once at creation.
-- user_id identifies whose Jira connection to use for the external API.
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  key_hash     TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,  -- first 8 chars; used to narrow hash lookup
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_tenant
  ON users(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tickets_tenant_project_created
  ON tickets(tenant_id, jira_project_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_prefix
  ON api_keys(key_prefix);

CREATE INDEX IF NOT EXISTS idx_jira_connections_user
  ON jira_connections(tenant_id, user_id);
