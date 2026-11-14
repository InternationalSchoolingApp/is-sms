// Canvas (provider 40) and Courseware (provider 41) progress reports - legacy CanvasReport.jsp / CoursewareReport.jsp.
// The report endpoint answers these two providers with `courseWareReport` (one entry per course) instead of the
// gradebook `gradebookEnroll`.

export const isCourseWare = (report) => ["40", "41"].includes(String(report?.lmsProId));

/** One entry per course: { courseName, teacherName, academicYearStartDate / EndDate, itemList, counters, grade fields }. */
export const courseWareCourses = (report) => (Array.isArray(report?.courseWareReport) ? report.courseWareReport : []);

/** Canvas shows the due / submitted dates and the activity counters; Courseware shows only type, name, percentage, grade. */
export const courseWareLayout = (report) => {
  const canvas = String(report?.lmsProId) === "40";
  return { showDates: canvas, showCounters: canvas };
};

/** The legacy page prints "N/A" for an empty value. */
export const cwText = (value) => (value === undefined || value === null || String(value).trim() === "" ? "N/A" : String(value));

export const courseWareItems = (course) => (Array.isArray(course?.itemList) ? course.itemList : []);
