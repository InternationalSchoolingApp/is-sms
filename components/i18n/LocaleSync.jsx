"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { LOCALE_COOKIE, normalizeLocale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/actions";
import { getLanguagePreference } from "@/services/languagePreferenceApi";

const hasLocaleCookie = () => document.cookie.split(";").some((part) => part.trim().startsWith(`${LOCALE_COOKIE}=`));

/**
 * A browser that never picked a language (no NEXT_LOCALE cookie) takes the student's saved preference from SMS, so a
 * new device opens in the language chosen elsewhere. Once this browser has a cookie it wins (the switcher saves every
 * choice to SMS as well). Best effort: any failure leaves the dashboard in its current language, and the server
 * action is called directly (not through callServer) so a missing endpoint never opens the session-expired dialog.
 */
export function LocaleSync() {
  const locale = normalizeLocale(useLocale());
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || hasLocaleCookie()) return;
    // Once per mount of the dashboard layout (which stays mounted across module navigation); the ref also keeps
    // React's development double-run of effects from asking twice.
    done.current = true;
    getLanguagePreference()
      .then(async (result) => {
        if (!result?.ok || !result.data) return;
        const saved = normalizeLocale(result.data);
        await setUserLocale(saved);
        if (saved !== locale) router.refresh();
      })
      .catch(() => {});
  }, [locale, router]);

  return null;
}
