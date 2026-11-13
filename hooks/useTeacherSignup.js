"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getTeacherBasicDetails,
  saveTeacherBasicDetails,
  teacherSignupStage1,
} from "@/services/teacherSignupApi";
import { buildAuthentication, buildAuthenticatedRequest } from "@/utils/authentication";
import { encodeRawString } from "@/utils/payloadEncoding";
import { getUtmFieldsForSignup } from "@/utils/utmCookies";
import { formatTeacherDobForRequest, parseTeacherDob } from "@/utils/teacherSignupValidation";

const USER_TYPE = "TEACHER";
const STATUS_SUCCESS = "1";

/**
 * The teacher sign-up (stage-1) request, the same shape the legacy teacher page posts
 * (ClientSignupTeacherController#teacherSignupStage1: { authentication, data }). `schoolId` is the NUMERIC school row
 * id and `schoolUUID` the URL slug; they are different values and must not be merged. A teacher sign-up carries no
 * learning program / enrollment-for, and no captcha number (the backend skips its own reCAPTCHA check when the
 * Next.js flow is on). Passwords are double-encoded: once here, then again with the whole payload.
 */
export function buildTeacherStage1Request({ fields, context }) {
  return {
    authentication: buildAuthentication(context, USER_TYPE),
    data: {
      location: fields.location || "{}",
      signupType: "Online",
      userType: USER_TYPE,
      schoolId: context.schoolNumericId,
      schoolUUID: context.schoolUUID,
      ...getUtmFieldsForSignup(),
      email: fields.email.trim(),
      confirmEmail: fields.confirmEmail.trim(),
      password: encodeRawString(fields.password),
      confirmPassword: encodeRawString(fields.confirmPassword),
    },
  };
}

export function useTeacherAccountSignup({ context }) {
  return useMutation({
    mutationFn: (fields) =>
      teacherSignupStage1(context.schoolUUID, buildTeacherStage1Request({ fields, context }), fields.recaptchaToken),
  });
}

/**
 * get-teacher-basic-details -> the form's own field shape. IDs come back as numbers (0 = not chosen) and every select
 * keys its options by String(id); `dob` is "yyyy-MM-dd" or "" (parsed by hand, never new Date(string), which would
 * read it as UTC and show the day before in a western timezone). The phone: `countryData` is the ISO2 of the saved
 * country (the flag to restore), `countryCode` its dial code without the "+".
 */
export function mapTeacherDetailsToFields(teacher) {
  if (!teacher) return null;
  const id = (value) => (Number(value) > 0 ? String(value) : "");
  return {
    firstName: teacher.firstName || "",
    middleName: teacher.middleName || "",
    lastName: teacher.lastName || "",
    dob: parseTeacherDob(teacher.dob),
    gender: teacher.gender || "",
    countryId: id(teacher.countryId),
    stateId: id(teacher.stateId),
    cityId: id(teacher.cityId),
    communicationEmail: teacher.communicationEmail || "",
    contactNumber: teacher.contactNumber || "",
    // intl-tel-input's own names (see PhoneNumberField): ISO2 in upper case and the dial code with its "+"
    countryCode: teacher.countryData ? String(teacher.countryData).toUpperCase() : "",
    countryIsdCode: teacher.countryCode ? `+${String(teacher.countryCode).replace(/^\+/, "")}` : "",
  };
}

// Several observers can share this query; within the window they reuse the cache, and Step 1 writes what it saved
// back with setQueryData so it never lags behind.
export const TEACHER_DETAILS_STALE_MS = 30 * 1000;

export function useTeacherBasicDetailsPrefill({ context, userId }) {
  return useQuery({
    queryKey: ["teacher-basic-details", userId],
    queryFn: async () => {
      const response = await getTeacherBasicDetails(context.schoolUUID, userId);
      if (response?.status !== STATUS_SUCCESS) return null;
      return mapTeacherDetailsToFields(response.details?.teacher);
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: TEACHER_DETAILS_STALE_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * The save-basic-details request. Same fields the legacy page sends, except marital status / address / zip code,
 * which the Next.js step does not collect: they are left out so the backend keeps what is already stored.
 * `countryCode` is the dial code without the "+" and `countryData` the lower-case ISO2 (the OPPOSITE of the names
 * intl-tel-input hands back, see mapTeacherDetailsToFields). `userId` is the signed-in teacher's own id (the backend
 * refuses anyone else's).
 */
export function buildSaveTeacherDetailsRequest({ fields, context, userId }) {
  return {
    authentication: buildAuthenticatedRequest(context, userId, USER_TYPE),
    teacherDetails: {
      firstName: fields.firstName.trim(),
      middleName: (fields.middleName || "").trim(),
      lastName: fields.lastName.trim(),
      dob: formatTeacherDobForRequest(fields.dob),
      gender: fields.gender,
      countryData: fields.countryCode ? fields.countryCode.toLowerCase() : "",
      countryCode: fields.countryIsdCode ? fields.countryIsdCode.replace(/^\+/, "") : "",
      contactNumber: (fields.contactNumber || "").replace(/[-\s]/g, ""),
      communicationEmail: fields.communicationEmail,
      countryId: fields.countryId,
      stateId: fields.stateId,
      cityId: fields.cityId,
    },
  };
}

export function useTeacherBasicDetailsSave({ context, userId }) {
  return useMutation({
    mutationFn: (fields) =>
      saveTeacherBasicDetails(context.schoolUUID, buildSaveTeacherDetailsRequest({ fields, context, userId })),
  });
}
