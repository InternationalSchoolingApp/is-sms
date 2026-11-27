import { NextResponse } from "next/server";
import { getMaintenanceDowntimeStatus } from "@/services/maintenanceApi";

/**
 * The site-wide maintenance / downtime notice (components/common/MaintenanceBanner.jsx), as a Route Handler instead of a
 * Server Action.
 *
 * Server Actions are sent one at a time by the browser. The banner is mounted in app/layout.js, so its check was the first
 * action of every page and the dashboard's own start-up (Tier 1) waited behind it — on the student dashboard audit it held
 * the page for 21.6s once. A plain request to this route runs side by side with everything else.
 *
 * Same backend call as before (services/maintenanceApi.js: GET {school}/api/v1/maintenance-downtime-status with this
 * server's service key). No sign-in needed: the banner also shows on the login and enrollment pages.
 *
 * GET ?school={schoolUUID} -> the backend's answer ({ active, message, ... }) or null.
 */
const SCHOOL = /^[A-Za-z0-9-]{1,100}$/;

export async function GET(request) {
  const school = request.nextUrl.searchParams.get("school") || "";
  if (!SCHOOL.test(school)) {
    return NextResponse.json(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const status = await getMaintenanceDowntimeStatus(school);
  return NextResponse.json(status ?? null, { headers: { "Cache-Control": "no-store" } });
}
