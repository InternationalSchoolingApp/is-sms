"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useDateFnsLocale } from "@/i18n/dateLocale";
import { ClassFeedbackModal } from "@/components/dashboard/calendar/ClassFeedbackModal";
import { PendingFeedbackPopup } from "@/components/dashboard/calendar/PendingFeedbackPopup";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useFeedbackSetting } from "@/hooks/useFeedbackSetting";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { getSchoolCalendar } from "@/services/dashboardApi";
import { getFeedbackSubmission } from "@/services/feedbackApi";
import { normalizeCalendarEvents, resolveTimezone } from "@/utils/calendarEvents";
import {
  FEEDBACK_SETTING,
  buildEmbedUrl,
  buildWebhook,
  classDateTimeOf,
  delayMsOf,
  instantOf,
  isBulkFeedbackDay,
  isFeedbackActivity,
  pendingFeedbackOf,
  previousWeekRange,
  showsPopupAfterClass,
  teacherDisplayOf,
  toUtcText,
} from "@/utils/classFeedback";
import { FEEDBACK_ENDED_EVENT, FEEDBACK_OPEN_EVENT } from "@/utils/feedbackEvents";
import { callServer } from "@/utils/serverCall";
import { SessionExpiredError } from "@/utils/sessionState";

/**
 * Class feedback on the student dashboard - legacy feedbackStudentTeacher.js + the feedback parts of dashboardCalendarNew.js.
 * Mounted once on the home page, for every grade look. It
 *   1. opens the feedback form (the backend's embed address in an iframe) when a "Rate this class / activity" button asks for it;
 *   2. opens it by itself when a class / activity the student saw live has ended (once FEEDBACK_SHOW_POPUP_AFTER_CLASS is "TRUE"
 *      or the student is a test user), after FEEDBACK_MODAL_DELAY_MIN minutes;
 *   3. on the day BULK_FEEDBACK_SHOW_DAY, lists last week's sessions still to rate in the "Pending Feedback" popup.
 * The backend decides whether there is anything to rate (not attended / no form: nothing is shown, as in the legacy page).
 * Not in demo mode.
 */
export function ClassFeedbackHost() {
  const { context } = useDashboardContext();
  const dummy = useDummyStudent();
  const t = useTranslations("feedback");
  const tc = useTranslations("common");
  const dateLocale = useDateFnsLocale();
  const userId = context?.userId;
  const schoolUUID = context?.schoolUUID;
  const dashboardData = useStudentDashboardData({ schoolUUID, userId });
  const timezone = resolveTimezone(dashboardData.userTimezone);
  const wanted = Boolean(userId && schoolUUID) && (context?.role || "student") === "student" && dummy.settled && !dummy.enabled;

  const afterClass = useFeedbackSetting(FEEDBACK_SETTING.afterClass, { userId, enabled: wanted });
  const delay = useFeedbackSetting(FEEDBACK_SETTING.delayMinutes, { userId, enabled: wanted });
  const testUsers = useFeedbackSetting(FEEDBACK_SETTING.testUsers, { userId, enabled: wanted });
  const showFromDate = useFeedbackSetting(FEEDBACK_SETTING.showFromDate, { userId, enabled: wanted });
  const bulkDay = useFeedbackSetting(FEEDBACK_SETTING.bulkDay, { userId, enabled: wanted });

  const [modal, setModal] = useState(null);
  const [pending, setPending] = useState(null);

  // What the event listeners below need, always the latest.
  const live = useRef({});
  useEffect(() => {
    live.current = {
      wanted,
      userId,
      userName: context?.userName || "",
      role: String(context?.role || "student").toUpperCase(),
      timezone,
      afterClass: afterClass.value,
      delay: delay.value,
      testUsers: testUsers.value,
      errorText: tc("status.somethingWentWrong"),
    };
  });

  const busy = useRef(false);
  const openFeedback = useCallback(async (info, rightSlide = false) => {
    const cfg = live.current;
    if (!cfg.wanted || !info || busy.current) return;
    busy.current = true;
    try {
      const result = await callServer(() =>
        getFeedbackSubmission({
          entityType: info.eventType,
          entityId: info.eventId,
          userFullName: cfg.userName,
          eventDateTime: toUtcText(info.start, cfg.timezone),
        })
      );
      // S001 (already rated) / S002 (not rated yet) come with the form's address; S003 (not attended) and S004 (no form) show nothing.
      if ((result.statusCode === "S001" || result.statusCode === "S002") && result.details) {
        const url = buildEmbedUrl(result.details, {
          userName: cfg.userName,
          userId: cfg.userId,
          profileRole: cfg.role,
          webhook: buildWebhook(info, { userId: cfg.userId, timezone: cfg.timezone }),
          origin: window.location.origin,
          uiOrigin: process.env.NEXT_PUBLIC_FEEDBACK_UI_ORIGIN,
        });
        setModal({ key: `${info.id}-${Date.now()}`, info, url, rightSlide });
      }
    } catch (error) {
      if (!(error instanceof SessionExpiredError)) toast.error(cfg.errorText);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    const onOpen = (e) => openFeedback(e.detail?.info, Boolean(e.detail?.rightSlide));
    window.addEventListener(FEEDBACK_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(FEEDBACK_OPEN_EVENT, onOpen);
  }, [openFeedback]);

  // A class / activity that was live has ended: wait for its end plus the configured delay, then open (legacy checkClassEndedStatus).
  useEffect(() => {
    const handled = new Set();
    const timers = [];
    const onEnded = (e) => {
      const info = e.detail?.info;
      const cfg = live.current;
      if (!info || !cfg.wanted || handled.has(info.id)) return;
      handled.add(info.id);
      if (!showsPopupAfterClass(cfg.afterClass, cfg.testUsers, cfg.userId)) return;
      const endedAt = instantOf(info.end, cfg.timezone);
      const wait = Math.max(0, (Number.isNaN(endedAt) ? Date.now() : endedAt) + delayMsOf(cfg.delay) - Date.now());
      timers.push(setTimeout(() => openFeedback(info, false), wait));
    };
    window.addEventListener(FEEDBACK_ENDED_EVENT, onEnded);
    return () => {
      window.removeEventListener(FEEDBACK_ENDED_EVENT, onEnded);
      timers.forEach(clearTimeout);
    };
  }, [openFeedback]);

  // The weekly Pending Feedback popup, once per page load, on the configured day of the week.
  const bulkChecked = useRef(false);
  useEffect(() => {
    if (!wanted || bulkChecked.current || bulkDay.value === null || showFromDate.value === null || dashboardData.isLoading) return;
    bulkChecked.current = true;
    if (!isBulkFeedbackDay(bulkDay.value)) return;
    const { startDate, endDate } = previousWeekRange();
    getSchoolCalendar({ schoolUUID, userId, startDate, endDate }).then((data) => {
      if (!data || ["0", "2", "3"].includes(String(data.status))) return;
      const holidays = data.holidays || [];
      const events = normalizeCalendarEvents(data.event, { timezone, courseDetails: data.courseDetails }).filter((event) => !holidays.includes(event.localDateKey));
      const list = pendingFeedbackOf(events, { showFromDate: showFromDate.value, timezone });
      if (list.total > 0) setPending(list);
    });
  }, [wanted, bulkDay.value, showFromDate.value, dashboardData.isLoading, schoolUUID, userId, timezone]);

  if (!wanted) return null;
  return (
    <>
      {pending && <PendingFeedbackPopup pending={pending} onRate={(info) => openFeedback(info, true)} onClose={() => setPending(null)} />}
      {modal && (
        <ClassFeedbackModal
          key={modal.key}
          title={modal.info.eventTitle || modal.info.title || t("modal.classFallback")}
          dateTime={classDateTimeOf(modal.info, { locale: dateLocale })}
          teacher={isFeedbackActivity(modal.info) ? "" : teacherDisplayOf(modal.info) === "Teacher" ? tc("words.teacher") : teacherDisplayOf(modal.info)}
          url={modal.url}
          rightSlide={modal.rightSlide}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
