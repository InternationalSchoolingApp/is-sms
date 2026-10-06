"use client";

import { useMutation } from "@tanstack/react-query";
import { signupStage1 } from "@/services/studentSignupBackendApi";
import { encodeRawString } from "@/utils/payloadEncoding";
import { getUtmFieldsForSignup } from "@/utils/utmCookies";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { getHash } from "@/utils/common";

/**
 * Builds the enrollment/stage-1 request body, matching
 * getRequestForSignup() in signupCommon.js field-for-field.
 *
 * `schoolId`/`schoolUUID`/`learningProgram`/`enrollmentFor` now come from
 * the URL the user is actually on
 * (/{schoolId}/student/{enrollmentFor}/{learningProgram}, see
 * app/[enrollmentFor]/[learningProgram]/page.jsx),
 * matching how the JSP app resolves these server-side per-request —
 * `context` is just carrying them down, not defaulting them from env vars
 * anymore.
 *
 * IMPORTANT (confirmed via a live server stack trace, not guessed):
 * `Authentication.schoolId` and `SignupDTO.schoolId` are both typed
 * `Integer` in the backend — the NUMERIC school row id, e.g. 1 for the
 * default/primary school. This is a DIFFERENT value from `schoolUUID`
 * (the string slug used in URL paths, e.g. "international-schooling").
 * Sending the UUID string into the `schoolId` field throws a Jackson
 * InvalidFormatException server-side and the whole request 500s. Never
 * merge these two into one value again.
 */
function buildStage1Request({ mode, fields, context }) {
  const authentication = {
    hash: getHash(),
    schoolId: context.schoolNumericId,
    schoolUUID: context.schoolUUID,
    userType: "STUDENT",
  };

  const data = {
    location: "{}",
    signupType: mode === "offline" ? "Offline" : "Online",
    userType: "STUDENT",
    schoolId: context.schoolNumericId,
    schoolUUID: context.schoolUUID,
    ...getUtmFieldsForSignup(),
  };

  if (mode === "offline") {
    // AccountFormOfflineB2B's <Select> already uses full backend enum
    // values directly (e.g. "BATCH", not "G") — no mapping needed here.
    data.email = fields.communicationEmail;
    data.referralCode = fields.referralCode;
    data.learningProgram = fields.learningProgram;
    data.enrollmentFor = context.enrollmentFor;
    data.discount = fields.discount ?? "";
  } else {
    data.email = fields.email;
    data.confirmEmail = fields.confirmEmail;
    // Password is double-encoded: once here (matching encode() in
    // jquery.commonFunction.js), then again as part of the whole request
    // when postPayload() calls encodePayload() below — confirmed at source
    // (studentSignupStage1 calls aesUtil.decode() a second time, on just
    // this field, after decoding the outer payload).
    data.password = encodeRawString(fields.password);
    data.confirmPassword = encodeRawString(fields.confirmPassword);
    data.captcha = fields.captcha;
    data.referralCode = fields.referralCode;
    data.unregisteredId = context.unregisteredId ?? "";
    data.discount = fields.discount ?? "";
    data.ras = context.ras ?? "";
    // context.learningProgram is our own short URL code (e.g. "G") — map
    // it to the backend's full enum string before sending.
    data.learningProgram = getLearningProgramBackendValue(context.learningProgram);
    data.enrollmentFor = context.enrollmentFor;
  }
  debugger;
  console.log("data", data)
  return { authentication, data };
}

export function useAccountSignup({ mode, context }) {
  return useMutation({
    mutationFn: (fields) => signupStage1(context.schoolUUID, buildStage1Request({ mode, fields, context })),
  });
}
