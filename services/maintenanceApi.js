import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

/**
 * Maintenance / downtime status — the small public banner feed shown
 * site-wide (see components/common/MaintenanceBanner.jsx).
 *
 * Endpoint: GET {schoolId}/api/v1/maintenance-downtime-status
 * Response: { active: boolean, message: string }
 *
 * Client-safe module (no next/headers), same shape as services/paymentApi.js:
 * it's a plain browser-facing GET so the banner can poll it from a
 * "use client" component. Goes through resolveBackendOrigin() so the local
 * dev proxy keeps it same-origin, exactly like the other browser-facing
 * backend calls.
 *
 * `schoolUUID` is the {schoolId} URL-path segment, passed in by the caller
 * (resolved from the URL/session), never read from an env var here.
 */

function backendUrl(schoolUUID, path) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

export async function getMaintenanceDowntimeStatus(schoolUUID) {
  const response = await fetch(backendUrl(schoolUUID, "api/v1/maintenance-downtime-status"), {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
