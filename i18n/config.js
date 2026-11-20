/**
 * Student dashboard languages (docs/i18n.md). The URL never carries the locale: the choice lives in the
 * NEXT_LOCALE cookie (and in the student's saved preference on SMS), so proxy.js and the backend rewrites,
 * which read path segments, are untouched.
 */
export const LOCALES = ["en", "fr", "pt", "zh", "es"];
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// What the switcher shows: each language in its own name, so a student who cannot read the current one still finds theirs.
export const LOCALE_NAMES = {
  en: "English",
  fr: "Français",
  pt: "Português",
  zh: "中文",
  es: "Español",
};

// BCP 47 tag for <html lang> and Intl/toLocale*String calls.
export const LOCALE_TAGS = {
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-BR",
  zh: "zh-CN",
  es: "es-ES",
};

// next-intl needs a time zone; dates are still formatted by the existing date-fns(-tz) helpers in the student's own zone.
// Asia/Singapore is the project-wide fallback zone (AGENTS.md).
export const INTL_TIME_ZONE = "Asia/Singapore";

export const isLocale = (value) => LOCALES.includes(value);

/** Any stored/received value -> a supported locale ("fr-FR" -> "fr", "PT" -> "pt", junk -> "en"). */
export function normalizeLocale(value) {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

export const localeTag = (locale) => LOCALE_TAGS[normalizeLocale(locale)];
