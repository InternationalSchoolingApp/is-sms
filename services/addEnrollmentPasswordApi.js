"use server";

import { hasBackendOrigin, resolveServerBackendOrigin } from "@/utils/backendOrigin";
import { encodePayload, encodeRawString } from "@/utils/payloadEncoding";
import { getHash } from "@/utils/common";
import { withServiceKey } from "@/lib/auth/serviceKey";

/**
 * Add-enrollment "Create password" wrapper. Same endpoint and request shape ChangePassword.jsp uses
 * (callForResetPassword -> getRequestForReset in jquery.commonFunction.js):
 * POST {schoolId}/api/v1/common/reset-password with
 * payload = base64({ authentication: { hash, schoolUUID, userType: "COMMON", userId },
 *                    data: { password, confirmPassword } }), password fields additionally base64-encoded.
 * The UNIQUEUUID header is deliberately NOT sent: the backend would then resolve the logged-in caller (the parent)
 * instead of the new student whose id is in authentication.userId. The service key is: reset-password is a public
 * SMS API, which a server calls with its key (a browser would carry a visitor token).
 *
 * Resolves the backend's JSON ({ status, statusCode, message }) or null on a transport / non-OK failure.
 */
export async function createAddEnrollmentPassword(schoolUUID, { userId, password, confirmPassword }) {
  if (!hasBackendOrigin() || !schoolUUID || !userId) return null;
  const baseUrl = await resolveServerBackendOrigin();
  const body = {
    authentication: { hash: getHash(), schoolUUID, userType: "COMMON", userId: String(userId) },
    data: { password: encodeRawString(password), confirmPassword: encodeRawString(confirmPassword) },
  };
  try {
    const response = await fetch(`${baseUrl}/${schoolUUID}/api/v1/common/reset-password`, withServiceKey({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: encodePayload(body) }),
    }));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
