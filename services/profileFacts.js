import { backendRequest } from "@/utils/backendRequest";
import { customFieldsOf } from "@/utils/profileModel";

/**
 * Server-only helper (not a Server Action) for My Profile writes: finds the signed-in user's current enrolment
 * (student/dashboard/get-student-dashboard, the call the dashboard shell makes) and loads that user's own profile with
 * it (profile-view-content-new needs a real studentStandardId, with 0 it leaves out studentProfile); the user is
 * always the token user. Returns what a write may rely on instead of browser input:
 *   { studentStandardId (current enrolment), timeSlots [{ id, start "HH:mm", end "HH:mm" }], activityIds [string],
 *     socialLinkIds [string] (the user's own active custom social links), customFields [{ id, type, value }], contacts }.
 */

// The documents the profile page can upload / remove, by the backend's docType names (profileViewNewContent.js).
export const PROFILE_DOC_TYPES = ["Age Proof", "Address Proof", "Signature", "Last Academic Proof"];
// The profile photo goes through the same save-docs call (the backend makes the ID card again with it).
export const PROFILE_PHOTO_TYPE = "Profile Image";

const hhmm = (value) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};

/**
 * The saved contact values a profile OTP may be sent to, by the existing page's field ids:
 * { phoneNumber: { value, iso, whatsApp }, studentEmailId: { value }, ... }. Only saved values count: an OTP never
 * goes to (or verifies) a value typed in the browser.
 */
function contactsOf(sp) {
  const [p = {}, g = {}] = sp;
  const t = (v) => (v == null ? "" : String(v).trim());
  const phone = (number, iso, wa) => ({ value: t(number).replace(/[^0-9]/g, ""), iso: t(iso).toLowerCase(), whatsApp: t(wa).toUpperCase() === "Y" });
  return {
    phoneNumber: phone(p.phoneNumber, p.phoneNumberCountryCode, p.phoneNumberWhatsAppStatus),
    altPhoneNumber: phone(p.altPhoneNumber, p.altPhoneNumberCountryCode, p.altPhoneNumberWhatsAppStatus),
    motherPhoneNumber: phone(g.motherPhoneNumber, g.motherPhoneNumberCountryCode, g.motherPhoneNumberWhatsAppStatus),
    fatherPhoneNumber: phone(g.fatherPhoneNumber, g.fatherPhoneNumberCountryCode, g.fatherPhoneNumberWhatsAppStatus),
    guardianPhoneNumber: phone(g.guardianPhoneNumber, g.guardianPhoneNumberCountryCode, g.guardianPhoneNumberWhatsAppStatus),
    studentEmailId: { value: t(p.studentEmailId) },
    altEmailId: { value: t(p.altEmailId) },
    motherEmail: { value: t(g.motherEmail) },
    fatherEmail: { value: t(g.fatherEmail) },
    guardianEmail: { value: t(g.guardianEmail) },
  };
}

export async function loadMyProfileFacts() {
  const dashboard = await backendRequest({ path: "student/dashboard/get-student-dashboard", checkSession: null, buildBody: (me) => ({ userId: me.userId }) });
  if (!dashboard.ok) return dashboard;
  const enrolment = Number(dashboard.data?.studentStandardId) || 0;
  if (!enrolment) return { ok: false, code: "NO_ENROLMENT", message: "No current enrolment was found on your profile." };
  const loaded = await backendRequest({
    path: "dashboard/profile-view-content-new",
    buildBody: (me) => ({ userId: me.userId, actionType: "1a", studentStandardId: enrolment }),
  });
  if (!loaded.ok) return loaded;
  const sp = loaded.data?.profileData?.studentProfile;
  if (String(loaded.data?.status) !== "1" || !Array.isArray(sp)) {
    return { ok: false, code: "PROFILE", message: loaded.data?.message || "Your profile could not be loaded." };
  }
  const standards = Array.isArray(sp[2]?.studentStandardDTO) ? sp[2].studentStandardDTO : [];
  // The enrolment the profile itself lists for this user (the dashboard one, checked against the profile).
  const studentStandardId = standards.some((x) => Number(x.studentStandardId) === enrolment) ? enrolment : Number(standards[0]?.studentStandardId) || 0;
  if (!studentStandardId) return { ok: false, code: "NO_ENROLMENT", message: "No current enrolment was found on your profile." };
  return {
    ok: true,
    data: {
      studentStandardId,
      timeSlots: (Array.isArray(sp[3]?.prefTimeList) ? sp[3].prefTimeList : []).map((t) => ({ id: t.timePrefId, start: hhmm(t.startTime), end: hhmm(t.endTime) })),
      activityIds: (Array.isArray(sp[4]?.joinedSportsAndECList) ? sp[4].joinedSportsAndECList : []).map((row) => String(row.id)),
      socialLinkIds: (Array.isArray(sp[0]?.socialMedia) ? sp[0].socialMedia : [])
        .filter((s) => String(s?.socialMediaMasterId) === "0" && String(s?.status || "").toUpperCase() === "Y" && s?.userSocialMediaId)
        .map((s) => String(s.userSocialMediaId)),
      customFields: [0, 1, 2, 4].flatMap((i) => customFieldsOf(sp[i]?.customFields)).map((f) => ({ id: f.id, type: f.type, value: f.value })),
      contacts: contactsOf(sp),
    },
  };
}
