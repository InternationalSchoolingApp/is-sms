"use client";

import { useState, useEffect, useRef } from "react";
import { User, GraduationCap, VenusAndMars, Globe, Cake, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/add-enrollment/MobileActionBar";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { DatePicker } from "@/components/ui/date-picker";
import { Req } from "@/components/common/Req";
import {
  useAddStudentDetailsSignup,
  useAddGradeOptions,
  useAddCountryOptions,
} from "@/hooks/add-enrollment/useAddStage1";
import { nameFieldProps } from "@/utils/nameInput";
import { validateAge, getDobPickerBounds } from "@/utils/ageValidation";
import { getLearningProgramsForSelect } from "@/constant/LearningPrograms";

// Backend's MastersController.resolveOneMaster() doesn't recognize
// LEARNING_PROGRAM_LIST yet (an unknown key falls through to the states
// handler and crashes on null requestValue — confirmed by live 500). Until
// the backend handler is added, source the LP options from the same
// hardcoded constant the main-flow Offline/B2B account form uses
// (components/student-enroll/AccountFormOfflineB2B.jsx:12). Swap to
// useAddLearningProgramOptions (already defined in useAddStage1.js) once
// the backend side is live.
const LEARNING_PROGRAMS = getLearningProgramsForSelect();

// GAP: gender wire values (M/F vs. Male/Female) weren't pinned down by
// source — SignupStudentDTO carries both `gender` (code) and `genderName`
// (display), implying a short code. Confirm against a live
// save-student-details call before shipping; swap here if wrong.
export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "DONOTWANTTOSPECIFY", label: "Do Not Want To Specify" },
];

const INITIAL_FIELDS = {
  learningProgram: "",
  firstName: "",
  lastName: "",
  standardId: "",
  dob: null, // Date object — DatePicker (shadcn Calendar+Popover) works with Date, not a string
  gender: "",
  nationality: "",
};

// Gray placeholder block matching one field's footprint — used only while
// the step's required master-data queries (countries) are loading.
function FieldSkeleton() {
  return <div className="h-12 w-full animate-pulse rounded-md bg-slate-100" />;
}

/** Structural skeleton mirroring the real form's grid, shown until countries have loaded. */
function Stage1Skeleton() {
  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      <h2 className="text-center text-xl font-bold text-black md:text-2xl">Student Details</h2>
      <div className="mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <FieldSkeleton key={`identity-${i}`} />
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <div className="h-8 w-20 animate-pulse rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

// Reduced per-field validator for the Add-Another-Student Stage 1 (7 fields
// only). Mirrors validateStudentDetails() in utils/studentSignupValidation.js
// shape — { valid, errors } — but inlined because the shared validator
// requires contact/address/email fields this form intentionally omits.
function validateAddStudentFields(fields) {
  const errors = {};
  if (!fields.learningProgram) errors.learningProgram = "Please select a learning program.";
  if (!fields.firstName?.trim()) errors.firstName = "Please enter the student's first name.";
  if (!fields.lastName?.trim()) errors.lastName = "Please enter the student's last name.";
  if (!fields.standardId) errors.standardId = "Please select a grade.";
  if (!fields.dob) errors.dob = "Please select a date of birth.";
  if (!fields.gender) errors.gender = "Please select a gender.";
  if (!fields.nationality) errors.nationality = "Please select a nationality.";
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Stage 1 of the Add Another Student wizard ("Student profile") — a trimmed,
 * 7-field version of components/student-enroll/Stage1StudentDetails.jsx:
 * learning program, first/last name, grade, DOB, gender, nationality. No
 * address / contact / email / dual-diploma studying-school block — those are
 * not collected for an add-another-child flow. Content only; rendered inside
 * EnrollmentWizardShell by AddStudentDetailsStep.
 *
 * Structure, validation flow, grid/skeleton, and submit-handling pattern
 * all mirror the main Stage1StudentDetails — Learning Program options come
 * from the same hardcoded constant/LearningPrograms.js that the Offline/B2B
 * account form uses, and grade options re-fetch when LP changes.
 */
export function AddStage1StudentDetails({ context, userId, uniqueId, initialFields, onNext }) {
  const [fields, setFields] = useState(() => ({ ...INITIAL_FIELDS, ...initialFields }));
  const [errors, setErrors] = useState({});
  // Every field name that has ever shown an error this session (set grows,
  // never shrinks) — see the live-revalidation effect below for why this is
  // needed separately from `errors` itself.
  const everErroredFieldsRef = useRef(new Set());

  const countries = useAddCountryOptions(context);
  const grades = useAddGradeOptions(context, fields.learningProgram);
  const signup = useAddStudentDetailsSignup({ context, userId, uniqueId, countries: countries.data });
  const dobBounds = getDobPickerBounds();

  // This step's required master data — grades depend on a learning program
  // selection the user hasn't made yet at first render, so they're not part
  // of the gate (an empty options list is the correct initial state, not a
  // loading failure).
  const stepReady = countries.isSuccess;

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

  // Re-checks every field that currently shows an error OR has ever shown
  // one this session, against the same validators handleSubmit uses — so a
  // message clears (and the field turns green) as soon as the value becomes
  // valid, AND comes back if the user then re-invalidates it (e.g. clears a
  // field they'd just fixed), instead of only ever being able to clear.
  useEffect(() => {
    setErrors((prev) => {
      const keys = [...everErroredFieldsRef.current];
      if (keys.length === 0) return prev;
      const { errors: current } = validateAddStudentFields(fields);
      const dobError = validateAge(fields.dob);
      if (dobError && !current.dob) current.dob = dobError;
      const next = { ...prev };
      let changed = false;
      keys.forEach((key) => {
        if (!current[key]) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        } else if (current[key] !== prev[key]) {
          next[key] = current[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fields]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  // Changing the learning program clears the already-picked grade — grade
  // options are LP-specific, so a stale standardId from a different LP's
  // list must not survive the switch.
  function setLearningProgram(learningProgram) {
    setFields((prev) => ({ ...prev, learningProgram, standardId: "" }));
  }

  // Changing the grade clears the already-picked DOB rather than leaving a
  // value selected for the previous grade.
  function setGrade(standardId) {
    setFields((prev) => ({ ...prev, standardId, dob: null }));
  }

  async function handleSubmit() {
    const { valid, errors: fieldErrors } = validateAddStudentFields(fields);
    const dobError = validateAge(fields.dob);
    const allErrors = dobError ? { ...fieldErrors, dob: fieldErrors.dob || dobError } : fieldErrors;

    Object.keys(allErrors).forEach((key) => everErroredFieldsRef.current.add(key));
    setErrors(allErrors);
    if (!valid || dobError) return;

    try {
      const response = await signup.mutateAsync(fields);

      if (response?.status === "0" || response?.status === "2") {
        setErrors((prev) => ({ ...prev, form: response.message || "Something went wrong. Please try again." }));
        return;
      }
      if (!response) {
        setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
        return;
      }

      onNext?.(fields);
    } catch (err) {
      console.error("AddStage1StudentDetails submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  if (!stepReady) {
    return <Stage1Skeleton />;
  }

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Student Details</h2>

      <div className="mt-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-2">
        <FloatingLabelSelect
          icon={BookOpen}
          label={<Req label="Select Learning Program" required />}
          value={fields.learningProgram}
          onValueChange={setLearningProgram}
          options={LEARNING_PROGRAMS}
          error={errors.learningProgram}
        />
        <FloatingLabelInput
          icon={User}
          label={<Req label="Student's First Name" required />}
          filledLabel={<Req label="First Name" required />}
          value={fields.firstName}
          {...nameFieldProps((v) => setField("firstName", v))}
          error={errors.firstName}
        />
        <FloatingLabelInput
          icon={User}
          label={<Req label="Student's Last Name" required />}
          filledLabel={<Req label="Last Name" required />}
          value={fields.lastName}
          {...nameFieldProps((v) => setField("lastName", v))}
          error={errors.lastName}
        />
        <FloatingLabelSelect
          icon={GraduationCap}
          label={<Req label="Select Grade" required />}
          value={fields.standardId}
          onValueChange={setGrade}
          options={grades.data || []}
          disabled={!fields.learningProgram || grades.isPending}
          error={errors.standardId}
        />
        <DatePicker
          icon={Cake}
          label={<Req label="Date of Birth" required />}
          placeholder="MMM DD, YYYY"
          value={fields.dob}
          onChange={(value) => setField("dob", value)}
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
        />
        <FloatingLabelSelect
          icon={Globe}
          label={<Req label="Nationality" required />}
          value={fields.nationality}
          onValueChange={(v) => setField("nationality", v)}
          options={countries.data || []}
          error={errors.nationality}
          searchable
        />
      </div>

      {errors.form && <p className="mt-4 text-center text-sm font-semibold text-red-600">{errors.form}</p>}

      <MobileActionBar context={context} className="md:mt-10">
        <Button type="button" onClick={handleSubmit} disabled={signup.isPending} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
          {signup.isPending ? "Please wait…" : "Next"}
        </Button>
      </MobileActionBar>
    </div>
  );
}
