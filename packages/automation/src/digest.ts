import path from 'path';
import dotenv from 'dotenv';

// Load cron.env from the automation package root before anything else
dotenv.config({ path: path.join(__dirname, '..', 'cron.env') });

import { fetchLatestPost } from './blog-fetcher';
import { generateSummary } from './summariser';
import { createDigestTicket } from './ticket-creator';
import { findByUrl, insertPending, updateStatus, closePool } from './db';

async function main(): Promise<void> {
  console.log('[digest] Starting NHI Blog Digest run…');

  // ── 1. Fetch the most recent post ─────────────────────────────────────────
  console.log('[digest] Fetching latest post from oasis.security/blog…');
  const post = await fetchLatestPost();
  console.log(`[digest] Found: "${post.title}" — ${post.url}`);

  // ── 2. De-duplication check ───────────────────────────────────────────────
  const existing = await findByUrl(post.url);
  if (existing) {
    console.log(`[digest] Already processed (status: ${existing.status}) — skipping. ${post.url}`);
    return;
  }

  // ── 3. Insert pending row to track progress ───────────────────────────────
  const id = await insertPending(post.url, post.title);
  console.log(`[digest] Inserted blog_digests row ${id} (status: pending)`);

  try {
    // ── 4. Generate AI summary ──────────────────────────────────────────────
    console.log('[digest] Generating AI summary via Claude…');
    const summaryResult = await generateSummary({
      title: post.title,
      body: post.body,
      tags: post.tags,
    });
    await updateStatus(id, 'summarised');
    console.log(`[digest] Summary generated (severity: ${summaryResult.severity}, priority: ${summaryResult.priority})`);

    // ── 5. Create Jira ticket ───────────────────────────────────────────────
    console.log('[digest] Creating Jira ticket…');
    const ticket = await createDigestTicket({ url: post.url, title: post.title }, summaryResult);
    await updateStatus(id, 'ticketed', {
      jiraIssueKey: ticket.jiraIssueKey,
      jiraUrl: ticket.jiraUrl,
    });

    console.log(`[digest] Done. Ticket created: ${ticket.jiraIssueKey} — ${ticket.jiraUrl}`);
  } catch (err) {
    await updateStatus(id, 'failed', { errorMsg: String(err) }).catch(() => {});
    throw err;
  }
}

main()
  .catch((err) => {
    console.error('[digest] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => closePool());
