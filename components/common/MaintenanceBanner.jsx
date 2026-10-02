"use client";

import { useEffect, useRef } from "react";
import { Circle } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getMaintenanceDowntimeStatus } from "@/services/maintenanceApi";

/**
 * Site-wide maintenance/downtime notice. Polls
 * GET {schoolId}/api/v1/maintenance-downtime-status and shows a scrolling
 * marquee ONLY when the backend reports a non-blank message (an empty
 * message — or no school to query — renders nothing). Mirrors the reference
 * Announcement component: the message repeated with small dot separators,
 * scrolling across a single track.
 *
 * The school UUID is resolved the same way PaymentResponseView does it: the
 * {school}/{schoolId} URL path segment first (the school-scoped enrollment
 * routes carry it), then the Auth.js session (the flat wizard routes read it
 * from there), then NEXT_PUBLIC_SCHOOL_ID for the unprefixed common routes.
 *
 * Mounted once in app/layout.js so it rides above every page.
 */
export function MaintenanceBanner() {
  const params = useParams();
  const { data: session } = useSession();

  const schoolUUID =
    params?.school ||
    params?.schoolId ||
    session?.schoolUUID ||
    process.env.NEXT_PUBLIC_SCHOOL_ID;

  const { data } = useQuery({
    queryKey: ["maintenance-downtime-status", schoolUUID],
    queryFn: () => getMaintenanceDowntimeStatus(schoolUUID),
    enabled: Boolean(schoolUUID),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: false,
  });

  const message = typeof data?.message === "string" ? data.message.trim() : "";
  // Show whenever there's a message to show. `active` gates it too so the
  // backend can keep a message staged while active=false without displaying it.
  const show = Boolean(data?.active && message);

  const bannerRef = useRef(null);

  // Fixed at the very top so it never scrolls away and always sits above
  // every page's own chrome. Taken out of flow, it would otherwise cover the
  // first strip of each page — so publish its live height as
  // `--maintenance-banner-h` on <html>, and have any page with its OWN fixed
  // top chrome (e.g. AccountCreationForm's mobile header) offset by it so
  // the two stack cleanly instead of overlapping. Measured with a
  // ResizeObserver so a longer wrapped message keeps the offset correct.
  // Reset to 0 when hidden so nothing reserves space for a banner that isn't
  // there (this is also why every consumer reads the var with a `, 0px`
  // fallback — belt-and-suspenders for the instant before this effect runs).
  useEffect(() => {
    const root = document.documentElement;
    if (!show) {
      root.style.setProperty("--maintenance-banner-h", "0px");
      return;
    }
    const el = bannerRef.current;
    if (!el) return;
    const apply = () => root.style.setProperty("--maintenance-banner-h", `${el.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty("--maintenance-banner-h", "0px");
    };
  }, [show]);

  if (!show) return null;

  const items = Array.from({ length: 8 }).map((_, index) => (
    <span key={index} className="mr-10 inline-flex items-center">
      <Circle size={8} className="mr-2 fill-current" />
      {message}
    </span>
  ));

  return (
    <div
      ref={bannerRef}
      role="status"
      aria-live="polite"
      className="maintenance-banner fixed inset-x-0 top-0 z-[60] overflow-hidden border-b border-amber-300 bg-amber-100 py-1 text-sm font-medium text-amber-900"
    >
      <div className="maintenance-track whitespace-nowrap">{items}</div>
    </div>
  );
}
