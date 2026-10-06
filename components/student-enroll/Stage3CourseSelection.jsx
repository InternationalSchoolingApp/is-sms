"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
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
  useLocalCourseUpdate,
  useUpdateCourseSelection,
} from "@/hooks/useCourseSelection";
import { useGradeOptions, useCountryOptions, useStudentDetailsPrefill, useStudentDetailsSignup } from "@/hooks/useStudentDetailsSignup";
import { getCourseAddCheck, hidesCourseCredits, validateCourseCredits } from "@/utils/studentSignupValidation";
import { getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
import { saveWizardStudentFields } from "@/utils/wizardStorage";

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
    return "Advance courses have more assessments & assignments as compared to regular courses and contribute to a higher GPA.";
  }
  if (courseType === "HON") {
    return "Honors courses have more assessments & assignments as compared to regular courses and contribute to a higher GPA.";
  }
  return undefined;
}

// Drops a trailing "Honors"/"Advance(d)" from a course name. Only used where the
// variant already has its own control next to the name (the VariantToggle, or the
// arrow buttons when there's more than one alternate), so the name doesn't repeat
// what that control is already saying: "English II Honors" beside an on-state Honors
// toggle reads as "English II". A course with NO variant control keeps its full name
// — there the suffix is the only thing marking it as the Honors variant.
// A category whose courses are ALL already selected has an addable count of zero
// (counts stay addable-only by design), and "0 courses available" reads as if the
// category were empty when it's really full. Name that state instead.
function addableCountLabel(count) {
  if (count === 0) return "All selected";
  return `${count} course${count === 1 ? "" : "s"} available`;
}

// A ticked row in the "choose courses" pane can be removed from there as well as
// from the selected list — EXCEPT when the course is mandatory, which has no remove
// control anywhere (the selected list hides its trash icon on the same condition).
// `selectedCourse` is the original CourseDTO, which is what removeSubject() needs.
/**
 * Optimistic add/remove: a pure prev -> next on the cached course page, applied by
 * useUpdateCourseSelection's onMutate so the click paints immediately and rolled
 * back by it if the server rejects the change.
 *
 * These model LIST MEMBERSHIP and the credit total only — the two things the screen
 * derives everything visible from (selected list, the tick/Add state of every row,
 * the counts, the progress ring, the Selection Summary buckets). Fee breakdowns and
 * the backend's own limit messages are NOT recomputed here; they refresh a beat
 * later when the real response replaces the page.
 */
function optimisticAdd(courseData, category, subject) {
  const id = String(subject.subjectId);
  const ids = parseIds(courseData.selectedSubjectsAsString);
  if (ids.includes(id)) return courseData;
  const credit = Number(subject.subjectCredit) || 0;
  // Shaped like a CourseDTO, because that's what the selected list reads.
  // upgradeCourses is left empty: whether this subject has a Honors/Advanced
  // sibling is the server's answer, and guessing it would flash a toggle that
  // might then vanish.
  const entry = {
    courseId: subject.subjectId,
    categoryId: category.courseId,
    courseName: subject.subjectName,
    courseCategory: category.courseName,
    courseMandatory: subject.courseMandatory === 1 || subject.isMandatorySubject === true ? 1 : 0,
    courseType: subject.courseType,
    courseTypeOriginal: subject.courseType,
    creditScore: subject.subjectCredit,
    creditScoreFloat: credit,
    coursePriceSelectedString: subject.subjectPriceString,
    courseDescriptionUrl: subject.courseDescriptionUrl,
    upgradeCourses: [],
  };
  return {
    ...courseData,
    selectedSubjectsAsString: [...ids, id].join(","),
    selectedSubjects: [...(courseData.selectedSubjects || []), entry],
    totalCredit: Number(courseData.totalCredit || 0) + credit,
  };
}

function optimisticRemove(courseData, selectedCourse) {
  const id = String(selectedCourse.courseId);
  const credit = Number(selectedCourse.creditScoreFloat ?? selectedCourse.creditScore) || 0;
  // The server strips selected subjects out of availableCourses, so a course
  // selected at page load has no addable record to fall back to. Put one back,
  // or removing it would blank the row until the response lands instead of
  // flipping it to "+ Add". A course added earlier in this session is still in
  // that list, hence the contains check.
  const categoryId = String(selectedCourse.categoryId);
  const availableCourses = (courseData.availableCourses || []).map((category) => {
    if (String(category.courseId) !== categoryId) return category;
    const subjects = category.subjects || [];
    if (subjects.some((subject) => String(subject.subjectId) === id)) return category;
    return {
      ...category,
      subjects: [
        ...subjects,
        {
          subjectId: selectedCourse.courseId,
          subjectName: selectedCourse.courseName,
          subjectPriceString: selectedCourse.coursePriceSelectedString,
          subjectCredit: credit,
          courseType: selectedCourse.courseType,
          courseDescriptionUrl: selectedCourse.courseDescriptionUrl,
        },
      ],
    };
  });
  return {
    ...courseData,
    availableCourses,
    selectedSubjectsAsString: parseIds(courseData.selectedSubjectsAsString).filter((x) => x !== id).join(","),
    selectedSubjects: (courseData.selectedSubjects || []).filter((course) => String(course.courseId) !== id),
    totalCredit: Math.max(0, Number(courseData.totalCredit || 0) - credit),
  };
}

// A selected CourseDTO's `courseType` is overwritten with Compulsory/Optional, so
// the variant has to come back out of `courseTypeOriginal`.
function variantTypeCode(courseTypeOriginal) {
  const name = String(courseTypeOriginal || "");
  if (/hon/i.test(name)) return "HON";
  if (/adv/i.test(name)) return "ADV";
  return "FT";
}

/**
 * Describes `course` as an upgrade target, so that after switching away from it the
 * student can switch back. Shaped like the CourseWithSameParentDTO the server sends.
 */
function variantReturnTarget(course, target) {
  const courseType = variantTypeCode(course.courseTypeOriginal);
  const isRegular = courseType === "FT";
  const hasFee = Number(course.additionalFee) > 0;
  return {
    courseId: course.courseId,
    categoryId: course.categoryId,
    courseName: course.courseName,
    courseType,
    courseTypeOriginal: course.courseTypeOriginal,
    courseCode: course.courseCode,
    creditScore: course.creditScore,
    creditScoreFloat: course.creditScoreFloat,
    courseMandatory: course.courseMandatory,
    courseDescriptionUrl: course.courseDescriptionUrl,
    additionalFee: course.additionalFee,
    additionalFeeString: course.additionalFeeString,
    buttonLabel: isRegular ? "Switch to Regular" : `Choose ${course.courseTypeOriginal}`,
    // upgrade() only raises the fee confirmation when this is non-empty, and dropping
    // back to the Regular variant never adds a fee — matching the server, which sends
    // an empty warning on exactly that direction.
    warningMessage:
      isRegular || !hasFee
        ? ""
        : `You are about to choose ${course.courseTypeOriginal} version of ${course.courseName}. An additional ${course.additionalFeeString} will be added to your Course Fee. Kindly confirm this selection`,
    // Lets the NEXT toggle restore this exact target object — fee wording included —
    // rather than rebuilding it from a selected course that no longer carries it.
    restoreTarget: target,
  };
}

/**
 * Honors/Advance switch, applied locally. Swaps the course for its sibling variant
 * IN PLACE (same list position, same CSV position) and hands the new entry an
 * upgradeCourses list pointing back at the variant just left, so the toggle keeps
 * working without a server round trip.
 */
function optimisticUpgrade(courseData, course, target) {
  const fromId = String(course.courseId);
  const toId = String(target.courseId);
  const selected = courseData.selectedSubjects || [];
  const index = selected.findIndex((entry) => String(entry.courseId) === fromId);
  if (index === -1) return courseData;
  const back = target.restoreTarget || variantReturnTarget(course, target);
  const swapped = {
    ...course,
    courseId: target.courseId,
    categoryId: target.categoryId ?? course.categoryId,
    courseName: target.courseName ?? course.courseName,
    // courseType stays as-is: on a selected course it holds Compulsory/Optional,
    // which describes the slot and doesn't change with the variant.
    courseTypeOriginal: target.courseTypeOriginal,
    courseCode: target.courseCode ?? course.courseCode,
    creditScore: target.creditScore ?? course.creditScore,
    creditScoreFloat: target.creditScoreFloat ?? course.creditScoreFloat,
    additionalFee: target.additionalFee,
    additionalFeeString: target.additionalFeeString,
    courseDescriptionUrl: target.courseDescriptionUrl ?? course.courseDescriptionUrl,
    upgradeCourses: [
      ...(course.upgradeCourses || []).filter((entry) => String(entry.courseId) !== toId),
      { ...back, restoreTarget: target },
    ],
  };
  const selectedSubjects = [...selected];
  selectedSubjects[index] = swapped;
  const creditDelta = (Number(target.creditScoreFloat) || 0) - (Number(course.creditScoreFloat) || 0);
  return {
    ...courseData,
    selectedSubjects,
    selectedSubjectsAsString: parseIds(courseData.selectedSubjectsAsString)
      .map((id) => (id === fromId ? toId : id))
      .join(","),
    totalCredit: Math.max(0, Number(courseData.totalCredit || 0) + creditDelta),
  };
}

/**
 * "Remove all", applied locally. Mandatory courses stay: sending an empty selection
 * makes the backend re-populate the compulsory subjects for the grade
 * (CTECourseUtil, getCompulsarySubjectsByStandardId), so clearing them here would
 * just diverge from whatever the eventual save comes back with.
 *
 * Folding optimisticRemove over each course reuses its addable-restore and credit
 * bookkeeping rather than duplicating it.
 */
function optimisticRemoveAll(courseData) {
  return (courseData.selectedSubjects || [])
    .filter((course) => course.courseMandatory !== 1)
    .reduce((next, course) => optimisticRemove(next, course), courseData);
}

/**
 * Confirming the recommended-courses dialog, applied locally. That dialog REPLACES
 * the selection outright (see its own note), so this drops whatever isn't in the
 * confirmed set and adds whatever is missing.
 *
 * New courses are built from the catalogue entry in availableCourses where possible,
 * since RecommendedCourseDTO carries no category, price band or description URL. A
 * recommendation with no catalogue match still joins the selected list, but can't be
 * filed under a category in the right-hand pane until the next save refreshes it.
 */
function optimisticApplyRecommended(courseData, ids, recommendedCourses = []) {
  const wanted = ids.map(String);
  const wantedSet = new Set(wanted);
  let next = (courseData.selectedSubjects || [])
    .filter((course) => !wantedSet.has(String(course.courseId)))
    .reduce((acc, course) => optimisticRemove(acc, course), courseData);

  const catalogue = new Map();
  for (const category of next.availableCourses || []) {
    for (const subject of category.subjects || []) {
      catalogue.set(String(subject.subjectId), { category, subject });
    }
  }
  const recommended = new Map(recommendedCourses.map((course) => [String(course.subjectId), course]));

  for (const id of wanted) {
    if (parseIds(next.selectedSubjectsAsString).includes(id)) continue;
    const match = catalogue.get(id);
    if (match) {
      next = optimisticAdd(next, match.category, match.subject);
      continue;
    }
    const recommendation = recommended.get(id);
    if (!recommendation) continue;
    next = optimisticAdd(
      next,
      { courseId: undefined, courseName: "" },
      {
        subjectId: recommendation.subjectId,
        subjectName: recommendation.subjectName,
        subjectCredit: recommendation.subjectCredit,
        subjectPriceString: recommendation.subjectPriceString,
        courseMandatory: recommendation.courseMandatory,
      }
    );
  }
  return next;
}

function canRemoveSelected(subject) {
  return Boolean(subject.selectedCourse) && subject.courseMandatory === 0;
}

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
        <span className={`px-1 text-xs font-medium leading-none ${isTarget ? 'text-white':'text-black'}`}>{label}</span>
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
function CourseCategoryDialog({ course, onClose, selectedIds, data, showPaymentOption, busy, onAddSubject, onRemoveSubject }) {
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  if (!course) return null;

  const CategoryIcon = categoryIcon(course.courseName);

  async function handleAdd(subject) {
    if (busy || addingId || removingId) return;
    const id = String(subject.subjectId);
    setAddingId(id);
    try {
      await onAddSubject(course, subject);
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemove(subject) {
    if (busy || addingId || removingId) return;
    const id = String(subject.subjectId);
    setRemovingId(id);
    try {
      await onRemoveSubject(subject.selectedCourse);
    } finally {
      setRemovingId(null);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-2 space-y-0  px-4 py-3">
          <CategoryIcon className="h-5 w-5 shrink-0 text-black" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold text-black">{course.courseName}</DialogTitle>
            <p className="text-xs text-slate-500">{addableCountLabel(course.subjects.length)}</p>
          </div>
        </DialogHeader>
        <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {(course.displaySubjects || course.subjects).map((subject) => {
            const id = String(subject.subjectId);
            const alreadySelected = subject.alreadySelected || selectedIds.includes(id);
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
                {alreadySelected ? (
                  <span className="flex shrink-0 items-center gap-3">
                    <span title="Already selected" className="flex items-center text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">Already selected</span>
                    </span>
                    {canRemoveSelected(subject) && (
                      <button
                        type="button"
                        onClick={() => handleRemove(subject)}
                        disabled={busy || Boolean(addingId) || Boolean(removingId)}
                        title="Remove course"
                        aria-label={`Remove ${subject.subjectName}`}
                        className="inline-flex cursor-pointer items-center text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdd(subject)}
                    disabled={busy || Boolean(addingId) || Boolean(removingId)}
                    className="shrink-0 rounded-md bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> {addingId === id ? "Adding…" : "Add"}
                  </Button>
                )}
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
  const applyLocal = useLocalCourseUpdate({ userId, standardId });
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
  // Add/remove only edit the cached page; nothing is persisted until flushSelection
  // writes the whole selection in one call. True means the cached page is ahead of
  // what's in the database.
  const unsavedRef = useRef(false);

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

  // Courses now live only in the cache until Next/Back saves them, so a reload or
  // tab close would drop them without this. The browser shows its own generic
  // "leave site?" prompt; the string is ignored by every current browser.
  useEffect(() => {
    function warnIfUnsaved(event) {
      if (!unsavedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnIfUnsaved);
    return () => window.removeEventListener("beforeunload", warnIfUnsaved);
  }, []);

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

  // The selection as plain id strings, in the order the list renders. Still read by
  // the mobile category sheet and the recommended-courses dialog.
  const selectedIds = parseIds(data?.selectedSubjectsAsString);

  /**
   * Writes the accumulated selection to the server in one
   * course-details-by-standard-id call. Called before leaving the step (Next/Back),
   * since add/remove no longer save as you go.
   *
   * Resolves { ok, courseData } — courseData is the server's fresh page on a flush,
   * or the current page when there was nothing to save, so callers don't act on a
   * stale closure.
   */
  async function flushSelection() {
    if (!unsavedRef.current) return { ok: true, courseData: data };
    const ids = parseIds(data?.selectedSubjectsAsString);
    try {
      const response = await update.mutateAsync({
        standardId: data.standardId,
        selectedSubjects: ids.join(","),
        // Mirrors removeAll(): an empty selection is a "remove", anything else an
        // "add" — the backend uses controlType only for its own messaging, and
        // confirmRecommended already saves a whole set this way.
        controlType: ids.length === 0 ? "remove" : "add",
      });
      if (!isSuccessResponse(response)) {
        handleFailure(response, "Could not save your courses. Please try again.");
        return { ok: false, courseData: data };
      }
      unsavedRef.current = false;
      // The backend can drop courses it won't accept (AP below the credit minimum,
      // over-limit rows). If what came back isn't what we sent, the student is now
      // looking at a different selection than they picked, so stop rather than
      // carrying on to payment with it.
      const savedIds = parseIds(response.selectedSubjectsAsString);
      if (savedIds.length !== ids.length || savedIds.some((id) => !ids.includes(id))) {
        toast.error("Some courses could not be saved. Please review your selection.");
        return { ok: false, courseData: response };
      }
      return { ok: true, courseData: response };
    } catch (err) {
      console.error("Stage3CourseSelection save failed:", err);
      toast.error(GENERIC_ERROR);
      return { ok: false, courseData: data };
    }
  }

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
    const added = applyLocal((previous) => optimisticAdd(previous, course, subject));
    if (added) {
      unsavedRef.current = true;
      toast.success(`${subject.subjectName} added`);
    }
  }

  async function removeSubject(course) {
    if (busy) return;
    const removed = applyLocal((previous) => optimisticRemove(previous, course));
    if (removed) {
      unsavedRef.current = true;
      toast.success(`${course.courseName} removed`);
    }
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
    const removed = applyLocal(optimisticRemoveAll);
    if (removed) {
      unsavedRef.current = true;
      toast.success("All courses removed");
    }
  }

  async function upgrade(course, target) {
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
    // Substituted IN PLACE (see optimisticUpgrade): the backend renders "Your
    // Selected Courses" in exactly the order of the CSV it's given
    // (getOrderedSubjects' `ORDER BY FIELD(SUBJECT_ID, ...)`, then
    // CTECourseUtil.reorderSelectedCourses), so the local swap has to hold the
    // position too or the course would jump to the bottom on the next save.
    const switched = applyLocal((previous) => optimisticUpgrade(previous, course, target));
    if (switched) {
      unsavedRef.current = true;
      // Names the actual resulting subject (e.g. "English I Honors added" / "English I added"),
      // not a generic "Switch to Honors"/"Switch to Regular" — course.courseName is the subject's
      // own display name (e.g. "English I"), and courseTypeOriginal === "Regular" means this
      // upgrade is switching TO the alternate (Honors/Advanced) variant named by target.courseType.
      const targetType = String(target.courseType || "").toUpperCase();
      const subjectName = stripVariantSuffix(course.courseName);
      if (/^(FT|REGULAR)$/.test(targetType)) {
        toast.success(`Switched back to ${subjectName}`);
      } else {
        // Named from the TARGET alone. Keying this off the course's current type
        // left several branches with no return — Honors -> Advanced among them —
        // and the undefined reached the toast as "<course> undefined added".
        const variantSuffix = /ADV/.test(targetType) ? " Advanced" : /HON/.test(targetType) ? " Honors" : "";
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
        return;
      }
      // Courses are grade-specific, so the new grade's page replaces the old one
      // outright — any local, unsaved picks for the PREVIOUS grade are gone on
      // purpose, and the flag has to drop with them or Next would re-save a
      // selection that's already server-fresh.
      unsavedRef.current = false;
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
    const recommendedCourses = recommendedData?.recommendedCourses || [];
    const saved = applyLocal((previous) => optimisticApplyRecommended(previous, ids, recommendedCourses));
    if (saved) {
      unsavedRef.current = true;
      setRecommendedData(null);
      toast.success("Recommended courses added");
    }
  }

  // Leaving the step in either direction has to persist the selection, otherwise
  // everything picked since the page loaded is gone. A failed save keeps the student
  // here with the error rather than silently discarding their courses.
  async function handleBack() {
    if (busy) return;
    const saved = await flushSelection();
    if (!saved.ok) return;
    onBack?.();
  }

  async function handleNext() {
    if (busy) return;
    const creditError = validateCourseCredits(data);
    if (creditError) {
      toast.error(creditError);
      return;
    }
    const saved = await flushSelection();
    if (!saved.ok) return;
    try {
      const { ok, response } = await proceed.mutateAsync({ courseData: saved.courseData, showPaymentOption });
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
            <Button type="button" variant="outline" onClick={handleBack} disabled={busy}>
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
  const gradeBand = getGradeBand(data.standardName, data.standardId);
  const showCourseCredits = gradeBand === "high";
  const showCourseRequirement = gradeBand === "middle";
  const batchOrProvider39 = data.registrationType === "BATCH" || Number(data.courseProviderId) === 39;
  const selectedCourses = data.selectedSubjects || [];
  const mandatoryCount = selectedCourses.filter((course) => course.courseMandatory === 1).length;
  const canRemoveAll = !fixed && selectedCourses.length > mandatoryCount;
  // The backend strips every already-selected subject out of availableCourses
  // (CTECourseUtil's `selectedIdsCopy.contains(...)` / parentId checks), so this
  // pane never receives them and a category silently shrinks as you pick from it.
  // Re-attach them from data.selectedSubjects for DISPLAY only: they render with a
  // tick instead of an Add button, so the student sees a category's full set rather
  // than only what's left. CourseDTO (selected) and SubjectB2CDTO (available) don't
  // share field names, hence the remap.
  const selectedIdSet = new Set(parseIds(data?.selectedSubjectsAsString));
  const selectedByCategory = new Map();
  for (const course of selectedCourses) {
    const key = String(course.categoryId);
    const entry = {
      subjectId: course.courseId,
      subjectName: course.courseName,
      subjectPriceString: course.coursePriceSelectedString,
      courseDescriptionUrl: course.courseDescriptionUrl,
      alreadySelected: true,
      courseMandatory: course.courseMandatory,
      // Kept whole so the row's remove button can hand removeSubject() the exact
      // object it expects (it reads courseId AND categoryId off it).
      selectedCourse: course,
    };
    const existing = selectedByCategory.get(key);
    if (existing) existing.push(entry);
    else selectedByCategory.set(key, [entry]);
  }
  const availableCourses = (data.availableCourses || [])
    .map((course) => {
      // Selection wins: a subject that is selected is never also offered as addable.
      // The backend already strips those out, but an optimistic add leaves the
      // subject in `subjects` until the response lands, and without this filter the
      // same course would render twice — once with Add, once with a tick.
      const addable = (course.subjects || []).filter(
        (subject) => !selectedIdSet.has(String(subject.subjectId))
      );
      const picked = selectedByCategory.get(String(course.courseId)) || [];
      return {
        ...course,
        subjects: addable,
        // Addable + already-selected, A-Z. `subjects` deliberately stays
        // addable-only so the category counts keep meaning "available to add".
        displaySubjects: [...addable, ...picked].sort((a, b) =>
          String(a.subjectName || "").localeCompare(String(b.subjectName || ""))
        ),
      };
    })
    // A category whose courses are now ALL selected has an empty `subjects` but a
    // non-empty `displaySubjects`, and still belongs in the list.
    .filter((course) => course.displaySubjects.length > 0);
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
          course.displaySubjects?.some((subject) => subject.subjectName?.toLowerCase().includes(query))
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
        <div className={`mt-0 flex items-center gap-3 rounded-sm border pl-3 md:hidden ${gradeBand === "elementary" || centerGradeHeader ? "justify-center" : "justify-between"}`}>
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
            Change <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:p-4 lg:py-6 lg:px-8">
      {header}

      

      {/* Desktop/tablet: the full summary card (grade chip, credits
          requirement, progress ring, Selection Summary legend) — untouched. */}
      <div className="mt-4 hidden gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex md:flex-row md:flex-wrap md:items-center md:gap-8 md:p-5">
        {data.standardName && (
          <div className={`flex items-center gap-2 rounded-lg py-2 px-3 bg-[#e6f3ff] flex-1 ${gradeBand === "elementary" || centerGradeHeader ? "mx-auto" : ""}`}>
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
              Change Grade <RefreshCw className="h-3.5 w-3.5" />
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
          <div className="hidden items-center gap-3 border-slate-300 lg:border-r-1 sm:border-l sm:px-8 md:flex">
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
          <header className={`items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 ${(showCreditSummary || showCourseCountSummary) ? "hidden md:flex" : "flex"}`}>
            <h2 className="text-sm font-bold text-black">
              {showCourseCountSummary || showCourseCredits ? (
                <>
                  <span className="md:hidden">Selected Courses: <span className="text-primary">{selectedCourseCount}/{displayCourseCountTarget} courses</span></span>
                  <span className="hidden md:inline">Selected Courses</span>
                </>
              ) : "Your Selected Courses"}
            </h2>
            <div className="flex items-center gap-3">
              {canRemoveAll && (
                <button
                  type="button"
                  onClick={removeAll}
                  disabled={busy}
                  className="inline-flex items-center gap-1 cursor-pointer text-xs font-semibold text-red-600 hover:text-red-700"
                  aria-label="Remove all courses"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </header>
          {/* Mobile-only: plain "Credits Requirement" banner from the mobile
          reference design — no card border, no progress ring, no Selection
          Summary legend. */}
          <div className="mt-0 space-y-2 md:hidden">
            {(showCreditSummary || showCourseCountSummary) && (
              <div className="rounded rounded-bl-none rounded-br-none bg-primary px-4 py-3.5 text-white">
                <div className="flex items-center justify-between gap-3">
                  {courseMinMet ? (
                    <span className="inline-flex items-center gap-2 text-sm font-bold">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400">
                        <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                      </span>
                      {selectedCourseCount} courses selected
                    </span>
                  ) : (
                    <span className="text-sm font-bold">Select at least {minCourseCount} courses</span>
                  )}
                  {canRemoveAll && (
                    <button
                      type="button"
                      onClick={removeAll}
                      disabled={busy}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-60 ${
                        courseMinMet ? "px-3 py-0.5" : "px-3 py-1.5 text-xs font-semibold"
                      }`}
                      aria-label="Remove all courses"
                    >
                      <Trash2 className="h-4 w-4" />
                      All
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
                            ? "bg-emerald-400"
                            : "bg-white"
                          : "bg-orange-400"
                      }`}
                    />
                  ))}
                </div>

                {!courseMinMet ? (
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-white/90">{selectedCourseCount} selected</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary">{remainingCourses} more needed</span>
                  </div>
                ) : extraCourseCount > 0 ? (
                  <p className="mt-2 text-xs font-medium text-white/90">
                    Min {data.minCourseLimit} selected · {extraCourseCount} extra course{extraCourseCount === 1 ? "" : "s"}
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
          {selectedCourses.length === 0 && (<p className={`px-4 py-6 text-sm text-black ${selectedCourses.length === 0 ? `text-center` : ``}`}>{selectedSummary(data)}</p>)}
          {selectedCourses.length > 0 && (
            <ol className="space-y-2 p-3 md:space-y-0 md:divide-y md:divide-slate-100 md:p-0">
              {selectedCourses.map((course) => {
                const CourseIcon = categoryIcon(course.courseName);
                const singleUpgradeTarget = course.upgradeCourses?.length === 1 ? course.upgradeCourses[0] : null;
                // Any variant control at all — the toggle (exactly one alternate) or the
                // arrow buttons (more than one). Either way the control names the variant,
                // so the course name doesn't have to.
                const hasVariantControl = (course.upgradeCourses?.length || 0) > 0;
                return (
                  <li key={course.courseId} className={`flex flex-col ${!fixed && course.courseMandatory === 1 && !batchOrProvider39 ? 'gap-3' : ''} rounded-md border border-slate-100 bg-blue-50 px-3 py-1.5 shadow-sm sm:flex-row sm:flex-wrap sm:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0 md:px-4 md:py-3 md:shadow-none`}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e6f3ff] text-primary">
                        <CourseIcon className="h-4 w-4" />
                      </span> */}
                      <div className="min-w-0 inline-flex flex-1">
                        <div className="text-sm inline-flex font-medium text-black">
                          <span> {hasVariantControl ? stripVariantSuffix(course.courseName) : course.courseName}</span> 

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
                    : "Select Courses"}

                  <span className="text-primary">{data.totalCredit >= data.maxCourseLimit ? ``: ` · select minimum ${remainingCourses} more`}</span>
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
                {data.eligibleForRecommendedCourse && (
                  <Button type="button" size="sm" onClick={openRecommended} disabled={busy} className="shrink-0 rounded-md bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> View Our Recommendations
                  </Button>
                )}
              </div>
            </header>
            {/* Mobile header: title only — the recommended-courses button below
                is full-width instead, and there's no search box (matches the
                reference mobile design). */}
            <div className="border-b border-slate-200 px-4 py-3 md:hidden">
              <h2 className="text-sm font-bold text-black">{data.totalCredit >= data.maxCourseLimit ? 'Select Extra Courses':'Select Courses'}</h2>
            </div>
            {data.eligibleForRecommendedCourse && (
              <div className="px-4 pt-4 md:hidden">
                <Button type="button" onClick={openRecommended} disabled={busy} className="w-full rounded-md bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> View Our Recommendations
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
                              title={addableCountLabel(course.subjects.length)}
                              aria-label={addableCountLabel(course.subjects.length)}
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                                active ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {course.subjects.length === 0 ? <Check className="h-3 w-3" aria-hidden="true" /> : course.subjects.length}
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
                          {addableCountLabel(activeCourse.subjects.length)} <ChevronDown className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <div className="space-y-2 p-4" style={detailPaneHeight>250 ? { height: detailPaneHeight, overflowY: "auto" } : { maxHeight: "300px", overflowY: "auto" }}>
                        {activeCourse.courseDescription && <p className="text-xs text-slate-500">{activeCourse.courseDescription}</p>}
                        {activeCourse.displaySubjects
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
                                {subject.alreadySelected ? (
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span title="Already selected" className="flex items-center text-emerald-600">
                                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                                      <span className="sr-only">Already selected</span>
                                    </span>
                                    {canRemoveSelected(subject) && (
                                      <button
                                        type="button"
                                        onClick={() => removeSubject(subject.selectedCourse)}
                                        disabled={busy}
                                        title="Remove course"
                                        aria-label={`Remove ${subject.subjectName}`}
                                        className="inline-flex cursor-pointer items-center text-red-600 hover:text-red-700 disabled:opacity-50"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </span>
                                ) : (
                                  <Button type="button" size="sm" onClick={() => addSubject(activeCourse, subject)} disabled={busy} className="rounded-md bg-primary hover:bg-primary/90">
                                    <Plus className="h-4 w-4" /> Add
                                  </Button>
                                )}
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
                          <span className="min-w-0 flex-1 truncate text-black">{course.courseName}</span>
                          <span className="flex px-2  shrink-0 items-center justify-center rounded-full border border-black-300 bg-white text-[11px] font-semibold text-black">
                            {course.subjects.length === 0
                              ? "All selected"
                              : `${course.subjects.length} ${course.subjects.length > 1 ? "Courses" : "Course"}`}
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
          onRemoveSubject={removeSubject}
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
            <Button type="button" variant="outline" className="cursor-pointer" onClick={handleBack} disabled={busy}>
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
    </>
  );
}
