/**
 * Pure helpers for the course-selection screens, shared by the signup
 * (Stage3CourseSelection) and add-enrollment (AddStage2CourseSelection) flows.
 *
 * Display only: both screens still save every add/remove/upgrade through
 * course-details-by-standard-id and render from the response. These shape that
 * response for the UI — no React, no network, so they unit test directly.
 */

export function parseIds(csv) {
  return (csv || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
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
