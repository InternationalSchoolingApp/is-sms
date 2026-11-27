import { getLearningProgramRouteCode } from "@/constant/LearningPrograms";
 
const LEARNING_PROGRAM_THEME = {
  O: {
    label: "One-to-One Learning",
    image: "/images/enrollement_bg.png",
  },
  DD: {
    label: "Dual Diploma",
    image: "/images/enrollement_bg.png",
  },
  ONE_TO_ONE_FLEX: {
    label: "Flexy Program",
    image: "/images/enrollement_bg.png",
  },
  G: {
    label: "Group Learning",
    image: "/images/enrollement_bg.png",
  },
  SCHOLARSHIP: {
    label: "Self Learning",
    image: "/images/self-study-enrollment.png",
  },
  SSP: {
    label: "Self Study Plus",
    image: "/images/self-study-enrollment.png",
  },
};

export function getLearningProgramTheme(learningProgram) {
  const routeCode = getLearningProgramRouteCode(learningProgram);
  return LEARNING_PROGRAM_THEME[routeCode] || LEARNING_PROGRAM_THEME.O;
}

export { getLearningProgramBackendValue, getLearningProgramShortCode } from "@/constant/LearningPrograms";
