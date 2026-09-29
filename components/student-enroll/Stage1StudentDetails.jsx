"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { SectionHeading } from "@/components/student-enroll/wizard/fields";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import {
  useStudentDetailsSignup,
  useGradeOptions,
  useCountryOptions,
  useStateOptions,
  useCityOptions,
} from "@/hooks/useStudentDetailsSignup";
import { validateStudentDetails, isPureAscii } from "@/utils/studentSignupValidation";
import { validateAge, getDobPickerBounds } from "@/utils/ageValidation";
import { getLearningProgramBackendValue, getLearningProgramTheme } from "@/utils/learningProgramTheme";

// GAP: gender wire values (M/F vs. Male/Female) weren't pinned down by
// source — SignupStudentDTO carries both `gender` (code) and `genderName`
// (display), implying a short code. Confirm against a live
// save-student-details call before shipping; swap here if wrong.
const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "DONOTWANTTOSPECIFY", label: "Do Not Want To Specify" },
];

const INITIAL_FIELDS = {
  firstName: "",
  middleName: "",
  lastName: "",
  dob: null, // Date object — DatePicker (shadcn Calendar+Popover) works with Date, not a string
  gender: "",
  standardId: "",
  countryId: "",
  stateId: "",
  cityId: "",
  nationality: "",
  courseProviderId: "",
  communicationEmail: "",
  contactNumber: "",
  countryCode: "",
  countryIsdCode: "",
  phoneValid: undefined,
  studyingSchoolName: "",
  studyingGradeId: "",
  countryIdOfSchool: "",
};

/** Every field label goes through this — the red asterisk is the one bit every field needs consistently. */
function Req({ label, required }) {
  return (
    <>
      {label}
      {required && <span className="text-red-500 top-1 relative"> *</span>}
    </>
  );
}

/**
 * Stage 1 of the enrollment wizard ("Student profile") — student's own
 * details (name, DOB, gender, grade, nationality/contact or the Dual
 * Diploma "current school" variant, and country/state/city). Content only;
 * rendered inside EnrollmentWizardShell by
 * app/step/1/page.jsx. Mirrors
 * signupStudentStage1.js / SignupStudentUtil.saveStudentDetails() — see
 * utils/ageValidation.js and hooks/useStudentDetailsSignup.js for the
 * confirmed field/endpoint contract this replicates.
 *
 * Fields reuse the same floating-label primitives as the account-creation
 * screen (components/ui/floating-label-*.jsx, DatePicker, PhoneNumberField)
 * rather than a separate static-label implementation, so every form in the
 * app behaves and looks the same.
 */
export function Stage1StudentDetails({ context, userId, initialFields, onNext }) {
  const [fields, setFields] = useState(() => ({ ...INITIAL_FIELDS, ...initialFields }));
  const [errors, setErrors] = useState({});
  const [flaggedModal, setFlaggedModal] = useState(null);

  const isDualDiploma = getLearningProgramBackendValue(context.learningProgram) === "DUAL_DIPLOMA";
  const programLabel = getLearningProgramTheme(context.learningProgram).label;

  const grades = useGradeOptions(context);
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);
  const signup = useStudentDetailsSignup({ context, userId, isDualDiploma, countries: countries.data });
  const dobBounds = getDobPickerBounds();

  // Prefill's fields.nationality (from get-student-details) is the backend's
  // country NAME string (legacy schema — see resolveNationalityName's doc
  // comment in useStudentDetailsSignup.js), but this select is keyed by
  // country ID like every other one here. Once the country list loads,
  // swap the prefilled name for the matching id so the select shows the
  // right value; a value already matching an id (fresh form, no prefill,
  // or already remapped) is left alone.
  useEffect(() => {
    if (!countries.data?.length || !fields.nationality) return;
    const alreadyById = countries.data.some((c) => c.value === fields.nationality);
    if (alreadyById) return;
    const match = countries.data.find((c) => c.label === fields.nationality);
    if (match) setField("nationality", match.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries.data]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function setCountry(countryId) {
    setFields((prev) => ({ ...prev, countryId, stateId: "", cityId: "" }));
  }

  function setState(stateId) {
    setFields((prev) => ({ ...prev, stateId, cityId: "" }));
  }

  async function handleSubmit() {
    const { valid, errors: fieldErrors } = validateStudentDetails(fields, { isDualDiploma });
    const dobError = validateAge(fields.dob);
    const allErrors = dobError ? { ...fieldErrors, dob: fieldErrors.dob || dobError } : fieldErrors;

    if (!isPureAscii(fields.studyingSchoolName || "")) {
      allErrors.form = "Please use the English keyboard while providing information";
    }

    setErrors(allErrors);
    if (!valid || dobError) return;

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
      console.error("Stage1StudentDetails submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  return (
    <div>
      <span className="inline-block rounded-full bg-[color-mix(in_oklch,var(--primary),white_0%)] px-3 py-1 text-sm sm:text-md md:text-lg font-bold uppercase tracking-wide text-white">
        {programLabel}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Student details</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">
        Step 1 of 4. Enter the student&apos;s identification and contact information as it appears on official documents.
      </p>

      <SectionHeading>Identity Record</SectionHeading>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <FloatingLabelInput
          // icon={User}
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
          label={<Req label="Grade" required />}
          value={fields.standardId}
          onValueChange={(v) => setField("standardId", v)}
          options={grades.data || []}
          error={errors.standardId || (grades.isError ? "Could not load grades" : undefined)}
          searchable
        />
        <DatePicker
          label={<Req label="Date of Birth" required />}
          value={fields.dob}
          onChange={(v) => setField("dob", v)}
          fromDate={dobBounds.fromDate}
          toDate={dobBounds.toDate}
          error={errors.dob}
        />
        <FloatingLabelSelect
          label={<Req label="Gender" required />}
          value={fields.gender}
          onValueChange={(v) => setField("gender", v)}
          options={GENDER_OPTIONS}
          error={errors.gender}
          searchable
        />
      </div>

      {isDualDiploma ? (
        <>
          <SectionHeading>Current School</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelInput
              label={<Req label="Current School Name" required />}
              className="sm:col-span-2 lg:col-span-1"
              value={fields.studyingSchoolName}
              onChange={(e) => setField("studyingSchoolName", e.target.value)}
              error={errors.studyingSchoolName}
            />
            <FloatingLabelSelect
              label={<Req label="Current Grade" required />}
              value={fields.studyingGradeId}
              onValueChange={(v) => setField("studyingGradeId", v)}
              options={grades.data || []}
              error={errors.studyingGradeId}
            />
            <FloatingLabelSelect
              label={<Req label="Country of Current School" required />}
              value={fields.countryIdOfSchool}
              onValueChange={(v) => setField("countryIdOfSchool", v)}
              options={countries.data || []}
              error={errors.countryIdOfSchool}
              searchable
            />
          </div>
        </>
      ) : (
        <>
          <SectionHeading>Contact &amp; Citizenship</SectionHeading>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelInput
              label={<Req label="Email Address" required />}
              type="email"
              value={fields.communicationEmail}
              onChange={(e) => setField("communicationEmail", e.target.value)}
              error={errors.communicationEmail}
            />
            <PhoneNumberField
              label={<Req label="Mobile Number" required />}
              value={fields.contactNumber}
              // Only takes effect at mount (see useIntlTelInput's doc
              // comment) — restores the saved country flag when Stage 1
              // was prefilled from get-student-details (initialFields
              // already has countryCode by the time this component first
              // renders; see app/step/1/page.jsx).
              initialCountry={initialFields?.countryCode ? initialFields.countryCode.toLowerCase() : undefined}
              onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
              }
              error={errors.contactNumber}
            />
            <FloatingLabelSelect
              label={<Req label="Nationality" required />}
              value={fields.nationality}
              onValueChange={(v) => setField("nationality", v)}
              options={countries.data || []}
              error={errors.nationality}
              searchable
            />
          </div>
        </>
      )}

      <SectionHeading>Current Residence</SectionHeading>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <FloatingLabelSelect
          label={<Req label="Country" required />}
          value={fields.countryId}
          onValueChange={setCountry}
          options={countries.data || []}
          error={errors.countryId}
          searchable
        />
        <FloatingLabelSelect
          label={<Req label="Province / State" required />}
          value={fields.stateId}
          onValueChange={setState}
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

      {errors.form && <p className="mt-4 text-sm font-semibold text-red-600">{errors.form}</p>}

      <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
        <p className="text-xs text-slate-500">Required fields are marked with an asterisk.</p>
        <div className="flex items-center gap-5">
          {/* <button type="button" className="text-sm text-slate-600 hover:text-slate-900">
            Save for later
          </button> */}
          <Button type="button" onClick={handleSubmit} disabled={signup.isPending} className="rounded-md bg-primary px-6 hover:bg-primary/90">
            {signup.isPending ? "Please wait…" : "Continue to Step 2"}
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
