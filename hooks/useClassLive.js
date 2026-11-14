"use client";

import { useDashboardContext } from "@/hooks/useDashboardContext";
import { usePicoLive } from "@/components/k5/pico/picoEvents";

/**
 * Is a class live right now? K-5 / Grade 6-8 / High: what the planner tells the buddy. Standard home: a live event drawn
 * by the calendar (callers read ".calendar-live-dashed" themselves when `live` is null).
 * -> { known, live }
 */
export function useClassLive() {
  const { isK5 } = useDashboardContext();
  const picoLive = usePicoLive();
  if (isK5) return { known: picoLive.ready, live: Boolean(picoLive.name) };
  return { known: true, live: null };
}
