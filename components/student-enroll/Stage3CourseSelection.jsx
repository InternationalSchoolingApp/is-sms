"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getLearningProgramTheme, getLearningProgramBackendValue } from "@/utils/learningProgramTheme";
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

/**
 * Stage 3 of the enrollment wizard ("Course Selection"). Mirrors
 * getAllCourseDetails()/addCourse()/removeCourse() in signupStudentStage3.js
 * and getCourseSelectionContent() in signupStudentContent.js: every change
 * re-posts the full selection to course-details-by-standard-id, which
 * persists it and returns the recomputed page. Continuing saves a payment
 * plan (see useProceedToReview) so the next step is the review page.
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
export function Stage3CourseSelection({ context, userId, standardId, onNext, onBack, onSessionExpired }) {
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
  const resolverRef = useRef(null);
  // Legacy apCourseSelectionFlag: the AP warning shows once per selection session.
  const apAcknowledgedRef = useRef(false);
  // Legacy oneTimeModal: the "extra fee from now on" notice shows once.
  const extraFeeNoticeShownRef = useRef(false);

  const data = courseQuery.data?.status === STATUS_SUCCESS ? courseQuery.data : null;
  const initialFailure = courseQuery.data && courseQuery.data.status !== STATUS_SUCCESS ? courseQuery.data : null;
  const showPaymentOption = paymentOption.data;
  const busy = update.isPending || recommended.isPending || proceed.isPending;
  const programLabel = getLearningProgramTheme(context.learningProgram).label;

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
      setNotice({ tone: "error", text: check.blockedMessage });
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
    await applyChange({
      selectedSubjects: [...selectedIds, String(subject.subjectId)].join(","),
      controlType: "add",
      courseId: course.courseId,
    });
  }

  async function removeSubject(course) {
    if (busy) return;
    await applyChange({
      selectedSubjects: selectedIds.filter((id) => id !== String(course.courseId)).join(","),
      controlType: "remove",
      courseId: course.categoryId,
    });
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
    await applyChange({
      selectedSubjects: [...selectedIds.filter((id) => id !== String(course.courseId)), String(target.courseId)].join(","),
      controlType: "add",
      courseId: course.categoryId,
    });
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

  const header = (
    <>
      <span className="inline-block rounded-full bg-primary px-3 py-1 text-sm font-bold uppercase tracking-wide text-white sm:text-base md:text-lg">
        {programLabel}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Course selection</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">Step 3 of 4. Choose the courses for this academic year.</p>
    </>
  );

  if (courseQuery.isLoading) {
    return (
      <div>
        {header}
        <p className="mt-8 text-sm text-slate-500">Loading courses…</p>
      </div>
    );
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
  const materialFee = data.courseMaterialFeeDetails;

  return (
    <div>
      {header}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {data.standardName && (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
            {data.standardName}
            <button
              type="button"
              onClick={() => setChangeGradeOpen(true)}
              disabled={busy}
              className="text-xs font-semibold text-white/80 underline hover:text-white"
            >
              Change
            </button>
          </span>
        )}
        {showMinBanner && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            You need a minimum of {data.minCourseLimit} credits
          </span>
        )}
      </div>

      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${notice.tone === "error" ? "text-red-600" : notice.tone === "success" ? "text-emerald-700" : "text-slate-600"}`}
        >
          {notice.text}
        </p>
      )}

      <div className={`mt-6 grid gap-6 ${showAvailable ? "lg:grid-cols-2" : ""} ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
        <section className="self-start overflow-hidden rounded-xl border border-slate-200 bg-white">
          <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-white">
            <h2 className="text-sm font-semibold">{selectedSummary(data)}</h2>
            {canRemoveAll && (
              <button
                type="button"
                onClick={removeAll}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white"
              >
                <Trash2 className="h-4 w-4" /> Remove all
              </button>
            )}
          </header>
          {selectedCourses.length > 0 && (
            <ol className="divide-y divide-slate-100">
              {selectedCourses.map((course, index) => (
                <li key={course.courseId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="text-sm text-slate-400">{index + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {course.courseName}
                      {!hideCredits && <span className="text-slate-500"> ({course.creditScore} credit)</span>}
                    </p>
                    <CourseSummaryLink url={course.courseDescriptionUrl} />
                  </div>
                  {(course.upgradeCourses || []).map((target) => (
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
                  ))}
                  {!fixed && course.courseMandatory === 1 && !batchOrProvider39 && (
                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Mandatory</span>
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
              ))}
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
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{availableSummary(data)}</h2>
                {data.registrationType === "SCHOLARSHIP" && (
                  <p className="text-xs text-slate-500">Please note: live classes are not offered in this program.</p>
                )}
              </div>
              {data.eligibleForRecommendedCourse && (
                <Button type="button" size="sm" variant="outline" onClick={openRecommended} disabled={busy}>
                  Add recommended courses
                </Button>
              )}
            </header>
            <ul>
              {availableCourses.map((course) => {
                const open = effectiveOpenId === course.courseId;
                return (
                  <li key={course.courseId} className="border-b border-slate-200 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setOpenCourseId(open ? -1 : course.courseId)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800"
                    >
                      <span>{course.courseName}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="space-y-2 px-4 pb-4">
                        {course.courseDescription && <p className="text-xs text-slate-500">{course.courseDescription}</p>}
                        {course.subjects.map((subject) => {
                          const notes = subjectNotes(subject, data, showPaymentOption);
                          return (
                            <div key={subject.subjectId} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-primary">{subject.subjectName}</p>
                                {notes.length > 0 && (
                                  <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
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
                              <Button type="button" size="sm" onClick={() => addSubject(course, subject)} disabled={busy}>
                                <Plus /> Add
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {paymentOption.isError && (
        <p className="mt-4 text-sm text-red-600">
          Could not load payment settings.{" "}
          <button type="button" className="font-semibold underline" onClick={() => paymentOption.refetch()}>
            Try again
          </button>
        </p>
      )}

      <div className="mt-10 flex flex-col-reverse items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
        <p className="text-xs text-slate-500">Your course choices are saved as you make them.</p>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
              Back
            </Button>
          )}
          <Button
            type="button"
            onClick={handleNext}
            disabled={busy || !showPaymentOption}
            className="rounded-md bg-primary px-6 hover:bg-primary/90"
          >
            {proceed.isPending ? "Please wait…" : "Continue to Step 4"}
          </Button>
        </div>
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
