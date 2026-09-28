// One-off LIVE test against the real backend's read-only masters endpoint,
// to close the last open gap in the migration plan (payload-encoding
// verified only locally so far). Safe: GET-equivalent, no data mutation.
// Run: node scripts/liveTestMastersEndpoint.mjs

import { encodePayload } from "../utils/payloadEncoding.js";
import { getHash } from "../utils/common.js";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://192.168.8.155:8080";
const SCHOOL_UUID = process.env.NEXT_PUBLIC_SCHOOL_ID || "international-schooling";

const request = {
  authentication: { hash: getHash(), schoolUUID: SCHOOL_UUID, userType: "STUDENT" },
  requestData: { requestKey: "COUNTRY_LIST_KEY" },
};

const url = `${BASE_URL}/${SCHOOL_UUID}/api/v1/common/masters`;
const body = JSON.stringify({ payload: encodePayload(request) });

console.log("POST", url);
console.log("body:", body);

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
});

console.log("HTTP status:", res.status);
const text = await res.text();
console.log("response (first 500 chars):", text.slice(0, 500));
