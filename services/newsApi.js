"use server";

import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Website news articles — DataFetchController (@RequestMapping("/api/v1/website/")),
 * confirmed truly public/stateless (@CrossOrigin origins="*", no auth check anywhere
 * in WebsiteDataUtil), and NOT schoolId-scoped — lives entirely outside the normal
 * per-school API tree.
 *
 * Badge count: there is no real unread-count contract server-side. Legacy's own
 * #newsBadge is literally `totalNews` (the GLOBAL article count across the whole
 * dataset, not per-student), hidden client-side-only once viewed and NOT
 * recomputed from the server — confirmed by reading news.js/newsContent.js. We
 * mirror that exact (slightly odd) behavior rather than inventing a real one.
 */

async function parseJsonResponse(response) {
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/website/get-all-articles?page=&size= — page defaults to 1 (not
 * 0) server-side if omitted, size defaults to 10. No country/category filter
 * params exist. Response (WebFetchCommonDTO): code, message, list, totalNews.
 * Each list item is a PARTIAL WebArticleDTO (id, content, sourceUrl, title,
 * publishDate, country, readTime, image, sourceName, sourceLogo only — no
 * description/readingTime/status, those only come back from get-article-by-id).
 */
export async function getAllArticles({ page = 1, size = 10 } = {}) {
  if (!hasBackendOrigin()) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/api/v1/website/get-all-articles?page=${page}&size=${size}`, { method: "GET" });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/website/get-article-by-id?id=&userId= — full WebArticleDTO in
 * `data`. Side effect: with a valid userId, upserts a NewsAcknowledgement row
 * (view tracking) — i.e. simply opening an article marks it acknowledged
 * server-side (even though, per the doc above, nothing reads that back out
 * as a badge count).
 */
export async function getArticleById({ id, userId }) {
  if (!hasBackendOrigin() || !id) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/api/v1/website/get-article-by-id?id=${id}&userId=${userId ?? ""}`, { method: "GET" });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}

/**
 * POST /api/v1/website/get-article-by-ids — legacy's "View All News" button
 * (`showNewsDataByIds('4,3,2')` over the ids currently rendered). Bulk-marks
 * every id acknowledged (NewsAcknowledgement upsert per id) and returns the
 * full WebArticleDTO for each. The wire body is the standard
 * {payload: encodePayload(...)} envelope (AES-decoded server-side), not the
 * plaintext body the legacy JS itself sends — same mismatch pattern already
 * confirmed for the dashboard-family endpoints.
 */
export async function getArticlesByIds({ ids, userId }) {
  if (!hasBackendOrigin() || !ids?.length) return null;
  try {
    const baseUrl = await resolveServerBackendOrigin();
    const response = await fetch(`${baseUrl}/api/v1/website/get-article-by-ids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: encodePayload({ userId, ids: ids.join(",") }) }),
    });
    return parseJsonResponse(response);
  } catch {
    return null;
  }
}
