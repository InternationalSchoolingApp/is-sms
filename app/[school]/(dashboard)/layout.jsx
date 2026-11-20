import { getLocale, getMessages } from "next-intl/server";
import { IntlClientProvider } from "@/components/i18n/IntlClientProvider";
import { HtmlLang } from "@/components/i18n/HtmlLang";
import { LocaleSync } from "@/components/i18n/LocaleSync";
import { INTL_TIME_ZONE } from "@/i18n/config";
import { DashboardChrome } from "./DashboardChrome";

// Server Component layout for the role dashboard route group. Mounts the shared
// DashboardChrome (context + shell) exactly once around every module route, so
// the shell persists across navigation. Module pages render only their own
// content as children. Role is "student" for Phase A (the only migrated role).
// The student's language (NEXT_LOCALE cookie, i18n/request.js) wraps the whole dashboard: switching it
// router.refresh()es this layout with the new messages, so client state is kept (docs/i18n.md).
export default async function DashboardLayout({ children }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <IntlClientProvider locale={locale} messages={messages} timeZone={INTL_TIME_ZONE}>
      <HtmlLang />
      <LocaleSync />
      <DashboardChrome role="student">{children}</DashboardChrome>
    </IntlClientProvider>
  );
}
