import { getClientBackendOverride } from "@/utils/backendOrigin";
import { getIpLocation as getOverrideIpLocation } from "@/services/ipLocationApi";

/** Keep the visitor's browser on the same request path as a direct location lookup.
 * A Server Action can reach the backend from the Next.js host's IP instead.
 * Only the UAT backend override needs the server hop to avoid cross-origin CORS.
 */
export async function getIpLocation() {
  if (getClientBackendOverride()) return getOverrideIpLocation();

  const response = await fetch("/api/v1/ip-location", { cache: "no-store" });
  if (!response.ok) throw new Error(`ip-location responded ${response.status}`);
  const data = await response.json();
  if (data?.status !== "success") {
    throw new Error(data?.message || "IP location lookup failed");
  }
  return data;
}
