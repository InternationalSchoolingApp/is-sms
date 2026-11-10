"use server";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { withServiceKey } from "@/lib/auth/session";


async function backendUrl(schoolUUID, path) {
  const baseUrl = await resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

export async function getMaintenanceDowntimeStatus(schoolUUID) {
  try {
    const response = await fetch(await backendUrl(schoolUUID, "api/v1/maintenance-downtime-status"), withServiceKey());
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    // Backend unreachable (e.g. a tester's UAT override points at a dead
    // host) — the banner just has nothing to show, not a crash.
    return null;
  }
}
