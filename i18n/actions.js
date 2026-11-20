"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, normalizeLocale } from "./config";

/** Stores the dashboard language for this browser. The caller then router.refresh()es so the layout re-reads it. */
export async function setUserLocale(locale) {
  const value = normalizeLocale(locale);
  const store = await cookies();
  store.set(LOCALE_COOKIE, value, { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" });
  return value;
}
