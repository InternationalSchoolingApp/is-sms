import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { INTL_TIME_ZONE, LOCALE_COOKIE, normalizeLocale } from "./config";
import { loadMessages } from "./loadMessages";

// next-intl's per-request config (picked up by createNextIntlPlugin in next.config.mjs). No locale in the URL:
// the NEXT_LOCALE cookie decides, English when it is missing or not one of ours.
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  return { locale, messages: await loadMessages(locale), timeZone: INTL_TIME_ZONE };
});
