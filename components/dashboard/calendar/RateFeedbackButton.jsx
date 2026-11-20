"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { calendarButtonClass } from "@/components/dashboard/calendar/CalendarModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useFeedbackSetting } from "@/hooks/useFeedbackSetting";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getEventStatus, resolveTimezone } from "@/utils/calendarEvents";
import { FEEDBACK_SETTING, buildFeedbackInfo, canShowFeedbackButton } from "@/utils/classFeedback";
import { openClassFeedback } from "@/utils/feedbackEvents";

/**
 * "Rate this class" / "Rate this activity" of the finished class / activity popup (legacy renderModalFeedbackButton).
 * Shown only when the backend mapped a feedback form to the event and the class is on/after FEEDBACK_SHOW_FROM_DATE (or the
 * student is a feedback test user). It closes the popup it sits in (`onBeforeOpen`) and the feedback opens
 * (components/dashboard/ClassFeedbackHost.jsx). Never in demo mode.
 */
export function RateFeedbackButton({ event, onBeforeOpen }) {
  const { context, isK5 } = useDashboardContext();
  const dummy = useDummyStudent();
  const t = useTranslations("feedback");
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const userId = context?.userId;
  const eligible =
    Boolean(userId) &&
    dummy.settled &&
    !dummy.enabled &&
    (event.eventKind === "class" || event.eventKind === "activity") &&
    event.isFeedbackFormMapped === "Y" &&
    getEventStatus(event) === "completed";
  const showFromDate = useFeedbackSetting(FEEDBACK_SETTING.showFromDate, { userId, enabled: eligible });
  const testUsers = useFeedbackSetting(FEEDBACK_SETTING.testUsers, { userId, enabled: eligible });
  if (!eligible || !canShowFeedbackButton(event, { showFromDate: showFromDate.value, testUsers: testUsers.value, userId })) return null;

  const timezone = resolveTimezone(dashboardData.userTimezone);
  const label = event.eventKind === "activity" ? t("rate.activity") : t("rate.class");
  return (
    <button
      type="button"
      onClick={() => {
        onBeforeOpen?.();
        openClassFeedback(buildFeedbackInfo(event, timezone));
      }}
      className={isK5 ? calendarButtonClass(true, "primary") : "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-primary px-4 py-2 text-sm font-semibold text-white"}
    >
      <Star className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
