import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Progress Report > Download. The report answer carries a backend link
 * ({school}/dashboard/send-mail-student-get-user-gradebook/{uniqueId}?payload=<encoded>) that builds the PDF and
 * can take a minute. This route opens that link for the signed-in user with their token, so the page can fetch it,
 * show "Preparing…" until the PDF arrives, and then save it.
 * Only the `payload` (and design=k5 for the K–5 look) is taken from the browser; the school and the unique id come
 * from the session.
 */
export async function GET(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID || !me?.uniqueId) {
    return NextResponse.json({ message: "Your session has been logged out" }, { status: 401 });
  }
  if (!hasBackendOrigin()) return NextResponse.json({ message: "The backend is not configured." }, { status: 500 });

  // Keep the payload exactly as the backend wrote it (it is decoded there), only check it is present.
  if (!request.nextUrl.searchParams.get("payload")) {
    return NextResponse.json({ message: "The report link is missing." }, { status: 400 });
  }
  // The payload stays exactly as the backend wrote it (it is decoded there); design is the only other value passed on.
  const query = new URLSearchParams();
  query.set("payload", request.nextUrl.searchParams.get("payload"));
  if (request.nextUrl.searchParams.get("design") === "k5") query.set("design", "k5");
  const rawQuery = `?${query.toString()}`;

  let response;
  try {
    const base = await resolveServerBackendOrigin();
    response = await fetch(
      `${base}/${me.schoolUUID}/dashboard/send-mail-student-get-user-gradebook/${encodeURIComponent(me.uniqueId)}${rawQuery}`,
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
