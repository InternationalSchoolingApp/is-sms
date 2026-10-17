import { Open_Sans } from "next/font/google";
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


const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* GTM + Clarity — only fire when NEXT_PUBLIC_DEPLOYMENT_MODE=PROD,
            mirroring the JSP's <c:if test="${DEPLOYMENT_MODE=='PROD'}">. */}
        <AnalyticsScripts />
        <DisableZoom />
        <AuthSessionProvider session={session}>
          <QueryProvider>
            <PageTitle />
            <MaintenanceBanner />
            <CampaignCookieInitializer/>
            <ConsentBanner />
            {children}
          </QueryProvider>
          <GlobalLoader />
          <AppToaster />
        </AuthSessionProvider>
        <BackendSwitcher />
      </body>
    </html>
  );
}
