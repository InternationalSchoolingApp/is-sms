"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calculator,
  Check,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { FaAngleRight, FaArrowDown, FaRegEyeSlash } from "react-icons/fa";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

function isSuccessResponse(response) {
  return String(response?.status) === STATUS_SUCCESS;
}

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
  if (count === 0) return "Select Courses from below";
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
    return "Advance courses have more assessments & assignments as compared to regular courses and contribute to a higher GPA.";
  }
  if (courseType === "HON") {
    return "Honors courses have more assessments & assignments as compared to regular courses and contribute to a higher GPA.";
  }
  return undefined;
}

// Drops a trailing "Honors"/"Advance(d)" from a course name. Only used where the
// variant already has its own control next to the name (the VariantToggle), so the
// name doesn't repeat what the toggle is already saying: "English II Honors" beside
// an on-state Honors toggle reads as "English II". A course with no toggle keeps its
// full name — there the suffix is the ONLY thing marking it as the Honors variant.
function stripVariantSuffix(name) {
  return String(name || "").replace(/\s+(?:honou?rs?|advanced?)$/i, "");
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
function getGradeBand(standardName, standardId) {
  const name = String(standardName || "").toLowerCase();
  if (/kindergarten|\bgrade\s*k\b|\bk\s*to\s*\d/.test(name)) return "elementary";
  const grade = name.match(/(?:grade\s*)?(\d{1,2})/);
  if (grade) {
    const value = Number(grade[1]);
    if (value <= 5) return "elementary";
    if (value <= 8) return "middle";
    if (value <= 12) return "high";
  }
  return hidesCourseCredits(standardId) ? "elementary" : "high";
}

function summarizeSelection(selectedCourses, gradeBand) {
  const counts = { Mandatory: 0, Electives: 0, Honors: 0, Advance: 0, AP: 0 };
  selectedCourses.forEach((course) => {
    if (course.courseMandatory === 1 || course.courseMandatory === "1") counts.Mandatory += 1;

    const category = String(course.courseCategory || "").toUpperCase();
    const courseType = String(course.courseTypeOriginal || "").toUpperCase();
    if (category === "ELECTIVES") counts.Electives += 1;

    const isAp = category === "ADVANCED PLACEMENT" || courseType === "ADVANCED PLACEMENT" || courseType === "AP";
    const isAdvance = /\bADV(?:ANCE|ANCED)?\b/.test(courseType) || category === "ADVANCE";
    if (isAp) {
      counts[gradeBand === "high" ? "AP" : "Advance"] += 1;
    } else if (isAdvance && gradeBand !== "high") counts.Advance += 1;
    else if (/\bHON(?:OR|ORS)?\b/.test(courseType) && gradeBand === "high") counts.Honors += 1;
  });
  const buckets = [
    { label: "Mandatory", count: counts.Mandatory, dot: "bg-emerald-500" },
    { label: "Electives", count: counts.Electives, dot: "bg-purple-500" },
  ];
  if (gradeBand === "high") {
    buckets.push(
      { label: "Honors", count: counts.Honors, dot: "bg-amber-500" },
      { label: "AP (college-level)", count: counts.AP, dot: "bg-indigo-700" },
    );
  } else buckets.push({ label: "Advance", count: counts.Advance, dot: "bg-indigo-700" });
  return buckets;
}

// CSS conic-gradient ring, no chart library needed.
function CreditProgressRing({ value, max, unit = "credits" }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--primary) ${pct * 3.6}deg, #dbeafe ${pct * 3.6}deg)` }}
      role="img"
      aria-label={`${value} of ${max} ${unit} selected`}
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
  // variant the course currently is. Width follows the label, so "Honors" and
  // "Advanced" both fit with the knob on the opposite side.
  const label = /adv/i.test(isTarget ? course.courseTypeOriginal : target.courseType) ? "Advance" : "Honors";
  const hint = upgradeHint(target.courseType);
  const toggleButton = (
    <button
      type="button"
      role="switch"
      aria-checked={isTarget}
      aria-label={target.buttonLabel || "Switch course variant"}
      onClick={() => onToggle(course, target)}
      disabled={disabled}
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-1 transition-colors disabled:opacity-50 ${
        isTarget ? "flex-row-reverse bg-primary text-white" : "bg-slate-300"
      }`}
    >
      {isTarget ?
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
        <Check className="h-3 w-3 text-[#3fa43c]" strokeWidth={5} />
      </span>:<span className="h-4 w-4 shrink-0 rounded-full bg-white shadow" />}

      <span className={`px-1 text-xs font-medium leading-none ${isTarget ? 'text-white':'text-black'}`}>{label}</span>
    </button>
  );
  return (
    <div className="flex shrink-0 items-center gap-2">
      {hint ? (
        <Tooltip>
          <TooltipTrigger delay={50} render={toggleButton} />
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      ) : (
        toggleButton
      )}
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
        <DialogHeader className="flex-row items-center gap-2 space-y-0  px-4 py-3">
          <CategoryIcon className="h-5 w-5 shrink-0 text-black" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold text-black">{course.courseName}</DialogTitle>
            <p className="text-xs text-slate-500">
              {course.subjects.length} course{course.subjects.length === 1 ? "" : "s"} available
            </p>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {course.subjects.map((subject) => {
            const id = String(subject.subjectId);
            const alreadySelected = selectedIds.includes(id);
            const notes = subjectNotes(subject, data, showPaymentOption);
            return (
              <div key={id} className="flex items-center gap-3 px-4 py-3">
                {/* <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg  text-black">
                  <BookOpen className="h-4 w-4" />
                </span> */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-black">{subject.subjectName}</p>
                  {/* {!hidesCourseCredits(data.standardId) && <p className="text-xs text-slate-500">{subject.subjectCredit} Credit</p>} */}
                  {data.showCourseFee === "Y" && (
                    <p className="text-xs font-semibold text-black">{subject.subjectPriceString}</p>
                  )}
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
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:p-4 lg:py-6 lg:px-8">
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

export function Stage3CourseSelection({ context, userId, standardId: initialStandardId, onNext, onBack, onSessionExpired, inReview = false }) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  // Starts from the prop (Stage 1's saved grade at mount — see the doc
  // comment above), but tracks its own state from here so an in-page grade
  // change (handleGradeChange below) can switch useCourseDetails to the new
  // grade's cache entry immediately, without waiting for this component to
  // remount with a fresh prop.
  const [standardId, setStandardId] = useState(initialStandardId);
  const courseQuery = useCourseDetails({ context, userId, standardId });
  const paymentOption = useShowPaymentOption({ context, userId });
  const update = useUpdateCourseSelection({ context, userId, standardId });
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

  const data = isSuccessResponse(courseQuery.data) ? courseQuery.data : null;
  const initialFailure = courseQuery.data && !isSuccessResponse(courseQuery.data) ? courseQuery.data : null;
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
      toast.error(GENERIC_ERROR);
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
    toast.error(response.categoryMandatoryMessage || response.message || fallback);
  }

  async function applyChange(change) {
    try {
      const response = await update.mutateAsync({ standardId: data.standardId, ...change });
      if (!isSuccessResponse(response)) {
        handleFailure(response, "Could not update your courses. Please try again.");
        return false;
      }
      // The backend's own "Course added"/"Course removed" message used to also render as an
      // inline banner under "Your Selected Courses" — redundant with the toast each caller
      // (addSubject/removeSubject/upgrade/removeAll) already shows, so it's dropped here.
      return true;
    } catch (err) {
      console.error("Stage3CourseSelection update failed:", err);
      toast.error(GENERIC_ERROR);
      return false;
    }
  }

  const selectedIds = parseIds(data?.selectedSubjectsAsString);

  async function addSubject(course, subject) {
    if (busy) return;
    const check = getCourseAddCheck(data);
    if (check.blockedMessage) {
      toast.error(check.blockedMessage);
      return;
    }
  if (check.extraFee && showPaymentOption === "Y") {
    const selectedCount = data.selectedSubjects?.length || 0;
    const confirmed = await ask({
      title: "Extra fee",
      message: (
        <>
          {!extraFeeNoticeShownRef.current && (
            <p>Any course you add after the first {selectedCount} course{selectedCount === 1 ? "" : "s"} will have an extra fee.</p>
          )}
          <p>{subject.subjectName} has an extra fee of {subject.courseFeeString}. Would you like to add it?</p>
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
        message: <p>This course does not offer live classes. Would you like to add this course?</p>,
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
    const removed = await applyChange({ selectedSubjects: "", controlType: "remove" });
    if (removed) toast.success("All courses removed");
  }

  async function upgrade(course, target) {
    debugger
    if (busy) return;
    if (target.warningMessage && showPaymentOption === "Y") {
      const variant = target.courseType === "ADV" ? "Advanced" : "Honors";
      const fee = target.additionalFeeString || target.courseFeeString || target.subjectPriceString ||
        target.warningMessage.match(/\$[\d,.]+/)?.[0] || "an additional fee";
      const confirmed = await ask({
        title: target.buttonLabel || "Change course",
        message: <p>{course.courseName} {variant} has an extra fee of {fee}. Would you like to switch to this course?</p>,
        confirmLabel: "Yes",
      });
      if (!confirmed) return;
    }
    // Substitute the variant IN PLACE rather than dropping the old id and appending
    // the new one: the backend renders "Your Selected Courses" in exactly the order
    // of this CSV (getOrderedSubjects' `ORDER BY FIELD(SUBJECT_ID, ...)`, then
    // CTECourseUtil.reorderSelectedCourses), so appending made a course jump to the
    // bottom of the list the moment its Honors/Advanced toggle was flipped.
    const upgradedIds = selectedIds.map((id) => (id === String(course.courseId) ? String(target.courseId) : id));
    // The current course should always be in the selected list, but don't silently
    // drop the upgrade if it somehow isn't.
    if (!upgradedIds.includes(String(target.courseId))) upgradedIds.push(String(target.courseId));
    const switched = await applyChange({
      selectedSubjects: upgradedIds.join(","),
      controlType: "add",
      courseId: course.categoryId,
    });
    if (switched) {
      // Names the actual resulting subject (e.g. "English I Honors added" / "English I added"),
      // not a generic "Switch to Honors"/"Switch to Regular" — course.courseName is the subject's
      // own display name (e.g. "English I"), and courseTypeOriginal === "Regular" means this
      // upgrade is switching TO the alternate (Honors/Advanced) variant named by target.courseType.
      const currentType = String(course.courseTypeOriginal || "").toUpperCase();
      const targetType = String(target.courseType || "").toUpperCase();
      const subjectName = stripVariantSuffix(course.courseName);
      // const variantSuffix = currentType === "REGULAR" ? /ADV|ADVANCED/.test(targetType) ? " Advanced" : /HON|HONORS/.test(targetType) ? " Honors" : "" : "";
      const variantSuffix = (() => {
        if (currentType === "REGULAR") {
          if (/ADV|ADVANCED/.test(targetType)) {
            return " Advanced";
          } else if (/HON|HONORS/.test(targetType)) {
            return " Honors";
          }
        }else if(currentType == "HONORS" || currentType == "ADVANCED"){
          if (/FT|REGULAR/.test(targetType)) {
            return " Regular";
          }
        }else{
          return "";
        }
      })();
      if (/FT|REGULAR/.test(targetType)) {
        toast.success(`Switched back to ${subjectName}`);
      }else{
        toast.success(`${subjectName}${variantSuffix} added`);
      }
    }
  }

  async function handleGradeChange(newStandardId, newDob) {
    try {
      const fields = { ...(studentPrefill.data || {}), standardId: newStandardId, dob: newDob };
      const saveResponse = await changeGrade.mutateAsync(fields);
      if (!isSuccessResponse(saveResponse)) {
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
      // Switch useCourseDetails to the new grade's cache entry before the
      // mutation below writes its response there (useCourseSelection.js's
      // courseDetailsKey is keyed by standardId) — otherwise the write lands
      // on a cache entry this component isn't subscribed to.
      setStandardId(newStandardId);
      const courseResponse = await update.mutateAsync({
        standardId: newStandardId,
        cacheStandardId: newStandardId,
        selectedSubjects: "",
        controlType: "remove",
      });
      if (!isSuccessResponse(courseResponse)) {
        handleFailure(courseResponse, "Grade saved, but could not refresh courses for it. Please try again.");
      }
    } catch (err) {
      console.error("Stage3CourseSelection change-grade failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  async function openRecommended() {
    if (busy) return;
    try {
      const response = await recommended.mutateAsync();
      if (!isSuccessResponse(response)) {
        handleFailure(response, "Could not load recommended courses.");
        return;
      }
      setRecommendedData(response);
    } catch (err) {
      console.error("Stage3CourseSelection recommended-courses failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  async function confirmRecommended(ids) {
    apAcknowledgedRef.current = false;
    const saved = await applyChange({ selectedSubjects: ids.join(","), controlType: "add" });
    if (saved) {
      setRecommendedData(null);
      toast.success("Recommended courses added");
    }
  }

  async function handleNext() {
    if (busy) return;
    const creditError = validateCourseCredits(data);
    if (creditError) {
      toast.error(creditError);
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
      toast.error(GENERIC_ERROR);
    }
  }

  const header = inReview ? null : (
    <>
      {/* Program name is now shown by EnrollmentWizardShell's own hero above this card. */}
      <h2 className="text-center text-xl font-bold text-black md:text-2xl">
        <span className="inline">Course Selection</span>
      </h2>
    </>
  );

  if (courseQuery.isLoading) {
    return <Stage3Skeleton header={header} />;
  }
  console.log("data", data)
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
  // Same rule handleNext() enforces on click (validateCourseCredits: selected
  // credit/course total >= minCourseLimit, and under upperBandLimit when set)
  // — reused here purely for the Next button's dim/highlight styling. The
  // button stays clickable either way (not `disabled`): clicking it while dim
  // still runs handleNext(), which shows the same validation toast.
  const creditRequirementMet = !validateCourseCredits(data);
  const hideCredits = hidesCourseCredits(data.standardId);
  const gradeBand = getGradeBand(data.standardName, data.standardId);
  const showCourseCredits = gradeBand === "high";
  const showCourseRequirement = gradeBand === "middle";
  const batchOrProvider39 = data.registrationType === "BATCH" || Number(data.courseProviderId) === 39;
  const selectedCourses = data.selectedSubjects || [];
  const mandatoryCount = selectedCourses.filter((course) => course.courseMandatory === 1).length;
  const canRemoveAll = !fixed && selectedCourses.length > mandatoryCount;
  const availableCourses = (data.availableCourses || []).filter((course) => course.subjects?.length > 0);
  const showAvailable = !fixed && availableCourses.length > 0;
  const effectiveOpenId = openCourseId ?? availableCourses[0]?.courseId;
  const showMinBanner = Number(data.courseProviderId) !== 39 && Number(data.minCourseLimit) > Number(data.totalCredit);
  const showCreditSummary = showCourseCredits && !batchOrProvider39 && Number(data.minCourseLimit) > 0;
  const showCourseCountSummary = showCourseRequirement && !batchOrProvider39;
  const centerGradeHeader = !showCreditSummary && !showCourseCountSummary && (fixed || batchOrProvider39);
  const summaryBuckets = summarizeSelection(selectedCourses, gradeBand);
  const selectedCourseCount = selectedCourses.length;
  const courseCountTarget = Number(data.maxCourseLimit) || 6;
  const displayCourseCountTarget = Math.max(courseCountTarget, selectedCourseCount);
  const minCourseCount = Number(data.minCourseLimit) || 0;
  const remainingCourses = Math.max(0, minCourseCount - selectedCourseCount);
  const extraCourseCount = Math.max(0, selectedCourseCount - minCourseCount);
  const courseMinMet = minCourseCount > 0 && selectedCourseCount >= minCourseCount;
  const courseProgressSegments = Math.max(minCourseCount, selectedCourseCount, 1);

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
    <>
      {/* Mobile-only: the grade chip sits outside/above the white card per
          the mobile reference design — not inside it like desktop/tablet. */}
      {data.standardName && (
        <div className={`mt-2 flex items-center gap-3 rounded-sm pl-3 justify-center md:hidden`}>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-black">
            <GraduationCap className="h-5 w-5 text-primary" />
            {data.standardName}
          </span>
          <button
            type="button"
            onClick={() => setChangeGradeOpen(true)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            Change <RefreshCw className="h-3.5 w-3.5 stroke-3" />
          </button>
        </div>
      )}
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      {header}

      

      {/* Desktop/tablet: the full summary card (grade chip, credits
          requirement, progress ring, Selection Summary legend) — untouched. */}
      <div className={`hidden gap-1 rounded-2xl ${gradeBand === "elementary" || centerGradeHeader ? "mx-auto md:pt-2" : "mt-4 border border-slate-200 bg-white p-4 shadow-sm md:p-5"} md:flex md:flex-row md:flex-wrap md:items-center md:gap-8`}>
        {data.standardName && (
          <div className={`flex items-center gap-2 rounded-lg py-2 px-3 bg-[#e6f3ff] ${gradeBand === "elementary" || centerGradeHeader ? "mx-auto" : "flex-1"}`}>
            <span className="inline-flex items-center gap-2  text-sm font-semibold text-black">
              <GraduationCap className="h-5 w-5 text-primary" />
              {data.standardName}
            </span>
            <button
              type="button"
              onClick={() => setChangeGradeOpen(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 ml-auto rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              Change Grade <RefreshCw className="h-3.5 w-3.5 stroke-3" />
            </button>
          </div>
        )}

        {(showCreditSummary || showCourseCountSummary) && (
          <div className="flex items-center gap-2 justify-center border-slate-300 flex-1 sm:border-l sm:pl-8">
            
            <div>
              <div className="flex">
                <p className="text-xs text-black">You need to select</p>
              </div>
              <p className="text-sm font-bold text-black">
                at least {data.minCourseLimit} courses
              </p>
            </div>
          </div>
        )}

        {showCourseCountSummary && (
          <div className="flex items-center gap-3 border-slate-300 flex-1 sm:border-l sm:px-8">
            <CreditProgressRing value={selectedCourseCount} max={displayCourseCountTarget} unit="courses" />
            <div>
              <p className="text-xl font-bold text-primary">{selectedCourseCount}/{displayCourseCountTarget}</p>
              <p className="text-sm font-bold text-black">Courses Selected</p>
            </div>
          </div>
        )}

        {showCreditSummary && (
          <div className="hidden items-center gap-3 border-slate-300 sm:border-l sm:px-8 md:flex">
            {/* Once extra (over-the-minimum) courses are selected, the denominator should track
                what's actually been picked (e.g. 8/8), not stay pinned at the original minimum
                (8/6) — the ring and the fraction below both use this same adjusted max. */}
            <CreditProgressRing
              value={selectedCourseCount}
              max={Math.max(Number(data.minCourseLimit) || 1, selectedCourseCount)}
              unit="courses"
            />
            <div>
              <p className="text-xl font-bold text-primary">
                {selectedCourseCount}/{Math.max(Number(data.minCourseLimit) || 0, selectedCourseCount)}
              </p>
              <p className="text-sm font-bold text-black">Courses Selected</p>
            </div>
          </div>
        )}

        {/* {!fixed && !batchOrProvider39 && (
          <div className={`hidden bg-[#e6f3ff] rounded-lg xl:ml-2 py-4 ${showCourseCountSummary || !(showMinBanner && !showCreditSummary) ? "flex-1" : ""} sm:px-3 md:block`}>
            <p className="text-sm text-black font-bold">Selection Summary</p>
            <div className={`mt-1 flex flex-wrap gap-y-1 text-xs ${showCourseCountSummary ? "justify-between gap-x-6" : "gap-x-3"}`}>
              {summaryBuckets.map((bucket) => (
                <span key={bucket.label} className="inline-flex items-center gap-1 text-black">
                  <span className={`h-2 w-2 rounded-full ${bucket.dot}`} /> {bucket.label}: <span className="font-bold">{bucket.count}</span>
                </span>
              ))}
            </div>
          </div>
        )} */}
        
      </div>
      {showMinBanner && !showCreditSummary && gradeBand === "high" && (
          <div className="md:last:w-full rounded-lg py-1 text-center mt-4 tracking-wide bg-amber-100 text-dark-900">
          <span className="  px-3 py-1 text-md font-semibold uppercas">
            You need a minimum of {data.minCourseLimit} credits
          </span>
          </div>
        )}

      <div className={`mt-2 grid gap-6 ${showAvailable ? "lg:grid-cols-[1fr_1.6fr]" : ""} ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
        <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className={`items-center gap-3 border-b border-slate-200 px-4 py-3 w-full ${(showCreditSummary || showCourseCountSummary) ? "hidden md:flex" : "flex md:justify-start justify-center"}`}>
            <h2 className="text-sm font-bold text-black">
              {showCourseCountSummary || showCourseCredits ? (
                <>
                  <span className="md:hidden">Selected Courses: <span className="text-primary">{selectedCourseCount}/{displayCourseCountTarget} courses</span></span>
                  <span className="hidden md:inline">Selected Courses</span>
                </>
              ) : <><div className="text-center md:text-center w-full">Your <span className="text-primary">{selectedCourseCount}</span> Selected Courses</div></>}
            </h2>
            
              {canRemoveAll && (
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={removeAll}
                    disabled={busy}
                    className="inline-flex items-center gap-1 cursor-pointer text-xs font-semibold rounded-xl px-4 py-1 border border-red-600 text-red-600 hover:text-red-700"
                    aria-label="Remove all courses"
                  >
                    All <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            
          </header>
          {/* Mobile-only: plain "Credits Requirement" banner from the mobile
          reference design — no card border, no progress ring, no Selection
          Summary legend. */}
          <div className="mt-0 space-y-2 md:hidden">
            {(showCreditSummary || showCourseCountSummary) && (
              <div className="rounded rounded-bl-none rounded-br-none bg-primary px-4 py-3.5 text-white">
                <div className="flex items-center gap-3 justify-center">
                  {courseMinMet ? (
                    <span className="inline-flex flex-1 items-center gap-2 text-sm font-bold justify-center ml-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
                        <Check className="h-3 w-3 text-[#3fa43c]" strokeWidth={5} />
                      </span>
                      {selectedCourseCount} courses selected
                    </span>
                  ) : (
                    <span className="inline-flex flex-1 ml-4 justify-center items-center gap-2 text-sm font-bold">Select at least {minCourseCount} courses</span>
                  )}
                  {canRemoveAll && (
                    <button
                      type="button"
                      onClick={removeAll}
                      disabled={busy}
                      className={`inline-flex shrink-0 ml-auto items-center gap-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-60 ${
                        courseMinMet ? "px-3 py-0.5" : "px-3 py-1.5 text-xs font-semibold"
                      }`}
                      aria-label="Remove all courses"
                    > All
                      <Trash2 className="h-4 w-4" />
                      
                      {/* {!courseMinMet && "Clear all"} */}
                    </button>
                  )}
                </div>

                <div className="mt-2.5 flex gap-1">
                  {Array.from({ length: courseProgressSegments }).map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${
                        index >= selectedCourseCount
                          ? "bg-white/30"
                          : index < minCourseCount
                          ? courseMinMet
                            ? "bg-[#3fa43c]"
                            : "bg-white"
                          : "bg-orange-400"
                      }`}
                    />
                  ))}
                </div>

                {!courseMinMet ? (
                  <div className="mt-2.5 flex items-center justify-center gap-3">
                    <span className="text-xs font-bold  text-white/90">{selectedCourseCount} selected</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary">{remainingCourses} more needed</span>
                  </div>
                ) : extraCourseCount > 0 ? (
                  <p className="mt-2 text-xs text-white/90 text-center font-bold">
                    {data.minCourseLimit} selected · {extraCourseCount} extra course{extraCourseCount === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            )}

            {/* {showMinBanner && !showCreditSummary && (
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                You need a minimum of {data.minCourseLimit} credits
              </span>
            )} */}
          </div>
          {selectedCourses.length === 0 && (<p className={`px-4 py-6 text-sm text-black flex items-center ${selectedCourses.length === 0 ? `justify-center` : ``}`}>{selectedCourses.length === 0 ?  <><span className="hidden md:flex">No Course Selected</span><span className="md:hidden flex-1 text-center inline-flex items-center justify-center">{selectedSummary(data)} <FaArrowDown className="ml-2" /></span></> : <>{selectedSummary(data)} <FaArrowDown className="ml-2" /></>} </p>)}
          {selectedCourses.length > 0 && (
            <>
              {/* Mobile-only (<768px): compact list matching the reference
                  mobile design — M badge / trash icon top-right of each row,
                  the upgrade toggle (or buttons) underneath the course name,
                  row dividers instead of per-row card backgrounds. Desktop
                  keeps the existing card-style rows below, untouched. */}
              {!fixed && (selectedCourses.some((course) => course.courseMandatory === 1) || selectedCourses.some((course) => (course.upgradeCourses || []).length > 0)) && (
                <p className="p-1 bg-blue-50 text-center text-[10px] leading-relaxed sm:text-xs text-black md:hidden">
                  Tap &quot;<b className="font-bold">{gradeBand === "high" ? "Honors" : "Advance"}</b>&quot; to upgrade
                  {data.registrationType !== "BATCH" && gradeBand !== "elementary" && (
                    <>
                      {" "}|{" "}
                      <span className="inline-flex items-center gap-1.5 align-middle font-medium text-black">
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#3fa43c] text-[10px] font-bold text-white">F</span>
                        Fixed
                      </span>
                    </>
                  )}
                </p>
              )}
              <ol className="divide-y divide-slate-100 md:hidden">
                {selectedCourses.map((course, index) => {
                  const singleUpgradeTarget = course.upgradeCourses?.length === 1 ? course.upgradeCourses[0] : null;
                  return (
                    <li key={course.courseId} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#e6f3ff] text-xs font-semibold text-primary">
                            {index + 1}
                          </span>
                          <p className="text-sm font-medium text-black course_name">
                            {singleUpgradeTarget ? stripVariantSuffix(course.courseName) : course.courseName}
                          </p>
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
                        </div>
                        <CourseSummaryLink url={course.courseDescriptionUrl} />
                      </div>
                      <div className="flex shrink-0 items-center">
                        {!fixed && course.courseMandatory === 1 && data.registrationType !== "BATCH" && gradeBand !== "elementary" && (
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-[#3fa43c] text-[11px] font-bold text-white">
                            M
                          </span>
                        )}
                        {!fixed && course.courseMandatory === 0 && (
                          <button
                            type="button"
                            onClick={() => removeSubject(course)}
                            disabled={busy}
                            className="inline-flex items-center cursor-pointer text-red-600 hover:text-red-700"
                            aria-label="Remove course"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            <ol className="hidden md:block md:divide-y md:divide-slate-100">
              {selectedCourses.map((course, index) => {
                const CourseIcon = categoryIcon(course.courseName);
                const singleUpgradeTarget = course.upgradeCourses?.length === 1 ? course.upgradeCourses[0] : null;
                return (
                  <li key={course.courseId} className={`flex flex-col ${!fixed && course.courseMandatory === 1 && !batchOrProvider39 ? 'gap-3' : ''} rounded-md border border-slate-100 bg-blue-50 px-3 py-1.5 shadow-sm sm:flex-row sm:flex-wrap sm:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0 md:px-4 md:py-3 md:shadow-none`}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center text-sm justify-center rounded bg-[#e6f3ff] text-primary">
                        {index + 1}
                      </span>

                      <div className="min-w-0 inline-flex flex-1">
                        <div className="text-sm inline-flex font-medium text-black items-center">
                          <span> {singleUpgradeTarget ? stripVariantSuffix(course.courseName) : course.courseName}</span> 

                          <div className="flex shrink-0 ml-2 flex-1 items-center mr-auto gap-2">
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
                          </div>
                        </div>

                        {/* {showCourseCredits && <p className="text-xs text-slate-500">{course.creditScore} Credit</p>} */}
                        <CourseSummaryLink url={course.courseDescriptionUrl} />
                      </div>
                      {/* Mobile-only: the Advance/Honors toggle sits beside the
                          course name here; on sm+ it moves down into the badges
                          row below (same toggle, just hidden on the other breakpoint). */}
                      
                      {!fixed && course.courseMandatory === 0 && (
                        <button
                          type="button"
                          onClick={() => removeSubject(course)}
                          disabled={busy}
                          className="inline-flex sm:hidden items-center cursor-pointer gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                          aria-label="Remove all courses"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:pl-0">
                      {/* <div className="hidden items-center gap-2">
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
                      </div> */}
                      {!fixed && course.courseMandatory === 1 && !batchOrProvider39 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-100 px-2 py-1 text-xs font-semibold text-emerald">
                          <Lock className="h-3 w-3" /> Mandatory
                        </span>
                      )}
                      {!fixed && course.courseMandatory === 0 && (
                        <button
                          type="button"
                          onClick={() => removeSubject(course)}
                          disabled={busy}
                          className="hidden sm:inline-flex items-center cursor-pointer gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                          aria-label="Remove all courses"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            </>
          )}
        </section>

        {showAvailable && (
          <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
            {/* Desktop/tablet header: title + search + recommended button inline. */}
            <header className="hidden flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:flex">
              <div>
                <h2 className="text-sm font-bold text-black">
                  {data.totalCredit >= data.maxCourseLimit
                    ? "Select Extra Courses"
                    : "Select Your Courses Below"}

                  <span className="text-primary">{data.totalCredit >= data.maxCourseLimit ? ``: ` · ${remainingCourses} more needed`}</span>
                </h2>
                {(showCreditSummary || showCourseCountSummary) && remainingCourses > 0 && (
                  <p className="text-xs font-medium text-primary"></p>
                )}
              </div>
              <div className="flex flex-1 items-center gap-3 md:flex-none">
                <div className="relative flex-1 md:w-56 md:flex-none">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for courses..."
                    className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                {/* {data.eligibleForRecommendedCourse && (
                  <Button type="button" size="sm" onClick={openRecommended} disabled={busy} className="shrink-0 rounded-md bg-primary hover:bg-primary/90">
                    <FaRegEyeSlash  className="h-4 w-4" /> View Our Recommendations
                  </Button>
                )} */}
              </div>
            </header>
            {/* Mobile header: title only — the recommended-courses button below
                is full-width instead, and there's no search box (matches the
                reference mobile design). */}
            <div className="border-b border-slate-200 px-4 py-3 md:hidden">
              <h2 className="text-sm font-bold text-black text-center">{data.totalCredit >= data.maxCourseLimit ? 'Select Extra Courses':'Select Your Courses Below'}</h2>
            </div>
            {/* {data.eligibleForRecommendedCourse && (
              <div className="px-4 pt-4 md:hidden">
                <Button
                  type="button"
                  onClick={openRecommended}
                  disabled={busy}
                  className="h-auto w-full whitespace-normal rounded-md bg-primary py-2 text-center leading-snug hover:bg-primary/90"
                >
                  <FaRegEyeSlash className="h-4 w-4 shrink-0 stroke-3" /> View Our Recommendations
                </Button>
              </div>
            )} */}
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
                            <Tooltip>
                              <TooltipTrigger delay={100} render={<span className="min-w-0 flex-1 truncate text-left" />}>
                                {course.courseName}
                              </TooltipTrigger>
                              <TooltipContent>{course.courseName}</TooltipContent>
                            </Tooltip>
                            <span
                              title={`${course.subjects.length} course${course.subjects.length === 1 ? "" : "s"} available`}
                              aria-label={`${course.subjects.length} course${course.subjects.length === 1 ? "" : "s"} available`}
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
                          {activeCourse.subjects.length} course{activeCourse.subjects.length === 1 ? "" : "s"} available <ChevronDown className="h-3.5 w-3.5" />
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
                                  <p className="text-sm font-medium text-black subject_name">{subject.subjectName}</p>
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
                                      <p className="font-semibold text-black">{subject.subjectPriceString}</p>
                                    )}
                                    {/* <p>{subject.subjectCredit} credit</p> */}
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
                <ul className="divide-y divide-slate-100 p-2 md:hidden">
                  {visibleCourses.map((course) => {
                    const CategoryIcon = categoryIcon(course.courseName);
                    return (
                      <li key={course.courseId} className="mb-1">
                        <button
                          type="button"
                          onClick={() => setOpenCourseId(course.courseId)}
                          className="flex shadow-sm w-full items-center space-x-3 px-4 py-3 text-left border rounded-lg text-sm font-medium text-slate-700"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e6f3ff] text-primary">
                            <CategoryIcon className="h-4 w-4" />
                          </span>
                          <div className="flex-1 flex-col flex">
                            <span className="min-w-0 flex-1 truncate text-black">{course.courseName}</span>
                            <span className="px-2 w-fit shrink-0 items-center justify-center rounded-full border border-black-300 bg-white text-[11px] font-semibold text-black">
                              {course.subjects.length} {course.subjects.length>1?'Courses':'Course'} available
                            </span>
                          </div>
                          <span className="inline-flex px-2 cursor py-1 rounded-md bg-primary text-white text-xs"><Plus className="h-4 w-4" /> Add</span>
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
            className={`rounded-md cursor-pointer bg-primary px-4 hover:bg-primary/90 ${creditRequirementMet ? "" : "opacity-50"}`}
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
    </>
  );
}
