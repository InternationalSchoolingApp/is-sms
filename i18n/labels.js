"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

/**
 * Message key for a label that comes from the backend (menu module names, statuses, subject names...):
 * "Fee Details" -> "fee_details", "Buy & Book a Class" -> "buy_and_book_a_class".
 */
export function labelKey(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Translates backend-supplied labels at render time: tl("Fee Details") -> the `namespace.fee_details` message, or the
 * label unchanged when there is none. Only for display — keep comparing/sending the original value in logic.
 */
export function useLabelTranslator(namespace) {
  const t = useTranslations(namespace);
  return useCallback(
    (raw) => {
      if (raw === null || raw === undefined || raw === "") return raw;
      const key = labelKey(raw);
      return key && t.has(key) ? t(key) : raw;
    },
    [t]
  );
}
