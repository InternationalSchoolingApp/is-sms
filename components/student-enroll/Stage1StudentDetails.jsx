"use client";

import { useState, useEffect } from "react";
import { User, GraduationCap, VenusAndMars, Mail, Globe, Cake, MapPin, Map, Building2, School, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { Req } from "@/components/common/Req";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import {
  useStudentDetailsSignup,
  useGradeOptions,
  useCountryOptions,
  useStateOptions,
  useCityOptions,
} from "@/hooks/useStudentDetailsSignup";
import { validateStudentDetails } from "@/utils/studentSignupValidation";
import { nameFieldProps } from "@/utils/nameInput";
import { validateAge, getDobPickerBounds } from "@/utils/ageValidation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

// GAP: gender wire values (M/F vs. Male/Female) weren't pinned down by
// source — SignupStudentDTO carries both `gender` (code) and `genderName`
// (display), implying a short code. Confirm against a live
// save-student-details call before shipping; swap here if wrong.
export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "DONOTWANTTOSPECIFY", label: "Do Not Want To Specify" },
];

// Dual Diploma "Student Current Grade" is a fixed Grade 8-12 list in the old
// app (getStandardContentForDualDimploma() in masterContent.js; ids from
// getGradesData()), independent of the enrollment grade list — which for
// Dual Diploma doesn't include Grade 8.
export const CURRENT_GRADE_OPTIONS = [
  { value: "3", label: "Grade 8" },
  { value: "4", label: "Grade 9" },
  { value: "5", label: "Grade 10" },
  { value: "6", label: "Grade 11" },
  { value: "7", label: "Grade 12" },
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
  utmSource:"",
  utmDescription:"",
  originalUrl:"",
  gclid:"",
  utmCampaign:"",
  utmTerm :"",
  landingPage:"",
};

// Gray placeholder block matching one field's footprint — used only while
// the step's required master-data queries (grades/countries) are loading.
function FieldSkeleton() {
  return <div className="h-12 w-full animate-pulse rounded-md bg-slate-100" />;
}

/** Structural skeleton mirroring the real form's grid, shown until grades + countries have loaded. */
function Stage1Skeleton({ isDualDiploma }) {
  return (
    <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      <h2 className="text-center text-2xl font-extrabold text-black">Student Details</h2>
      <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <FieldSkeleton key={`identity-${i}`} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <FieldSkeleton key={`contact-${i}`} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <FieldSkeleton key={`residence-${i}`} />
        ))}
      </div>
      {isDualDiploma && (
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <FieldSkeleton key={`school-${i}`} />
          ))}
        </div>
      )}
      <div className="mt-10 flex justify-center">
        <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Stage 1 of the enrollment wizard ("Student profile") — student's own
 * details (name, DOB, gender, grade, nationality/contact, plus the Dual
 * Diploma "current school" fields shown additionally, never instead of the
 * contact fields — see useStudentDetailsSignup.js's buildSaveStudentDetailsRequest
 * doc comment) and country/state/city. Content only; rendered inside
 * EnrollmentWizardShell by app/step/1/page.jsx. Mirrors
 * signupStudentStage1.js / SignupStudentUtil.saveStudentDetails() — see
 * utils/ageValidation.js and hooks/useStudentDetailsSignup.js for the
 * confirmed field/endpoint contract this replicates.
 *
 * Visual design (card + icon-led fields + centered heading, no section
 * dividers) matches the reference screenshot; EnrollmentWizardShell owns the
 * program title/step row above this card. A structural skeleton (Stage1Skeleton)
 * replaces the form until this step's own required queries — grades and
 * countries, both fetched here — have loaded; the page above already gates
 * mounting this component at all until the get-student-details prefill
 * resolves, so together all three of this step's APIs gate what the student
 * sees before real data is shown.
 */
export function Stage1StudentDetails({ context, userId, initialFields, onNext }) {
  const [fields, setFields] = useState(() => ({ ...INITIAL_FIELDS, ...initialFields }));
  const [errors, setErrors] = useState({});
  const [flaggedModal, setFlaggedModal] = useState(null);

  const isDualDiploma = getLearningProgramBackendValue(context.learningProgram) === "DUAL_DIPLOMA";

  const grades = useGradeOptions(context);
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);
  const signup = useStudentDetailsSignup({ context, userId, isDualDiploma, countries: countries.data });
  const dobBounds = getDobPickerBounds();

  // This step's required master data — states/cities depend on a selection
  // the student hasn't made yet at first render, so they're not part of the
  // gate (an empty options list for them is the correct initial state, not
  // a loading failure).
  const stepReady = grades.isSuccess && countries.isSuccess;

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

  // Re-checks only fields that currently show an error, against the same
  // validators handleSubmit uses, so the message clears (and the field can
  // turn green) as soon as the value becomes valid instead of lingering
  // until the next submit.
  useEffect(() => {
    setErrors((prev) => {
      const keys = Object.keys(prev).filter((key) => key !== "form");
      if (keys.length === 0) return prev;
      const { errors: current } = validateStudentDetails(fields, { isDualDiploma });
      const dobError = validateAge(fields.dob);
      if (dobError && !current.dob) current.dob = dobError;
      const next = { ...prev };
      let changed = false;
      keys.forEach((key) => {
        if (!current[key]) {
          delete next[key];
          changed = true;
        } else if (current[key] !== prev[key]) {
          next[key] = current[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fields, isDualDiploma]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  // Changing the grade clears the already-picked DOB rather than leaving a
  // value selected for the previous grade.
  function setGrade(standardId) {
    setFields((prev) => ({ ...prev, standardId, dob: null }));
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

  if (!stepReady) {
    return <Stage1Skeleton isDualDiploma={isDualDiploma} />;
  }

  return (
    
      <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
        <h2 className="text-center text-1.5xl text-2xl font-extrabold text-black">Student Details</h2>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-2">
          <FloatingLabelInput
            icon={User}
            label={<Req label="Student's First Name" required />}
            value={fields.firstName}
            {...nameFieldProps((v) => setField("firstName", v))}
            error={errors.firstName}
          />
          {/* <FloatingLabelInput
            icon={User}
            label="Middle Name"
            value={fields.middleName}
            {...nameFieldProps((v) => setField("middleName", v))}
          /> */}
          <FloatingLabelInput
            icon={User}
            label={<Req label="Student's Last Name" required />}
            value={fields.lastName}
            {...nameFieldProps((v) => setField("lastName", v))}
            error={errors.lastName}
          />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <FloatingLabelSelect
            icon={GraduationCap}
            label={<Req label="Select Grade" required />}
            value={fields.standardId}
            onValueChange={setGrade}
            options={grades.data || []}
            error={errors.standardId || (grades.isError ? "Could not load grades" : undefined)}
            searchable
          />
          <DatePicker
            icon={Cake}
            label={<Req label={
                <>
                  Date of Birth{" "}
                  <span className="text-black text-[12px]">(Month Day, Year)</span>
                </>
              } required />}
            value={fields.dob}
            onChange={(v) => setField("dob", v)}
            fromDate={dobBounds.fromDate}
            toDate={dobBounds.toDate}
            error={errors.dob}
          />
          <FloatingLabelSelect
            icon={VenusAndMars}
            label={<Req label="Select Gender" required />}
            value={fields.gender}
            onValueChange={(v) => setField("gender", v)}
            options={GENDER_OPTIONS}
            error={errors.gender}
            searchable
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 [&_label]:max-w-[calc(100%-5rem)]">
          <FloatingLabelInput
            icon={Mail}
            label={<Req label="Student's Email" required />}
            type="email"
            value={fields.communicationEmail}
            onChange={(e) => setField("communicationEmail", e.target.value)}
            error={errors.communicationEmail}
            disabled
            inputClassName="text-black/90 disabled:text-black disabled:opacity-100"
          />
          <PhoneNumberField
            label={<Req 
              label={
                <>
                  Mobile Number{" "}
                  <span className="text-black text-[12px]">(Student or Parent)</span>
                </>
              }
            required />}
            value={fields.contactNumber}
            className="pb-1.5 w-full"
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
            icon={Globe}
            label={<Req label={
                  <>
                    Nationality{" "}
                    <span className="text-black text-[12px]">
                      (You must have a valid National ID)
                    </span>
                  </>
                } required />}
            value={fields.nationality}
            onValueChange={(v) => setField("nationality", v)}
            options={countries.data || []}
            error={errors.nationality}
            searchable
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <FloatingLabelSelect
            icon={MapPin}
            label={
              <Req
                label={
                  <>
                    Country{" "}
                    <span className="text-black text-[12px]">(Student&apos;s Current Location)</span>
                  </>
                }
                required
              />
            }
            value={fields.countryId}
            onValueChange={setCountry}
            options={countries.data || []}
            error={errors.countryId}
            searchable
          />
          <FloatingLabelSelect
            icon={Map}
            label={<Req label="Province / State" required />}
            value={fields.stateId}
            onValueChange={setState}
            options={states.data || []}
            error={errors.stateId}
            searchable
          />
          <FloatingLabelSelect
            icon={Building2}
            label={<Req label="City" required />}
            value={fields.cityId}
            onValueChange={(v) => setField("cityId", v)}
            options={cities.data || []}
            error={errors.cityId}
            searchable
          />
        </div>

        {isDualDiploma && (
          <>
            <strong className="mt-6 block text-base font-bold text-black">Current School Details</strong>
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <FloatingLabelInput
              icon={School}
              label={<Req label="Current School Name" required />}
              className="sm:col-span-2 lg:col-span-1"
              value={fields.studyingSchoolName}
              onChange={(e) => setField("studyingSchoolName", e.target.value)}
              error={errors.studyingSchoolName}
            />
            <FloatingLabelSelect
              icon={BookOpen}
              label={<Req label="Current Grade" required />}
              value={fields.studyingGradeId}
              onValueChange={(v) => setField("studyingGradeId", v)}
              options={CURRENT_GRADE_OPTIONS}
              error={errors.studyingGradeId}
            />
            <FloatingLabelSelect
              icon={MapPin}
              label={<Req label="Country of Current School" required />}
              value={fields.countryIdOfSchool}
              onValueChange={(v) => setField("countryIdOfSchool", v)}
              options={countries.data || []}
              error={errors.countryIdOfSchool}
              searchable
            />
          </div>
          </>
        )}

        {errors.form && <p className="mt-4 text-center text-sm font-semibold text-red-600">{errors.form}</p>}

        <MobileActionBar context={context} className="md:mt-10">
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
