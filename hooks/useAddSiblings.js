"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("header.siblings");
  const dummy = useDummyStudent();
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  // The add-enrollment route's sessionUserId segment is the numeric USER.id.
  // Older code passed uniqueId here, which the wizard correctly rejects as a
  // tampered URL and then keeps its data queries disabled.
  const sessionUserId = session?.studentUserId ?? session?.userId ?? userId;

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
  // Display text only (rendered as-is by the headers), in the dashboard's language.
  const label = hasPartialChild && partialChildName
    ? t("resume", { name: partialChildName })
    : t("add");

  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(async () => {
    if (dummy.enabled || !parentId || !schoolUUID || !sessionUserId || busy) return;
    setBusy(true);
    try {
      const result = await enrollAnotherChild(schoolUUID, parentId, sessionUserId);
      if (!result) {
        toast.error(t("startFailed"));
        return;
      }
      const step = SIGNUP_PAGE_TO_STEP[result.signupPage] || "student-details";
      window.open(`/${schoolUUID}/add-enrollment/${parentId}/${sessionUserId}/step/${step}`, "_blank");
    } catch {
      toast.error(t("failed"));
    } finally {
      setBusy(false);
    }
  }, [dummy.enabled, parentId, schoolUUID, sessionUserId, busy, t]);

  return { visible, label, busy, handleClick, loading: profileQuery.isLoading || settingQuery.isLoading };
}
