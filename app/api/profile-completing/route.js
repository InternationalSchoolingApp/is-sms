import { NextResponse } from "next/server";
import { loadProfileCompletingProcess } from "@/services/profileActionsApi";

/**
 * The "Complete Your Profile" check (hooks/useProfileCompletingProcess.js), as a Route Handler instead of a Server Action.
 *
 * Server Actions are sent one at a time by the browser. This check is the slowest read of the dashboard (the setting, then
 * get-profile-completing-process, then the saved profile to fill in the values - 13-18s on the 26 Nov audit), so while it ran
 * every other action the student started (a click, a save) waited behind it. A plain request to this route runs side by side.
 *
 * Same work as before (services/profileActionsApi.js loadProfileCompletingProcess, same backend calls). The person is always
 * the signed-in user of this tab (the X-Account header the page adds, read by the session helper) - nothing is taken from
 * the browser. The answer is the same { ok, data } / { ok: false, ... } shape the action returned, so the page handles it
 * exactly as before (utils/serverCall.js callServer).
 *
 * GET -> { ok: true, data: { enabled, profileData } } | { ok: false, sessionExpired?, code?, message? }
 */
export async function GET() {
  let result;
  try {
    result = await loadProfileCompletingProcess();
  } catch {
    result = { ok: false, code: "PROFILE_COMPLETING", message: "The profile check could not be loaded right now." };
  }
  return NextResponse.json(result ?? { ok: false, message: "Empty response" }, { headers: { "Cache-Control": "no-store" } });
}
