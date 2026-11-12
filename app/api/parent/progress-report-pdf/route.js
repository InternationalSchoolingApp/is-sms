import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { parentPost } from "@/services/parentApiBase";
import { decodeJsonPayload, reportDataOwners } from "@/components/parent/progress/reportPayload";

/**
 * Parent > Progress Report > Download. Like /api/performance/progress-report-pdf, but for a parent, so the backend's
 * download link is not forwarded on trust: the payload (plain base64 JSON the backend wrote) names the child and the
 * parent it was issued for in its `data` ("lms-provider-child-parent"), and that is checked here against the session
 * and the parent's own children (get-students-by-parent) before the PDF is requested. The child is read from the
 * payload only; nothing about it is taken from the browser separately. The school and unique id come from the session.
 */
export async function GET(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID || !me?.uniqueId || !me?.userId) {
    return NextResponse.json({ message: "Your session has been logged out" }, { status: 401 });
  }
  if (!hasBackendOrigin()) return NextResponse.json({ message: "The backend is not configured." }, { status: 500 });

  const payload = request.nextUrl.searchParams.get("payload");
  if (!payload) return NextResponse.json({ message: "The report link is missing." }, { status: 400 });

  const owners = reportDataOwners(decodeJsonPayload(payload)?.data);
  if (!owners || owners.parentUserId !== String(me.userId)) {
    return NextResponse.json({ message: "You do not have access to this report." }, { status: 403 });
  }
  const gate = await parentPost(me.schoolUUID, "/dashboard/parent/get-students-by-parent", { userId: me.userId });
  const children = Array.isArray(gate?.studentBasicDetails) ? gate.studentBasicDetails : [];
  if (!children.some((child) => String(child.userId) === owners.studentUserId)) {
    return NextResponse.json({ message: "You do not have access to this report." }, { status: 403 });
  }

  // The payload stays exactly as the backend wrote it (it is decoded there); design is the only other value passed on.
  const query = new URLSearchParams();
  query.set("payload", payload);
  if (request.nextUrl.searchParams.get("design") === "k5") query.set("design", "k5");

  let response;
  try {
    const base = await resolveServerBackendOrigin();
    response = await fetch(
      `${base}/${me.schoolUUID}/dashboard/send-mail-student-get-user-gradebook/${encodeURIComponent(me.uniqueId)}?${query.toString()}`,
      {
        method: "GET",
        headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json({ message: "The server could not be reached." }, { status: 502 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { message: "The report could not be downloaded. Please try again." },
      { status: response.status === 401 ? 401 : 502 },
    );
  }
  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("content-type") || "application/pdf");
  const contentLength = response.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Content-Disposition", response.headers.get("content-disposition") || 'attachment; filename="progress-report.pdf"');
  headers.set("Cache-Control", "no-store");
  return new NextResponse(response.body, { status: 200, headers });
}
