"use client";

import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/common/Loader";
import { Footer } from "@/components/common/Footer";
import { DashboardTopHeader } from "@/components/dashboard/DashboardTopHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { RightActionRail } from "@/components/dashboard/RightActionRail";
import { useDashboardContext } from "@/hooks/useDashboardContext";

/**
 * The student dashboard chrome — mirrors the legacy Dashboard.jsp shell
 * (top header + collapsible left sidebar + content + right action rail).
 * Mounted once by the (dashboard) layout so it persists across module
 * navigation. Nothing renders until the context is ready.
 *
 * Two sidebar states: `sidebarOpen` (mobile drawer) and `collapsed` (desktop
 * icon-rail). The header hamburger opens the drawer on small screens and
 * toggles the collapse on md+.
 */
export function DashboardShell({ children }) {
  const { ready, context, menu, logoUrl, session } = useDashboardContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Defaults to the collapsed icon-rail, matching the legacy dashboard.
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const onHamburger = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  if (!ready) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[#f2f5fa]" style={{ "--dash-header-h": "56px" }}>
      <DashboardTopHeader
        schoolName={context.schoolName}
        logoUrl={logoUrl}
        session={session}
        userName={context.userName}
        onHamburger={onHamburger}
      />

      <Sidebar
        menu={menu}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onExpand={() => setCollapsed(false)}
      />

      <div className={`flex min-h-screen flex-col pt-[56px] transition-[padding] duration-200 ${collapsed ? "md:pl-16" : "md:pl-64"}`}>
        <main className="flex-1 px-4 py-5 pr-4 sm:px-6 md:px-8 md:pr-20">{children}</main>
        <Footer schoolName={context.schoolName} />
      </div>

      <RightActionRail
        chatUrl={context.chatUrl}
        announcementCount={context.announcementCount}
        newsCount={context.newsCount}
      />
    </div>
  );
}
