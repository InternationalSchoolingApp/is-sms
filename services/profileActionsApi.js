"use server";

import { backendRequest } from "@/utils/backendRequest";
import { PROFILE_DOC_TYPES, loadMyProfileFacts } from "@/services/profileFacts";

/**
 * My Profile P3: the list-type changes the existing page saves straight away (not through Bulk Save):
 *   live-class preferred times  -> {school}/report/save-time-preference (saveType STUDENT_PROFILE) / dashboard/inactivate-time-preference
 *   joined sports & activities  -> dashboard/save-joined-sports-ec-club / dashboard/inactivate-joined-extra-curricular
 *   documents (remove)          -> dashboard/delete-uploaded-docs   (upload: app/api/profile/document/route.js)
 *
 * These endpoints still take the student / enrolment / row id from the payload without an ownership check (plan
 * section 19.4, gap #5 and the new save-time-preference gap). So here the user is always the token user, the
 * enrolment comes from the user's own profile loaded on the server (services/profileFacts.js), and a row can only be
 * removed when it is in that profile. Returns { ok, data } or { ok: false, code, message, sessionExpired? }.
 */

const fail = (code, message) => ({ ok: false, code, message });
const failed = (answer) => ["0", "2", "3"].includes(String(answer?.status ?? ""));
const messageOf = (answer, fallback) => answer?.message || answer?.MESSAGE || fallback;

// "09:30" -> "9:30:00" (the existing page sends hours without padding).
function toBackendTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  if (!m) return null;
  return `${Number(m[1])}:${m[2]}:00`;
}

export async function addClassTime({ start, end } = {}) {
  const s = toBackendTime(start);
  const e = toBackendTime(end);
  if (!s || !e) return fail("BAD_TIME", "Please choose a start and an end time.");
  if (String(start) >= String(end)) return fail("BAD_TIME", "The end time must be after the start time.");
  const facts = await loadMyProfileFacts();
  if (!facts.ok) return facts;
  const { studentStandardId, timeSlots } = facts.data;
  if (timeSlots.some((slot) => start < slot.end && end > slot.start)) {
    return fail("OVERLAP", "This time overlaps with one of your other times.");
  }
  const result = await backendRequest({
    path: "report/save-time-preference",
    buildBody: (me) => ({
      userId: me.userId,
      schoolId: me.schoolNumericId,
      slotAddUserId: me.userId,
      studentStandardId,
      userRole: "STUDENT",
      saveType: "STUDENT_PROFILE",
      teacherTimeList: [{ startTime: s, endTime: e }],
    }),
  });
  if (!result.ok) return result;
  if (failed(result.data)) return fail("SAVE_FAILED", messageOf(result.data, "The time could not be saved."));
  return { ok: true, data: { message: messageOf(result.data, "Time saved.") } };
}

export async function removeClassTime({ timePrefId } = {}) {
  const facts = await loadMyProfileFacts();
  if (!facts.ok) return facts;
  if (!facts.data.timeSlots.some((slot) => String(slot.id) === String(timePrefId))) return fail("NOT_YOURS", "This time is not on your profile.");
  const result = await backendRequest({
    path: "dashboard/inactivate-time-preference",
    buildBody: (me) => ({ userId: me.userId, sessionUserId: me.userId, timePrefId: Number(timePrefId) }),
  });
  if (!result.ok) return result;
  if (failed(result.data)) return fail("SAVE_FAILED", messageOf(result.data, "The time could not be removed."));
  return { ok: true, data: { message: "Time removed." } };
}

const DATE_RE = /^[A-Z][a-z]{2} \d{2}, \d{4}$/; // MMM dd, yyyy

export async function addActivity({ title, startDate, endDate, address } = {}) {
  const t = String(title || "").trim();
  const a = String(address || "").trim();
  if (!t) return fail("REQUIRED", "Please enter the sport or activity name.");
  if (!DATE_RE.test(String(startDate || "")) || !DATE_RE.test(String(endDate || ""))) return fail("REQUIRED", "Please choose the start and end dates.");
  if (!a) return fail("REQUIRED", "Please enter where it takes place.");
  if (new Date(startDate) > new Date(endDate)) return fail("BAD_DATE", "The end date must be on or after the start date.");
  const facts = await loadMyProfileFacts();
  if (!facts.ok) return facts;
  const result = await backendRequest({
    path: "dashboard/save-joined-sports-ec-club",
    buildBody: (me) => ({ userId: me.userId, sesssionUserId: me.userId, studentStandardId: facts.data.studentStandardId, title: t.slice(0, 200), startDate, endDate, address: a.slice(0, 300) }),
  });
  if (!result.ok) return result;
  if (failed(result.data)) return fail("SAVE_FAILED", messageOf(result.data, "The activity could not be saved."));
  return { ok: true, data: { message: "Activity added." } };
}

export async function removeActivity({ id } = {}) {
  const facts = await loadMyProfileFacts();
  if (!facts.ok) return facts;
  if (!facts.data.activityIds.includes(String(id))) return fail("NOT_YOURS", "This activity is not on your profile.");
  const result = await backendRequest({
    path: "dashboard/inactivate-joined-extra-curricular",
    buildBody: (me) => ({ userId: me.userId, sesssionUserId: me.userId, joinedExtraCurricularId: Number(id) }),
  });
  if (!result.ok) return result;
  if (failed(result.data)) return fail("SAVE_FAILED", messageOf(result.data, "The activity could not be removed."));
  return { ok: true, data: { message: "Activity removed." } };
}

export async function removeDocument({ docType } = {}) {
  if (!PROFILE_DOC_TYPES.includes(docType)) return fail("BAD_TYPE", "Unknown document.");
  const facts = await loadMyProfileFacts();
  if (!facts.ok) return facts;
  const result = await backendRequest({
    path: "dashboard/delete-uploaded-docs",
    buildBody: (me) => ({ userId: me.userId, studentStandardId: facts.data.studentStandardId, type: docType }),
  });
  if (!result.ok) return result;
  if (failed(result.data)) return fail("SAVE_FAILED", messageOf(result.data, "The document could not be removed."));
  return { ok: true, data: { message: "Document removed." } };
}
