import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Inbox > download one email attachment. The backend ({school}/dashboard/inbox/attachment) checks again that the
 * file belongs to an email this user may read and answers with a redirect to a link that works for 5 minutes.
 * The browser holds no backend login, so this route makes that call with the user's token, follows the redirect
 * itself — only to the storage host — and streams the file back with its readable name. The browser never gets a
 * link from the backend, and only the opaque `payload` of the email answer is taken from it.
 */
const STORAGE_HOSTS = (process.env.INBOX_ATTACHMENT_HOSTS || "amazonaws.com")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);
const NOT_NOW = "This attachment cannot be opened just now. Please try again later.";
const reply = (status, message) => NextResponse.json({ message }, { status });
const isStorageHost = (hostname) => STORAGE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export async function GET(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID) return reply(401, "Your session has been logged out");
  if (!hasBackendOrigin()) return reply(500, "The backend is not configured.");
  const payload = request.nextUrl.searchParams.get("payload");
  if (!payload) return reply(400, "This attachment link is not valid. Open the email in your Inbox and try again.");

  let check;
  try {
    const base = await resolveServerBackendOrigin();
    check = await fetch(`${base}/${me.schoolUUID}/dashboard/inbox/attachment?payload=${encodeURIComponent(payload)}`, {
      headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return reply(502, NOT_NOW);
  }
  if (check.status === 401) return reply(401, "Your session has been logged out");
  // 403 / 400 / 503: the backend's own plain-text reason is safe to show.
  if (check.status < 300 || check.status >= 400) {
    const reason = (await check.text().catch(() => "")).trim().slice(0, 300);
    return reply(check.status >= 400 ? check.status : 502, reason || NOT_NOW);
  }

  let link;
  try {
    link = new URL(check.headers.get("location") || "");
  } catch {
    return reply(502, NOT_NOW);
  }
  if (link.protocol !== "https:" || !isStorageHost(link.hostname.toLowerCase())) return reply(502, NOT_NOW);

  let file;
  try {
    file = await fetch(link, { cache: "no-store", redirect: "error" });
  } catch {
    return reply(502, NOT_NOW);
  }
  if (!file.ok || !file.body) return reply(502, NOT_NOW);

  // Stored names look like "123456789_homework.pdf": the part after the 9-digit prefix is the name to show.
  const stored = decodeURIComponent(link.pathname.split("/").pop() || "attachment");
  const shown = stored.replace(/^[0-9]{9}_/, "") || "attachment";
  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(shown)}`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const length = file.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new NextResponse(file.body, { status: 200, headers });
}
