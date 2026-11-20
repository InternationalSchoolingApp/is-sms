"use client";

import { NextIntlClientProvider } from "next-intl";

// A missing message is a developer mistake (English is merged under every language, see i18n/loadMessages.js):
// warn in development, never break the page.
function onError(error) {
  if (process.env.NODE_ENV !== "production") console.warn("[i18n]", error.message);
}

function getMessageFallback({ namespace, key }) {
  return [namespace, key].filter(Boolean).join(".");
}

/** NextIntlClientProvider with this app's error handling (functions cannot be passed from a Server Component). */
export function IntlClientProvider({ children, ...props }) {
  return (
    <NextIntlClientProvider {...props} onError={onError} getMessageFallback={getMessageFallback}>
      {children}
    </NextIntlClientProvider>
  );
}
