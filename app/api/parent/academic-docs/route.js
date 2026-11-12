import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { parentPost } from "@/services/parentApiBase";
import { DOC_KINDS, fetchRawAcademicDocs, rawRows, rowKeyOf } from "./academicDocsSource";

/**
 * Parent > Download Academic Docs > one document (transcript, diploma or academic verification of one row).
 *
 * POST { studentUserId, kind, index, rowKey } — a POST body, never the address bar, so no child id is in a URL or
 * link. Nothing here is a backend URL or token: `index` + `rowKey` only say WHICH row of the list the server itself is
 * about to fetch. Order of checks:
 *   1. the parent is the SESSION user (never from the request);
 *   2. the child must be one of the parent's own children (get-students-by-parent), else 403;
 *   3. student-academic-details is fetched again for that child (the backend checks the mapping too) and the document
 *      is resolved from that fresh response. A list that changed since the page loaded (rowKey mismatch) is a 409;
 *   4. the backend URL is not forwarded as is: only its page name and student id / payload are taken, the host is
 *      rebuilt from this server's configured backend origin and the school from the session (no open fetch).
 * The body is streamed to the browser (not buffered). Tokens and URLs are never logged or echoed.
 */
const fail = (status, message) => NextResponse.json({ message }, { status });

export async function POST(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID || !me?.userId) return fail(401, "Your session has been logged out");
  if (!hasBackendOrigin()) return fail(500, "The backend is not configured.");

  let body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "The document could not be requested.");
  }
  const kind = DOC_KINDS[body?.kind];
  const studentUserId = String(body?.studentUserId ?? "");
  const index = body?.index;
  if (!kind || !/^\d+$/.test(studentUserId) || !Number.isInteger(index) || index < 0 || typeof body?.rowKey !== "string") {
    return fail(400, "The document could not be requested.");
  }

  const gate = await parentPost(me.schoolUUID, "/dashboard/parent/get-students-by-parent", { userId: me.userId });
  const children = Array.isArray(gate?.studentBasicDetails) ? gate.studentBasicDetails : [];
  if (!children.some((child) => String(child.userId) === studentUserId)) return fail(403, "You do not have access to this document.");

  const raw = await fetchRawAcademicDocs({ schoolUUID: me.schoolUUID, parentUserId: me.userId, studentUserId });
  if (!raw) return fail(502, "The document could not be loaded. Please try again.");
  if (String(raw.status) === "3") return fail(401, "Your session has been logged out");
  const row = rawRows(raw)[index];
  if (!row || rowKeyOf(row) !== body.rowKey) return fail(409, "The documents have changed. Please refresh the page.");
  if (kind === DOC_KINDS.transcript && row.showTranscript === "N") return fail(404, "This document is not available.");

  // Only the page and its id/payload of the backend's link are used; scheme, host and school are ours.
  let target;
  try {
    const link = new URL(String(row[kind.field] || ""));
    const match = new RegExp(`/${me.schoolUUID.replace(/[^\w-]/g, "")}/dashboard/${kind.segment}/([^/]+)$`).exec(link.pathname);
    if (!match) return fail(404, "This document is not available.");
    target = `${await resolveServerBackendOrigin()}/${me.schoolUUID}/dashboard/${kind.segment}/${match[1]}${link.search}`;
  } catch {
    return fail(404, "This document is not available.");
  }

  let response;
  try {
    response = await fetch(target, {
      method: "GET",
      headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
      cache: "no-store",
    });
  } catch {
    return fail(502, "The server could not be reached.");
  }
  if (!response.ok || !response.body) {
    return fail(response.status === 401 ? 401 : response.status === 404 ? 404 : 502, "The document could not be downloaded. Please try again.");
  }

  const type = response.headers.get("content-type") || "application/octet-stream";
  const headers = new Headers();
  headers.set("Content-Type", type);
  const length = response.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  const extension = /pdf/i.test(type) ? ".pdf" : /html/i.test(type) ? ".html" : "";
  headers.set("Content-Disposition", response.headers.get("content-disposition") || `inline; filename="${kind.fileName}${extension}"`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  return new NextResponse(response.body, { status: 200, headers });
}
