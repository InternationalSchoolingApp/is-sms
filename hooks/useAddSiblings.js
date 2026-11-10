"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getUserShortProfile } from "@/services/dashboardApi";
import { getSettingsByTypeAndKey } from "@/services/settingsApi";
import { enrollAnotherChild } from "@/services/addEnrollmentBackendApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import toast from "react-hot-toast";

const SIGNUP_PAGE_TO_STEP = { 1: "student-details", 2: "course-selection", 3: "review-and-payment" };

/**
 * Everything the "Add More Siblings" button needs — visibility, label, busy
 * state and click handler. Fetches the user's short profile (parentId +
 * partial-child state) and the ADD_SIBILING_BTN setting, polls for partial-child
 * name every 60 s like the legacy dashboard's startPartialChildPolling.
 */
export function useAddSiblings() {
  const { context, session } = useDashboardContext();
  const dummy = useDummyStudent();
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  const uniqueId = session?.uniqueId;

  // ADD_SIBILING_BTN setting — only "true" shows the button
  const settingQuery = useQuery({
    queryKey: ["add-sibling-btn"],
    queryFn: async () => {
      const result = await getSettingsByTypeAndKey("CONFIGURATION", "ADD_SIBILING_BTN");
      return result?.ok && String(result.data).trim().toLowerCase() === "true";
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // User short profile — parentId + partial-child state (polls every 60 s)
  const profileQuery = useQuery({
    queryKey: ["user-short-profile", schoolUUID, userId],
    queryFn: () => getUserShortProfile({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId && !dummy.enabled),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const profile = profileQuery.data;
  const parentId = profile?.parentId ?? null;
  const hasPartialChild = String(profile?.hasPartialChild).toUpperCase() === "Y";
  const partialChildName = profile?.partialChildName || "";

  const visible = settingQuery.data === true && !dummy.enabled && parentId != null;
  const label = hasPartialChild && partialChildName
    ? `Resume ${partialChildName}'s Enrollment`
    : "Add More Siblings";

  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (dummy.enabled || !parentId || !schoolUUID || !uniqueId || busy) return;
    setBusy(true);
    try {
      const result = await enrollAnotherChild(schoolUUID, parentId, uniqueId);
      if (!result) {
        toast.error("Could not start enrollment — please try again.");
        return;
      }
      const step = SIGNUP_PAGE_TO_STEP[result.signupPage] || "student-details";
      window.open(`/${schoolUUID}/add-enrollment/${parentId}/${uniqueId}/step/${step}`, "_blank");
    } catch {
      toast.error("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }, [dummy.enabled, parentId, schoolUUID, uniqueId, busy]);

  return { visible, label, busy, handleClick, loading: profileQuery.isLoading || settingQuery.isLoading };
}
