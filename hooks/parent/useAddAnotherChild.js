"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getUserShortProfile } from "@/services/dashboardApi";
import { getSettingsByTypeAndKey } from "@/services/settingsApi";
import { enrollAnotherChild } from "@/services/addEnrollmentBackendApi";

// The step each resume point of the Add Another Student wizard opens on (signupPage 1 / 2 / 3).
const SIGNUP_PAGE_TO_STEP = { 1: "student-details", 2: "course-selection", 3: "review-and-payment" };

/**
 * Everything the parent's "Add Another Child" button needs: whether to show it, its label, busy state and click
 * handler. The parent counterpart of the student's "Add More Siblings" (legacy enrollOnBehalfOf in dashboardCommon.js):
 *  - shown only when the school setting CONFIGURATION / ADD_ANOTHER_CHILD_BTN is "true";
 *  - the parent's id and any half-finished child come from the short profile (polled every 60 s, like the legacy
 *    get-partial-child-name poll), so the label becomes "Resume {name}'s Enrollment" when a child is partly enrolled;
 *  - a click asks the backend to resume that child or reserve a new one, then opens the existing Add Another
 *    Student wizard (/{school}/add-enrollment/{parentId}/{sessionUserUniqueId}/step/...) in a NEW tab, signed in as
 *    the parent already is. The wizard's own proxy check requires the URL's session user to be the signed-in one.
 */
export function useAddAnotherChild() {
  const { context, session } = useDashboardContext();
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  const uniqueId = session?.uniqueId;
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const settingQuery = useQuery({
    queryKey: ["parent-add-another-child-btn", schoolUUID],
    queryFn: async () => {
      const result = await getSettingsByTypeAndKey("CONFIGURATION", "ADD_ANOTHER_CHILD_BTN");
      return Boolean(result?.ok) && String(result.data).trim().toLowerCase() === "true";
    },
    enabled: Boolean(schoolUUID),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const profileQuery = useQuery({
    queryKey: ["parent-short-profile", schoolUUID, userId],
    queryFn: () => getUserShortProfile({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const profile = profileQuery.data;
  const parentId = profile?.parentId ?? null;
  const hasPartialChild = String(profile?.hasPartialChild).toUpperCase() === "Y";
  const partialChildName = profile?.partialChildName || "";

  const visible = settingQuery.data === true && parentId != null;
  const label = hasPartialChild && partialChildName ? `Resume ${partialChildName}'s Enrollment` : "Add Another Child";

  const handleClick = async () => {
    if (!parentId || !schoolUUID || !uniqueId || busy) return;
    setBusy(true);
    // The tab opens inside the click (browsers block a window opened after an await) and is pointed at the wizard once
    // the backend has answered. It must not keep a handle back to this page.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const result = await enrollAnotherChild(schoolUUID, parentId, uniqueId);
      if (!result) {
        tab?.close();
        toast.error("Could not start enrollment, please try again.");
        return;
      }
      const step = SIGNUP_PAGE_TO_STEP[result.signupPage] || "student-details";
      const url = `/${schoolUUID}/add-enrollment/${parentId}/${uniqueId}/step/${step}`;
      if (tab) tab.location.href = url;
      else router.push(url); // the browser blocked the new tab: continue in this one
    } catch {
      tab?.close();
      toast.error("Something went wrong, please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { visible, label, busy, handleClick };
}
