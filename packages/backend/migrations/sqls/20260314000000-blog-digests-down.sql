-- Migration 20260314000000 — blog_digests table (DOWN)

DROP TABLE IF EXISTS blog_digests;

DROP INDEX IF EXISTS idx_blog_digests_status;

DROP INDEX IF EXISTS idx_blog_digests_jira_issue_key;
