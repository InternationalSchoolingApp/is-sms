"use client";

import { useState, useEffect, useRef } from "react";
import { Briefcase, Building2, BookOpen, Cake, GraduationCap, Globe, Mail, Map, MapPin, Phone as PhoneIcon, School, User, VenusAndMars, X } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { Req } from "@/components/common/Req";
import { RequiredAsterisk } from "@/components/common/RequiredAsterisk";
import { CURRENT_GRADE_OPTIONS, GENDER_OPTIONS } from "@/components/student-enroll/Stage1StudentDetails";
import { ParentRelationFields, WORKING_PROFESSION_OPTIONS } from "@/components/student-enroll/Stage2ParentDetails";
import {
  mapSignupStudentToFields,
  useCityOptions,
  useCountryOptions,
  useGradeOptions,
  useStateOptions,
  useStudentDetailsSignup,
} from "@/hooks/useStudentDetailsSignup";
import { mapSignupParentToFields, useParentDetailsSignup } from "@/hooks/useParentDetailsSignup";
import { getDobPickerBounds, validateAge } from "@/utils/ageValidation";
import { validateParentDetails, validateStudentDetails } from "@/utils/studentSignupValidation";
import { nameFieldProps } from "@/utils/nameInput";
import { seedOtherParentFields } from "@/utils/parentRelation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
const STATUS_SESSION_OUT = "3";
const GRID = "grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3";

/**
 * Edit popups for the review screen's Student / Parent sections —
 * openReviewInlineEdit() / saveReviewInlineEdit() in signupStudentContent.js.
 * Same field layout as Steps 1 and 2 (floating-label fields in a 3-column grid) inside a dialog with
 * a centred Save; a successful Save closes it. Nothing navigates.
 *
 * Save re-runs the step's own validation and save endpoint
 * (save-student-details / save-parent-details) via the same hooks Steps 1
 * and 2 use, and — like legacy — skips the request entirely when nothing
 * changed since Edit was clicked.
 */

function EditCard({ title, saving, onSave, onCancel, formError, children, centerTitle = false }) {
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      {/* Below md the title and the Save button stay pinned while only the form body scrolls. */}
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1112px]">
        {/* Title and close button share one row (the dialog's own absolutely-positioned close button sat
            above the title's centre line). */}
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-7 md:border-0 md:pb-0 md:pt-6">
          <DialogTitle className={`text-xl font-bold leading-7 text-black ${centerTitle ? "flex-1 text-center" : ""}`}>{title}</DialogTitle>
          {!saving && (
            <DialogClose
              aria-label="Close"
              className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md bg-red-500 text-white hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </DialogClose>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-6 sm:px-7 md:pb-2">
          {children}
          {formError && <p className="mt-4 text-center text-sm font-semibold text-red-600">{formError}</p>}
        </div>
        <div className="flex shrink-0 justify-center border-t border-slate-200 bg-white px-4 py-4 sm:px-7 md:border-0 md:pb-6 md:pt-6">
          <Button type="button" onClick={onSave} disabled={saving} className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Shared response handling for both saves; returns true when it saved.
function useSaveOutcome({ context, onSessionExpired }) {
  const [formError, setFormError] = useState(null);
  const [flaggedModal, setFlaggedModal] = useState(null);

  function outcome(response) {
    if (!response) {
      setFormError(GENERIC_ERROR);
      return false;
    }
    if (response.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
      return false;
    }
    if (response.status === "0" || response.status === "2") {
      if (response.statusCode === "FLAGGED") {
        setFlaggedModal({ schoolName: context.schoolName, sessionName: response.message });
      } else {
        setFormError(response.message || "Something went wrong. Please try again.");
      }
      return false;
    }
    return true;
  }

  const modal = (
    <FlaggedSeatsModal
      open={!!flaggedModal}
      onOpenChange={(open) => !open && setFlaggedModal(null)}
      schoolName={flaggedModal?.schoolName}
      sessionName={flaggedModal?.sessionName}
    />
  );

  return { formError, setFormError, outcome, modal };
}

export function StudentInlineEdit({ context, userId, student, standardId, onSaved, onCancel, onSessionExpired }) {
  // The review payload keeps the grade on the course block when the student block lacks it.
  const [initial] = useState(() => {
    const mapped = mapSignupStudentToFields(student);
    return mapped && !mapped.standardId && standardId ? { ...mapped, standardId: String(standardId) } : mapped;
  });
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState({});
  // Every field name that has ever shown an error this session (set grows,
  // never shrinks) — see the live-revalidation effect below for why this is
  // needed separately from `errors` itself.
  const everErroredFieldsRef = useRef(new Set());
  const isDualDiploma =
    getLearningProgramBackendValue(context.learningProgram) === "DUAL_DIPLOMA" || Boolean(student?.studyingSchoolName);

  const grades = useGradeOptions(context);
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);
  const signup = useStudentDetailsSignup({ context, userId, isDualDiploma, countries: countries.data });
  const { formError, setFormError, outcome, modal } = useSaveOutcome({ context, onSessionExpired });

  // The backend hands nationality back as a country NAME; the select is keyed by id
  // (same remap Stage1StudentDetails does once the country list loads) — resolved
  // at render/save time so it never needs a setState-in-effect.
  const resolveNationality = (value) => {
    const list = countries.data || [];
    if (!value || list.some((c) => c.value === value)) return value;
    return list.find((c) => c.label === value)?.value ?? value;
  };
  const current = { ...fields, nationality: resolveNationality(fields.nationality) };

  const set = (name) => (value) => setFields((prev) => ({ ...prev, [name]: value }));

  // Re-checks every field that currently shows an error OR has ever shown
  // one this session, against the same validators save() uses — so a
  // message clears (and the field turns green) as soon as the value becomes
  // valid, AND comes back if the user then re-invalidates it, instead of
  // only ever being able to clear. Mirrors Stage1StudentDetails.jsx.
  useEffect(() => {
    setErrors((prev) => {
      const keys = [...everErroredFieldsRef.current];
      if (keys.length === 0) return prev;
      const { errors: liveErrors } = validateStudentDetails(current, { isDualDiploma });
      const dobError = validateAge(current.dob);
      if (dobError && !liveErrors.dob) liveErrors.dob = dobError;
      const next = { ...prev };
      let changed = false;
      keys.forEach((key) => {
        if (!liveErrors[key]) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        } else if (liveErrors[key] !== prev[key]) {
          next[key] = liveErrors[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, isDualDiploma]);

  async function save() {
    setFormError(null);
    const { valid, errors: fieldErrors } = validateStudentDetails(current, { isDualDiploma });
    const dobError = validateAge(current.dob);
    const allErrors = dobError ? { ...fieldErrors, dob: fieldErrors.dob || dobError } : fieldErrors;
    Object.keys(allErrors).forEach((key) => everErroredFieldsRef.current.add(key));
    setErrors(allErrors);
    if (!valid || dobError) {
      setFormError(allErrors.form || allErrors.dob || null);
      return;
    }
    // Nothing changed since Edit -> no save call, just leave edit mode.
    if (JSON.stringify(current) === JSON.stringify({ ...initial, nationality: resolveNationality(initial.nationality) })) {
      onCancel();
      return;
    }
    try {
      const response = await signup.mutateAsync(current);
      if (outcome(response)) onSaved(current);
    } catch (err) {
      console.error("StudentInlineEdit save failed:", err);
      setFormError(GENERIC_ERROR);
    }
  }

  const dobBounds = getDobPickerBounds();

  return (
    <>
      <EditCard title="Student Details" saving={signup.isPending} onSave={save} onCancel={onCancel} formError={formError} centerTitle>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <FloatingLabelInput icon={User} label={<Req label="Student's First Name" required />} filledLabel={<Req label="First Name" required />} value={fields.firstName} {...nameFieldProps(set("firstName"))} error={errors.firstName} />
          {/* Middle Name removed from student signup */}
          <FloatingLabelInput icon={User} label={<Req label="Student's Last Name" required />} filledLabel={<Req label="Last Name" required />} value={fields.lastName} {...nameFieldProps(set("lastName"))} error={errors.lastName} />
        </div>

        <div className={`mt-3.5 ${GRID}`}>
          <FloatingLabelSelect
            icon={GraduationCap}
            label={<Req label={fields.standardId ? "Selected Grade" : "Select Grade"} required />}
            value={fields.standardId}
            onValueChange={set("standardId")}
            options={grades.data || []}
            error={errors.standardId}
            searchable
            disabled
          />
          {/* Grade, Date of Birth and Email are locked; everything else is editable. */}
          <DatePicker
            icon={Cake}
            label={<Req label={<>Date of Birth{" "}<span className="text-black text-[12px]">(Month Day, Year)</span></>} required />}
            value={fields.dob}
            onChange={set("dob")}
            fromDate={dobBounds.fromDate}
            toDate={dobBounds.toDate}
            error={errors.dob}
            disabled
          />
          <FloatingLabelSelect
            icon={VenusAndMars}
            label={<Req label={fields.standardId ? "Selected Gender" : "Select Gender"} required />}
            value={fields.gender}
            onValueChange={set("gender")}
            options={GENDER_OPTIONS}
            error={errors.gender}
            searchable
          />
        </div>

        <div className={`mt-3.5 ${GRID}`}>
          <FloatingLabelInput
            icon={Mail}
            label={<Req label="Student's Email" required />}
            type="email"
            value={fields.communicationEmail}
            readOnly
            disabled
            inputClassName="cursor-not-allowed bg-slate-100 text-black disabled:pointer-events-auto disabled:opacity-100"
          />
          <PhoneNumberField
            label={<Req label={<>Mobile Number{" "}<span className="text-black text-[12px]">(Student or Parent)</span></>} required />}
            value={fields.contactNumber}
            className="w-full pb-1.5"
            initialCountry={initial?.countryCode ? initial.countryCode.toLowerCase() : undefined}
            onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
              setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
            }
            error={errors.contactNumber}
          />
          <FloatingLabelSelect
            icon={Globe}
            label={<Req label={<>Nationality{" "}<span className="text-black text-[12px]">(You must have a valid National ID)</span></>} required />}
            value={current.nationality}
            onValueChange={set("nationality")}
            options={countries.data || []}
            error={errors.nationality}
            searchable
          />
        </div>

        <div className={`mt-3.5 ${GRID}`}>
          <FloatingLabelSelect
            icon={MapPin}
            label={<Req label={<>Country{" "}<span className="text-black text-[12px]">(Student&apos;s Current Location)</span></>} required />}
            value={fields.countryId}
            onValueChange={(countryId) => setFields((prev) => ({ ...prev, countryId, stateId: "", cityId: "" }))}
            options={countries.data || []}
            error={errors.countryId}
            searchable
          />
          <FloatingLabelSelect
            icon={Map}
            label={<Req label="Province / State" required />}
            value={fields.stateId}
            onValueChange={(stateId) => setFields((prev) => ({ ...prev, stateId, cityId: "" }))}
            options={states.data || []}
            error={errors.stateId}
            searchable
          />
          <FloatingLabelSelect
            icon={Building2}
            label={<Req label="City" required />}
            value={fields.cityId}
            onValueChange={set("cityId")}
            options={cities.data || []}
            error={errors.cityId}
            searchable
          />
        </div>

        {isDualDiploma && (
          <>
            <strong className="mt-6 block text-base font-bold text-black">Current School Details</strong>
          <div className={`mt-3 ${GRID}`}>
            <FloatingLabelInput
              icon={School}
              label={<Req label="Current School Name" required />}
              value={fields.studyingSchoolName}
              onChange={(e) => set("studyingSchoolName")(e.target.value)}
              error={errors.studyingSchoolName}
            />
            <FloatingLabelSelect
              icon={BookOpen}
              label={<Req label="Current Grade" required />}
              value={fields.studyingGradeId}
              onValueChange={set("studyingGradeId")}
              options={CURRENT_GRADE_OPTIONS}
              error={errors.studyingGradeId}
            />
            <FloatingLabelSelect
              icon={MapPin}
              label={<Req label="Country of Current School" required />}
              value={fields.countryIdOfSchool}
              onValueChange={set("countryIdOfSchool")}
              options={countries.data || []}
              error={errors.countryIdOfSchool}
              searchable
            />
          </div>
          </>
        )}
      </EditCard>
      {modal}
    </>
  );
}

export function ParentInlineEdit({ context, userId, parent, title = "Parent/Guardian Details", onSaved, onCancel, onSessionExpired }) {
  const [initial] = useState(() => {
    const mapped = mapSignupParentToFields(parent);
    return mapped && seedOtherParentFields(mapped, context.schoolUUID, userId);
  });
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState({});
  // Every field name that has ever shown an error this session (set grows,
  // never shrinks) — see the live-revalidation effect below for why this is
  // needed separately from `errors` itself.
  const everErroredFieldsRef = useRef(new Set());
  // The read-only table decides the same way: working-professional fields replace the parent ones.
  const isOneToOneFlex =
    getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX" || Boolean(parent?.workingProfessionName);

  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);
  const signup = useParentDetailsSignup({ context, userId, isOneToOneFlex });
  const { formError, setFormError, outcome, modal } = useSaveOutcome({ context, onSessionExpired });

  const set = (name) => (value) => setFields((prev) => ({ ...prev, [name]: value }));

  // Re-checks every field that currently shows an error OR has ever shown
  // one this session, against the same validator save() uses — so a message
  // clears (and the field turns green) as soon as the value becomes valid,
  // AND comes back if the user then re-invalidates it. Mirrors
  // Stage2ParentDetails.jsx.
  useEffect(() => {
    setErrors((prev) => {
      const keys = [...everErroredFieldsRef.current];
      if (keys.length === 0) return prev;
      const { errors: liveErrors } = validateParentDetails(fields, { isOneToOneFlex });
      const next = { ...prev };
      let changed = false;
      keys.forEach((key) => {
        if (!liveErrors[key]) {
          if (key in next) {
            delete next[key];
            changed = true;
          }
        } else if (liveErrors[key] !== prev[key]) {
          next[key] = liveErrors[key];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [fields, isOneToOneFlex]);

  async function save() {
    setFormError(null);
    const { valid, errors: fieldErrors } = validateParentDetails(fields, { isOneToOneFlex });
    Object.keys(fieldErrors).forEach((key) => everErroredFieldsRef.current.add(key));
    setErrors(fieldErrors);
    if (!valid) {
      setFormError(fieldErrors.form || fieldErrors.communication || null);
      return;
    }
    if (JSON.stringify(fields) === JSON.stringify(initial)) {
      onCancel();
      return;
    }
    try {
      const response = await signup.mutateAsync(fields);
      if (outcome(response)) onSaved(fields);
    } catch (err) {
      console.error("ParentInlineEdit save failed:", err);
      setFormError(GENERIC_ERROR);
    }
  }

  return (
    <>
      <EditCard title={title} saving={signup.isPending} onSave={save} onCancel={onCancel} formError={formError}>
        {isOneToOneFlex ? (
          <div className={GRID}>
            <FloatingLabelSelect
              icon={GraduationCap}
              label={<Req label="Are you a student or a working professional?" required />}
              value={fields.workingProfession}
              onValueChange={set("workingProfession")}
              options={WORKING_PROFESSION_OPTIONS}
              error={errors.workingProfession}
            />
            <FloatingLabelInput
              icon={School}
              label={<Req label="School / College / Organization Name" required />}
              value={fields.institutionName}
              onChange={(e) => set("institutionName")(e.target.value)}
              error={errors.institutionName}
            />
            <FloatingLabelSelect
              icon={MapPin}
              label={<Req label="Country of School / College / Organization" required />}
              value={fields.institutionCountryId}
              onValueChange={set("institutionCountryId")}
              options={countries.data || []}
              error={errors.institutionCountryId}
              searchable
            />
          </div>
        ) : (
          <>
            <ParentRelationFields
              schoolUUID={context.schoolUUID}
              userId={userId}
              fields={fields}
              setFields={setFields}
              errors={errors}
              clearErrors={(...names) => setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !names.includes(key))))}
            />

            <div className={`mt-3.5 ${GRID}`}>
              <FloatingLabelSelect
                icon={MapPin}
                label={<Req label={<>Country{" "}<span className="text-black text-[12px]">(Parent&apos;s Current Location)</span></>} required />}
                value={fields.countryId}
                onValueChange={(countryId) => setFields((prev) => ({ ...prev, countryId, stateId: "", cityId: "" }))}
                options={countries.data || []}
                error={errors.countryId}
                searchable
              />
              <FloatingLabelSelect
                icon={Map}
                label={<Req label="Province / State" required />}
                value={fields.stateId}
                onValueChange={(stateId) => setFields((prev) => ({ ...prev, stateId, cityId: "" }))}
                options={states.data || []}
                error={errors.stateId}
                searchable
              />
              <FloatingLabelSelect
                icon={Building2}
                label={<Req label="City" required />}
                value={fields.cityId}
                onValueChange={set("cityId")}
                options={cities.data || []}
                error={errors.cityId}
                searchable
              />
            </div>

          </>
        )}

        {/* Shown for every variant, like getParentDetailsContent() */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-base font-bold text-black">Preferred Contact Method <RequiredAsterisk /></h3>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <IoLogoWhatsapp className="h-4 w-4 text-emerald-600" /> WhatsApp
            <Checkbox checked={fields.communicationWhatsApp} onCheckedChange={(v) => set("communicationWhatsApp")(Boolean(v))} />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <PhoneIcon className="h-4 w-4 text-black" /> Call
            <Checkbox checked={fields.communicationCall} onCheckedChange={(v) => set("communicationCall")(Boolean(v))} />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <Mail className="h-4 w-4 text-black" /> Email
            <Checkbox checked={fields.communicationEmail} onCheckedChange={(v) => set("communicationEmail")(Boolean(v))} />
          </label>
        </div>
      </div>
      {errors.communication && <p className="mt-2 text-xs text-red-600">{errors.communication}</p>}

      </EditCard>
      {modal}
    </>
  );
}
