/**
 * Badge label + hero image per learning program, confirmed by reading the
 * <c:choose> blocks in SignupStudent.jsp and matched against live screenshots
 * of /student/enrollment/{G,SSP,DD,F} and the default (ONE_TO_ONE) route.
 * Images copied as-is from the existing app's own static assets
 * (src/main/resources/static/theme2/images/*.png) into public/images/.
 */
const LEARNING_PROGRAM_THEME = {
  O: { label: "One-to-One Enrollment", image: "/images/one-to-one-learning-enrollment.png" },
  DD: { label: "Dual Diploma Enrollment", image: "/images/one-to-one-learning-enrollment.png" },
  ONE_TO_ONE_FLEX: { label: "Flexy Enrollment", image: "/images/one-to-one-learning-enrollment.png" },
  G: { label: "Group Learning Enrollment", image: "/images/group-learning-enrollment.png" },
  SCHOLARSHIP: { label: "Self Learning Enrollment", image: "/images/self-study-enrollment.png" },
  SSP: { label: "Self Plus Enrollment", image: "/images/self-study-enrollment.png" },
};

export function getLearningProgramTheme(learningProgram) {
  return LEARNING_PROGRAM_THEME[learningProgram] || LEARNING_PROGRAM_THEME.O;
}

/**
 * Maps our short URL codes to the backend's actual LearningProgramConstant
 * string values (confirmed from LearningProgramConstant.java) — the
 * `learningProgram` field sent in the enrollment/stage-1 payload MUST be
 * one of these full values, never the short code, or business logic that
 * compares against LearningProgramConstant.X.getValue() server-side
 * (course-provider mapping, fee plans, etc.) will silently not match.
 */
const LEARNING_PROGRAM_BACKEND_VALUE = {
  O: "ONE_TO_ONE",
  DD: "DUAL_DIPLOMA",
  ONE_TO_ONE_FLEX: "ONE_TO_ONE_FLEX",
  G: "BATCH",
  SCHOLARSHIP: "SCHOLARSHIP",
  SSP: "SSP",
};

export function getLearningProgramBackendValue(learningProgram) {
  return LEARNING_PROGRAM_BACKEND_VALUE[learningProgram] || LEARNING_PROGRAM_BACKEND_VALUE.O;
}
