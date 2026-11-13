import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders } from "@/lib/auth/session";
import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Inbox > the text of one email. The backend serves it as an HTML page ({school}/dashboard/inbox/email-content),
 * which the existing page opened straight from the browser; here the browser holds no backend login, so this route
 * opens it for the signed-in user with their token and hands the HTML back as text. The page then shows it inside a
 * sandboxed frame (no scripts) — it is never put into the page itself.
 * Only the opaque `payload` from the email answer is taken from the browser; the school comes from the session and
 * the backend checks again that the email belongs to this user.
 */
const reply = (status, message) => NextResponse.json({ message }, { status });

export async function GET(request) {
  const me = await getAccountSession();
  if (!me?.accessToken || !me?.schoolUUID) return reply(401, "Your session has been logged out");
  if (!hasBackendOrigin()) return reply(500, "The backend is not configured.");
  const payload = request.nextUrl.searchParams.get("payload");
  if (!payload) return reply(400, "This email could not be shown just now.");

  let response;
  try {
    const base = await resolveServerBackendOrigin();
    response = await fetch(`${base}/${me.schoolUUID}/dashboard/inbox/email-content?payload=${encodeURIComponent(payload)}`, {
      headers: { ...serviceKeyHeaders(), Authorization: `Bearer ${me.accessToken}` },
      cache: "no-store",
    });
  } catch {
    return reply(502, "The server could not be reached.");
  }
  if (response.status === 401) return reply(401, "Your session has been logged out");
  if (!response.ok) return reply(502, "This email could not be shown just now.");

  return new NextResponse(await response.text(), {
    status: 200,
    headers: {
      // Plain text on purpose: opened directly, this address shows source, never a live page on this origin.
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
