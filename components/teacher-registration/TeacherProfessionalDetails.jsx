"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Briefcase, CalendarDays, GraduationCap, Link2, MessageSquareText, Pencil, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import { FloatingLabelTextarea } from "@/components/ui/floating-label-textarea";
import { Req } from "@/components/common/Req";
import { TeacherDocumentField } from "@/components/teacher-registration/TeacherDocumentField";
import { TeacherMultiSelectDialog } from "@/components/teacher-registration/TeacherMultiSelectDialog";
import { useTeacherDocumentDelete, useTeacherProfessionalSave } from "@/hooks/useTeacherProfessionalDetails";
import {
  TEACHER_COURSE_BANDS,
  TEACHER_DOCUMENTS,
  TEACHER_EXPERIENCE_OPTIONS,
  TEACHER_JOB_DESCRIPTION_MAX_LENGTH,
  TEACHER_ORGANIZATION_MAX_LENGTH,
  TEACHER_QUALIFICATION_OPTIONS,
  TEACHER_SPECIALIZATION_MAX_LENGTH,
  countTeacherCourses,
  findMissingTeacherDocument,
  getTeacherDeclarationText,
  getTeacherGradeOptions,
  validateTeacherProfessionalDetails,
} from "@/utils/teacherProfessionalDetails";

const STATUS_SUCCESS = "1";
const GRADES_BAND_KEY = "grades";

function ChipList({ items }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item.key} className="max-w-full truncate rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary" title={item.label}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

// One of the two "choose ..." buttons with its error and the chips of what is chosen.
function PickerButton({ label, error, onClick, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className={`flex h-12 w-full cursor-pointer items-center justify-between rounded-md border bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${
          error ? "border-2 border-red-500" : "border-transparent"
        }`}
      >
        <span>{label}</span>
        <Pencil className="h-4 w-4" />
      </button>
      {error && <p className="mt-1 pl-2 text-xs text-red-600">{error}</p>}
      {children}
    </div>
  );
}

/**
 * Step 2 of the teacher registration ("Professional details"): degree, experience, last job, the grades and courses
 * taught, the supporting documents (each uploaded as soon as it is chosen), the demo, and the declaration. Content
 * only: rendered inside the wizard shell by app/[school]/teacher-registration/step/professional-details. Modelled on
 * TeacherPersonalDetails; the field contract is the legacy page's (teacher/signup/save-academic-professional-details),
 * see utils/teacherProfessionalDetails.js.
 *
 * `initial` is read at mount only (the container resolves it first): { fields, documents, linkMode, courseLists }.
 * Documents live outside the save (upload-document / delete-document store them straight away), so they are tracked
 * here separately from `fields`.
 *
 * Demo: a teacher who already has a saved demo link gets the link field (legacy "link mode"); the live recorder is a
 * later piece, so until it exists everybody else sees a disabled placeholder.
 */
export function TeacherProfessionalDetails({ context, school, userId, initial, onNext, onBack, onSessionOut }) {
  const [fields, setFields] = useState(initial.fields);
  const [documents, setDocuments] = useState(initial.documents);
  const [busyTypes, setBusyTypes] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const [picker, setPicker] = useState(null); // null | "grades" | "courses"
  // Every field that has ever shown an error this session: re-checked live while it is in here (as in step 1).
  const everErroredFieldsRef = useRef(new Set());

  const linkMode = initial.linkMode;
  const save = useTeacherProfessionalSave({ context, userId });
  const removeDocument = useTeacherDocumentDelete({ context });
  const gradeOptions = useMemo(() => getTeacherGradeOptions(context.schoolNumericId), [context.schoolNumericId]);
  const missingDocument = findMissingTeacherDocument(documents);
  const uploading = busyTypes.size > 0;

  useEffect(() => {
    setErrors((prev) => {
      const keys = [...everErroredFieldsRef.current];
      if (keys.length === 0) return prev;
      const { errors: current } = validateTeacherProfessionalDetails(fields, { linkMode, documents });
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
  }, [fields, documents, linkMode]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleBusyChange(fileType, busy) {
    setBusyTypes((prev) => {
      const next = new Set(prev);
      if (busy) next.add(fileType);
      else next.delete(fileType);
      return next;
    });
  }

  async function handleDeleteDocument(fileType) {
    try {
      const answer = await removeDocument.mutateAsync(fileType);
      if (answer?.status !== STATUS_SUCCESS) return false;
      setDocuments((prev) => {
        const next = { ...prev };
        delete next[fileType];
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }

  async function handleSubmit() {
    if (save.isPending || uploading) return;
    const { valid, errors: fieldErrors } = validateTeacherProfessionalDetails(fields, { linkMode, documents });
    Object.keys(fieldErrors).forEach((key) => everErroredFieldsRef.current.add(key));
    setErrors(fieldErrors);
    if (!valid) return;

    try {
      const response = await save.mutateAsync({ fields, linkMode });
      if (!response) {
        setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
        return;
      }
      // Success is status "1"; the failures answer a message with a statusCode that differs per failure.
      if (response.status !== STATUS_SUCCESS) {
        setErrors((prev) => ({ ...prev, form: response.message || "Something went wrong. Please try again." }));
        return;
      }
      onNext?.({ linkMode });
    } catch (err) {
      console.error("TeacherProfessionalDetails submit failed:", err);
      setErrors((prev) => ({ ...prev, form: "Something went wrong. Please check your connection and try again." }));
    }
  }

  const gradeLabelByKey = new Map(gradeOptions.map((option) => [option.value, option.label]));
  const gradeChips = fields.grades.map((key) => ({ key, label: gradeLabelByKey.get(key) || key }));
  const courseChips = TEACHER_COURSE_BANDS.flatMap((band) =>
    fields.courses[band.key].map((title) => ({ key: `${band.key}:${title}`, label: title }))
  );

  const pickerBands =
    picker === "grades"
      ? [{ key: GRADES_BAND_KEY, label: "Grades", options: gradeOptions }]
      : TEACHER_COURSE_BANDS.map((band) => ({
          key: band.key,
          label: band.label,
          options: (initial.courseLists[band.key] || []).map((title) => ({ value: title, label: title })),
        }));
  const pickerValue = picker === "grades" ? { [GRADES_BAND_KEY]: fields.grades } : fields.courses;

  function applyPicker(next) {
    if (picker === "grades") {
      // stored in grade order, whatever order they were ticked in
      const order = new Map(gradeOptions.map((option, index) => [option.value, index]));
      const chosen = [...next[GRADES_BAND_KEY]].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
      setField("grades", chosen);
    } else {
      setField("courses", { elementary: next.elementary, middle: next.middle, high: next.high });
    }
  }

  return (
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:px-8 lg:py-6">
      <h2 className="text-center text-xl font-extrabold text-black md:text-2xl">Professional Details</h2>

      <div className="mt-4.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <FloatingLabelSelect
          icon={GraduationCap}
          label={<Req label="Highest Education Degree" required />}
          value={fields.highestQualificationId}
          onValueChange={(v) => setField("highestQualificationId", v)}
          options={TEACHER_QUALIFICATION_OPTIONS}
          error={errors.highestQualificationId}
        />
        <FloatingLabelInput
          icon={BookOpen}
          label={<Req label="Degree Specialization" required />}
          value={fields.educationSpecialization}
          maxLength={TEACHER_SPECIALIZATION_MAX_LENGTH}
          onChange={(e) => setField("educationSpecialization", e.target.value)}
          error={errors.educationSpecialization}
        />
        <FloatingLabelSelect
          icon={CalendarDays}
          label={<Req label="Experience In Years" required />}
          value={fields.totalExperienceYears}
          onValueChange={(v) => setField("totalExperienceYears", v)}
          options={TEACHER_EXPERIENCE_OPTIONS}
          error={errors.totalExperienceYears}
        />
        <FloatingLabelInput
          icon={Briefcase}
          label={<Req label="Last Organization Name" required />}
          value={fields.lastOrganizationName}
          maxLength={TEACHER_ORGANIZATION_MAX_LENGTH}
          onChange={(e) => setField("lastOrganizationName", e.target.value)}
          error={errors.lastOrganizationName}
        />
      </div>

      <FloatingLabelTextarea
        className="mt-3.5"
        label={<Req label="Why Should We Hire You?" required />}
        value={fields.lastJobDesc}
        maxLength={TEACHER_JOB_DESCRIPTION_MAX_LENGTH}
        onChange={(e) => setField("lastJobDesc", e.target.value)}
        error={errors.lastJobDesc}
        counter={`${fields.lastJobDesc.length}/${TEACHER_JOB_DESCRIPTION_MAX_LENGTH}`}
      />

      <div className="mt-1 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <PickerButton label={<Req label="Grades you have taught" required />} error={errors.grades} onClick={() => setPicker("grades")}>
          <ChipList items={gradeChips} />
        </PickerButton>
        <PickerButton label={<Req label="Courses you have taught" required />} error={errors.courses} onClick={() => setPicker("courses")}>
          <ChipList items={courseChips} />
          {countTeacherCourses(fields.courses) > 0 && (
            <p className="mt-1 pl-1 text-xs text-slate-500">{countTeacherCourses(fields.courses)} selected</p>
          )}
        </PickerButton>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-red-600">
          NOTE:- Please upload files in the following formats (jpg, jpeg, pdf or png) with a maximum size of 4.4 MB
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TEACHER_DOCUMENTS.map((doc) => (
            <TeacherDocumentField
              key={doc.fileType}
              school={school}
              doc={doc}
              saved={documents[doc.fileType]}
              error={doc.required && errors.documents && missingDocument?.fileType === doc.fileType ? errors.documents : ""}
              onUploaded={(fileType, saved) => setDocuments((prev) => ({ ...prev, [fileType]: saved }))}
              onDelete={handleDeleteDocument}
              onBusyChange={handleBusyChange}
              onSessionOut={onSessionOut}
            />
          ))}
        </div>
      </div>

      {linkMode ? (
        <div className="mt-5">
          <FloatingLabelInput
            icon={Link2}
            label={<Req label="Please provide a link of your demo" required />}
            value={fields.demoVedioLink}
            onChange={(e) => setField("demoVedioLink", e.target.value)}
            error={errors.demoVedioLink}
          />
          <p className="mt-1 pl-2 text-xs text-slate-600">
            The link should be publicly accessible, e.g. a public YouTube or Google Drive link.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-lg border border-slate-200 p-4 text-center">
          <h3 className="text-base font-bold text-black">Record Your Demo</h3>
          <Button type="button" disabled className="h-10 rounded-xl px-4 font-bold">
            <Video className="h-4 w-4" /> LIVE RECORD YOUR DEMO
          </Button>
          <p className="text-xs text-slate-500">Live demo recording is coming to this page shortly.</p>
        </div>
      )}

      <div className="mt-5">
        <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-black">
          <Checkbox
            checked={fields.declConfirmation}
            onCheckedChange={(checked) => setField("declConfirmation", Boolean(checked))}
            className="mt-0.5"
            aria-invalid={Boolean(errors.declConfirmation)}
          />
          <span>{getTeacherDeclarationText(context.schoolName)}</span>
        </label>
        {errors.declConfirmation && <p className="mt-1 pl-7 text-xs text-red-600">{errors.declConfirmation}</p>}
      </div>

      {errors.form && <p className="mt-4 text-center text-sm font-semibold text-red-600">{errors.form}</p>}
      {missingDocument && (
        <p className="mt-4 text-center text-xs text-slate-500">Please upload the required documents (marked *) to continue.</p>
      )}

      <MobileActionBar context={null} className="md:mt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={save.isPending} className="cursor-pointer rounded-md px-4">
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={save.isPending || uploading || Boolean(missingDocument)}
          className="cursor-pointer rounded-md bg-primary px-4 hover:bg-primary/90"
        >
          {save.isPending ? "Please wait…" : uploading ? "Uploading…" : "Next"}
        </Button>
      </MobileActionBar>

      <TeacherMultiSelectDialog
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        title={picker === "grades" ? "Grades you have taught" : "Courses you have taught"}
        description={picker === "grades" ? "Choose every grade you have taught." : "Choose the courses you have taught at each school level."}
        bands={pickerBands}
        value={pickerValue}
        onApply={applyPicker}
      />
    </div>
  );
}
