"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { viaTier1 } from "@/utils/dashboardBootstrap";
import { ChangePasswordModal } from "@/components/dashboard/ChangePasswordModal";
import { K5ChangePasswordModal } from "@/components/k5/panels/K5ChangePasswordModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { resolveTimezone } from "@/utils/calendarEvents";
import { getUserShortProfile } from "@/services/dashboardApi";

/**
 * "You must change your password" on the student dashboard — legacy rendereDashboardContent: one second after the
 * dashboard loads, when the password is due (lastPassUpdatedDate) or a sibling added from enrollment is still on the
 * temporary password (addSiblingFirstLogin), the Change Password popup opens (it can only be left with Cancel, not by clicking outside)
 * (callCommonDashboardPageForPasswordChange('14','No')).
 *
 * The legacy page read both flags from the dashboard-or-migration answer, which never fills them, so the prompt never
 * showed there; they are taken here from get-user-short-profile, which works them out (CommonUtil.getPasswordPolicy:
 * FORCE_PASSWORD_CHANGE_POLICY_SERVICE on and the password older than PASSWORD_RESET_IN_DAYS, or no policy row yet;
 * CommonUtil.isAddSiblingFirstLogin). Students only (not a parent viewing a child), never in dummy mode.
 *
 * It is shown on the dashboard home page only (StudentHomeForGrade mounts it there, not on My Classes), and once a day: the first
 * time the student is on the home page that day (the day in their own timezone, Asia/Singapore when none is set). The day is
 * remembered on this device when the popup is closed (Cancel or a successful change); the next day it opens again for as long as
 * the password is still due.
 */
const dayKey = (timezone) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const storageKey = (userId) => `is-pwd-prompt-day:${userId}`;
const readDay = (userId) => {
  try {
    return window.localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
};
const writeDay = (userId, day) => {
  try {
    window.localStorage.setItem(storageKey(userId), day);
  } catch {
    // storage unavailable: it then shows again on the next load of the home page
  }
};

export function ForcedPasswordChange() {
  const { context, isK5 } = useDashboardContext();
  const dummy = useDummyStudent();
  const queryClient = useQueryClient();
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  const wanted = Boolean(schoolUUID && userId) && (context?.role || "student") === "student" && dummy.settled && !dummy.enabled;
  // The student's own timezone decides what "today" is (same shared answer as the home page).
  const dashboardData = useStudentDashboardData({ schoolUUID, userId });
  const timezone = resolveTimezone(dashboardData.userTimezone);

  // Same cache entry as the Add Siblings button (hooks/useAddSiblings.js).
  const { data: profile } = useQuery({
    queryKey: ["user-short-profile", schoolUUID, userId],
    queryFn: () => viaTier1(userId, "shortProfile", (a) => a.shortProfile, () => getUserShortProfile({ schoolUUID, userId })),
    enabled: wanted,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const due = profile?.lastPassUpdatedDate === true || profile?.addSiblingFirstLogin === true || profile?.addSiblingFirstLogin === "Y";

  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!wanted || !due || done || dashboardData.isLoading) return undefined;
    // Already shown (and closed) today: not again until tomorrow.
    if (readDay(userId) === dayKey(timezone)) return undefined;
    const id = setTimeout(() => setOpen(true), 1000);
    return () => clearTimeout(id);
  }, [wanted, due, done, dashboardData.isLoading, userId, timezone]);

  if (!open) return null;
  const close = () => {
    writeDay(userId, dayKey(timezone));
    setOpen(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ["user-short-profile", schoolUUID, userId] });
  };
  return isK5 ? <K5ChangePasswordModal forced onClose={close} /> : <ChangePasswordModal forced onClose={close} />;
}
