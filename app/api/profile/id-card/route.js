import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * My Profile > Download Student ID Card. The profile answer carries a backend link
 * ({school}/dashboard/student/id-card-pdf?payload=<encrypted>); the browser has no backend session, so this
 * route opens that same link for the signed-in user with their token and sends the PDF back.
 * Only the encrypted `payload` is taken from the browser; the school comes from the session, and the backend
 * checks that the card belongs to this user (UserAccessGuard, 403 otherwise).
 */
export async function GET(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID) return NextResponse.json({ message: "Your session has been logged out" }, { status: 401 });
  if (!hasBackendOrigin()) return NextResponse.json({ message: "The backend is not configured." }, { status: 500 });

  // Keep the payload exactly as the backend wrote it (it is decrypted there), only re-check it is present.
  const rawQuery = request.nextUrl.search || "";
  if (!request.nextUrl.searchParams.get("payload")) return NextResponse.json({ message: "The ID card link is missing." }, { status: 400 });

  let response;
  try {
    const base = await resolveServerBackendOrigin();
    response = await fetch(`${base}/${me.schoolUUID}/dashboard/student/id-card-pdf${rawQuery}`, {
      method: "GET",
      headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "The server could not be reached." }, { status: 502 });
  }
  if (!response.ok) {
    return NextResponse.json({ message: "The ID card could not be downloaded." }, { status: response.status === 401 ? 401 : response.status || 502 });
  }
  // The backend answers 200 with an empty body when it could not make the card (its catch-all), so read it
  // (a card is a small PDF) and turn "nothing" into an error instead of an empty download.
  const file = await response.arrayBuffer().catch(() => null);
  if (!file || file.byteLength === 0) {
    return NextResponse.json({ message: "Your ID card is not ready yet. Please try again later." }, { status: 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("content-type") || "application/pdf");
  headers.set("Content-Disposition", response.headers.get("content-disposition") || 'inline; filename="student-id-card.pdf"');
  headers.set("Cache-Control", "no-store");
  return new NextResponse(file, { status: 200, headers });
}
