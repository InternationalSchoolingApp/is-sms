"use client";

import { useMutation } from "@tanstack/react-query";
import { saveParentDetails, sendOtpForParentVerification, verifyParentOtp } from "@/services/studentSignupApi";
import { buildAuthentication, buildAuthenticatedRequest } from "@/utils/authentication";

function buildCommunications({ whatsapp, call, email }) {
  return `W=${whatsapp ? "Y" : "N"}|C=${call ? "Y" : "N"}|E=${email ? "Y" : "N"}`;
}

/**
 * Builds the save-parent-details request, matching getRequestForSignupParent()
 * in signupStudentStage2.js field-for-field (request DTO confirmed at
 * SignupStudentUtil.java:2165 — SaveParentDetailsRequestDTO { authentication,
 * signupParent }). The ONE_TO_ONE_FLEX branch (workingProfession/
 * institutionName/institutionCountryId, saved onto Student, not Parents) is
 * mutually exclusive with the normal parent-relationship fields — confirmed
 * at SignupStudentUtil.java:2478/2533/2589.
 *
 * `skipParent` is always "Y": the current live UI has no parent-login/
 * password creation field (confirmed dead in the old JS too — parentSwitchIntput
 * /parentPassword aren't actually rendered), so the backend's
 * password-required branch (only entered when skipParent=="N" &&
 * parentEmailStatus==0) is deliberately never triggered here.
 */
function buildSaveParentDetailsRequest({ fields, context, userId, isOneToOneFlex }) {
  const signupParent = {
    responsibleConfirm: "Yes",
    gender: "DONOTWANTTOSPECIFY",
    skipParent: "Y",
  };

  if (isOneToOneFlex) {
    signupParent.workingProfession = fields.workingProfession;
    signupParent.institutionName = fields.institutionName;
    signupParent.institutionCountryId = fields.institutionCountryId;
  } else {
    signupParent.relationship = fields.relation;
    // "Other" relation isn't selectable in the UI (see RELATION_OPTIONS in
    // Stage2ParentDetails.jsx), matching the live is-rest-api form, so this is
    // always empty -- kept because the backend DTO still expects the key.
    signupParent.otherRelationName = "";
    signupParent.firstName = fields.firstName;
    signupParent.middleName = fields.middleName || "";
    signupParent.lastName = fields.lastName;
    signupParent.email = fields.email || "";
    signupParent.countryIsdCode2 = fields.countryIsdCode || "";
    signupParent.countryCode = fields.countryCode || "";
    signupParent.contactNumber = fields.contactNumber || "";
    signupParent.countryId = fields.countryId;
    signupParent.stateId = fields.stateId;
    signupParent.cityId = fields.cityId;
    // No referral-code field on the live is-rest-api form either (its
    // #referralCode element doesn't exist, so getRequestForSignupParent()
    // always falls back to '').
    signupParent.referralCode = "";
    signupParent.communications = buildCommunications({
      whatsapp: fields.communicationWhatsApp,
      call: fields.communicationCall,
      email: fields.communicationEmail,
    });
  }

  return { authentication: buildAuthenticatedRequest(context, userId), signupParent };
}

export function useParentDetailsSignup({ context, userId, isOneToOneFlex }) {
  return useMutation({
    mutationFn: (fields) =>
      saveParentDetails(context.schoolUUID, buildSaveParentDetailsRequest({ fields, context, userId, isOneToOneFlex })),
  });
}

/**
 * OTP-based parent email verification (send-otp-for-parent-verification /
 * verify-otp, both in CommonController.java, {schoolId}/api/v1/common/*,
 * NOT under student/enrollment/*). Response `statusCode` legend (SeriConstant.java):
 * "1" sent ok, "0" send/verify failure, "2" verified, "3" OTP mismatch,
 * "4" send-count exceeded (rate limited).
 *
 * Only relevant on first pass through the wizard — saveSignupParent() on the
 * backend auto-verifies without checking the Otp table once the student has
 * already reached the Address stage once (User.firstReset >= 13). The UI
 * still always offers verification; the backend just no-ops the check then.
 */
export function useSendParentOtp({ context, userId }) {
  return useMutation({
    mutationFn: ({ email, parentName }) =>
      sendOtpForParentVerification(context.schoolUUID, {
        authentication: buildAuthenticatedRequest(context, userId),
        data: { userId, email, schoolId: context.schoolNumericId, parentName },
      }),
  });
}

export function useVerifyParentOtp({ context }) {
  return useMutation({
    mutationFn: ({ email, otp }) =>
      verifyParentOtp(context.schoolUUID, {
        authentication: buildAuthentication(context),
        requestData: { requestValue: email, requestExtra1: otp },
      }),
  });
}
