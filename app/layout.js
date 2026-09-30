import { Open_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";

// Matches the existing JSP app's font (Google Fonts "Open Sans", loaded via
// <link> in SignupStudent.jsp / SignupCommon.jsp) — confirmed at source.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Student Signup",
  description: "Student Signup — Next.js migration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* GTM + Clarity — only fire when NEXT_PUBLIC_DEPLOYMENT_MODE=PROD,
            mirroring the JSP's <c:if test="${DEPLOYMENT_MODE=='PROD'}">. */}
        <AnalyticsScripts />
        <AuthSessionProvider>
          <QueryProvider>{children}</QueryProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
