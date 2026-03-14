import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> {
  return getPool().query(sql, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ── blog_digests DAL ──────────────────────────────────────────────────────────

export type DigestStatus = 'pending' | 'summarised' | 'ticketed' | 'failed';

export interface DigestRow {
  id: string;
  post_url: string;
  post_title: string;
  status: DigestStatus;
  jira_issue_key: string | null;
  jira_url: string | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

export async function findByUrl(url: string): Promise<DigestRow | null> {
  const result = await query(
    'SELECT * FROM blog_digests WHERE post_url = $1',
    [url]
  );
  return (result.rows as DigestRow[])[0] ?? null;
}

export async function insertPending(url: string, title: string): Promise<string> {
  const result = await query(
    `INSERT INTO blog_digests (post_url, post_title, status)
     VALUES ($1, $2, 'pending')
     RETURNING id`,
    [url, title]
  );
  return ((result.rows as { id: string }[])[0]).id;
}

export interface UpdateExtras {
  jiraIssueKey?: string;
  jiraUrl?: string;
  errorMsg?: string;
}

export async function updateStatus(
  id: string,
  status: DigestStatus,
  extras: UpdateExtras = {}
): Promise<void> {
  await query(
    `UPDATE blog_digests
     SET status         = $2,
         jira_issue_key = COALESCE($3, jira_issue_key),
         jira_url       = COALESCE($4, jira_url),
         error_msg      = COALESCE($5, error_msg),
         updated_at     = now()
     WHERE id = $1`,
    [id, status, extras.jiraIssueKey ?? null, extras.jiraUrl ?? null, extras.errorMsg ?? null]
  );
}
