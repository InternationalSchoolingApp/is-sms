"use server";

import { headers } from "next/headers";
import { resolveServerBackendOrigin } from "@/utils/backendOrigin";

/**
 * Server Action mirror of the legacy browser-side GET {PRO_IP_API_URL} call
 * (see utils/locationFinder.js) — moved server-side so it keeps working
 * under a UAT backend override: a direct browser fetch to some OTHER
 * backend gets blocked by that backend's own CORS policy (it never put this
 * app's origin in its allow-list), same as every endpoint this app calls —
 * a server-to-server call never goes through CORS at all.
 *
 * IpLocationController's extractClientIp() (is-rest-api) reads the FIRST
 * hop of X-Forwarded-For before falling back to the raw socket address,
 * specifically so it still resolves the real site visitor's IP when called
 * through a proxy — forward the incoming request's own X-Forwarded-For here
 * so geolocation keeps resolving the actual visitor, not this server's own
 * egress IP.
 */
export async function getIpLocation() {
  const baseUrl = await resolveServerBackendOrigin();
  if (!baseUrl) return null;

  const incomingHeaders = await headers();
  const forwardedFor = incomingHeaders.get("x-forwarded-for") || "";

  const response = await fetch(`${baseUrl}/api/v1/ip-location`, {
    headers: forwardedFor ? { "X-Forwarded-For": forwardedFor } : undefined,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ip-location responded ${response.status}`);
  return response.json();
}
