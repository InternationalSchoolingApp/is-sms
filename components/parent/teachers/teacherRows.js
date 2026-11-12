// Legacy getSalutationByGender (jquery.commonFunction.js): Mr. / Ms., nothing for any other value.
export function salutation(gender) {
  const value = String(gender ?? "").trim().toLowerCase();
  if (value === "male") return "Mr.";
  if (value === "female") return "Ms.";
  return "";
}

const text = (value) => {
  const s = String(value ?? "").trim();
  return s || "N/A";
};

/** One list item of details.assignedTeachers -> { key, course, teacher } as the legacy table shows it. */
export function toTeacherRow(item, index) {
  const name = String(item?.teacherName ?? "").trim();
  return {
    key: `${item?.coruseId ?? "c"}-${item?.teacherId ?? "t"}-${index}`,
    course: text(item?.courseName),
    teacher: name ? `${salutation(item?.teacherGender)} ${name}`.trim() : "N/A",
  };
}
