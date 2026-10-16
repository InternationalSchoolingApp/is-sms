"use client";

import { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/common/Loader";
import { Footer } from "@/components/common/Footer";
import { DashboardTopHeader } from "@/components/dashboard/DashboardTopHeader";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { RightActionRail } from "@/components/dashboard/RightActionRail";
import { useDashboardContext } from "@/hooks/useDashboardContext";

// Above this width, the header and footer stay pinned to the viewport and
// the content between them becomes its own scroll region (matching the
// legacy dashboard shell). Below it, the page scrolls normally.
const WIDE_LAYOUT_QUERY = "(min-width: 990px)";

function useWideLayout() {
  const [isWide, setIsWide] = useState(() => typeof window !== "undefined" && window.matchMedia(WIDE_LAYOUT_QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(WIDE_LAYOUT_QUERY);
    const onChange = (e) => setIsWide(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isWide;
}

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
  const isWideLayout = useWideLayout();
  // A callback ref (not useRef): `ready` is false on the first render (the
  // component returns <FullScreenLoader/> before the footer div exists at
  // all), so a plain ref stays null through that pass. useRef changing
  // doesn't trigger a re-render, so once `ready` flips true and the footer
  // finally mounts, an effect keyed only on `isWideLayout` (unchanged) would
  // never re-run to pick it up — footerHeight would stay stuck at 0 forever.
  // This way the node itself is state, so it's a real effect dependency.
  const [footerNode, setFooterNode] = useState(null);
  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Measured (not hardcoded) so the scrollable content area always ends
  // exactly above the footer, however tall its text wraps to.
  useEffect(() => {
    if (!isWideLayout || !footerNode) return;
    const observer = new ResizeObserver(([entry]) => setFooterHeight(entry.contentRect.height));
    observer.observe(footerNode);
    return () => observer.disconnect();
  }, [isWideLayout, footerNode]);

  const onHamburger = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  if (!ready) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-[#f2f5fa]" style={{ "--dash-header-h": "56px", "--dash-footer-h": `${footerHeight}px` }}>
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

      <div
        className={`flex min-h-screen flex-col pt-[56px] transition-[padding] duration-200 ${collapsed ? "md:pl-16" : "md:pl-64"}`}
        style={isWideLayout ? { height: "100vh", minHeight: "100vh" } : undefined}
      >
        <main
          className="flex-1 px-4 py-5 pr-4 sm:px-6 md:px-4 md:pr-15"
          style={isWideLayout ? { height: `calc(100vh - 56px - ${footerHeight}px)`, overflowY: "auto" } : undefined}
        >
          {children}
        </main>
        {isWideLayout ? (
          <div ref={setFooterNode} className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
            <Footer schoolName={context.schoolName} />
          </div>
        ) : (
          <Footer schoolName={context.schoolName} />
        )}
      </div>

      <RightActionRail
        chatUrl={context.chatUrl}
        schoolUUID={context.schoolUUID}
        userId={context.userId}
        newsCount={context.newsCount}
      />
    </div>
  );
}
