"use server";

import { randomUUID } from "node:crypto";
import { backendRequest } from "@/utils/backendRequest";
import { loadMyProfileFacts } from "@/services/profileFacts";
import { dialCode } from "@/utils/profileModel";

/**
 * My Profile P4: verify a saved phone number / e-mail with a one-time code, as the existing page does
 * (profileViewNew.js getProfileContactOtpPayload): {school}/api/v1/common/otp-process with
 *   otpType 1 = send, 2 = resend, 3 = verify; messageChannel PHONE (SMS) | WHATSAPP | EMAIL;
 *   entityType "STUDENT_PROFILE_CONTACT_<fieldId>" (WhatsApp: "STUDENT_PROFILE_CONTACT_WHATSAPP_<fieldId>").
 *
 * The backend's verify marks verified whatever user + value the request names (plan section 19.4 gap #6, Batch C).
 * So here the browser only says WHICH field and channel: the user is the token user and the number / e-mail is the
 * value saved on that user's own profile (services/profileFacts.js), the same on send and verify. A value typed but
 * not saved cannot get a code. Returns { ok, data: { message } } or { ok: false, code, message, sessionExpired? }.
 */

const PHONE_FIELDS = ["phoneNumber", "altPhoneNumber", "motherPhoneNumber", "fatherPhoneNumber", "guardianPhoneNumber"];
const EMAIL_FIELDS = ["studentEmailId", "altEmailId", "motherEmail", "fatherEmail", "guardianEmail"];
const WHATSAPP_FIELD = {
  phoneNumber: "phoneNumberWhatsAppStatus",
  altPhoneNumber: "altPhoneNumberWhatsAppStatus",
  motherPhoneNumber: "motherPhoneNumberWhatsAppStatus",
  fatherPhoneNumber: "fatherPhoneNumberWhatsAppStatus",
  guardianPhoneNumber: "guardianPhoneNumberWhatsAppStatus",
};

const fail = (code, message) => ({ ok: false, code, message });

async function otpRequest({ fieldId, channel, otpType, otpCode = "" }) {
  const isPhone = PHONE_FIELDS.includes(fieldId);
  const isEmail = EMAIL_FIELDS.includes(fieldId);
  if (!isPhone && !isEmail) return fail("BAD_FIELD", "This detail cannot be verified here.");
  const ch = isEmail ? "EMAIL" : channel === "WHATSAPP" ? "WHATSAPP" : "PHONE";

  const facts = await loadMyProfileFacts();
  if (!facts.ok) return facts;
  const contact = facts.data.contacts[fieldId] || {};
  if (!contact.value) return fail("EMPTY", "Please save this detail first.");
  if (ch === "WHATSAPP" && !contact.whatsApp) return fail("NO_WHATSAPP", "Please tick WhatsApp for this number and save it first.");
  const isd = isPhone ? dialCode(contact.iso).replace(/^\+/, "") : "";
  if (isPhone && !isd) return fail("NO_CODE", "Please save the country code of this number first.");

  const otpFieldId = ch === "WHATSAPP" ? WHATSAPP_FIELD[fieldId] : fieldId;
  const result = await backendRequest({
    path: "api/v1/common/otp-process",
    checkSession: null,
    buildBody: (me) => ({
      authentication: { hash: randomUUID(), loginHash: "", userType: "STUDENT", userId: me.userId, schoolId: me.schoolNumericId, schoolUUID: me.schoolUUID, sessionUserId: me.userId },
      requestOTPData: {
        otpType,
        isdCode: isd,
        userphone: isPhone ? contact.value : "",
        otpCode,
        signupType: "",
        isDemoUser: "false",
        email: ch === "EMAIL" ? contact.value : "",
        messageChannel: ch,
        location: "",
        entityType: ch === "WHATSAPP" ? `STUDENT_PROFILE_CONTACT_WHATSAPP_${fieldId}` : `STUDENT_PROFILE_CONTACT_${fieldId}`,
        entityId: me.userId,
        userId: me.userId,
        fieldId: otpFieldId,
        schoolUUID: me.schoolUUID,
        schoolId: me.schoolNumericId,
        varifiedUsing: ch === "EMAIL" ? "E" : ch === "WHATSAPP" ? "W" : "N",
      },
    }),
  });
  if (!result.ok) return result;
  if (String(result.data?.status) !== "1") return fail(String(result.data?.statusCode || "OTP_FAILED"), result.data?.message || "The code could not be sent.");
  return { ok: true, data: { message: result.data?.message || "" } };
}

/** Send (or, with resend, send again) a code to a saved phone number (SMS / WhatsApp) or e-mail. */
export async function sendProfileOtp({ fieldId, channel, resend = false } = {}) {
  return otpRequest({ fieldId, channel, otpType: resend ? 2 : 1 });
}

/** Check the code; on success the backend marks that saved value as verified. */
export async function verifyProfileOtp({ fieldId, channel, code } = {}) {
  const otpCode = String(code || "").trim();
  if (!/^[0-9]{4,8}$/.test(otpCode)) return fail("BAD_CODE", "Please enter the code you received.");
  return otpRequest({ fieldId, channel, otpType: 3, otpCode });
}
