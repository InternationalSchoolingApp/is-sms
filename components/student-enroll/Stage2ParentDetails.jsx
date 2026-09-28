"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { SectionHeading } from "@/components/student-enroll/wizard/fields";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/hooks/useStudentDetailsSignup";
import { useParentDetailsSignup, useSendParentOtp, useVerifyParentOtp } from "@/hooks/useParentDetailsSignup";
import { validateParentDetails, isValidEmail } from "@/utils/studentSignupValidation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

const RELATION_OPTIONS = [
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Guardian", label: "Guardian" },
  { value: "Other", label: "Other" },
];

// SS/CS/WP confirmed at SignupUtil.java's display-name mapping
// (getParentDetails response: SS -> "School Student", CS -> "College
// Student", WP -> "Working Professional").
const WORKING_PROFESSION_OPTIONS = [
  { value: "SS", label: "School Student" },
  { value: "CS", label: "College Student" },
  { value: "WP", label: "Working Professional" },
];

function initialFields(studentAddress) {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    relation: "",
    otherRelationName: "",
    email: "",
    emailVerified: false,
    contactNumber: "",
    countryCode: "",
    countryIsdCode: "",
    phoneValid: undefined,
    sameAsStudent: Boolean(studentAddress?.countryId),
    countryId: studentAddress?.countryId || "",
    stateId: studentAddress?.stateId || "",
    cityId: studentAddress?.cityId || "",
    communicationWhatsApp: false,
    communicationCall: false,
    communicationEmail: false,
    referralCode: "",
    workingProfession: "",
    institutionName: "",
    institutionCountryId: "",
  };
}

function Req({ label, required }) {
  return (
    <>
      {label}
      {required && <span className="text-red-500 top-1 relative"> *</span>}
    </>
  );
}

/**
 * Stage 2 of the enrollment wizard ("Parent information"). Mirrors
 * signupStudentStage2.js / SignupStudentUtil.saveSignupParent() — for
 * ONE_TO_ONE_FLEX, the normal parent-relationship fields are replaced
 * entirely by workingProfession/institutionName/institutionCountryId
 * (confirmed at SignupStudentUtil.java:2478, saved onto the Student entity,
 * not Parents). Parent email verification is OTP-based
 * (send-otp-for-parent-verification / verify-otp in CommonController.java),
 * not a plain field save — see hooks/useParentDetailsSignup.js.
 *
 * `studentAddress` (countryId/stateId/cityId from Stage 1) seeds the "same
 * as student" default — purely a client-side convenience copy, there's no
 * backend flag for it (confirmed: SignupUtil.convertToSignupParentsDTO only
 * defaults the parent's location from the student on first visit, same idea).
 */
export function Stage2ParentDetails({ context, userId, studentAddress, onNext, onBack }) {
  const [fields, setFields] = useState(() => initialFields(studentAddress));
  const [errors, setErrors] = useState({});
  const [flaggedModal, setFlaggedModal] = useState(null);
  const [otpStep, setOtpStep] = useState("idle"); // idle | sent
  const [otpCode, setOtpCode] = useState("");
  const [otpMessage, setOtpMessage] = useState(null);

  const isOneToOneFlex = getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX";

  const signup = useParentDetailsSignup({ context, userId, isOneToOneFlex });
  const sendOtp = useSendParentOtp({ context, userId });
  const verifyOtp = useVerifyParentOtp({ context });
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function setEmail(value) {
    setFields((prev) => ({ ...prev, email: value, emailVerified: false }));
    setOtpStep("idle");
    setOtpCode("");
    setOtpMessage(null);
  }

  function toggleSameAsStudent(checked) {
    setFields((prev) => ({
      ...prev,
      sameAsStudent: checked,
      countryId: checked ? studentAddress?.countryId || "" : "",
      stateId: checked ? studentAddress?.stateId || "" : "",
      cityId: checked ? studentAddress?.cityId || "" : "",
    }));
  }

  async function handleSendOtp() {
    if (!isValidEmail(fields.email)) {
      setErrors((prev) => ({ ...prev, email: "Email is either empty or invalid" }));
      return;
    }
    setOtpMessage(null);
    const response = await sendOtp.mutateAsync({
      email: fields.email,
      parentName: `${fields.firstName} ${fields.lastName}`.trim(),
    });
    if (response?.statusCode === "1") {
      setOtpStep("sent");
    } else if (response?.statusCode === "4") {
      setOtpMessage(response.message || "Too many OTP attempts, please try again later.");
    } else {
      setOtpMessage(response?.message || "Could not send OTP. Please try again.");
    }
  }

  async function handleVerifyOtp() {
    setOtpMessage(null);
    const response = await verifyOtp.mutateAsync({ email: fields.email, otp: otpCode });
    if (response?.statusCode === "2") {
      setFields((prev) => ({ ...prev, emailVerified: true }));
      setOtpStep("idle");
      setErrors((prev) => ({ ...prev, email: undefined }));
    } else {
      setOtpMessage(response?.message || "Incorrect OTP, please try again.");
    }
  }

  async function handleSubmit() {
    const { valid, errors: fieldErrors } = validateParentDetails(fields, { isOneToOneFlex });
    setErrors(fieldErrors);
    if (!valid) return;

    try {
      const response = await signup.mutateAsync(fields);

      if (response?.status === "0" || response?.status === "2") {
        if (response.statusCode === "FLAGGED") {
          setFlaggedModal({ schoolName: context.schoolName, sessionName: response.message });
          return;
        }
        setErrors((prev) => ({ ...prev, form: response.message || "Something went wrong. Please try again." }));
        return;
      }
      if (!response) {
        setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
        return;
      }

      onNext?.(fields);
    } catch (err) {
      console.error("Stage2ParentDetails submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Parent information</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Step 2 of 4. Tell us who we should stay in touch with.</p>

      {isOneToOneFlex ? (
        <>
          <SectionHeading>Working Professional Details</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelSelect
              label={<Req label="Are you a student or a working professional?" required />}
              className="sm:col-span-2 lg:col-span-1"
              value={fields.workingProfession}
              onValueChange={(v) => setField("workingProfession", v)}
              options={WORKING_PROFESSION_OPTIONS}
              error={errors.workingProfession}
            />
            <FloatingLabelInput
              label={<Req label="School / College / Organization Name" required />}
              value={fields.institutionName}
              onChange={(e) => setField("institutionName", e.target.value)}
              error={errors.institutionName}
            />
            <FloatingLabelSelect
              label={<Req label="Country of School / College / Organization" required />}
              value={fields.institutionCountryId}
              onValueChange={(v) => setField("institutionCountryId", v)}
              options={countries.data || []}
              error={errors.institutionCountryId}
              searchable
            />
          </div>
        </>
      ) : (
        <>
          <SectionHeading>Parent / Guardian</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelInput
              label={<Req label="First Name" required />}
              value={fields.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              error={errors.firstName}
            />
            <FloatingLabelInput
              label="Middle Name"
              value={fields.middleName}
              onChange={(e) => setField("middleName", e.target.value)}
            />
            <FloatingLabelInput
              label={<Req label="Last Name" required />}
              value={fields.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              error={errors.lastName}
            />
            <FloatingLabelSelect
              label={<Req label="Relation with Student" required />}
              value={fields.relation}
              onValueChange={(v) => setField("relation", v)}
              options={RELATION_OPTIONS}
              error={errors.relation}
            />
            {fields.relation === "Other" && (
              <FloatingLabelInput
                label={<Req label="Please specify relation" required />}
                value={fields.otherRelationName}
                onChange={(e) => setField("otherRelationName", e.target.value)}
                error={errors.otherRelationName}
              />
            )}
          </div>

          <SectionHeading>Contact Information</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FloatingLabelInput
                label="Email Address"
                type="email"
                value={fields.email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                status={fields.emailVerified ? "valid" : undefined}
              />
              {fields.email && !fields.emailVerified && (
                <div className="mt-1.5 flex items-center gap-2 pl-2">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendOtp.isPending}
                    className="text-xs font-semibold text-primary underline"
                  >
                    {sendOtp.isPending ? "Sending…" : otpStep === "sent" ? "Resend OTP" : "Verify email (send OTP)"}
                  </button>
                </div>
              )}
              {fields.email && fields.emailVerified && (
                <p className="mt-1 pl-2 text-xs font-semibold text-emerald-600">Email verified</p>
              )}
              {otpStep === "sent" && !fields.emailVerified && (
                <div className="mt-2 flex items-center gap-2">
                  <FloatingLabelInput
                    label="Enter OTP"
                    className="flex-1"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyOtp}
                    disabled={verifyOtp.isPending || otpCode.length !== 6}
                  >
                    {verifyOtp.isPending ? "Verifying…" : "Verify"}
                  </Button>
                </div>
              )}
              {otpMessage && <p className="mt-1 pl-2 text-xs text-red-600">{otpMessage}</p>}
            </div>
            <PhoneNumberField
              label="Contact Number"
              value={fields.contactNumber}
              onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
              }
              error={errors.contactNumber}
            />
            <FloatingLabelInput
              label="Referral Code"
              value={fields.referralCode}
              onChange={(e) => setField("referralCode", e.target.value)}
            />
          </div>

          <SectionHeading>Address</SectionHeading>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
            <Checkbox checked={fields.sameAsStudent} onCheckedChange={toggleSameAsStudent} />
            Same as student&apos;s residence address
          </label>
          {fields.sameAsStudent ? (
            <p className="mb-4 text-sm text-slate-500">
              Using the same country / state / city entered for the student.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <FloatingLabelSelect
                label={<Req label="Country" required />}
                value={fields.countryId}
                onValueChange={(v) => setFields((prev) => ({ ...prev, countryId: v, stateId: "", cityId: "" }))}
                options={countries.data || []}
                error={errors.countryId}
                searchable
              />
              <FloatingLabelSelect
                label={<Req label="Province / State" required />}
                value={fields.stateId}
                onValueChange={(v) => setFields((prev) => ({ ...prev, stateId: v, cityId: "" }))}
                options={states.data || []}
                error={errors.stateId}
                searchable
              />
              <FloatingLabelSelect
                label={<Req label="City" required />}
                value={fields.cityId}
                onValueChange={(v) => setField("cityId", v)}
                options={cities.data || []}
                error={errors.cityId}
                searchable
              />
            </div>
          )}

          <SectionHeading>Preferred Contact Method</SectionHeading>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={fields.communicationWhatsApp}
                onCheckedChange={(v) => setField("communicationWhatsApp", Boolean(v))}
              />
              WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={fields.communicationCall}
                onCheckedChange={(v) => setField("communicationCall", Boolean(v))}
              />
              Call
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={fields.communicationEmail}
                onCheckedChange={(v) => setField("communicationEmail", Boolean(v))}
              />
              Email
            </label>
          </div>
          {errors.communication && <p className="mt-2 text-xs text-red-600">{errors.communication}</p>}
        </>
      )}

      {errors.form && <p className="mt-4 text-sm font-semibold text-red-600">{errors.form}</p>}

      <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
        <p className="text-xs text-slate-500">Required fields are marked with an asterisk.</p>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} disabled={signup.isPending}>
              Back
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={signup.isPending} className="rounded-md bg-primary px-6 hover:bg-primary/90">
            {signup.isPending ? "Please wait…" : "Continue to Step 3"}
          </Button>
        </div>
      </div>

      <FlaggedSeatsModal
        open={!!flaggedModal}
        onOpenChange={(open) => !open && setFlaggedModal(null)}
        schoolName={flaggedModal?.schoolName}
        sessionName={flaggedModal?.sessionName}
      />
    </div>
  );
}
