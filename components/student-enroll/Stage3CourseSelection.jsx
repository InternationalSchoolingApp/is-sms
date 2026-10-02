"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calculator,
  ChevronDown,
  FlaskConical,
  Globe2,
  GraduationCap,
  HeartPulse,
  Info,
  Languages,
  Lock,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlaggedSeatsModal } from "@/components/student-enroll/FlaggedSeatsModal";
import { ConfirmDialog } from "@/components/student-enroll/ConfirmDialog";
import { RecommendedCoursesDialog } from "@/components/student-enroll/RecommendedCoursesDialog";
import { ChangeGradeDialog } from "@/components/student-enroll/ChangeGradeDialog";
import {
  STATUS_SESSION_OUT,
  STATUS_SUCCESS,
  useCourseDetails,
  useProceedToReview,
  useRecommendedCourses,
  useShowPaymentOption,
  useUpdateCourseSelection,
} from "@/hooks/useCourseSelection";
import { useGradeOptions, useCountryOptions, useStudentDetailsPrefill, useStudentDetailsSignup } from "@/hooks/useStudentDetailsSignup";
import { getCourseAddCheck, hidesCourseCredits, validateCourseCredits } from "@/utils/studentSignupValidation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { saveWizardStudentFields } from "@/utils/wizardStorage";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

function parseIds(csv) {
  return (csv || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isNoLiveClasses(subject, registrationType) {
  return registrationType !== "SCHOLARSHIP" && (subject.remarks === 0 || subject.remarks === "0");
}

// Header over the selected list, as in getCourseSelectionContent() (signupStudentContent.js).
function selectedSummary(data) {
  const count = data.selectedSubjects?.length || 0;
  if (count === 0) return "Please select a course";
  if (data.registrationType === "BATCH" || Number(data.courseProviderId) === 39) {
    return `${count} fixed ${count > 1 ? "courses" : "course"}`;
  }
  if (hidesCourseCredits(data.standardId)) {
    return count > 1 ? `${count} courses selected` : `${count} course worth ${data.totalCredit} credit`;
  }
  return count > 1
    ? `You have ${count} courses worth ${data.totalCredit} credits`
    : `You have ${count} course worth ${data.totalCredit} credit`;
}

// Header over the available list, same source.
function availableSummary(data) {
  const min = Number(data.minCourseLimit) || 0;
  const max = Number(data.maxCourseLimit) || 0;
  const total = Number(data.totalCredit) || 0;
  if (min <= total) return "Select extra courses";
  const single = max - total <= 1;
  const what = single ? "a course" : "courses";
  if (total >= max) return `Please select ${what}`;
  return `Please select ${what} worth ${total === 0 ? min : max - total} ${single ? "credit" : "credits"}`;
}

function subjectNotes(subject, data, showPaymentOption) {
  const notes = [];
  if (isNoLiveClasses(subject, data.registrationType)) notes.push("This course does not offer live classes");
  if (showPaymentOption === "Y") {
    if (subject.materialFee > 0) notes.push(`${subject.materialFeeString} extra for external materials`);
    if (data.registrationType !== "ONE_TO_ONE_FLEX" && subject.additionalFee > 0) {
      const overMax = Number(data.totalCredit) > Number(data.maxCourseLimit);
      notes.push(`${overMax ? subject.subjectPriceString : subject.additionalFeeString} extra for ${subject.courseType} courses`);
    }
  }
  return notes;
}

function upgradeHint(courseType) {
  if (courseType === "ADV") {
    return "Advanced courses have more assessments & assignments as compared to regular courses and contribute to a higher GPA.";
  }
  if (courseType === "HON") {
    return "Honors courses have more assessments & assignments as compared to regular courses and contribute to a higher GPA.";
  }
  return undefined;
}

function CourseSummaryLink({ url }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
      Course summary
    </a>
  );
}

// Purely cosmetic: picks an icon for a subject-category card by matching its
// name — the backend doesn't send an icon/category-type field, so this is a
// best-effort keyword match with a generic fallback, not business logic.
function categoryIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("math")) return Calculator;
  if (n.includes("science")) return FlaskConical;
  if (n.includes("language")) return Languages;
  if (n.includes("social") || n.includes("history")) return Globe2;
  if (n.includes("elective")) return Sparkles;
  if (n.includes("health") || n.includes("physical")) return HeartPulse;
  if (n.includes("art")) return Palette;
  return BookOpen;
}

// Purely cosmetic breakdown of the already-selected courses for the
// "Selection Summary" legend — a pure derived count over `selectedCourses`
// (recomputed fresh every render), so adding/removing a course automatically
// moves it in/out of the right bucket, no extra state needed. Confirmed
// field mapping: Required from courseMandatory (unchanged); Electives and
// Advanced come from `courseCategory` (CourseDTO.courseCategory — the
// subject's own category name, e.g. "Electives"/"Advanced Placement", NOT
// courseTypeOriginal) specifically; Regular/Honors still come from
// courseTypeOriginal as before, for anything not in one of those two
// categories.
function summarizeSelection(selectedCourses) {
  
  const counts = { Required: 0, Regular: 0, Electives: 0, Honors: 0, Advanced: 0 };
  selectedCourses.forEach((course) => {
    if (course.courseMandatory === 1) {
      counts.Required += 1;
      return;
    }
    if (course.courseCategory === "Electives") counts.Electives += 1;
    else if (course.courseCategory === "Advanced Placement") counts.Advanced += 1;
    else if (course.courseTypeOriginal === "Regular") counts.Regular += 1;
    else if (course.courseTypeOriginal === "Honors") counts.Honors += 1;
  });
  return [
    { label: "Required", count: counts.Required, dot: "bg-emerald-500" },
    { label: "Regular", count: counts.Regular, dot: "bg-primary" },
    { label: "Electives", count: counts.Electives, dot: "bg-purple-500" },
    { label: "Honors", count: counts.Honors, dot: "bg-amber-500" },
    { label: "Advanced", count: counts.Advanced, dot: "bg-indigo-700" },
  ];
}

// CSS conic-gradient ring, no chart library needed.
function CreditProgressRing({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--primary) ${pct * 3.6}deg, #dbeafe ${pct * 3.6}deg)` }}
      role="img"
      aria-label={`${value} of ${max} credits selected`}
    >
      <div className="h-9 w-9 rounded-full bg-white" />
    </div>
  );
}

// Same upgrade(course, target) call as the arrow-button fallback below — just
// a toggle-shaped control for the common "exactly one alternate variant"
// case (e.g. Regular <-> Honors), matching the reference design. Any
// confirmation gate (extra fee, warning message) still lives inside
// upgrade() itself and still runs before anything changes.
function VariantToggle({ course, target, onToggle, disabled }) {
  const isTarget = course.courseTypeOriginal !== "Regular";
  // Off: label names the variant you'd switch TO (target); on: names the
  // variant the course currently is. Width follows the label, so "Honor" and
  // "Advanced" both fit with the knob on the opposite side.
  const label = /adv/i.test(isTarget ? course.courseTypeOriginal : target.courseType) ? "Advanced" : "Honor";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={isTarget}
        aria-label={target.buttonLabel || "Switch course variant"}
        title={upgradeHint(target.courseType)}
        onClick={() => onToggle(course, target)}
        disabled={disabled}
        className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-1 transition-colors disabled:opacity-50 ${
          isTarget ? "flex-row-reverse bg-primary text-white" : "bg-slate-300 text-slate-600"
        }`}
      >
        <span className="h-4 w-4 shrink-0 rounded-full bg-white shadow" />
        <span className="px-1 text-xs font-medium leading-none">{label}</span>
      </button>
    </div>
  );
}

// Below-768px layout swaps the desktop sidebar+detail-pane for a full-width
// category list + this dialog — real viewport detection, not just CSS,
// since both layouts are driven by the SAME openCourseId state and only one
// of them may actually render as a modal at a time (a CSS-hidden Dialog
// still mounts its fixed-position overlay and would block the desktop UI).
function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpointPx]);
  return isMobile;
}

// Mobile-only "category sheet": tapping a category on the mobile course list
// opens this instead of the desktop inline detail pane. Each row has its own
// "+ Add" button that calls the exact same addSubject(course, subject) used
// everywhere else, immediately — same extra-fee/AP/no-live-class confirm
// gates, same request per subject, just triggered per-row instead of via a
// checkbox + batch "Add" button.
function CourseCategoryDialog({ course, onClose, selectedIds, data, showPaymentOption, busy, onAddSubject }) {
  const [addingId, setAddingId] = useState(null);

  if (!course) return null;

  const CategoryIcon = categoryIcon(course.courseName);

  async function handleAdd(subject) {
    if (busy || addingId) return;
    const id = String(subject.subjectId);
    setAddingId(id);
    try {
      await onAddSubject(course, subject);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-2 space-y-0 bg-[#eef4ff] px-4 py-3">
          <CategoryIcon className="h-5 w-5 shrink-0 text-primary" />
          <DialogTitle className="text-base font-semibold text-primary">{course.courseName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {course.subjects.map((subject) => {
            const id = String(subject.subjectId);
            const alreadySelected = selectedIds.includes(id);
            const notes = subjectNotes(subject, data, showPaymentOption);
            return (
              <div key={id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f3ff] text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{subject.subjectName}</p>
                  {!hidesCourseCredits(data.standardId) && <p className="text-xs text-slate-500">{subject.subjectCredit} Credit</p>}
                  {notes.map((note, index) => (
                    <p key={index} className="text-xs font-medium text-primary">
                      {note}
                    </p>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAdd(subject)}
                  disabled={alreadySelected || busy || Boolean(addingId)}
                  className="shrink-0 rounded-md bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> {alreadySelected ? "Added" : addingId === id ? "Adding…" : "Add"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Gray placeholder block — same building block Stage1Skeleton uses.
function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

/** Structural skeleton mirroring the real layout, shown while course-details-by-standard-id is loading. */
function Stage3Skeleton({ header }) {
  return (
    <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      {header}
      <SkeletonBlock className="mt-4 h-20 w-full rounded-xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <section className="rounded-xl border border-slate-200 p-4">
          <SkeletonBlock className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-14 w-full" />
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 p-4">
          <SkeletonBlock className="h-5 w-40" />
          <div className="mt-4 grid gap-3 sm:grid-cols-[190px_1fr]">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-10 w-full" />
              ))}
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Stage 3 of the enrollment wizard ("Course Selection"). Mirrors
 * getAllCourseDetails()/addCourse()/removeCourse() in signupStudentStage3.js
 * and getCourseSelectionContent() in signupStudentContent.js: every change
 * re-posts the full selection to course-details-by-standard-id, which
 * persists it and returns the recomputed page. Continuing saves a payment
 * plan (see useProceedToReview) so the next step is the review page.
 *
 * Visual design (summary bar with credit ring/legend, category sidebar +
 * detail pane for available courses, Regular/Honor toggle) matches the
 * reference screenshots — see categoryIcon/summarizeSelection/
 * CreditProgressRing/VariantToggle above for what's presentational-only vs.
 * the untouched business logic below (add/remove/upgrade/recommended/
 * change-grade/proceed all call the exact same hooks/handlers as before).
 *
 * Not built here yet: the ONE_TO_ONE_FLEX grade switcher and the
 * enrollment-documents gate (legacy lets the student skip that one, so
 * proceeding without it matches the skip path). The change-grade modal
 * (changeSelectedGrade()/saveSelectedGradeAndDob() in signupStudentStage3.js)
 * is built — see ChangeGradeDialog and handleGradeChange below.
 *
 * `standardId` is Stage 1's saved grade (see app/step/3/page.jsx) — the
 * initial course-details-by-standard-id read must carry it (confirmed
 * against a real captured legacy-app payload; see useCourseSelection.js's
 * doc comment) or the backend's grade/fee mapping lookup has nothing to key
 * on and the call fails with a generic error.
 */
export function Stage3CourseSelection({ context, userId, standardId, onNext, onBack, onSessionExpired, inReview = false }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const courseQuery = useCourseDetails({ context, userId, standardId });
  const paymentOption = useShowPaymentOption({ context, userId });
  const update = useUpdateCourseSelection({ context, userId });
  const recommended = useRecommendedCourses({ context, userId });
  const proceed = useProceedToReview({ context, userId });

  // Change Grade & DOB modal (changeSelectedGrade()/saveSelectedGradeAndDob()
  // in signupStudentStage3.js) — reuses Stage 1's own prefill/save hooks
  // rather than a separate request builder, same as Stage 1 itself does.
  const isDualDiploma = getLearningProgramBackendValue(context.learningProgram) === "DUAL_DIPLOMA";
  const studentPrefill = useStudentDetailsPrefill({ context, userId });
  const grades = useGradeOptions(context);
  const countries = useCountryOptions(context);
  const changeGrade = useStudentDetailsSignup({ context, userId, isDualDiploma, countries: countries.data });
  const [changeGradeOpen, setChangeGradeOpen] = useState(false);

  const [notice, setNotice] = useState(null);
  const [flaggedModal, setFlaggedModal] = useState(null);
  const [recommendedData, setRecommendedData] = useState(null);
  const [openCourseId, setOpenCourseId] = useState(null);
  const [confirmRequest, setConfirmRequest] = useState(null);
  // Display-only filter over the "Choose Courses" panel (category names +
  // subject names) — never touches selection state or any request payload.
  const [search, setSearch] = useState("");
  const resolverRef = useRef(null);
  // Legacy apCourseSelectionFlag: the AP warning shows once per selection session.
  const apAcknowledgedRef = useRef(false);
  // Legacy oneTimeModal: the "extra fee from now on" notice shows once.
  const extraFeeNoticeShownRef = useRef(false);

  // Desktop/tablet only (>767px): .course-category's height is pinned to
  // whatever height .suject-category (the sidebar) naturally renders at —
  // whether that's short (few categories) or tall (many) — and scrolls its
  // own content via overflow-y when it doesn't fit. A ref callback (not a
  // useEffect) so it re-measures whenever the sidebar <ul> itself mounts or
  // unmounts (e.g. the loading -> loaded transition), and a ResizeObserver so
  // it stays in sync if the sidebar's own height ever changes later (search
  // filtering the category list, font load, etc.).
  const [detailPaneHeight, setDetailPaneHeight] = useState(null);
  const sidebarCleanupRef = useRef(null);
  const sidebarRefCallback = useCallback((node) => {
    if (sidebarCleanupRef.current) {
      sidebarCleanupRef.current();
      sidebarCleanupRef.current = null;
    }
    if (!node) {
      setDetailPaneHeight(null);
      return;
    }
    function measure() {
      setDetailPaneHeight(window.innerWidth > 767 ? node.offsetHeight : null);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    sidebarCleanupRef.current = () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const data = courseQuery.data?.status === STATUS_SUCCESS ? courseQuery.data : null;
  const initialFailure = courseQuery.data && courseQuery.data.status !== STATUS_SUCCESS ? courseQuery.data : null;
  const showPaymentOption = paymentOption.data;
  const busy = update.isPending || recommended.isPending || proceed.isPending;

  useEffect(() => {
    if (data?.selectedSubjects?.some((course) => course.courseTypeOriginal === "Advanced Placement")) {
      apAcknowledgedRef.current = true;
    }
  }, [data]);

  useEffect(() => {
    if (!initialFailure) return;
    if (initialFailure.status === STATUS_SESSION_OUT) onSessionExpired?.();
    else if (initialFailure.statusCode === "FLAGGED") setFlaggedModal({ sessionName: initialFailure.message });
  }, [initialFailure, onSessionExpired]);

  useEffect(() => {
    if (notice?.tone !== "success" && notice?.tone !== "info") return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  function ask(request) {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmRequest(request);
    });
  }

  function resolveConfirm(answer) {
    resolverRef.current?.(answer);
    resolverRef.current = null;
    setConfirmRequest(null);
  }

  function handleFailure(response, fallback) {
    if (!response) {
      setNotice({ tone: "error", text: GENERIC_ERROR });
      return;
    }
    if (response.status === STATUS_SESSION_OUT) {
      onSessionExpired?.();
      return;
    }
    if (response.statusCode === "FLAGGED") {
      setFlaggedModal({ sessionName: response.message });
      return;
    }
    setNotice({ tone: "error", text: response.categoryMandatoryMessage || response.message || fallback });
  }

  async function applyChange(change) {
    setNotice(null);
    try {
      const response = await update.mutateAsync({ standardId: data.standardId, ...change });
      if (response?.status !== STATUS_SUCCESS) {
        handleFailure(response, "Could not update your courses. Please try again.");
        return false;
      }
      if (response.message) {
        setNotice({ tone: response.message === "No changes to save" ? "info" : "success", text: response.message });
      }
      return true;
    } catch (err) {
      console.error("Stage3CourseSelection update failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
      return false;
    }
  }

  const selectedIds = parseIds(data?.selectedSubjectsAsString);

  async function addSubject(course, subject) {
    if (busy) return;
    setNotice(null);
    const check = getCourseAddCheck(data);
    if (check.blockedMessage) {
      toast.error(check.blockedMessage);
      return;
    }
    if (check.extraFee && showPaymentOption === "Y") {
      const confirmed = await ask({
        title: "Extra fee",
        message: (
          <>
            {!extraFeeNoticeShownRef.current && (
              <p>{selectedSummary(data)}. Now extra fee will be charged for choosing extra courses.</p>
            )}
            <p>
              Extra fee of {subject.courseFeeString} will be charged for selecting {subject.subjectName}. Kindly confirm this
              selection.
            </p>
          </>
        ),
        confirmLabel: "Confirm & add",
        cancelLabel: "Close",
      });
      if (!confirmed) return;
      extraFeeNoticeShownRef.current = true;
    }
    if (Number(context.schoolNumericId) === 1 && subject.courseType === "Advanced Placement" && !apAcknowledgedRef.current) {
      
      const confirmed = await ask({
        title: "AP course",
        message: (
          <p>
            {context.schoolName} is approved by College Board to offer AP courses. Kindly{" "}
            <a href="https://about.collegeboard.org/contact-us" target="_blank" rel="noreferrer" className="text-primary underline">
              contact
            </a>{" "}
            an authorized test centre for AP exams. AP courses are college level and approved by the College Board.
          </p>
        ),
      });
      if (!confirmed) return;
      apAcknowledgedRef.current = true;
    }
    if (isNoLiveClasses(subject, data.registrationType)) {
      const confirmed = await ask({
        title: "No live classes",
        message: <p>This course does not offer live classes. Do you wish to select this course?</p>,
      });
      if (!confirmed) return;
    }
    setOpenCourseId(course.courseId);
    const added = await applyChange({
      selectedSubjects: [...selectedIds, String(subject.subjectId)].join(","),
      controlType: "add",
      courseId: course.courseId,
    });
    if (added) toast.success(`${subject.subjectName} added`);
  }

  async function removeSubject(course) {
    if (busy) return;
    const removed = await applyChange({
      selectedSubjects: selectedIds.filter((id) => id !== String(course.courseId)).join(","),
      controlType: "remove",
      courseId: course.categoryId,
    });
    if (removed) toast.success(`${course.courseName} removed`);
  }

  async function removeAll() {
    if (busy) return;
    const confirmed = await ask({
      title: "Remove all courses",
      message: <p>Are you sure you want to remove all selected courses?</p>,
      confirmLabel: "Yes",
    });
    if (!confirmed) return;
    apAcknowledgedRef.current = false;
    await applyChange({ selectedSubjects: "", controlType: "remove" });
  }

  async function upgrade(course, target) {
    if (busy) return;
    if (target.warningMessage && showPaymentOption === "Y") {
      const confirmed = await ask({
        title: target.buttonLabel || "Change course",
        message: <p>{target.warningMessage}</p>,
        confirmLabel: "Yes",
      });
      if (!confirmed) return;
    }
    const switched = await applyChange({
      selectedSubjects: [...selectedIds.filter((id) => id !== String(course.courseId)), String(target.courseId)].join(","),
      controlType: "add",
      courseId: course.categoryId,
    });
    if (switched) {
      toast.success(course.courseTypeOriginal === "Regular" ? "Switch to Honor" : "Switch to Regular");
    }
  }

  async function handleGradeChange(newStandardId, newDob) {
    setNotice(null);
    try {
      const fields = { ...(studentPrefill.data || {}), standardId: newStandardId, dob: newDob };
      const saveResponse = await changeGrade.mutateAsync(fields);
      if (saveResponse?.status !== STATUS_SUCCESS) {
        handleFailure(saveResponse, "Could not save the new grade. Please try again.");
        return;
      }
      // Keep the prefill cache in sync with what was just saved — otherwise
      // reopening this modal later reads the STALE standardId/dob (the query
      // has no reason to refetch on its own since this component never
      // remounts), and the Grade select shows the grade from before this
      // change instead of preselecting what was just saved.
      queryClient.setQueryData(["student-details-prefill", userId], fields);
      // Mirrors saveSelectedGradeAndDob(): grade saved, so refresh Step 3's
      // course list for the new grade, clearing the old grade's selection
      // (courses are grade-specific) — same as getAllCourseDetails('Y', '')
      // after #signupStage3 #standardId/#selectedSubjects/#controlType are reset.
      saveWizardStudentFields(context.schoolUUID, userId, fields);
      setChangeGradeOpen(false);
      const courseResponse = await update.mutateAsync({ standardId: newStandardId, selectedSubjects: "", controlType: "remove" });
      if (courseResponse?.status !== STATUS_SUCCESS) {
        handleFailure(courseResponse, "Grade saved, but could not refresh courses for it. Please try again.");
      }
    } catch (err) {
      console.error("Stage3CourseSelection change-grade failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  async function openRecommended() {
    if (busy) return;
    setNotice(null);
    try {
      const response = await recommended.mutateAsync();
      if (response?.status !== STATUS_SUCCESS) {
        handleFailure(response, "Could not load recommended courses.");
        return;
      }
      setRecommendedData(response);
    } catch (err) {
      console.error("Stage3CourseSelection recommended-courses failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  async function confirmRecommended(ids) {
    apAcknowledgedRef.current = false;
    const saved = await applyChange({ selectedSubjects: ids.join(","), controlType: "add" });
    if (saved) setRecommendedData(null);
  }

  async function handleNext() {
    if (busy) return;
    setNotice(null);
    const creditError = validateCourseCredits(data);
    if (creditError) {
      setNotice({ tone: "error", text: creditError });
      return;
    }
    try {
      const { ok, response } = await proceed.mutateAsync({ courseData: data, showPaymentOption });
      if (!ok) {
        handleFailure(response, "Could not continue. Please try again.");
        return;
      }
      onNext?.();
    } catch (err) {
      console.error("Stage3CourseSelection proceed failed:", err);
      setNotice({ tone: "error", text: GENERIC_ERROR });
    }
  }

  const header = inReview ? null : (
    <>
      {/* Program name is now shown by EnrollmentWizardShell's own hero above this card. */}
      <h2 className="text-center text-2xl font-bold text-slate-900">
        <span className="md:hidden">Select Courses</span>
        <span className="hidden md:inline">Course selection</span>
      </h2>
    </>
  );

  if (courseQuery.isLoading) {
    return <Stage3Skeleton header={header} />;
  }

  if (!data) {
    return (
      <div>
        {header}
        <p className="mt-8 text-sm font-semibold text-red-600">
          {initialFailure?.message || "Could not load your courses."}
        </p>
        <div className="mt-6 flex gap-3">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button type="button" onClick={() => courseQuery.refetch()} disabled={courseQuery.isFetching}>
            Try again
          </Button>
        </div>
        <FlaggedSeatsModal
          open={!!flaggedModal}
          onOpenChange={(open) => !open && setFlaggedModal(null)}
          schoolName={context.schoolName}
          sessionName={flaggedModal?.sessionName}
        />
      </div>
    );
  }

  const fixed = Boolean(data.requiredFixedCourses);
  const hideCredits = hidesCourseCredits(data.standardId);
  const batchOrProvider39 = data.registrationType === "BATCH" || Number(data.courseProviderId) === 39;
  const selectedCourses = data.selectedSubjects || [];
  const mandatoryCount = selectedCourses.filter((course) => course.courseMandatory === 1).length;
  const canRemoveAll = !fixed && selectedCourses.length > mandatoryCount;
  const availableCourses = (data.availableCourses || []).filter((course) => course.subjects?.length > 0);
  const showAvailable = !fixed && availableCourses.length > 0;
  const effectiveOpenId = openCourseId ?? availableCourses[0]?.courseId;
  const showMinBanner = Number(data.courseProviderId) !== 39 && Number(data.minCourseLimit) > Number(data.totalCredit);
  const showCreditSummary = !hideCredits && !batchOrProvider39 && Number(data.minCourseLimit) > 0;
  const materialFee = data.courseMaterialFeeDetails;
  const summaryBuckets = summarizeSelection(selectedCourses);

  // Display-only filter — matches a category by its own name, or by any of
  // its subjects' names, and only affects what's rendered in the "Choose
  // Courses" panel below.
  const query = search.trim().toLowerCase();
  const visibleCourses = query
    ? availableCourses.filter(
        (course) =>
          course.courseName?.toLowerCase().includes(query) ||
          course.subjects?.some((subject) => subject.subjectName?.toLowerCase().includes(query))
      )
    : availableCourses;
  const activeCourse = visibleCourses.find((course) => course.courseId === effectiveOpenId) || visibleCourses[0];
  // Unlike activeCourse (which defaults to the first category for the
  // desktop sidebar's always-something-shown pane), the mobile category
  // sheet must stay closed until a category is explicitly tapped — openCourseId
  // is null/-1 in that closed state, not defaulted to the first category.
  const mobileActiveCourse = openCourseId && openCourseId !== -1 ? visibleCourses.find((course) => course.courseId === openCourseId) || null : null;
  return (
    <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      {header}

      {/* Mobile-only: the simple stacked "Grade chip" + plain "Credits
          Requirement" line from the mobile reference design — no card
          border, no progress ring, no Selection Summary legend. */}
      <div className="mt-4 space-y-2 md:hidden">
        {data.standardName && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#e6f3ff] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
              <GraduationCap className="h-5 w-5 text-primary" />
              {data.standardName}
            </span>
            <button
              type="button"
              onClick={() => setChangeGradeOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              Change <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showCreditSummary && (
          <div className="flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Info className="h-2.5 w-2.5" />
              </span>
              Credits Requirement:
            </span>
            <span className="text-sm font-bold text-slate-900">Minimum {data.minCourseLimit} Credits</span>
          </div>
        )}

        {/* {showMinBanner && !showCreditSummary && (
          <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            You need a minimum of {data.minCourseLimit} credits
          </span>
        )} */}
      </div>

      {/* Desktop/tablet: the full summary card (grade chip, credits
          requirement, progress ring, Selection Summary legend) — untouched. */}
      <div className="mt-4 hidden gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex md:flex-row md:flex-wrap md:items-center md:gap-8 md:p-5">
        {data.standardName && (
          <div className="flex items-center gap-2 rounded-lg py-2 px-3 bg-[#e6f3ff]">
            <span className="inline-flex items-center gap-2  text-sm font-semibold text-slate-900">
              <GraduationCap className="h-5 w-5 text-primary" />
              {data.standardName}
            </span>
            <button
              type="button"
              onClick={() => setChangeGradeOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 ml-auto rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              Change <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showCreditSummary && (
          <div className="flex items-center gap-2 border-slate-300 sm:border-l sm:pl-8">
            
            <div>
              <div className="flex">
                <p className="text-xs text-slate-500">Credits Requirement</p>
                <span className="flex h-5 w-5 ml-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Info className="h-3 w-3" />
                  </span>
              </div>
              <p className="text-sm font-bold text-slate-900">Minimum {data.minCourseLimit} Credits</p>
            </div>
          </div>
        )}

        {showCreditSummary && (
          <div className="hidden items-center gap-3 border-slate-300 lg:border-r-1 sm:border-l sm:px-8 md:flex">
            <CreditProgressRing value={Number(data.totalCredit) || 0} max={Number(data.minCourseLimit) || 1} />
            <div>
              <p className="text-xl font-bold text-primary">
                {data.totalCredit}/{data.minCourseLimit}
              </p>
              <p className="text-sm font-bold text-slate-900">Credits Selected</p>
            </div>
          </div>
        )}

        {!fixed && !batchOrProvider39 && (
          <div className={`hidden bg-[#e6f3ff] rounded-lg xl:ml-2  py-4 ${showMinBanner && !showCreditSummary ? ``:`flex-1`} sm:px-3 md:block`}>
            <p className="text-xs font-semibold text-slate-500">Selection Summary</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {summaryBuckets.map((bucket) => (
                <span key={bucket.label} className="inline-flex items-center gap-1 text-slate-700">
                  <span className={`h-2 w-2 rounded-full ${bucket.dot}`} /> {bucket.label}:{bucket.count}
                </span>
              ))}
            </div>
          </div>
        )}
        
      </div>
      {showMinBanner && !showCreditSummary && (
          <div className="md:last:w-full rounded-lg py-1 text-center mt-4 tracking-wide bg-amber-100 text-dark-900">
          <span className="  px-3 py-1 text-md font-semibold uppercas">
            You need a minimum of {data.minCourseLimit} credits
          </span>
          </div>
        )}
      {
      notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${notice.tone === "error" ? "text-red-600" : notice.tone === "success" ? "text-emerald-700" : "text-slate-600"}`}
        >
          {notice.text}
        </p>
      )}

      <div className={`mt-4 grid gap-6 ${showAvailable ? "lg:grid-cols-[1fr_1.6fr]" : ""} ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
        <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">Your Selected Courses</h2>
            <div className="flex items-center gap-3">
              {!hideCredits && <span className="text-sm font-semibold text-primary">{data.totalCredit} Credit</span>}
              {canRemoveAll && (
                <button
                  type="button"
                  onClick={removeAll}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                  aria-label="Remove all courses"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>
          {selectedCourses.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">{selectedSummary(data)}</p>}
          {selectedCourses.length > 0 && (
            <ol className="space-y-2 p-3 md:space-y-0 md:divide-y md:divide-slate-100 md:p-0">
              {selectedCourses.map((course) => {
                const CourseIcon = categoryIcon(course.courseName);
                const singleUpgradeTarget = course.upgradeCourses?.length === 1 ? course.upgradeCourses[0] : null;
                return (
                  <li
                    key={course.courseId}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 shadow-sm md:rounded-none md:border-0 md:bg-transparent md:p-0 md:px-4 md:py-3 md:shadow-none"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f3ff] text-primary">
                      <CourseIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{course.courseName}</p>
                      {!hideCredits && <p className="text-xs text-slate-500">{course.creditScore} Credit</p>}
                      <CourseSummaryLink url={course.courseDescriptionUrl} />
                    </div>
                    {singleUpgradeTarget ? (
                      <VariantToggle course={course} target={singleUpgradeTarget} onToggle={upgrade} disabled={busy} />
                    ) : (
                      (course.upgradeCourses || []).map((target) => (
                        <Button
                          key={target.courseId}
                          type="button"
                          size="sm"
                          variant="outline"
                          title={upgradeHint(target.courseType)}
                          onClick={() => upgrade(course, target)}
                          disabled={busy}
                        >
                          {target.buttonLabel}
                          {course.courseTypeOriginal === "Regular" ? <ArrowUp /> : <ArrowDown />}
                        </Button>
                      ))
                    )}
                    {!fixed && course.courseMandatory === 1 && !batchOrProvider39 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <Lock className="h-3 w-3" /> Mandatory
                      </span>
                    )}
                    {!fixed && course.courseMandatory === 0 && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${course.courseName}`}
                        onClick={() => removeSubject(course)}
                        disabled={busy}
                      >
                        <Trash2 className="text-red-600" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {materialFee?.totalEntityFee > 0 && (
            <div className="border-t border-slate-200 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">External material fee</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                {(materialFee.description || []).map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
              <p className="mt-1">
                External material fee: <span className="font-semibold">{materialFee.totalEntityFeeString}</span>
              </p>
            </div>
          )}
        </section>

        {showAvailable && (
          <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Desktop/tablet header: title + search + recommended button inline. */}
            <header className="hidden flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:flex">
              <h2 className="text-sm font-bold text-slate-900">{data.totalCredit >= data.maxCourseLimit ? 'Select Extra Courses':'Select Courses'}</h2>
              <div className="flex flex-1 items-center gap-3 md:flex-none">
                <div className="relative flex-1 md:w-56 md:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for courses..."
                    className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-slate-900"
                  />
                </div>
                {data.eligibleForRecommendedCourse && (
                  <Button type="button" size="sm" onClick={openRecommended} disabled={busy} className="shrink-0 rounded-md bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Add recommended Courses
                  </Button>
                )}
              </div>
            </header>
            {/* Mobile header: title only — the recommended-courses button below
                is full-width instead, and there's no search box (matches the
                reference mobile design). */}
            <div className="border-b border-slate-200 px-4 py-3 md:hidden">
              <h2 className="text-sm font-bold text-slate-900">Choose Courses</h2>
            </div>
            {data.eligibleForRecommendedCourse && (
              <div className="px-4 pt-4 md:hidden">
                <Button type="button" onClick={openRecommended} disabled={busy} className="w-full rounded-md bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Add recommended Courses
                </Button>
              </div>
            )}
            {data.registrationType === "SCHOLARSHIP" && (
              <p className="px-4 pt-3 text-xs text-slate-500">Please note: live classes are not offered in this program.</p>
            )}
            {visibleCourses.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No courses match your search.</p>
            ) : (
              <>
                {/* Desktop/tablet: category sidebar + inline detail pane. */}
                <div className="hidden md:grid md:grid-cols-[190px_1fr] md:items-start">
                  <ul ref={sidebarRefCallback} className="suject-category">
                    {visibleCourses.map((course) => {
                      const CategoryIcon = categoryIcon(course.courseName);
                      const active = activeCourse?.courseId === course.courseId;
                      return (
                        <li key={course.courseId}>
                          <button
                            type="button"
                            onClick={() => setOpenCourseId(course.courseId)}
                            className={`flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium ${
                              active ? "bg-[#e6f3ff] text-primary" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <CategoryIcon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{course.courseName}</span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                active ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {course.subjects.length}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {activeCourse && (
                    <div
                      className="course-category border-l border-slate-200"
                      
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                        <span className="text-sm font-semibold text-primary">{activeCourse.courseName}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          {activeCourse.subjects.length} Courses <ChevronDown className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <div className="space-y-2 p-4" style={detailPaneHeight>250 ? { height: detailPaneHeight, overflowY: "auto" } : { maxHeight: "300px", overflowY: "auto" }}>
                        {activeCourse.courseDescription && <p className="text-xs text-slate-500">{activeCourse.courseDescription}</p>}
                        {activeCourse.subjects
                          .filter((subject) => !query || subject.subjectName?.toLowerCase().includes(query) || activeCourse.courseName?.toLowerCase().includes(query))
                          .map((subject) => {
                            const notes = subjectNotes(subject, data, showPaymentOption);
                            return (
                              <div key={subject.subjectId} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f3ff] text-primary">
                                  <BookOpen className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-900">{subject.subjectName}</p>
                                  {notes.length > 0 && (
                                    <ul className="mt-1 space-y-0.5 font-semibold text-xs text-primary">
                                      {notes.map((note, index) => (
                                        <li key={index}>• {note}</li>
                                      ))}
                                    </ul>
                                  )}
                                  <CourseSummaryLink url={subject.courseDescriptionUrl} />
                                </div>
                                {!hideCredits && (
                                  <div className="shrink-0 text-right text-xs text-slate-600">
                                    {data.showCourseFee === "Y" && (
                                      <p className="font-semibold text-slate-900">{subject.subjectPriceString}</p>
                                    )}
                                    <p>{subject.subjectCredit} credit</p>
                                  </div>
                                )}
                                <Button type="button" size="sm" onClick={() => addSubject(activeCourse, subject)} disabled={busy} className="rounded-md bg-primary hover:bg-primary/90">
                                  <Plus className="h-4 w-4" /> Add
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                {/* Mobile: flat, full-width category list — tapping one opens
                    CourseCategoryDialog below instead of an inline pane. */}
                <ul className="divide-y divide-slate-100 md:hidden">
                  {visibleCourses.map((course) => {
                    const CategoryIcon = categoryIcon(course.courseName);
                    return (
                      <li key={course.courseId}>
                        <button
                          type="button"
                          onClick={() => setOpenCourseId(course.courseId)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f3ff] text-primary">
                            <CategoryIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{course.courseName}</span>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-semibold text-slate-700">
                            {course.subjects.length}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        )}
      </div>

      {isMobile && (
        <CourseCategoryDialog
          course={mobileActiveCourse}
          onClose={() => setOpenCourseId(null)}
          selectedIds={selectedIds}
          data={data}
          showPaymentOption={showPaymentOption}
          busy={busy}
          onAddSubject={addSubject}
        />
      )}

      {paymentOption.isError && (
        <p className="mt-4 text-sm text-red-600">
          Could not load payment settings.{" "}
          <button type="button" className="font-semibold underline" onClick={() => paymentOption.refetch()}>
            Try again
          </button>
        </p>
      )}

      <div className="mt-10 flex flex-col-reverse items-center justify-center gap-4 pt-6 sm:flex-row">
        {/* <p className="text-xs text-slate-500">Your course choices are saved as you make them.</p> */}
        <MobileActionBar context={context}>
          {onBack && (
            <Button type="button" variant="outline" className="cursor-pointer" onClick={onBack} disabled={busy}>
              {inReview ? "Cancel" : "Back"}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNext}
            disabled={busy || !showPaymentOption}
            className="rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90"
          >
            {proceed.isPending ? "Please wait…" : inReview ? "Save" : "Next"}
          </Button>
        </MobileActionBar>
      </div>

      <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm} />
      <ChangeGradeDialog
        open={changeGradeOpen}
        onOpenChange={setChangeGradeOpen}
        grades={grades.data}
        courseProviderId={Number(data.courseProviderId)}
        initialStandardId={String(studentPrefill.data?.standardId ?? data.standardId ?? "")}
        initialDob={studentPrefill.data?.dob}
        busy={changeGrade.isPending || update.isPending}
        onSave={handleGradeChange}
      />
      {recommendedData && (
        <RecommendedCoursesDialog
          data={recommendedData}
          selectedIds={selectedIds}
          busy={update.isPending}
          onClose={() => setRecommendedData(null)}
          onConfirm={confirmRecommended}
        />
      )}
      <FlaggedSeatsModal
        open={!!flaggedModal}
        onOpenChange={(open) => !open && setFlaggedModal(null)}
        schoolName={context.schoolName}
        sessionName={flaggedModal?.sessionName}
      />
    </div>
  );
}
