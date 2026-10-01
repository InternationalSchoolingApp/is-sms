import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

// `schoolUUID` now comes from the caller's own params (the page's searchParams,
// e.g. ?schoolUUID=... on the gateway's redirect back into this app), NOT an
// env var — matches the same convention services/studentSignupApi.js and
// studentSignupBackendApi.js use for `schoolUUID`.
function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (key === "schoolUUID") continue;
    query.append(key, value);
  }
  query.set("applyingFrom", "nextjs");
  return query.toString();
}

async function getPaymentInitResponse(gateway, uniqueUuid, params) {
  const baseUrl = resolveBackendOrigin();
  const schoolUUID = params?.get("schoolUUID");
  if (!hasBackendOrigin() || !schoolUUID || !uniqueUuid) return null;

  const query = buildQuery(params);
  const url = `${baseUrl}/api/v1/${encodeURIComponent(schoolUUID)}/payment/${gateway}-payment-init/${encodeURIComponent(uniqueUuid)}${query ? `?${query}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function getStripePaymentInit(uniqueUuid, params) {
  return getPaymentInitResponse("stripe", uniqueUuid, params);
}

export function getAirwallexPaymentInit(uniqueUuid, params) {
  return getPaymentInitResponse("airwallex", uniqueUuid, params);
}
