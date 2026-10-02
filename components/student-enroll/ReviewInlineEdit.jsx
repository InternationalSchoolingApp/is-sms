"use client";

import { useState } from "react";
import { Briefcase, Building2, BookOpen, Cake, GraduationCap, Globe, Mail, Map, MapPin, Phone as PhoneIcon, School, User, VenusAndMars } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { PhoneNumberField } from "@/components/student-enroll/PhoneNumberField";
import { GENDER_OPTIONS } from "@/components/student-enroll/Stage1StudentDetails";
import { RELATION_OPTIONS, WORKING_PROFESSION_OPTIONS } from "@/components/student-enroll/Stage2ParentDetails";
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
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
const STATUS_SESSION_OUT = "3";
const GRID = "grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3";

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

/** Same red asterisk the step forms use. */
function Req({ label, required }) {
  return (
    <>
      {label}
      {required && <span className="relative top-1 text-red-500"> *</span>}
    </>
  );
}

function EditCard({ title, saving, onSave, onCancel, formError, children }) {
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      {/* Below md the title and the Save button stay pinned while only the form body scrolls. */}
      <DialogContent showCloseButton={!saving} className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1112px]">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-7 py-4 md:border-0 md:pb-0 md:pt-6">
          <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-6 md:pb-2">
          {children}
          {formError && <p className="mt-4 text-center text-sm font-semibold text-red-600">{formError}</p>}
        </div>
        <div className="flex shrink-0 justify-center border-t border-slate-200 bg-white px-7 py-4 md:border-0 md:pb-6 md:pt-6">
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

  async function save() {
    setFormError(null);
    const { valid, errors: fieldErrors } = validateStudentDetails(current, { isDualDiploma });
    const dobError = validateAge(current.dob);
    const allErrors = dobError ? { ...fieldErrors, dob: fieldErrors.dob || dobError } : fieldErrors;
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
      <EditCard title="Student Details" saving={signup.isPending} onSave={save} onCancel={onCancel} formError={formError}>
        <div className={GRID}>
          <FloatingLabelInput icon={User} label={<Req label="First Name" required />} value={fields.firstName} {...nameFieldProps(set("firstName"))} error={errors.firstName} />
          <FloatingLabelInput icon={User} label="Middle Name" value={fields.middleName} {...nameFieldProps(set("middleName"))} />
          <FloatingLabelInput icon={User} label={<Req label="Last Name" required />} value={fields.lastName} {...nameFieldProps(set("lastName"))} error={errors.lastName} />
          <FloatingLabelSelect
            icon={GraduationCap}
            label={<Req label="Grade" required />}
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
            label={<Req label="Date of Birth" required />}
            value={fields.dob}
            onChange={set("dob")}
            fromDate={dobBounds.fromDate}
            toDate={dobBounds.toDate}
            error={errors.dob}
            disabled
          />
          <FloatingLabelSelect
            icon={VenusAndMars}
            label={<Req label="Gender" required />}
            value={fields.gender}
            onValueChange={set("gender")}
            options={GENDER_OPTIONS}
            error={errors.gender}
            searchable
          />
        </div>

        <div className={`mt-6 ${GRID}`}>
          <FloatingLabelInput
            icon={Mail}
            label="Enter your email"
            type="email"
            value={fields.communicationEmail}
            readOnly
            disabled
            inputClassName="cursor-not-allowed bg-slate-100 text-slate-500 disabled:pointer-events-auto disabled:opacity-100"
          />
          <PhoneNumberField
            label={<Req label="Mobile Number" required />}
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
            label={<Req label="Nationality" required />}
            value={current.nationality}
            onValueChange={set("nationality")}
            options={countries.data || []}
            error={errors.nationality}
            searchable
          />
        </div>

        <div className={`mt-6 ${GRID}`}>
          <FloatingLabelSelect
            icon={MapPin}
            label={<Req label="Country" required />}
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
            <strong className="mt-6 block text-base font-bold text-slate-900">Current School Details</strong>
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
              options={grades.data || []}
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
  const [initial] = useState(() => mapSignupParentToFields(parent));
  const [fields, setFields] = useState(initial);
  const [errors, setErrors] = useState({});
  // The read-only table decides the same way: working-professional fields replace the parent ones.
  const isOneToOneFlex =
    getLearningProgramBackendValue(context.learningProgram) === "ONE_TO_ONE_FLEX" || Boolean(parent?.workingProfessionName);

  const countries = useCountryOptions(context);
  const states = useStateOptions(context, fields.countryId);
  const cities = useCityOptions(context, fields.stateId);
  const signup = useParentDetailsSignup({ context, userId, isOneToOneFlex });
  const { formError, setFormError, outcome, modal } = useSaveOutcome({ context, onSessionExpired });

  const set = (name) => (value) => setFields((prev) => ({ ...prev, [name]: value }));

  async function save() {
    setFormError(null);
    const { valid, errors: fieldErrors } = validateParentDetails(fields, { isOneToOneFlex });
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
            <div className={GRID}>
              <FloatingLabelInput icon={User} label={<Req label="First Name" required />} value={fields.firstName} {...nameFieldProps(set("firstName"))} error={errors.firstName} />
              <FloatingLabelInput icon={User} label="Middle Name" value={fields.middleName} {...nameFieldProps(set("middleName"))} />
              <FloatingLabelInput icon={User} label={<Req label="Last Name" required />} value={fields.lastName} {...nameFieldProps(set("lastName"))} error={errors.lastName} />
              <FloatingLabelSelect
                icon={Briefcase}
                label={<Req label="Relation with Student" required />}
                value={fields.relation}
                onValueChange={set("relation")}
                options={RELATION_OPTIONS}
                error={errors.relation}
                searchable
              />
              <FloatingLabelInput icon={Mail} label="Parent Email" type="email" value={fields.email} onChange={(e) => set("email")(e.target.value)} error={errors.email} />
              <PhoneNumberField
                label="Parent Mobile Number (Optional)"
                value={fields.contactNumber}
                className="w-full pb-1.5"
                initialCountry={initial?.countryCode ? initial.countryCode.toLowerCase() : undefined}
                onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                  setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
                }
                error={errors.contactNumber}
              />
            </div>

            <div className={`mt-6 ${GRID}`}>
              <FloatingLabelSelect
                icon={MapPin}
                label={<Req label="Country" required />}
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

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-base font-bold text-slate-900">How to Contact You?</h3>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <IoLogoWhatsapp className="h-4 w-4 text-emerald-600" /> WhatsApp
                  <Checkbox checked={fields.communicationWhatsApp} onCheckedChange={(v) => set("communicationWhatsApp")(Boolean(v))} />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <PhoneIcon className="h-4 w-4 text-slate-900" /> Call
                  <Checkbox checked={fields.communicationCall} onCheckedChange={(v) => set("communicationCall")(Boolean(v))} />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <Mail className="h-4 w-4 text-slate-900" /> Email
                  <Checkbox checked={fields.communicationEmail} onCheckedChange={(v) => set("communicationEmail")(Boolean(v))} />
                </label>
              </div>
            </div>
            {errors.communication && <p className="mt-2 text-xs text-red-600">{errors.communication}</p>}
          </>
        )}
      </EditCard>
      {modal}
    </>
  );
}
