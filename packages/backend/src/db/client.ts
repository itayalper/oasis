import { Pool, QueryResult } from 'pg';
import { env } from '../config/env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env.databaseUrl });
  }
  return pool;
}

// Returns an untyped QueryResult; callers cast `.rows` to their own types.
// This avoids fighting pg's `QueryResultRow = { [column: string]: any }` constraint
// while still providing type safety at the point where rows are consumed.
export function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return getPool().query(text, params);
}
