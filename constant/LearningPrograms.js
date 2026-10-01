export const LEARNING_PROGRAMS = [
  {
    learningProgram: "BATCH",
    learningProgramLabel: "Group Learning",
    orderId: 3,
    abbreviation: "G,B,BATCH",
    defaultCourseProviderId: 38,
    routeCode: "G",
  },
  {
    learningProgram: "DUAL_DIPLOMA",
    learningProgramLabel: "Dual Diploma",
    orderId: 5,
    abbreviation: "DD",
    defaultCourseProviderId: 37,
    routeCode: "DD",
  },
  {
    learningProgram: "ONE_TO_ONE",
    learningProgramLabel: "One-to-One Learning",
    orderId: 2,
    abbreviation: "O",
    defaultCourseProviderId: 37,
    routeCode: "O",
  },
  {
    learningProgram: "ONE_TO_ONE_FLEX",
    learningProgramLabel: "Flexy Program",
    orderId: 4,
    abbreviation: "F,Flexy",
    defaultCourseProviderId: 37,
    routeCode: "ONE_TO_ONE_FLEX",
  },
  {
    learningProgram: "SCHOLARSHIP",
    learningProgramLabel: "Self Study",
    orderId: 1,
    abbreviation: "A,S",
    defaultCourseProviderId: 37,
    routeCode: "SCHOLARSHIP",
  },
  {
    learningProgram: "SSP",
    learningProgramLabel: "Self Study Plus",
    orderId: 0,
    abbreviation: "SSP",
    defaultCourseProviderId: 37,
    routeCode: "SSP",
  },
];

function normalizeValue(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function findLearningProgram(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;

  return LEARNING_PROGRAMS.find((program) => {
    const abbreviations = program.abbreviation.split(",").map(normalizeValue);
    return (
      normalizeValue(program.learningProgram) === normalized ||
      normalizeValue(program.routeCode) === normalized ||
      abbreviations.includes(normalized)
    );
  }) || null;
}

export function getLearningProgramRouteCode(value) {
  return findLearningProgram(value)?.routeCode || null;
}

export function getLearningProgramBackendValue(value) {
  return findLearningProgram(value)?.learningProgram || "ONE_TO_ONE";
}

export function getLearningProgramShortCode(value) {
  return findLearningProgram(value)?.routeCode || "O";
}

export function getLearningProgramsForSelect() {
  return [...LEARNING_PROGRAMS]
    .sort((left, right) => left.orderId - right.orderId)
    .map(({ learningProgram, learningProgramLabel }) => ({
      value: learningProgram,
      label: learningProgramLabel,
    }));
}
