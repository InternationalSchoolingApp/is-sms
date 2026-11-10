"use client";

import { useCallback, useEffect, useState } from "react";
import { copyrightLine } from "@/utils/schoolBrand";
import { useParams, usePathname } from "next/navigation";
import { RightActionRail } from "@/components/dashboard/RightActionRail";
import { AppearanceProvider } from "@/components/appearance/AppearanceProvider";
import { ReadingRuler } from "@/components/appearance/ReadingRuler";
import { K5Header } from "@/components/k5/K5Header";
import { K5NavRail } from "@/components/k5/K5NavRail";
import { AppearanceDialog } from "@/components/k5/look/AppearanceDialog";
import { PicoGuide } from "@/components/k5/pico/PicoGuide";
import { setPicoLive } from "@/components/k5/pico/picoEvents";
import { SelectToSpeak } from "@/components/k5/pico/SelectToSpeak";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { studentNavHref } from "@/utils/dashboardNav";

/**
 * Grade K–5 dashboard chrome (docs/migration/grade_k5_dashboard_plan.html, Phases 1 + 3) —
 * rendered by DashboardChrome instead of DashboardShell when the context says isK5.
 * Same URLs, same module pages: only the chrome and the scoped .theme-k5 tokens differ.
 * Layout replicates Playful.dc.html: sticky header, fixed 96px nav rail on the left,
 * fixed 80px action rail on the right, content centred in a 1440px column. The student's
 * look (AppearanceProvider) and the Pico guide (home page) live here too.
 */
export function K5Shell({ children }) {
  const { context } = useDashboardContext();
  return (
    <AppearanceProvider scope="k5" userId={context.userId}>
      <K5Frame>{children}</K5Frame>
    </AppearanceProvider>
  );
}

function K5Frame({ children }) {
  const { context, menu, logoUrl, session, isPreK, lmsProviderURL, isPayLmsPaymentPending } = useDashboardContext();
  
  const pathname = usePathname();
  const { school } = useParams();
  const themeProps = useK5ThemeProps("relative flex min-h-screen flex-col overflow-x-clip bg-k5-page");
  const [navOpen, setNavOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  // The buddy's page tips wait for the left menu to have its items.
  const menuCount = menu?.length ?? 0;
  useEffect(() => {
    setPicoLive({ menuReady: menuCount > 0 });
    return () => setPicoLive({ menuReady: false });
  }, [menuCount]);
  const isHome = pathname === studentNavHref(school, "");

  // Same bfcache guard as DashboardShell: a restored page reloads so the session is re-checked.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // A route change closes the opened nav / drawer.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavOpen(false);
  }
  return (
    <div {...themeProps} data-k5-prek={isPreK ? "true" : undefined}>
      <K5Header
        schoolName={context.schoolName}
        logoUrl={logoUrl}
        session={session}
        userName={context.userName}
        navOpen={navOpen}
        onMenu={() => setNavOpen((v) => !v)}
        onAppearance={() => setLookOpen(true)}
        lmsProviderURL={lmsProviderURL}
        isPayLmsPaymentPending={isPayLmsPaymentPending}
      />

      <div className="k5-layout relative mx-auto box-border flex w-full max-w-[100%] flex-1 items-start gap-5 px-5 pb-[220px] pt-5 max-[760px]:flex-wrap">
        <div aria-hidden="true" className="w-24 flex-none max-[760px]:hidden" />
        <K5NavRail menu={menu} open={navOpen} onOpen={() => setNavOpen(true)} onClose={closeNav} isPreK={isPreK} userId={context.userId} />

        <main className="flex min-w-0 flex-[1_1_auto] flex-col gap-4 max-[760px]:basis-full">{children}</main>

        <div aria-hidden="true" className="w-20 flex-none max-[760px]:hidden" />
        <RightActionRail
          variant="k5"
          chatUrl={context.chatUrl}
          diaryUrl={context.diaryUrl}
          schoolUUID={context.schoolUUID}
          userId={context.userId}
          uniqueId={context.uniqueId}
          userRole={session?.userRole}
          email={session?.email}
          schoolName={context.schoolName}
        />
      </div>

      {/* Below 760px the action rail is a fixed bottom tab bar — keep the footer clear of it. */}
      <footer className="px-4 pb-6 pt-2 text-center text-[13px] font-bold text-k5-mut max-[760px]:pb-[110px]">
        {copyrightLine(context.schoolName)}
      </footer>

      <PicoGuide userId={context.userId} firstName={String(context.userName || "").split(" ")[0]} home={isHome} />
      <SelectToSpeak />
      <ReadingRuler />
      <AppearanceDialog open={lookOpen} onClose={() => setLookOpen(false)} />
    </div>
  );
}
