import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BLOG_BASE = 'https://www.oasis.security';
const BLOG_INDEX = `${BLOG_BASE}/blog`;

export interface BlogPost {
  url: string;
  title: string;
  body: string;
  tags: string[];
}

export async function fetchLatestPost(): Promise<BlogPost> {
  // ── Step 1: find the most recent post URL from the blog index ──────────────
  const indexRes = await fetch(BLOG_INDEX, { headers: { 'User-Agent': 'NHI-Blog-Digest/1.0' } });
  if (!indexRes.ok) {
    throw new Error(`Failed to fetch blog index: ${indexRes.status} ${indexRes.statusText}`);
  }
  const indexHtml = await indexRes.text();
  const $index = cheerio.load(indexHtml);

  // The blog listing renders post cards as anchor elements whose href starts with /blog/
  // We skip /blog itself and pick the first distinct post path.
  let postPath: string | null = null;
  let postTitle: string | null = null;

  $index('a[href]').each((_i, el) => {
    if (postPath) return; // already found
    const href = $index(el).attr('href') ?? '';
    // Match /blog/<slug> — must have a slug segment after /blog/
    if (/^\/blog\/[^/]+$/.test(href)) {
      postPath = href;
      // Try to grab text from the link or a nearby heading
      const text = $index(el).text().trim();
      if (text) postTitle = text;
    }
  });

  if (!postPath) {
    throw new Error('Could not locate any blog post links on the index page');
  }

  const postUrl = `${BLOG_BASE}${postPath}`;

  // ── Step 2: fetch the full post ────────────────────────────────────────────
  const postRes = await fetch(postUrl, { headers: { 'User-Agent': 'NHI-Blog-Digest/1.0' } });
  if (!postRes.ok) {
    throw new Error(`Failed to fetch post ${postUrl}: ${postRes.status} ${postRes.statusText}`);
  }
  const postHtml = await postRes.text();
  const $post = cheerio.load(postHtml);

  // ── Step 3: extract title (prefer <h1> or og:title meta) ──────────────────
  const ogTitle = $post('meta[property="og:title"]').attr('content')?.trim();
  const h1Title = $post('h1').first().text().trim();
  const title = ogTitle ?? h1Title ?? postTitle ?? postPath;

  // ── Step 4: extract tags ───────────────────────────────────────────────────
  const tags: string[] = [];
  // Try common tag/category patterns
  $post('meta[property="article:tag"]').each((_i, el) => {
    const t = $post(el).attr('content')?.trim();
    if (t) tags.push(t);
  });
  if (tags.length === 0) {
    $post('[class*="tag"], [class*="category"], [class*="label"]').each((_i, el) => {
      const t = $post(el).text().trim();
      if (t && t.length < 50) tags.push(t);
    });
  }

  // ── Step 5: extract body text (strip chrome) ───────────────────────────────
  $post('nav, header, footer, script, style, noscript, [class*="nav"], [class*="header"], [class*="footer"], [class*="menu"], [class*="cookie"], [class*="banner"]').remove();

  // Prefer article / main element if present
  const articleEl = $post('article, main, [class*="article"], [class*="post-body"], [class*="content"]').first();
  const bodyText = (articleEl.length ? articleEl : $post('body'))
    .text()
    .replace(/\s{3,}/g, '\n\n') // collapse excessive whitespace
    .trim();

  return { url: postUrl, title, body: bodyText, tags: [...new Set(tags)] };
}
