import { Open_Sans } from "next/font/google";
import { AppToaster } from "@/components/common/AppToaster";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { GlobalLoader } from "@/components/common/GlobalLoader";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { PageTitle } from "@/components/common/PageTitle";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import CampaignCookieInitializer from "@/components/CampaignCookieInitializer";


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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* GTM + Clarity — only fire when NEXT_PUBLIC_DEPLOYMENT_MODE=PROD,
            mirroring the JSP's <c:if test="${DEPLOYMENT_MODE=='PROD'}">. */}
        <AnalyticsScripts />
        <AuthSessionProvider>
          <QueryProvider>
            <PageTitle />
            <MaintenanceBanner />
            <CampaignCookieInitializer/>
            {children}
          </QueryProvider>
          <GlobalLoader />
          <AppToaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
