"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getAnnouncementDetails } from "@/services/dashboardApi";
import { getDiaryUnreadCount } from "@/services/diaryApi";

/**
 * The announcement and diary badge counts for the selected child, for the parent mobile bottom bar. These are the
 * rail's own queries (same keys and calls as RightActionRail), so they share its cache: no second request. In
 * dummy mode the rail serves generated data and the bar shows no counts.
 */
export function useParentRailCounts() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const dummy = useDummyStudent();
  const schoolUUID = context?.schoolUUID;
  const userId = context?.userId;
  const studentUserId = selectedChild ? selectedChild.userId : undefined;
  const live = !dummy.enabled;

  const announcements = useQuery({
    queryKey: ["student-announcements", schoolUUID, studentUserId ?? userId, dummy.key],
    queryFn: () => getAnnouncementDetails({ schoolUUID, userId: studentUserId ?? userId, startFrom: 0, pageSize: 20 }),
    enabled: Boolean(schoolUUID && (studentUserId ?? userId) && dummy.settled && live),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const diary = useQuery({
    queryKey: ["diary-unread-count", userId, dummy.key, studentUserId ?? null],
    queryFn: () => getDiaryUnreadCount({ sessionUserId: userId, studentUserId }),
    enabled: Boolean(userId && dummy.settled && live),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return {
    newAnnouncements: announcements.data?.newAnnouncementCount || 0,
    unreadDiary: diary.data?.details?.unreadMessageCount || 0,
  };
}
