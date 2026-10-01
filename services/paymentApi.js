import { encodePayload } from "@/utils/payloadEncoding";
import { hasBackendOrigin, resolveBackendOrigin } from "@/utils/backendOrigin";

/**
 * Payment-gateway endpoints, confirmed from ClientCommonPaymentController.java.
 *
 * `schoolUUID` is an explicit argument on every call, taken from the caller's
 * own params (route/query), NOT read from an env var — matches the same
 * convention services/studentSignupApi.js and studentSignupBackendApi.js
 * already use for `schoolUUID`.
 */

function backendUrl(schoolUUID, path) {
  const baseUrl = resolveBackendOrigin();
  if (!hasBackendOrigin() || !schoolUUID) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_BASE_URL must be set (see .env.local.example) and schoolUUID must be passed in"
    );
  }
  return `${baseUrl}/${schoolUUID}/${path}`;
}

async function postPayload(schoolUUID, path, data) {
  const response = await fetch(backendUrl(schoolUUID, path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ payload: encodePayload(data) }),
  });
  return response.json();
}

export function getPaymentGatewayOptions(schoolUUID, request) {
  return postPayload(schoolUUID, "common/payment-gateway/options", request);
}

export function invokePaymentGateway(schoolUUID, request) {
  return postPayload(schoolUUID, "common/invoke-payment-gateway", request);
}

export function checkPayment(schoolUUID, request) {
  return postPayload(schoolUUID, "common/check-payment", request);
}

export function getPaymentPaidStatus(schoolUUID, request) {
  return postPayload(schoolUUID, "common/get-payment-paid-status", request);
}

export function getPaymentGatewayMaster(schoolUUID) {
  return fetch(backendUrl(schoolUUID, "pg-getway-master"), { credentials: "include" }).then((r) => r.json());
}
