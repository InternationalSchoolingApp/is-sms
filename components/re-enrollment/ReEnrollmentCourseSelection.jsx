"use client";

import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ReEnrollmentStepTitle } from "./ReEnrollmentFlow";
import { FullScreenLoader } from "@/components/common/Loader";
import { Stage3CourseSelection } from "@/components/student-enroll/Stage3CourseSelection";
import { eligibilityKey, useReEnrollmentContext } from "@/hooks/useReEnrollment";
import { FLEXY_GRADES } from "@/constant/FlexyGrades";
import { useRequireSelectedOption } from "@/hooks/useRequireSelectedOption";
import { expireSession } from "@/utils/logout";
import { nextStepAfter, previousStepBefore, reEnrollmentStepPath, STEP_COURSE_SELECTION } from "@/utils/reEnrollmentSteps";

/**
 * COURSE_SELECTION step: the legacy "Select Your Courses for {grade}" title bar (learning program badge above it)
 * over the course selection screen, the same screen and API the enrollment uses, in re-enrollment mode.
 */
export function ReEnrollmentCourseSelection() {
  const router = useRouter();
  const { school } = useParams();
  const queryClient = useQueryClient();
  const { session, context, option, steps } = useReEnrollmentContext();
  const allowed = useRequireSelectedOption(STEP_COURSE_SELECTION);
  if (!allowed) return <FullScreenLoader />;

  // Flexy students pick the Flexy grade (Elementary / Middle / High / Credit Recovery / AP) here, like on the old dashboard;
  // Take Individual Course keeps the grade. Other programs have a fixed grade.
  const isFlexy = option.learningProgram === "ONE_TO_ONE_FLEX";
  const gradeLocked = option.enrollmentType === "REGISTRATION_IMPORVE_GRADES";
  const next = nextStepAfter(steps, STEP_COURSE_SELECTION);
  // First step: Back returns to the option screen.
  const previous = previousStepBefore(steps, STEP_COURSE_SELECTION) ?? "OPTION";
  return (
    <>
      <ReEnrollmentStepTitle subtitle={isFlexy ? undefined : option.learningProgramLabel}>
        {isFlexy ? option.learningProgramLabel : <>Course Selection for <span className="text-primary">{option.grade?.name}</span></>}
      </ReEnrollmentStepTitle>
      <Stage3CourseSelection
        reEnrollment
        context={context}
        userId={session.userId}
        standardId={option.grade?.id}
        reEnrollmentGrades={isFlexy ? FLEXY_GRADES : undefined}
        reEnrollmentGradeLocked={gradeLocked}
        // The backend record has the new grade now: the later screens (payment, review) read it from the eligibility answer.
        onReEnrollmentGradeChange={() => queryClient.invalidateQueries({ queryKey: eligibilityKey(session.userId) })}
        onNext={() => router.push(reEnrollmentStepPath(school, next))}
        onBack={previous ? () => router.push(reEnrollmentStepPath(school, previous)) : undefined}
        onSessionExpired={() => expireSession(school)}
      />
    </>
  );
}
