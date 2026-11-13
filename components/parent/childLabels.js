// Small text helpers for how a child is named on the parent dashboard.

// "GRADE 8" -> "Grade 8" (the backend sends the standard name in capitals).
export const gradeLabel = (standardName) =>
  String(standardName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// "Mohammed Bin Mubarak Al Dayani" -> "Mohammed".
export const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] || "";
