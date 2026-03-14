-- Migration 20260311215302 — initial schema (DOWN)
-- Drops all tables in reverse dependency order to respect FK constraints.

DROP INDEX IF EXISTS idx_jira_connections_user;
DROP INDEX IF EXISTS idx_api_keys_prefix;
DROP INDEX IF EXISTS idx_tickets_tenant_project_created;
DROP INDEX IF EXISTS idx_users_tenant;
DROP INDEX IF EXISTS idx_users_email;

DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS jira_connections;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;
