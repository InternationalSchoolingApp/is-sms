"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { localeTag } from "@/i18n/config";

/**
 * Keeps <html lang> on the dashboard's language (screen readers, hyphenation, CJK font selection). The root layout is
 * shared with the English-only enrollment pages, so it stays "en" there and the dashboard sets it here.
 */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = localeTag(locale);
    return () => {
      document.documentElement.lang = previous || "en";
    };
  }, [locale]);
  return null;
}
