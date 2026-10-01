import { getLearningProgramRouteCode } from "@/constant/LearningPrograms";

const LEARNING_PROGRAM_THEME = {
  O: {
    label: "One-to-One Enrollment",
    subtitle: "Personalized learning. Real attention. Brighter outcomes.",
    image: "/images/enrollement_bg.png",
  },
  DD: {
    label: "Dual Diploma Enrollment",
    subtitle: "Two diplomas. One journey. Twice the opportunity.",
    image: "/images/enrollement_bg.png",
  },
  ONE_TO_ONE_FLEX: {
    label: "Flexy Enrollment",
    subtitle: "Learn your way. On your schedule. At your pace.",
    image: "/images/enrollement_bg.png",
  },
  G: {
    label: "Group Learning Enrollment",
    subtitle: "Learn together. Grow together. Achieve together.",
    image: "/images/enrollement_bg.png",
  },
  SCHOLARSHIP: {
    label: "Self Learning Enrollment",
    subtitle: "Study independently. Progress confidently. Succeed on your terms.",
    image: "/images/self-study-enrollment.png",
  },
  SSP: {
    label: "Self Plus Enrollment",
    subtitle: "Self-paced study with expert support when you need it.",
    image: "/images/self-study-enrollment.png",
  },
};

export function getLearningProgramTheme(learningProgram) {
  const routeCode = getLearningProgramRouteCode(learningProgram);
  return LEARNING_PROGRAM_THEME[routeCode] || LEARNING_PROGRAM_THEME.O;
}

export { getLearningProgramBackendValue, getLearningProgramShortCode } from "@/constant/LearningPrograms";
