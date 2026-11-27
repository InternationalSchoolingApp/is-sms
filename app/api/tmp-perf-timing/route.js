// TEMP (2026-11-27): saves / times profile-view-content-new (full, or with ?sections=). Remove after checking.
import { NextResponse } from "next/server";
import { getAccountSession, serviceKeyHeaders, smsAuthHeaders } from "@/lib/auth/session";
import { encodePayload } from "@/utils/payloadEncoding";
import { resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { currentStudentStandard } from "@/utils/ownEnrolments";

const SP = "C:/Users/Serii/AppData/Local/Temp/claude/214a450c5694c9a9/1aca6dfe-3a9b-4105-bf49-1e82e0674220/scratchpad/";

export async function GET(request) {
  const session = await getAccountSession();
  if (!session?.userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  const dash = await currentStudentStandard();
  const ssid = Number(dash?.data?.studentStandardId) || 0;
  const params = new URL(request.url).searchParams;
  const sections = params.get("sections") ? params.get("sections").split(",").map(Number) : undefined;
  const base = await resolveServerBackendOrigin();
  const headers = { "Content-Type": "application/json", ...serviceKeyHeaders(), ...(await smsAuthHeaders()) };
  const payload = { userId: Number(session.userId), actionType: "1a", studentStandardId: ssid, ...(sections ? { sections } : {}) };
  const t = Date.now();
  const r = await fetch(`${base}/${session.schoolUUID}/dashboard/profile-view-content-new`, { method: "POST", headers, body: JSON.stringify({ payload: encodePayload(payload) }), cache: "no-store" });
  const data = await r.json();
  const save = params.get("save");
  if (save && /^[a-z0-9-]+$/.test(save)) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(`${SP}pv5-${save}.json`, JSON.stringify(data ?? null, null, 1));
  }
  return NextResponse.json({ wallMs: Date.now() - t, ssid, status: data?.status });
}
