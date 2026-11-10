/**
 * Grade → dashboard band for the Grade K–5 dashboard (docs/migration/grade_k5_dashboard_plan.html,
 * sections 7 + 12.8). The backend (GradeBandUtil, StudentDetailsDTO.gradeBand) decides the band;
 * this is only the fallback for dummy mode and for a backend without the gradeBand field.
 * Bands mirror is-rest-api v1/constant/GradeBand: "ELEMENTARY" | "MIDDLE" | "HIGH".
 */

export const GRADE_BANDS = ["ELEMENTARY", "MIDDLE", "HIGH"];

// Dummy-mode grade table (moved from utils/dummyStudent.js): grade key → STANDARD row.
export const GRADE_CONFIG = {
  K: { standardId: 11, standardName: "KINDERGARTEN", label: "Grade K" },
  1: { standardId: 12, standardName: "GRADE 1", label: "Grade 1" },
  2: { standardId: 13, standardName: "GRADE 2", label: "Grade 2" },
  3: { standardId: 14, standardName: "GRADE 3", label: "Grade 3" },
  4: { standardId: 15, standardName: "GRADE 4", label: "Grade 4" },
  5: { standardId: 16, standardName: "GRADE 5", label: "Grade 5" },
  6: { standardId: 1, standardName: "GRADE 6", label: "Grade 6" },
  7: { standardId: 2, standardName: "GRADE 7", label: "Grade 7" },
  8: { standardId: 3, standardName: "GRADE 8", label: "Grade 8" },
  9: { standardId: 4, standardName: "GRADE 9", label: "Grade 9" },
  10: { standardId: 5, standardName: "GRADE 10", label: "Grade 10" },
  11: { standardId: 6, standardName: "GRADE 11", label: "Grade 11" },
  12: { standardId: 7, standardName: "GRADE 12", label: "Grade 12" },
};
export const GRADE_KEYS = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
export const ELEMENTARY_GRADE_KEYS = ["K", "1", "2", "3", "4", "5"];

// PreK / Nursery — resolves ELEMENTARY on the backend (confirmed), with the isPreK sub-flag.
const PREK_STANDARD_ID = 17;
// standardId 19 is NOT mapped: its band is still unconfirmed (plan section 15), so it falls back.
const STANDARD_BANDS = {
  17: "ELEMENTARY",
  11: "ELEMENTARY",
  12: "ELEMENTARY",
  13: "ELEMENTARY",
  14: "ELEMENTARY",
  15: "ELEMENTARY",
  16: "ELEMENTARY",
  1: "MIDDLE",
  2: "MIDDLE",
  3: "MIDDLE",
  4: "HIGH",
  5: "HIGH",
  6: "HIGH",
  7: "HIGH",
};

// Every learning program gets the K–5 dashboard (decision 10); isSelfStudy is content-only, not a gate.
export const K5_LEARNING_PROGRAMS = ["BATCH", "CWS", "DUAL_DIPLOMA", "ONE_TO_ONE", "ONE_TO_ONE_FLEX", "SCHOLARSHIP", "SSP"];
// GradeBandUtil.isSelfStudy: Self-Study (SCHOLARSHIP) and Self-Study Plus (SSP).
const SELF_STUDY_PROGRAMS = ["SCHOLARSHIP", "SSP"];

/** The band for a STANDARD_ID, or null when unknown. */
export function bandFromStandardId(standardId) {
  return STANDARD_BANDS[Number(standardId)] ?? null;
}

export function isPreKStandard(standardId) {
  return Number(standardId) === PREK_STANDARD_ID;
}

/** A backend gradeBand value, or null when missing / not one of GRADE_BANDS. */
export function normalizeGradeBand(value) {
  
  const band = String(value || "").trim().toUpperCase();
  return GRADE_BANDS.includes(band) ? band : null;
}

export function isK5LearningProgram(registrationType) {
  return K5_LEARNING_PROGRAMS.includes(String(registrationType || "").trim().toUpperCase());
}

export function isSelfStudyProgram(registrationType) {
  return SELF_STUDY_PROGRAMS.includes(String(registrationType || "").trim().toUpperCase());
}

export function gradeKeyByStandardId(id) {
  const value = String(id || "").trim();
  return Object.keys(GRADE_CONFIG).find((key) => String(GRADE_CONFIG[key].standardId) === value) || "";
}

export function gradeKeyByLabel(label) {
  const value = String(label || "").trim().toUpperCase();
  if (!value) return "";
  if (["K", "KG", "GRADE K", "KINDERGARTEN"].includes(value)) return "K";
  const match = value.match(/(?:GRADE\s*)?(\d{1,2})/);
  return match && GRADE_CONFIG[match[1]] ? match[1] : "";
}
