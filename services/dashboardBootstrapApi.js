"use server";

import { getSessionIdentity } from "@/utils/backendRequest";
import {
  getAnnouncementDetails,
  getAppInstallPromptEligible,
  getChatUnseenCount,
  getDashboardChatLinks,
  getDashboardMenu,
  getNeedHelpContact,
  getPendingAssignmentCount,
  getSchoolCalendar,
  getStudentAcademicDetails,
  getStudentAcademicPerformance,
  getStudentDashboardDetails,
  getStudentDashboardOrMigration,
  getStudentMenuFlags,
  getUserShortProfile,
} from "@/services/dashboardApi";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { getOnboardingStatus } from "@/services/onboardingGateApi";
import { getAllArticles } from "@/services/newsApi";
import { getInboxUnread } from "@/services/inboxApi";
import { getCartCount } from "@/services/cartApi";
import { loadQuoteOfMoment } from "@/services/quoteApi";
import { loadPendingContactChecks } from "@/services/contactCheckApi";
import { getReserveSeatEligibility } from "@/services/reserveSeatApi";
import { getSystemTrainingPopup } from "@/services/systemTrainingApi";
import { loadOutlookReminder } from "@/services/outlookReminderApi";
import { getSettingsByTypeAndKeys } from "@/services/settingsApi";
import { FEEDBACK_SETTING_KEYS } from "@/utils/classFeedback";

/**
 * Student dashboard start-up in as few round trips as possible. Server Actions called from the browser run one after the
 * other, so thirty small actions cost the sum of all of them. These two read the same data with the backend calls running side
 * by side on the server (Promise.all), so the wait is the slowest call, not the total.
 *
 *   getDashboardBootstrap  everything the page needs to draw: dashboard details (grade band, time zone), the sidebar menu, the
 *                          student name, the school links (logo, chat / diary url), the onboarding check, today's calendar,
 *                          My Performance, the overdue count and the quote of the moment.
 *                          Also the short profile (look, forced password) and the contact check, the first popup (it has a time limit).
 *   getDashboardBadges     what can come a moment later: the right-rail counts (announcements, news, chat), the inbox and the cart.
 *   getDashboardExtras     the other popups' checks: need help, reserve a seat, system training, app install, Outlook, feedback settings.
 *
 * Every part is its own answer: one that fails is `undefined` here and the page then asks for that one part the way it always
 * did (utils/dashboardBootstrap.js), so a single failure never blanks the rest. Who the call is for comes only from the sign-in;
 * the only thing taken from the browser is a date range, which just chooses which of the student's own calendar days are
 * read. The client uses an answer only when its range / role id match what it asked for.
 */

const settle = (promise) => Promise.resolve(promise).then((value) => value, () => undefined);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function getDashboardBootstrap({ calendar } = {}) {
  const me = await getSessionIdentity();
  if (!me) return null;
  const base = { schoolUUID: me.schoolUUID, userId: me.userId };
  const range = calendar && DAY.test(String(calendar.startDate)) && DAY.test(String(calendar.endDate)) ? { startDate: String(calendar.startDate), endDate: String(calendar.endDate) } : null;

  // The grade band and the role id come from the details; the menu and the performance flavour wait for them, the rest do not.
  const details = settle(getStudentDashboardDetails(base));
  const menu = details.then(async (d) => {
    const roleId = d?.roleAndModuleAssign?.roleAndModuleDTO?.[0]?.roleId ?? null;
    if (!roleId) return undefined;
    return { roleId, data: await settle(getDashboardMenu({ ...base, schoolId: me.schoolNumericId, roleId })) };
  });
  const performance = details.then(async (d) => {
    const k5 = d?.k5DashboardEnabled === true;
    return { k5, data: await settle(getStudentAcademicPerformance({ ...base, k5Performance: k5 })) };
  });

  const [detailsAnswer, menuAnswer, performanceAnswer, migration, academic, chatLinks, links, menuFlags, onboarding, calendarData, pending, quote, shortProfile, contactPending] = await Promise.all([
    details,
    menu,
    performance,
    settle(getStudentDashboardOrMigration(base)),
    settle(getStudentAcademicDetails(base)),
    settle(getDashboardChatLinks(base)),
    me.schoolNumericId ? settle(getSchoolSettingsLinks(me.schoolNumericId)) : undefined,
    settle(getStudentMenuFlags({ schoolUUID: me.schoolUUID, studentUserId: me.userId })),
    settle(getOnboardingStatus()),
    range ? settle(getSchoolCalendar({ ...base, ...range })) : undefined,
    settle(getPendingAssignmentCount(base)),
    settle(loadQuoteOfMoment()),
    settle(getUserShortProfile(base)),
    settle(loadPendingContactChecks()),
  ]);

  return {
    details: detailsAnswer,
    menu: menuAnswer,
    performance: performanceAnswer,
    migration,
    academic,
    chatLinks,
    links,
    menuFlags,
    onboarding,
    calendar: range && calendarData !== undefined ? { ...range, data: calendarData } : undefined,
    pending,
    quote,
    shortProfile,
    contactPending,
  };
}

export async function getDashboardBadges() {
  const me = await getSessionIdentity();
  if (!me) return null;
  const base = { schoolUUID: me.schoolUUID, userId: me.userId };
  const [announcements, news, chatUnseen, inbox, cart] = await Promise.all([
    settle(getAnnouncementDetails({ ...base, startFrom: 0, pageSize: 20 })),
    settle(getAllArticles({ page: 1, size: 10 })),
    settle(getChatUnseenCount({ ...base, email: me.email })),
    settle(getInboxUnread()),
    settle(getCartCount()),
  ]);
  return { announcements, news, chatUnseen, inbox, cart };
}

export async function getDashboardExtras() {
  const me = await getSessionIdentity();
  if (!me) return null;
  const base = { schoolUUID: me.schoolUUID, userId: me.userId };
  const [needHelp, reserveSeat, systemTraining, appInstall, outlook, feedback] = await Promise.all([
    settle(getNeedHelpContact({ ...base, schoolNumericId: me.schoolNumericId })),
    settle(getReserveSeatEligibility()),
    settle(getSystemTrainingPopup()),
    me.uniqueId ? settle(getAppInstallPromptEligible({ uniqueId: me.uniqueId })) : undefined,
    settle(loadOutlookReminder()),
    settle(getSettingsByTypeAndKeys("CONFIGURATION", FEEDBACK_SETTING_KEYS)),
  ]);
  return { needHelp, reserveSeat, systemTraining, appInstall, outlook, feedback };
}
