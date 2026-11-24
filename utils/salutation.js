/** "Mr." / "Ms." for a teacher's or sender's gender as the backend sends it ("male" / "female", any case); "" when it is unknown. */
export function salutationFor(gender) {
  const normalized = (gender || "").toLowerCase();
  if (normalized === "male") return "Mr.";
  if (normalized === "female") return "Ms.";
  return "";
}

/** "Ms. Suzanne Fernando": the name with its salutation in front (just the name when the gender is unknown). */
export function withSalutation(name, gender) {
  return `${salutationFor(gender)} ${name || ""}`.trim();
}

/** "Ms. Suzanne": the teacher's FIRST name only (the first word of the full name) with the salutation - middle and last names are not shown. */
export function teacherShortName(name, gender) {
  // A name that already starts with a salutation (some data comes as "Ms. Sophia Williams") loses it first: the salutation is rebuilt from the gender.
  const first = String(name || "").trim().replace(/^(mr|ms|mrs|miss)\.?\s+/i, "").split(/\s+/)[0] || "";
  return withSalutation(first, gender);
}
