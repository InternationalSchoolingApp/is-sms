"use client";

import { useLocale } from "next-intl";
import { enUS, es, fr, ptBR, zhCN } from "date-fns/locale";
import { localeTag } from "./config";

const DATE_FNS_LOCALES = { en: enUS, fr, pt: ptBR, zh: zhCN, es };

/** date-fns locale object for an app locale: pass as `{ locale }` to format() so month/day names follow the language. */
export const dateFnsLocaleFor = (locale) => DATE_FNS_LOCALES[locale] || enUS;

/** The current dashboard language's date-fns locale (format(date, pattern, { locale: useDateFnsLocale() })). */
export function useDateFnsLocale() {
  return dateFnsLocaleFor(useLocale());
}

/** The current dashboard language as a BCP 47 tag, for toLocaleDateString / Intl.* calls ("en-US", "fr-FR", ...). */
export function useLocaleTag() {
  return localeTag(useLocale());
}
