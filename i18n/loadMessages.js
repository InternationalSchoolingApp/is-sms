import "server-only";
import { DEFAULT_LOCALE, normalizeLocale } from "./config";

const loaders = {
  en: () => import("@/messages/en"),
  fr: () => import("@/messages/fr"),
  pt: () => import("@/messages/pt"),
  zh: () => import("@/messages/zh"),
  es: () => import("@/messages/es"),
};

const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

// English underneath every other language, so a key a translation is missing still reads in English (never a raw key).
function mergeDeep(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = isPlainObject(v) && isPlainObject(base?.[k]) ? mergeDeep(base[k], v) : v;
  }
  return out;
}

/** All dashboard messages for `locale`, English-backed. `namespaces` limits the result (e.g. the root layout's shared set). */
export async function loadMessages(locale, namespaces) {
  const target = normalizeLocale(locale);
  const en = (await loaders[DEFAULT_LOCALE]()).default;
  const messages = target === DEFAULT_LOCALE ? en : mergeDeep(en, (await loaders[target]()).default);
  if (!namespaces) return messages;
  return Object.fromEntries(namespaces.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]]));
}
