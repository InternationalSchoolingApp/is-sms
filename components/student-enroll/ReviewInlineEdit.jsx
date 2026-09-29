"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { validateAge } from "@/utils/ageValidation";
import { validateParentDetails, validateStudentDetails } from "@/utils/studentSignupValidation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
const STATUS_SESSION_OUT = "3";

/**
 * In-place editing for the review screen's Student / Parent sections —
 * openReviewInlineEdit() / saveReviewInlineEdit() in signupStudentContent.js.
 * Same table, same rows: each value cell turns into its input, and the
 * header's Edit button is replaced by Save / Cancel. Nothing navigates.
 *
 * Save re-runs the step's own validation and save endpoint
 * (save-student-details / save-parent-details) via the same hooks Steps 1
 * and 2 use, and — like legacy — skips the request entirely when nothing
 * changed since Edit was clicked.
 */

function Row({ label, error, children }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-start sm:gap-4">
      <dt className="pt-2 text-slate-500">{label}</dt>
      <dd>
        {children}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </dd>
    </div>
  );
}

function TextCell({ value, onChange, error, type = "text", placeholder }) {
  return (
    <Input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      className="h-10 bg-white"
    />
  );
}

function LockedValue({ children }) {
  return <p className="pt-2 font-medium text-slate-900">{children}</p>;
}

function EditCard({ title, saving, onSave, onCancel, onReview, formError, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {/* Legacy keeps the Review button in the header while editing; it discards the edit and collapses. */}
          <Button type="button" size="sm" variant="secondary" onClick={onReview} disabled={saving}>
            Review
          </Button>
        </div>
      </header>
      <dl className="divide-y divide-slate-100 px-4 py-2 text-sm">{children}</dl>
      {formError && <p className="px-4 pb-3 text-sm font-semibold text-red-600">{formError}</p>}
    </section>
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

export function StudentInlineEdit({ context, userId, student, gradeName, onSaved, onCancel, onReview, onSessionExpired }) {
  const [initial] = useState(() => mapSignupStudentToFields(student));
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

  return (
    <>
      <EditCard title="Student Details" saving={signup.isPending} onSave={save} onCancel={onCancel} onReview={onReview} formError={formError}>
        <Row label="Name" error={errors.firstName || errors.lastName}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <TextCell value={fields.firstName} onChange={set("firstName")} error={errors.firstName} placeholder="First name" />
            <TextCell value={fields.middleName} onChange={set("middleName")} placeholder="Middle name" />
            <TextCell value={fields.lastName} onChange={set("lastName")} error={errors.lastName} placeholder="Last name" />
          </div>
        </Row>
        {/* Grade and DOB stay visible but locked, as in legacy's REVIEW_EDIT_DISABLED_KEYS. */}
        {gradeName && (
          <Row label="Grade">
            <LockedValue>{gradeName}</LockedValue>
          </Row>
        )}
        <Row label="Date of Birth">
          <LockedValue>{student?.dob}</LockedValue>
        </Row>
        <Row label="Gender" error={errors.gender}>
          <FloatingLabelSelect value={fields.gender} onValueChange={set("gender")} options={GENDER_OPTIONS} error={undefined} />
        </Row>
        {isDualDiploma ? (
          <>
            <Row label="Current School Name" error={errors.studyingSchoolName}>
              <TextCell value={fields.studyingSchoolName} onChange={set("studyingSchoolName")} error={errors.studyingSchoolName} />
            </Row>
            <Row label="Current Grade" error={errors.studyingGradeId}>
              <FloatingLabelSelect value={fields.studyingGradeId} onValueChange={set("studyingGradeId")} options={grades.data || []} />
            </Row>
            <Row label="Country of Current School" error={errors.countryIdOfSchool}>
              <FloatingLabelSelect value={fields.countryIdOfSchool} onValueChange={set("countryIdOfSchool")} options={countries.data || []} searchable />
            </Row>
          </>
        ) : (
          <>
            <Row label="Email" error={errors.communicationEmail}>
              <TextCell type="email" value={fields.communicationEmail} onChange={set("communicationEmail")} error={errors.communicationEmail} />
            </Row>
            <Row label="Phone Number" error={errors.contactNumber}>
              <PhoneNumberField
                label=" "
                value={fields.contactNumber}
                initialCountry={initial?.countryCode ? initial.countryCode.toLowerCase() : undefined}
                onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                  setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
                }
              />
            </Row>
            <Row label="Nationality" error={errors.nationality}>
              <FloatingLabelSelect value={current.nationality} onValueChange={set("nationality")} options={countries.data || []} searchable />
            </Row>
          </>
        )}
        <Row label="Country | State | City" error={errors.countryId || errors.stateId || errors.cityId}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <FloatingLabelSelect
              value={fields.countryId}
              onValueChange={(countryId) => setFields((prev) => ({ ...prev, countryId, stateId: "", cityId: "" }))}
              options={countries.data || []}
              searchable
            />
            <FloatingLabelSelect
              value={fields.stateId}
              onValueChange={(stateId) => setFields((prev) => ({ ...prev, stateId, cityId: "" }))}
              options={states.data || []}
              searchable
            />
            <FloatingLabelSelect value={fields.cityId} onValueChange={set("cityId")} options={cities.data || []} searchable />
          </div>
        </Row>
      </EditCard>
      {modal}
    </>
  );
}

export function ParentInlineEdit({ context, userId, parent, onSaved, onCancel, onReview, onSessionExpired }) {
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
      <EditCard title="Parent/Guardian Details" saving={signup.isPending} onSave={save} onCancel={onCancel} onReview={onReview} formError={formError}>
        {isOneToOneFlex ? (
          <>
            <Row label="Student or a working professional" error={errors.workingProfession}>
              <FloatingLabelSelect value={fields.workingProfession} onValueChange={set("workingProfession")} options={WORKING_PROFESSION_OPTIONS} />
            </Row>
            <Row label="School/College/Organization" error={errors.institutionName}>
              <TextCell value={fields.institutionName} onChange={set("institutionName")} error={errors.institutionName} />
            </Row>
            <Row label="Country" error={errors.institutionCountryId}>
              <FloatingLabelSelect value={fields.institutionCountryId} onValueChange={set("institutionCountryId")} options={countries.data || []} searchable />
            </Row>
          </>
        ) : (
          <>
            <Row label="Name" error={errors.firstName || errors.lastName}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <TextCell value={fields.firstName} onChange={set("firstName")} error={errors.firstName} placeholder="First name" />
                <TextCell value={fields.middleName} onChange={set("middleName")} placeholder="Middle name" />
                <TextCell value={fields.lastName} onChange={set("lastName")} error={errors.lastName} placeholder="Last name" />
              </div>
            </Row>
            <Row label="Relation with student" error={errors.relation}>
              <FloatingLabelSelect value={fields.relation} onValueChange={set("relation")} options={RELATION_OPTIONS} />
            </Row>
            <Row label="Email" error={errors.email}>
              <TextCell type="email" value={fields.email} onChange={set("email")} error={errors.email} />
            </Row>
            <Row label="Phone Number" error={errors.contactNumber}>
              <PhoneNumberField
                label=" "
                value={fields.contactNumber}
                initialCountry={initial?.countryCode ? initial.countryCode.toLowerCase() : undefined}
                onChange={({ contactNumber, countryIsdCode, countryCode, isValid }) =>
                  setFields((prev) => ({ ...prev, contactNumber, countryIsdCode, countryCode, phoneValid: isValid }))
                }
              />
            </Row>
            <Row label="Country | State | City" error={errors.countryId || errors.stateId || errors.cityId}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <FloatingLabelSelect
                  value={fields.countryId}
                  onValueChange={(countryId) => setFields((prev) => ({ ...prev, countryId, stateId: "", cityId: "" }))}
                  options={countries.data || []}
                  searchable
                />
                <FloatingLabelSelect
                  value={fields.stateId}
                  onValueChange={(stateId) => setFields((prev) => ({ ...prev, stateId, cityId: "" }))}
                  options={states.data || []}
                  searchable
                />
                <FloatingLabelSelect value={fields.cityId} onValueChange={set("cityId")} options={cities.data || []} searchable />
              </div>
            </Row>
            <Row label="Preferred contact" error={errors.communication}>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                {[
                  ["communicationWhatsApp", "WhatsApp"],
                  ["communicationCall", "Call"],
                  ["communicationEmail", "Email"],
                ].map(([key, text]) => (
                  <label key={key} className="flex items-center gap-2 text-slate-700">
                    <Checkbox checked={fields[key]} onCheckedChange={(v) => set(key)(Boolean(v))} />
                    {text}
                  </label>
                ))}
              </div>
            </Row>
          </>
        )}
      </EditCard>
      {modal}
    </>
  );
}
