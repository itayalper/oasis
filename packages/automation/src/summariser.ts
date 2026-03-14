import Anthropic from '@anthropic-ai/sdk';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type Priority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

export interface SummaryResult {
  summary: string;
  severity: Severity;
  priority: Priority;
  labels: string[];
}

interface PostInput {
  title: string;
  body: string;
  tags: string[];
}

const SYSTEM_PROMPT = `You are a security analyst at Oasis Security, a Non-Human Identity (NHI) management platform.

NHIs include service accounts, API keys, OAuth tokens, machine certificates, secrets, and any credential used by software rather than a human. Oasis Security discovers, enriches, and governs NHIs across cloud, SaaS, and on-prem environments — helping security teams understand who owns each NHI, what it accesses, how it behaves, and when credentials should be rotated or decommissioned.

Your job is to read a blog post published by Oasis Security and produce a structured digest that a security engineer can act on. The digest will be filed as a Jira ticket and reviewed by the security team.

Severity scale (use exactly one): CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL
Priority scale (use exactly one):  Highest | High | Medium | Low | Lowest

Severity/priority guidance:
- CRITICAL / Highest  — active exploit, zero-day, or immediate remediation required
- HIGH / High         — significant attack surface, real-world breach technique described, or active CVE
- MEDIUM / Medium     — important posture improvement, notable vulnerability class, or recommended configuration change
- LOW / Low           — best-practice guidance, tooling update, industry news, or product capability overview
- INFORMATIONAL / Low — general awareness, research preview, analyst mention, or company announcement

Output a single JSON object only — no prose, no markdown fences, no commentary outside the JSON:
{
  "summary": "<400-600 word markdown summary with exactly these four sections:\\n## Overview\\n## Key Findings\\n## NHI Relevance\\n## Recommended Actions>",
  "severity": "<one of the severity values above>",
  "priority": "<one of the priority values above>",
  "labels": ["<up to 5 concise labels derived from post tags or main topics, e.g. NHI-Management, Machine-Identity, AI-Security>"]
}`;

function buildUserMessage(post: PostInput): string {
  const tagsLine = post.tags.length > 0 ? `Tags: ${post.tags.join(', ')}\n\n` : '';
  return `Title: ${post.title}\n\n${tagsLine}Content:\n${post.body}`;
}

function parseSummaryResult(raw: string): SummaryResult {
  // Strip potential markdown fences if the model wraps output despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<SummaryResult>;

  const validSeverities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
  const validPriorities: Priority[] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

  const severity = validSeverities.includes(parsed.severity as Severity)
    ? (parsed.severity as Severity)
    : 'INFORMATIONAL';
  const priority = validPriorities.includes(parsed.priority as Priority)
    ? (parsed.priority as Priority)
    : 'Low';

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : raw,
    severity,
    priority,
    labels: Array.isArray(parsed.labels) ? (parsed.labels as string[]).slice(0, 5) : [],
  };
}

export async function generateSummary(post: PostInput): Promise<SummaryResult> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const client = new Anthropic({ apiKey });
  const userMessage = buildUserMessage(post);

  let lastError: unknown;

  // Up to 2 attempts
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in Claude response');
      }

      return parseSummaryResult(textBlock.text);
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        console.warn(`[summariser] Attempt ${attempt} failed, retrying…`, err);
      }
    }
  }

  // Fallback: return minimal result so the pipeline can still create a ticket
  console.error('[summariser] Both attempts failed, using fallback summary', lastError);
  return {
    summary: `## Overview\n\nAutomated summary could not be generated.\n\n**Error:** ${String(lastError)}\n\nPlease review the source post manually.`,
    severity: 'INFORMATIONAL',
    priority: 'Low',
    labels: [],
  };
}
