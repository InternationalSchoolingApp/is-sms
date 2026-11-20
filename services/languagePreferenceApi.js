"use server";

import { backendRequest } from "@/utils/backendRequest";
import { isLocale, normalizeLocale } from "@/i18n/config";

/**
 * The student's dashboard language as saved on SMS (USER_LANGUAGE_PREFERENCE, is-rest-api
 * StudentLanguagePreferenceController), so a new device opens in the language they picked elsewhere.
 * Both return { ok, data } / { ok: false, ... } like every backendRequest service; neither is allowed to break the page.
 */

/** data = the saved locale ("fr", ...) or "" when the student never chose one. */
export async function getLanguagePreference() {
  const result = await backendRequest({ path: "api/v1/student/language-preference", method: "GET", checkSession: null });
  if (!result.ok) return result;
  const saved = String(result.data?.data?.language || "").trim().toLowerCase();
  return { ok: true, data: isLocale(saved) ? saved : "" };
}

/** Saves `locale` for the signed-in user (the id comes from the session, never from the browser). */
export async function saveLanguagePreference(locale) {
  const language = normalizeLocale(locale);
  return backendRequest({
    path: "api/v1/student/language-preference",
    method: "POST",
    checkSession: null,
    buildBody: ({ userId }) => ({ userId, language }),
  });
}
