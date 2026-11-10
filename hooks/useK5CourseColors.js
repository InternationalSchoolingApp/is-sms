"use client";

import { useCallback } from "react";
import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentCalendar } from "@/hooks/useStudentCalendar";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getBrowserTimezone, resolveTimezone } from "@/utils/calendarEvents";
import { safeCourseColor } from "@/utils/k5Calendar";

const plain = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/\bgrade\s*[a-z0-9]+\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/s\b/g, "")
    .trim();

/**
 * The student's course colours, exactly as the K–5 home shows them (same calendar request and
 * courseRegistry, so it is usually already cached). `colorFor({ id, name })` matches by course id
 * first, then by name, and returns null when the course has no colour (caller keeps its default).
 */
export function useK5CourseColors() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const timezone = dummy.enabled ? getBrowserTimezone() : resolveTimezone(dashboardData.userTimezone);
  const { courseRegistry } = useStudentCalendar({
    schoolUUID: context?.schoolUUID,
    userId: context?.userId,
    timezone,
    monthFetch: true,
    initialDate: startOfDay(toZonedTime(new Date(), timezone)),
  });

  return useCallback(
    ({ id, name }) => {
      const courses = Object.values(courseRegistry || {});
      const byId = courses.find((c) => String(c.id) === String(id));
      if (byId) return safeCourseColor(byId.color);
      const wanted = plain(name);
      if (!wanted) return null;
      const wantedWords = wanted.split(" ");
      // Exact name first; otherwise one name must contain the other as whole words, and a lone word
      // never matches inside a longer name (so Art does not take the colour of Language Arts).
      let best = null;
      for (const c of courses) {
        const label = plain(c.label);
        if (!label) continue;
        if (label === wanted) {
          best = c;
          break;
        }
        const words = label.split(" ");
        const [small, big] = words.length <= wantedWords.length ? [words, wantedWords] : [wantedWords, words];
        if (small.length < 2 && big.length > 1) continue;
        if (small.every((w) => big.includes(w)) && (!best || label.length > plain(best.label).length)) best = c;
      }
      return best ? safeCourseColor(best.color) : null;
    },
    [courseRegistry],
  );
}
