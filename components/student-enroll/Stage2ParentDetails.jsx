"use client";

import { useState } from "react";
import { User, Briefcase, Mail, MapPin, Map, Building2, Phone as PhoneIcon, GraduationCap, School } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io";

import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { Checkbox } from "@/components/ui/checkbox";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/hooks/useStudentDetailsSignup";
import { useParentDetailsSignup } from "@/hooks/useParentDetailsSignup";
import { validateParentDetails } from "@/utils/studentSignupValidation";
import { nameFieldProps } from "@/utils/nameInput";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

// "Other" is commented out on the is-rest-api form too (masterContent.js
// getRelationshipContent()) -- only these three are actually selectable.
export const RELATION_OPTIONS = [
  { value: "Mother", label: "Mother" },
  { value: "Father", label: "Father" },
  { value: "Guardian", label: "Guardian" },
];

// SS/CS/WP confirmed at SignupUtil.java's display-name mapping
// (getParentDetails response: SS -> "School Student", CS -> "College
// Student", WP -> "Working Professional").
export const WORKING_PROFESSION_OPTIONS = [
  { value: "SS", label: "School Student" },
  { value: "CS", label: "College Student" },
  { value: "WP", label: "Working Professional" },
];

function defaultFields(studentAddress) {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    relation: "",
    email: "",
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
 * not Parents). Parent email and phone are both optional here, matching the
 * "(Optional)" labels on the live is-rest-api form — no OTP verification
 * gate on submit.
 *
 * `studentAddress` (countryId/stateId/cityId from Stage 1) seeds the "same
 * as student" default — purely a client-side convenience copy, there's no
 * backend flag for it (confirmed: SignupUtil.convertToSignupParentsDTO only
 * defaults the parent's location from the student on first visit, same idea).
 * Displayed as a "Change your Location" checkbox (matches legacy's own
 * #sameAsStudentLocation naming — see signupStudentStage1.js's
 * syncParentLocationWithStudent doc comment) — UNCHECKED (fields.sameAsStudent
 * true) is the default, showing the student's own country/state/city
 * read-only; checking it clears and unlocks them for a different address.
 * The underlying field is still `sameAsStudent`/true-means-same internally
 * (validation, submit payload) — only the checkbox's displayed
 * checked-state and label are inverted to match the reference design.
 *
 * `initialFields`, when given (Back from Stage 3, or a refresh), overrides
 * those defaults with whatever was last saved via
 * utils/wizardStorage.js's saveWizardParentFields — the same
 * save/reload-on-mount pattern Stage 1 uses for its own fields.
 */
export function Stage2ParentDetails({ context, userId, studentAddress, courseProviderId, initialFields, onNext, onBack }) {
  const [fields, setFields] = useState(() => ({ ...defaultFields(studentAddress), ...initialFields }));
  const [errors, setErrors] = useState({});
  const [flaggedModal, setFlaggedModal] = useState(null);

  const isOneToOneFlex = getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX";

  const signup = useParentDetailsSignup({ context, userId, isOneToOneFlex });
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
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

  // getParentDetailsContent() in signupStudentContent.js: provider 39 first, then the FLEX program.
  // The default keeps this screen's own "Parents Details" title.
  const heading =
    Number(courseProviderId) === 39
      ? "Communication Details"
      : isOneToOneFlex
        ? "Academic & Communication Details"
        : "Parents Details";

  const locationDisabled = fields.sameAsStudent;

  return (
    <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      <h2 className="text-center text-2xl font-bold text-slate-900">{heading}</h2>

      {isOneToOneFlex ? (
        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <FloatingLabelSelect
            icon={GraduationCap}
            label={<Req label="Are you a student or a working professional?" required />}
            className="sm:col-span-2 lg:col-span-1"
            value={fields.workingProfession}
            onValueChange={(v) => setField("workingProfession", v)}
            options={WORKING_PROFESSION_OPTIONS}
            error={errors.workingProfession}
          />
          <FloatingLabelInput
            icon={School}
            label={<Req label="School / College / Organization Name" required />}
            value={fields.institutionName}
            onChange={(e) => setField("institutionName", e.target.value)}
            error={errors.institutionName}
          />
          <FloatingLabelSelect
            icon={MapPin}
            label={<Req label="Country of School / College / Organization" required />}
            value={fields.institutionCountryId}
            onValueChange={(v) => setField("institutionCountryId", v)}
            options={countries.data || []}
            error={errors.institutionCountryId}
            searchable
          />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelInput
              icon={User}
              label={<Req label="First Name" required />}
              value={fields.firstName}
              {...nameFieldProps((v) => setField("firstName", v))}
              error={errors.firstName}
            />
            <FloatingLabelInput
              icon={User}
              label="Middle Name"
              value={fields.middleName}
              {...nameFieldProps((v) => setField("middleName", v))}
            />
            <FloatingLabelInput
              icon={User}
              label={<Req label="Last Name" required />}
              value={fields.lastName}
              {...nameFieldProps((v) => setField("lastName", v))}
              error={errors.lastName}
            />
            <FloatingLabelSelect
              icon={Briefcase}
              label={<Req label="Relation with Student" required />}
              value={fields.relation}
              onValueChange={(v) => setField("relation", v)}
              options={RELATION_OPTIONS}
              error={errors.relation}
              searchable
            />
            <FloatingLabelInput
              icon={Mail}
              label="Parent Email"
              type="email"
              value={fields.email}
              onChange={(e) => setField("email", e.target.value)}
              error={errors.email}
            />
            <PhoneNumberField
              label="Parent Mobile Number (Optional)"
              value={fields.contactNumber}
              className="pb-1.5 w-full"
              // Only takes effect at mount (see useIntlTelInput) — restores the saved phone country.
              initialCountry={initialFields?.countryCode ? initialFields.countryCode.toLowerCase() : undefined}
              onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
              }
              error={errors.contactNumber}
            />
          </div>

          <label className="mt-8 mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Checkbox checked={!fields.sameAsStudent} onCheckedChange={(v) => toggleSameAsStudent(!v)} />
            Change your Location
          </label>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelSelect
              icon={MapPin}
              label={locationDisabled ? "Country (Parent's Current Location)" : <Req label="Country" required />}
              value={fields.countryId}
              onValueChange={(v) => setFields((prev) => ({ ...prev, countryId: v, stateId: "", cityId: "" }))}
              options={countries.data || []}
              error={errors.countryId}
              disabled={locationDisabled}
              searchable
            />
            <FloatingLabelSelect
              icon={Map}
              label={<Req label="Province / State" required={!locationDisabled} />}
              value={fields.stateId}
              onValueChange={(v) => setFields((prev) => ({ ...prev, stateId: v, cityId: "" }))}
              options={states.data || []}
              error={errors.stateId}
              disabled={locationDisabled}
              searchable
            />
            <FloatingLabelSelect
              icon={Building2}
              label={<Req label="City" required={!locationDisabled} />}
              value={fields.cityId}
              onValueChange={(v) => setField("cityId", v)}
              options={cities.data || []}
              error={errors.cityId}
              disabled={locationDisabled}
              searchable
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-base font-bold text-slate-900">How to Contact You?</h3>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <IoLogoWhatsapp className="h-4 w-4 text-emerald-600" />
                WhatsApp
                <Checkbox
                  checked={fields.communicationWhatsApp}
                  onCheckedChange={(v) => setField("communicationWhatsApp", Boolean(v))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <PhoneIcon className="h-4 w-4 text-slate-900" />
                Call
                <Checkbox
                  checked={fields.communicationCall}
                  onCheckedChange={(v) => setField("communicationCall", Boolean(v))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <Mail className="h-4 w-4 text-slate-900" />
                Email
                <Checkbox
                  checked={fields.communicationEmail}
                  onCheckedChange={(v) => setField("communicationEmail", Boolean(v))}
                />
              </label>
            </div>
          </div>
          {errors.communication && <p className="mt-2 text-xs text-red-600">{errors.communication}</p>}
        </>
      )}

      {errors.form && <p className="mt-4 text-center text-sm font-semibold text-red-600">{errors.form}</p>}

      <MobileActionBar context={context} className="md:mt-10 md:pt-6">
        {onBack && (
          <Button type="button" variant="outline"  className="cursor-pointer" onClick={onBack} disabled={signup.isPending}>
            Back
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={signup.isPending} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
          {signup.isPending ? "Please wait…" : "Next"}
        </Button>
      </MobileActionBar>

      <FlaggedSeatsModal
        open={!!flaggedModal}
        onOpenChange={(open) => !open && setFlaggedModal(null)}
        schoolName={flaggedModal?.schoolName}
        sessionName={flaggedModal?.sessionName}
      />
    </div>
  );
}
