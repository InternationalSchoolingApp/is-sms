"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { greetingForHour } from "@/utils/parentHome";

// Legacy: the greeting shows once per page load (PARENT_DASHBOARD_GREETING_SHOWN_ONCE) and hides itself after 6 s.
// A module variable lives exactly as long as the page does (client-side navigation keeps it, a reload resets it).
let shownThisPageLoad = false;
const VISIBLE_MS = 6000;

export function ParentGreetingBanner() {
  const { context } = useDashboardContext();
  // The first render of a page load shows it; later mounts (back to home) do not.
  const [visible] = useState(() => {
    if (shownThisPageLoad) return false;
    shownThisPageLoad = true;
    return true;
  });
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => setHidden(true), VISIBLE_MS);
    return () => clearTimeout(id);
  }, [visible]);

  if (!visible || hidden) return null;
  const name = context?.userName || "Parent";

  return (
    <div role="status" className="mb-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-5 text-center text-white shadow-sm">
      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
        {greetingForHour(new Date().getHours())}
      </span>
      <h2 className="mt-2 text-lg font-extrabold">{greetingForHour(new Date().getHours())} {name}</h2>
      <p className="mt-1 text-sm text-white/90">Thank you for standing strong in your child&apos;s journey.</p>
    </div>
  );
}
