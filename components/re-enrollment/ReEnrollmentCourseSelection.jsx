"use client";

import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { PageTitle } from "@/components/re-enrollment/ReEnrollmentParts";
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
  const { school, mode } = useParams();
  const queryClient = useQueryClient();
  const { session, context, option, steps } = useReEnrollmentContext();
  const allowed = useRequireSelectedOption(STEP_COURSE_SELECTION);
  if (!allowed) return <FullScreenLoader />;

  // Flexy students pick the Flexy grade (Elementary / Middle / High / Credit Recovery / AP) here, like on the old dashboard;
  // Take Individual Course keeps the grade. Other programs have a fixed grade.
  const isFlexy = option.learningProgram === "ONE_TO_ONE_FLEX";
  const gradeLocked = option.enrollmentType === "REGISTRATION_IMPORVE_GRADES";
  const next = nextStepAfter(steps, STEP_COURSE_SELECTION);
  const previous = previousStepBefore(steps, STEP_COURSE_SELECTION);
  return (
    <>
      <PageTitle icon={BookOpen}>
        <span className="mb-1 block">
          <span className="inline-block rounded bg-primary px-2 text-base text-white">{option.learningProgramLabel}</span>
        </span>
        {!isFlexy && (
          <span className="font-semibold text-primary">
            Select Your Courses for <b>{option.grade?.name}</b>
          </span>
        )}
      </PageTitle>
      <Stage3CourseSelection
        reEnrollment
        context={context}
        userId={session.userId}
        standardId={option.grade?.id}
        reEnrollmentGrades={isFlexy ? FLEXY_GRADES : undefined}
        reEnrollmentGradeLocked={gradeLocked}
        // The backend record has the new grade now: the later screens (payment, review) read it from the eligibility answer.
        onReEnrollmentGradeChange={() => queryClient.invalidateQueries({ queryKey: eligibilityKey(session.userId) })}
        onNext={() => router.push(reEnrollmentStepPath(school, next, mode))}
        onBack={previous ? () => router.push(reEnrollmentStepPath(school, previous, mode)) : undefined}
        onSessionExpired={() => expireSession(school)}
      />
    </>
  );
}
