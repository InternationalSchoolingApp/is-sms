"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copyrightLine } from "@/utils/schoolBrand";
import { useParams, usePathname } from "next/navigation";
import { RightActionRail } from "@/components/dashboard/RightActionRail";
import { AppearanceProvider } from "@/components/appearance/AppearanceProvider";
import { ReadingRuler } from "@/components/appearance/ReadingRuler";
import { K5Header } from "@/components/k5/K5Header";
import { MotionProvider, useMotion } from "@/components/motion/MotionProvider";
import { PageReveal } from "@/components/motion/PageReveal";
import { CelebrationHost } from "@/components/motion/canvas/CelebrationHost";
import { ZOOM } from "@/components/motion/motionConfig";
import { CanvasBackground } from "@/components/motion/canvas/CanvasBackground";
import { K5NavRail } from "@/components/k5/K5NavRail";
import { K5QuoteOfMoment } from "@/components/k5/K5QuoteOfMoment";
import { AppearanceDialog } from "@/components/k5/look/AppearanceDialog";
import { SessionExpiredDialog } from "@/components/providers/SessionExpiredDialog";
import { PicoGuide } from "@/components/k5/pico/PicoGuide";
import { setPicoLive } from "@/components/k5/pico/picoEvents";
import { SelectToSpeak } from "@/components/k5/pico/SelectToSpeak";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { DashboardLookProvider, useDashboardContext } from "@/hooks/useDashboardContext";
import { effectiveGradeLook } from "@/constant/appearance";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { K5LiveClassWatcher } from "@/components/k5/home/K5LiveClassWatcher";
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
    <AppearanceProvider scope="k5" userId={context.userId} schoolUUID={context.schoolUUID}>
      <K5LookScope>
        <MotionProvider>
          <K5Frame>{children}</K5Frame>
        </MotionProvider>
      </K5LookScope>
    </AppearanceProvider>
  );
}

// The look the student picked in the Look dialog (Theme), else their grade's look: everything in the shell (header, rails,
// pages, dialogs) reads isMiddle / isHigh for that look.
function K5LookScope({ children }) {
  const { isMiddle, isHigh } = useDashboardContext();
  const { preferences } = useAppearance();
  const look = effectiveGradeLook(preferences.gradeLook, { isMiddle, isHigh });
  return <DashboardLookProvider look={look}>{children}</DashboardLookProvider>;
}

function K5Frame({ children }) {
  const { context, menu, menuLoading, logoUrl, schoolWebsite, session, isPreK, isMiddle, isHigh, lmsProviderURL, isPayLmsPaymentPending } = useDashboardContext();
  
  const pathname = usePathname();
  const dummy = useDummyStudent();
  const { school } = useParams();
  const { isLoading: appearanceLoading, preferences } = useAppearance();
  const { band: motionBand, reduced: motionReduced } = useMotion();
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
  // "My Classes" (the Today / Week / Month planner, Playful.dc.html navClasses) comes from the database menu: it shows when
  // the student's role has the My Classes module (MODULES / USER_RIGHTS). Only the Playful look has that page in its nav,
  // so the Balanced / Mature looks leave it out.
  const navMenu = useMemo(() => (isMiddle && menu?.length ? menu.filter((item) => item.segment !== "my-classes") : menu), [menu, isMiddle]);
  // Pico's first welcome is only for a student who completed enrollment: the dashboard is reached only by one (the backend sends
  // a student still enrolling to the wizard), the grade band and details have loaded (context exists), and it is a real student,
  // not a counselor's dummy/demo view.
  const welcomeEligible = Boolean(context?.userId) && String(context?.role).toLowerCase() === "student" && dummy.settled && !dummy.enabled;

  // Same bfcache guard as DashboardShell: a restored page reloads so the session is re-checked.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    const sizeMap = { small: "14px", medium: "16px", large: "18px" };
    const fontMap = {
      cute: "'Fredoka', 'Baloo Bhaijaan 2', sans-serif",
      simple: "'Lexend', sans-serif",
      easy: "'Andika', sans-serif",
      clear: "'Atkinson Hyperlegible', sans-serif",
    };
    const el = document.documentElement;
    el.style.setProperty("--app-toast-font-size", sizeMap[preferences.textSize] || "16px");
    el.style.setProperty("--app-toast-font-family", fontMap[preferences.font] || fontMap.cute);
    el.style.setProperty("--app-toast-letter-spacing", preferences.reading === "spaced" ? "0.1em" : "normal");
    return () => {
      el.style.removeProperty("--app-toast-font-size");
      el.style.removeProperty("--app-toast-font-family");
      el.style.removeProperty("--app-toast-letter-spacing");
    };
  }, [preferences.textSize, preferences.font, preferences.reading]);

  // Toasts live outside the shell (AppToaster, root layout): hand them the band's zoom and the Motion setting through CSS
  // variables, like the toast font above. Reduced Motion makes the toast appear without any movement (0 s).
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty("--app-toast-zoom", String(ZOOM[motionBand]));
    el.style.setProperty("--app-toast-dur", motionReduced ? "0s" : "0.22s");
    return () => {
      el.style.removeProperty("--app-toast-zoom");
      el.style.removeProperty("--app-toast-dur");
    };
  }, [motionBand, motionReduced]);

  // A route change closes the opened nav / drawer.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setNavOpen(false);
  }
  return (
    <div {...themeProps} data-k5-prek={isPreK ? "true" : undefined} data-motion-band={motionBand} style={appearanceLoading ? { opacity: 0 } : undefined}>
      <CanvasBackground themeKey={`${themeProps["data-k5-theme"]}|${themeProps.className}`} />
      <CelebrationHost />
      <K5Header
        userId={context.userId}
        schoolUUID={context.schoolUUID}
        schoolName={context.schoolName}
        logoUrl={logoUrl}
        schoolWebsite={schoolWebsite}
        session={session}
        userName={context.userName}
        menu={menu}
        navOpen={navOpen}
        onMenu={() => setNavOpen((v) => !v)}
        onAppearance={() => setLookOpen(true)}
        lmsProviderURL={lmsProviderURL}
        isPayLmsPaymentPending={isPayLmsPaymentPending}
      />

      <div className="k5-layout relative mx-auto box-border flex w-full max-w-[100%] flex-1 items-start gap-3 px-5 pb-[20px] pt-5 max-[760px]:flex-wrap">
        <div aria-hidden="true" className="w-[76px] flex-none max-[760px]:hidden" />
        <K5NavRail menu={navMenu} loading={menuLoading} open={navOpen} onOpen={() => setNavOpen(true)} onClose={closeNav} isPreK={isPreK} userId={context.userId} />

        <PageReveal className="flex min-w-0 flex-[1_1_auto] flex-col gap-4 max-[760px]:basis-full">
          <K5QuoteOfMoment />
          {children}
        </PageReveal>

        <div aria-hidden="true" className="w-20 flex-none max-[760px]:hidden" />
        <RightActionRail
          variant="k5"
          middle={isMiddle}
          high={isHigh}
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
      <footer className="relative px-4 pb-6 pt-2 text-center text-[13px] font-bold text-k5-mut max-[760px]:pb-[110px]">
        {copyrightLine(context.schoolName)}
      </footer>

      {/* The home planner shows the live-class dialog itself; on every other page this does. */}
      {!isHome && <K5LiveClassWatcher />}
      <PicoGuide userId={context.userId} firstName={String(context.userName || "").split(" ")[0]} schoolName={context.schoolName} home={isHome} welcomeEligible={welcomeEligible} />
      <SelectToSpeak />
      <ReadingRuler />
      {/* The "session logged out" dialog, inside the student's own theme (colour, Day / Night, grade look). */}
      <SessionExpiredDialog themed />
      <AppearanceDialog open={lookOpen} onClose={() => setLookOpen(false)} firstName={String(context.userName || "").split(" ")[0]} />
    </div>
  );
}
