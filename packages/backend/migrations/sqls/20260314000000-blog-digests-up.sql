-- Migration 20260314000000 — blog_digests table (UP)
--
-- Tracks every blog post the NHI Blog Digest automation has processed.
-- status lifecycle: pending → summarised → ticketed (happy path)
--                             └────────────────────→ failed  (any step)

CREATE TABLE IF NOT EXISTS blog_digests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_url        TEXT        NOT NULL UNIQUE,
  post_title      TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'summarised', 'ticketed', 'failed')),
  jira_issue_key  TEXT,
  jira_url        TEXT,
  error_msg       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_digests_status
  ON blog_digests(status);

CREATE INDEX IF NOT EXISTS idx_blog_digests_jira_issue_key
  ON blog_digests(jira_issue_key);
