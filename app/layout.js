import { Open_Sans, Caveat } from "next/font/google";
import { AppToaster } from "@/components/common/AppToaster";
import { DisableZoom } from "@/components/common/DisableZoom";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { getAccountSession, publicSession } from "@/lib/auth/session";
import { GlobalLoader } from "@/components/common/GlobalLoader";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { BackendSwitcher } from "@/components/common/BackendSwitcher";
import { PageTitle } from "@/components/common/PageTitle"; 
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import CampaignCookieInitializer from "@/components/CampaignCookieInitializer";
import ConsentBanner from "@/components/ConsentBanner";
import { TabAccount } from "@/components/auth/TabAccount";
import { IntlClientProvider } from "@/components/i18n/IntlClientProvider";
import { loadMessages } from "@/i18n/loadMessages";
import { DEFAULT_LOCALE, INTL_TIME_ZONE } from "@/i18n/config";

// Outside the student dashboard everything stays English: the few components the dashboard shares with the
// enrollment pages (dialogs, payment modals) translate through the "common"/"shared"/"sharedCommon" namespaces, so those are all
// the root provides. The dashboard layout nests its own provider with the student's language.
const ROOT_NAMESPACES = ["common", "shared", "sharedCommon"];


const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// School Diary "handwritten note" styling (parentSchoolDiaryGetStyles' .caveat-font).
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }) {
  const session = publicSession(await getAccountSession());
  const rootMessages = await loadMessages(DEFAULT_LOCALE, ROOT_NAMESPACES);
  return (
    <html lang="en" className={`${openSans.variable} ${caveat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Which signed-in user this tab works for (several can share the browser): X-Account on its calls. */}
        <TabAccount account={session?.uniqueId} />
        {/* GTM + Clarity — only fire when NEXT_PUBLIC_DEPLOYMENT_MODE=PROD,
            mirroring the JSP's <c:if test="${DEPLOYMENT_MODE=='PROD'}">. */}
            
        <AnalyticsScripts />
        <DisableZoom />
        <AuthSessionProvider session={session}>
          <IntlClientProvider locale={DEFAULT_LOCALE} messages={rootMessages} timeZone={INTL_TIME_ZONE}>
            <QueryProvider>
              <PageTitle />
              <MaintenanceBanner />
              <CampaignCookieInitializer/>
              <ConsentBanner />
              {children}
            </QueryProvider>
            <GlobalLoader />
            <AppToaster />
          </IntlClientProvider>
        </AuthSessionProvider>
        <BackendSwitcher />
      </body>
    </html>
  );
}
