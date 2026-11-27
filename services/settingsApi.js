"use server";

import { backendRequest } from "@/utils/backendRequest";

/**
 * Settings from the school's SETTINGS table - the Next.js side of the legacy JS helper
 * getSettingsByTypeAndKey(type, key) (jquery.commonFunction.js): GET {school}/api/v1/get-setting?metaType=&metaKey=
 * answers { data: { metaValue } } (a missing row comes back as ""). Goes through the central backend helper,
 * so the session is validated first and a session-out answer is reported as { sessionExpired: true }.
 *
 * Both functions return { ok: true, data } / { ok: false, code, message, sessionExpired? }; call them through
 * callServer() (utils/serverCall.js) on the client.
 */

/** The setting's raw value as a string ("" when the setting does not exist). */
export async function getSettingsByTypeAndKey(type, key) {
  if (!type || !key) return { ok: false, code: "V001", message: "A setting type and key are required." };
  const result = await backendRequest({ path: "api/v1/get-setting", method: "GET", query: { metaType: type, metaKey: key }, checkSession: null });
  if (!result.ok) return result;
  const value = result.data?.data?.metaValue;
  return { ok: true, data: value == null ? "" : String(value) };
}

/**
 * The setting as a number: data = { value, empty }. `value` is a whole number >= 0, or null when the setting is
 * missing or not a valid number; `empty` is true when the setting is missing / blank (so the caller can tell
 * "not configured" from "configured badly"). Nothing here invents a default.
 */
export async function getNumericSettingByTypeAndKey(type, key) {
  const result = await getSettingsByTypeAndKey(type, key);
  if (!result.ok) return result;
  const text = String(result.data).trim();
  const value = /^\d+$/.test(text) ? Number(text) : NaN;
  return { ok: true, data: { value: Number.isSafeInteger(value) ? value : null, empty: text === "" } };
}

/**
 * Several settings of one type in one call: data = { [key]: string | null } (the raw value like getSettingsByTypeAndKey, or null
 * when that one read failed - a single failed key never fails the rest). The reads run side by side on the server, so the page
 * pays one queued server action instead of one per key. A session-out answer on any of them is reported as a whole.
 */
export async function getSettingsByTypeAndKeys(type, keys) {
  if (!type || !Array.isArray(keys) || !keys.length || keys.length > 10) return { ok: false, code: "V001", message: "A setting type and 1 to 10 keys are required." };
  const results = await Promise.all(keys.map((key) => getSettingsByTypeAndKey(type, key)));
  const expired = results.find((result) => result?.sessionExpired);
  if (expired) return expired;
  const data = {};
  keys.forEach((key, index) => {
    data[key] = results[index]?.ok ? results[index].data : null;
  });
  return { ok: true, data };
}
