"use client";

import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/common/Loader";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { RightActionRail } from "@/components/dashboard/RightActionRail";
import { ParentHeader } from "@/components/parent/shell/ParentHeader";
import { ParentSideMenu } from "@/components/parent/shell/ParentSideMenu";
import { ParentLoadingOverlay } from "@/components/parent/shell/ParentLoadingOverlay";
import { parentFont } from "@/components/parent/picker/parentFont";
import { copyrightLine } from "@/utils/schoolBrand";
import "@/components/parent/theme/parentDashboard.css";

// Above this width the menu shows its labels and the burger folds it to icons; at or below it the menu is icons only and
// the burger opens it over the page (a drawer on a phone). Same breakpoints as the design board.
const WIDE_QUERY = "(min-width: 1381px)";
const PHONE_QUERY = "(max-width: 760px)";

function useMedia(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/**
 * The parent dashboard chrome, in the parent theme (design board: ParentChildDashboard.html): header (burger, logo, LMS
 * switch, profile), the rounded left menu, the page, and the right rail (bottom bar on a phone). While the parent is
 * choosing a child the page is the child picker, which has its own banner: no menu and no rail, as in legacy.
 * Everything here is scoped under .pdash (components/parent/theme/parentDashboard.css), so the student dashboards are
 * untouched. The data (menu, counts, panels) is the same as before; only the look changed.
 */
export function ParentShell({ children }) {
  const { ready, gradeResolved, context, menu, logoUrl, schoolWebsite, session, lmsProviderURL, isPayLmsPaymentPending } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const choosing = !selectedChild;
  const wide = useMedia(WIDE_QUERY);
  const phone = useMedia(PHONE_QUERY);
  // `menuOpen` is the burger's state: on a wide screen the menu starts open (labels shown), otherwise closed.
  const [menuPick, setMenuPick] = useState(null);
  const menuOpen = menuPick ?? wide;

  if (!ready || !gradeResolved) return <FullScreenLoader />;

  const toggleMenu = () => setMenuPick(!menuOpen);

  return (
    <div className={`pdash ${parentFont.className}`}>
      <ParentHeader
        schoolName={context.schoolName}
        logoUrl={logoUrl}
        schoolWebsite={schoolWebsite}
        session={session}
        userName={context.userName}
        choosing={choosing}
        menuOpen={menuOpen}
        onBurger={toggleMenu}
        lmsProviderURL={lmsProviderURL}
        isPayLmsPaymentPending={isPayLmsPaymentPending}
      />

      {choosing ? (
        <main className="flex-1">{children}</main>
      ) : (
        <div className="wrap">
          <ParentSideMenu menu={menu} wide={wide} open={menuOpen} onClose={() => setMenuPick(false)} phone={phone} />
          <main className="main">{children}</main>
          <RightActionRail
            parentRail
            studentUserId={selectedChild.userId}
            hideNews
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
      )}

      <footer className="ft">{copyrightLine(context.schoolName)}</footer>
      <ParentLoadingOverlay />
    </div>
  );
}
