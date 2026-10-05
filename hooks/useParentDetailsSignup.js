"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getParentDetails, saveParentDetails } from "@/services/studentSignupBackendApi";
import { buildAuthenticatedRequest } from "@/utils/authentication";

/**
 * Inverse of buildCommunications(): turns a SignupParentDTO (as returned in
 * get-student-review-details' `signupParent`, same converter as
 * get-parent-details) into Stage2ParentDetails' own field shape, so the
 * review screen's inline "Edit" opens pre-filled from the data it already
 * loaded. `communications` is "W=Y|C=N|E=Y".
 */
export function mapSignupParentToFields(signupParent) {
  if (!signupParent) return null;
  // For a saved parent the backend fills the three "Y"/"N" flags from the DB but leaves the
  // `communications` string at its default (SignupUtil.convertToSignupParentsDTO), so read the flags
  // first and only fall back to the string.
  const comm = String(signupParent.communications || "");
  const flag = (key, explicit) => explicit === "Y" || new RegExp(`${key}=Y`).test(comm);
  return {
    firstName: signupParent.firstName || "",
    middleName: signupParent.middleName || "",
    lastName: signupParent.lastName || "",
    relation: signupParent.relationship || "",
    email: signupParent.email || "",
    contactNumber: signupParent.contactNumber || "",
    // The DTO's countryCode is the dial code ("1") and countryIsdCode2 the ISO2 ("us"); the form state
    // is the other way round (countryCode = ISO2, countryIsdCode = "+dial"), as the widget emits it.
    countryCode: String(signupParent.countryIsdCode2 || "").toUpperCase(),
    countryIsdCode: signupParent.countryCode ? `+${String(signupParent.countryCode).replace(/^\+/, "")}` : "",
    sameAsStudent: false,
    countryId: signupParent.countryId ? String(signupParent.countryId) : "",
    stateId: signupParent.stateId ? String(signupParent.stateId) : "",
    cityId: signupParent.cityId ? String(signupParent.cityId) : "",
    communicationWhatsApp: flag("W", signupParent.communicationWhatsApp),
    communicationCall: flag("C", signupParent.communicationCall),
    communicationEmail: flag("E", signupParent.communicationEmail),
    workingProfession: signupParent.workingProfession || "",
    institutionName: signupParent.institutionName || "",
    institutionCountryId: signupParent.institutionCountryId ? String(signupParent.institutionCountryId) : "",
  };
}

/**
 * Step 2's prefill — get-parent-details (callForParentSelection() in signupStudentStage2.js), the
 * same way Step 1 uses get-student-details. Resolves to the form-field shape, or null when the call
 * fails or this student has no parent saved yet (so the form keeps its own defaults).
 */
export function useParentDetailsPrefill({ context, userId }) {
  return useQuery({
    queryKey: ["parent-details-prefill", userId],
    queryFn: async () => {
      const response = await getParentDetails(context.schoolUUID, { userId });
      if (response?.status !== "1" || !response.signupParent) return null;
      const parent = response.signupParent;
      const hasSavedParent = Boolean(parent.firstName || parent.relationship || parent.workingProfession || parent.institutionName);
      return hasSavedParent ? mapSignupParentToFields(parent) : null;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

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
    // useIntlTelInput's onChange (see PhoneNumberField) hands back
    // countryCode = ISO2 ("IN") and countryIsdCode = dial code with a
    // leading "+" ("+91") — the OPPOSITE of what these DTO fields mean on
    // the backend: signupParentDTO.countryCode is the dial code, no "+"
    // (-> parents.PHONE_CODE_CONTACT_NUMBER), and countryIsdCode2 is the
    // lowercase ISO2 (-> parents.COUNTRY_CODE_ISO2, VARCHAR(2) — sending the
    // "+91" dial code there overflows it: "Data too long for column
    // 'COUNTRY_CODE_ISO2'"). Same fix as Stage 1's useStudentDetailsSignup.js.
    signupParent.countryIsdCode2 = fields.countryCode ? fields.countryCode.toLowerCase() : "";
    signupParent.countryCode = fields.countryIsdCode ? fields.countryIsdCode.replace(/^\+/, "") : "";
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fields) =>
      saveParentDetails(context.schoolUUID, buildSaveParentDetailsRequest({ fields, context, userId, isOneToOneFlex })),
    // The prefill query still holds the parent as it was BEFORE this save, and the step reads
    // its cache as soon as it remounts (Back from Step 3), so it would show the old values until
    // the background refetch lands -- and the form only takes its initial values once. Drop the
    // stale entry (same as useProceedToReview does for the review data) so the next visit waits
    // for the freshly saved parent. A rejected save (status "0"/"2", or no response) saved nothing.
    onSuccess: (response) => {
      if (!response || response.status === "0" || response.status === "2") return;
      queryClient.removeQueries({ queryKey: ["parent-details-prefill", userId] });
    },
  });
}
