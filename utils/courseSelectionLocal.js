/**
 * Pure transforms for client-side course selection, shared by the signup
 * (Stage3CourseSelection) and add-enrollment (AddStage2CourseSelection) flows.
 *
 * Both screens edit the cached course page locally as the student picks, then
 * persist the whole selection in ONE course-details-by-standard-id call when the
 * step is left. These functions are that local edit: pure prev -> next over the
 * cached page, no React and no network, so they can be unit tested directly.
 *
 * They model LIST MEMBERSHIP and the credit total — what the screens derive
 * everything visible from (selected list, each row's state, counts, progress ring,
 * summary buckets). Fee breakdowns and the backend's own limit messages are NOT
 * recomputed here; those refresh when the real response lands.
 */

export function parseIds(csv) {
  return (csv || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Local add/remove/upgrade: pure prev -> next transforms over the cached course
 * page. Add/remove/toggle/remove-all edit the cache only; the accumulated selection
 * is written to the server in ONE call when the step is left (flushSelection).
 *
 * These model LIST MEMBERSHIP and the credit total — what the screen derives
 * everything visible from (selected list, each row's tick/Add state, the counts, the
 * progress ring, the Selection Summary buckets). Fee breakdowns and the backend's
 * own limit messages are NOT recomputed here; they refresh on the next save.
 */
export function optimisticAdd(courseData, category, subject) {
  const id = String(subject.subjectId);
  const ids = parseIds(courseData.selectedSubjectsAsString);
  if (ids.includes(id)) return courseData;
  const credit = Number(subject.subjectCredit) || 0;
  // Shaped like a CourseDTO, because that's what the selected list reads.
  // upgradeCourses is left empty: whether this subject has a Honors/Advanced
  // sibling is the server's answer, and guessing would flash a toggle that may
  // then vanish.
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

export function optimisticRemove(courseData, selectedCourse) {
  const id = String(selectedCourse.courseId);
  const credit = Number(selectedCourse.creditScoreFloat ?? selectedCourse.creditScore) || 0;
  // The server strips selected subjects out of availableCourses, so a course
  // selected at page load has no addable record to fall back to. Put one back, or
  // removing it would blank the row until the next save instead of flipping it to
  // "+ Add". A course added earlier in this session is still in that list, hence
  // the contains check.
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

/**
 * "Remove all", applied locally. Mandatory courses stay: sending an empty selection
 * makes the backend re-populate the compulsory subjects for the grade
 * (CTECourseUtil, getCompulsarySubjectsByStandardId), so clearing them here would
 * only diverge from whatever the eventual save returns.
 */
export function optimisticRemoveAll(courseData) {
  return (courseData.selectedSubjects || [])
    .filter((course) => course.courseMandatory !== 1)
    .reduce((next, course) => optimisticRemove(next, course), courseData);
}

// A selected CourseDTO's `courseType` is overwritten with Compulsory/Optional, so
// the variant has to come back out of `courseTypeOriginal`.
export function variantTypeCode(courseTypeOriginal) {
  const name = String(courseTypeOriginal || "");
  if (/hon/i.test(name)) return "HON";
  if (/adv/i.test(name)) return "ADV";
  return "FT";
}

/**
 * Describes `course` as an upgrade target, so that after switching away from it the
 * student can switch back. Shaped like the CourseWithSameParentDTO the server sends.
 */
export function variantReturnTarget(course, target) {
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
    // upgrade() only raises the fee confirmation when this is non-empty, and
    // dropping back to the Regular variant never adds a fee — matching the server,
    // which sends an empty warning on exactly that direction.
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
export function optimisticUpgrade(courseData, course, target) {
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
 * Confirming the recommended-courses dialog, applied locally. That dialog REPLACES
 * the selection outright (see its own note), so this drops whatever isn't in the
 * confirmed set and adds whatever is missing.
 *
 * New courses are built from the catalogue entry in availableCourses where possible,
 * since RecommendedCourseDTO carries no category, price band or description URL. A
 * recommendation with no catalogue match still joins the selected list, but can't be
 * filed under a category in the right-hand pane until the next save refreshes it.
 */
export function optimisticApplyRecommended(courseData, ids, recommendedCourses = []) {
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

// A category whose courses are ALL already selected has an addable count of zero
// (counts stay addable-only by design), and "0 courses available" reads as if the
// category were empty when it's really full. Name that state instead.
export function addableCountLabel(count) {
  if (count === 0) return "All selected";
  return `${count} course${count === 1 ? "" : "s"} available`;
}

// A ticked row in the "choose courses" pane can be removed from there as well as
// from the selected list — EXCEPT when the course is mandatory, which has no remove
// control anywhere. `selectedCourse` is the original CourseDTO removeSubject() needs.
export function canRemoveSelected(subject) {
  return Boolean(subject.selectedCourse) && subject.courseMandatory === 0;
}

/**
 * Merges already-selected courses back into the categories they belong to, for
 * DISPLAY only. The backend strips selected subjects out of availableCourses, so a
 * category silently shrinks as you pick from it; this puts them back as ticked rows.
 *
 * Each category gains `displaySubjects` (addable + selected, A-Z) while `subjects`
 * stays addable-only, so category counts keep meaning "available to add".
 */
export function withSelectedMerged(courseData) {
  const selectedCourses = courseData.selectedSubjects || [];
  const selectedIdSet = new Set(parseIds(courseData.selectedSubjectsAsString));
  const byCategory = new Map();
  for (const course of selectedCourses) {
    const key = String(course.categoryId);
    const entry = {
      subjectId: course.courseId,
      subjectName: course.courseName,
      subjectPriceString: course.coursePriceSelectedString,
      courseDescriptionUrl: course.courseDescriptionUrl,
      alreadySelected: true,
      courseMandatory: course.courseMandatory,
      selectedCourse: course,
    };
    const existing = byCategory.get(key);
    if (existing) existing.push(entry);
    else byCategory.set(key, [entry]);
  }
  return (courseData.availableCourses || [])
    .map((category) => {
      // Selection wins: a locally added course is still in the server's `subjects`
      // until the next save, and without this it would render twice — once with
      // Add, once with a tick.
      const addable = (category.subjects || []).filter(
        (subject) => !selectedIdSet.has(String(subject.subjectId))
      );
      const picked = byCategory.get(String(category.courseId)) || [];
      return {
        ...category,
        subjects: addable,
        displaySubjects: [...addable, ...picked].sort((a, b) =>
          String(a.subjectName || "").localeCompare(String(b.subjectName || ""))
        ),
      };
    })
    // A category whose courses are now ALL selected has an empty `subjects` but a
    // non-empty `displaySubjects`, and still belongs in the list.
    .filter((category) => category.displaySubjects.length > 0);
}
