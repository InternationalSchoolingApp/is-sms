"use server";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";


function backendUrl(schoolUUID, path) {
  const baseUrl = resolveServerBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error("A backend origin and a schoolUUID (from the URL) are required");
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

export async function getMaintenanceDowntimeStatus(schoolUUID) {
  const response = await fetch(backendUrl(schoolUUID, "api/v1/maintenance-downtime-status"));
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
