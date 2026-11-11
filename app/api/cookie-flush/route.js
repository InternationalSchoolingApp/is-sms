import { NextResponse } from "next/server";

/**
 * GET /api/cookie-flush: expires every cookie this browser holds for THIS host, then answers with a 1x1 GIF.
 * It is called as a hidden <img> from the SMS site's cookie-flush page (/{school}/common/cookie-flush), so
 * one link there clears both sites. An image, because the SMS page cannot read a cross-origin JSON answer
 * without CORS but does see an image load.
 *
 * Host-only on purpose: each cookie is expired with the same name and NO Domain, so a cookie shared on the
 * parent domain (.internationalschooling.org) is left alone. Needs no sign-in: it only removes the caller's own
 * cookies. (The proxy.js matcher does not cover /api/*; without this route the request fell through to the
 * SMS fallback rewrite and came back 401.)
 */
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request) {
  const secureRequest =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.hostname === "localhost";

  const response = new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store",
      // the SMS site (another origin of this site) shows it as an <img>
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });

  for (const { name } of request.cookies.getAll()) {
    const prefixed = name.startsWith("__Host-") || name.startsWith("__Secure-");
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: secureRequest || prefixed,
    });
  }
  return response;
}
