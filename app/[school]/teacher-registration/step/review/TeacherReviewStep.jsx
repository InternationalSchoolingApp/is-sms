"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FullScreenLoader } from "@/components/common/Loader";
import { Button } from "@/components/ui/button";
import { TeacherPersonalDetails } from "@/components/teacher-registration/TeacherPersonalDetails";
import { TeacherReview } from "@/components/teacher-registration/TeacherReview";
import { TeacherUnderReview } from "@/components/teacher-registration/TeacherLockScreens";
import {
  TEACHER_PROCESS_QUERY_KEY,
  TEACHER_STATE_FORM,
  TEACHER_STATE_LOCKED,
  useTeacherRegistrationContext,
} from "@/hooks/useTeacherRegistrationContext";
import { useTeacherWizardResume } from "@/hooks/useTeacherWizardResume";
import { useTeacherBasicDetailsPrefill } from "@/hooks/useTeacherSignup";
import { useTeacherProfessionalPrefill } from "@/hooks/useTeacherProfessionalDetails";
import { useTeacherDemoRecordings } from "@/hooks/useTeacherDemoRecorder";
import { useSubmitTeacherForReview, useTeacherStatusPoll } from "@/hooks/useTeacherReview";
import { useCityOptions, useCountryOptions, useStateOptions } from "@/hooks/useStudentDetailsSignup";
import { effectiveDemoChoice } from "@/utils/teacherDemoRecording";
import { isValidTeacherDemoLink } from "@/utils/teacherProfessionalDetails";
import { teacherStepPath } from "@/utils/teacherRegistrationSteps";
import { TEACHER_GENDER_OPTIONS } from "@/utils/teacherSignupValidation";
import {
  buildTeacherDocumentRows,
  buildTeacherPersonalRows,
  buildTeacherProfessionalRows,
  teacherFullName,
} from "@/utils/teacherReview";
import { expireSession, logoutEverywhere } from "@/utils/logout";

const labelOf = (options, value) => options?.find((option) => option.value === String(value))?.label || "";

// Locked (submitted, or on hold): the legacy "Demo Under Review" screen. It asks again every 30 s and moves the teacher on
// when the school has approved the profile (the step below sees the new stage).
function ReviewLock({ context, session }) {
  const personal = useTeacherBasicDetailsPrefill({ context, userId: session?.userId });
  const { check, checking } = useTeacherStatusPoll({ enabled: true });
  return (
    <TeacherUnderReview
      fullName={teacherFullName(personal.data)}
      schoolName={context.schoolName}
      onCheck={check}
      checking={checking}
      onLogout={() => logoutEverywhere(session)}
    />
  );
}

// The read-only review: everything it shows is read from the server, so a reload shows the same.
function ReviewContent({ context, session, school, onSubmitted }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = session?.userId;
  const [editingPersonal, setEditingPersonal] = useState(false); // the personal details popup (Edit on that section)
  const personal = useTeacherBasicDetailsPrefill({ context, userId });
  const professional = useTeacherProfessionalPrefill({ context, userId });
  const countries = useCountryOptions(context);
  const states = useStateOptions(context, personal.data?.countryId);
  const cities = useCityOptions(context, personal.data?.stateId);
  const linkMode = Boolean(professional.data?.linkMode);
  const demo = useTeacherDemoRecordings({ context, userId, enabled: professional.isSuccess && !linkMode });
  const submit = useSubmitTeacherForReview({ context, userId });

  if (personal.isError || professional.isError || (personal.isSuccess && !personal.data)) {
    return (
      <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-red-600">We couldn&apos;t load your details.</p>
        <Button
          type="button"
          className="mt-4 cursor-pointer"
          onClick={() => {
            personal.refetch();
            professional.refetch();
          }}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (!personal.data || !professional.data) return <FullScreenLoader />;

  const fields = professional.data.fields;
  let demoView = { kind: "none" };
  if (linkMode) {
    if (isValidTeacherDemoLink(fields.demoVedioLink)) demoView = { kind: "link", url: fields.demoVedioLink.trim() };
  } else if (demo.isPending) {
    demoView = { kind: "loading" };
  } else {
    const chosenId = effectiveDemoChoice(demo.data?.attempts, fields.demoMeetingId);
    const attempt = demo.data?.attempts.find((candidate) => candidate.meetingId === chosenId);
    if (attempt) demoView = { kind: "recording", attempt };
  }

  async function handleSubmit() {
    const result = await submit.mutateAsync();
    if (result.ok) {
      toast.success("Demo has been sent successfully for review");
      queryClient.invalidateQueries({ queryKey: [TEACHER_PROCESS_QUERY_KEY] });
      onSubmitted();
      return true;
    }
    if (result.sessionOut) {
      expireSession(context.schoolUUID);
      return false;
    }
    toast.error(result.message);
    // It may already have been submitted (another tab): ask where the teacher belongs now.
    queryClient.invalidateQueries({ queryKey: [TEACHER_PROCESS_QUERY_KEY] });
    return false;
  }

  return (
    <>
    <TeacherReview
      context={context}
      fullName={teacherFullName(personal.data)}
      personalRows={buildTeacherPersonalRows({
        fields: personal.data,
        genderLabel: labelOf(TEACHER_GENDER_OPTIONS, personal.data.gender),
        countryName: labelOf(countries.data, personal.data.countryId),
        stateName: labelOf(states.data, personal.data.stateId),
        cityName: labelOf(cities.data, personal.data.cityId),
      })}
      professionalRows={buildTeacherProfessionalRows({ fields, schoolNumericId: context.schoolNumericId })}
      documentRows={buildTeacherDocumentRows(professional.data.documents)}
      demo={demoView}
      // Personal details are edited right here (a popup, as in the student review); the professional ones, with
      // their documents and the demo, are on Step 2.
      onEdit={(step) => (step === 1 ? setEditingPersonal(true) : router.push(teacherStepPath(school, step)))}
      onBack={() => router.push(teacherStepPath(school, 2))}
      onSubmit={handleSubmit}
    />
    {editingPersonal && (
      <TeacherPersonalDetails
        context={context}
        userId={userId}
        initialFields={{ ...personal.data, communicationEmail: personal.data.communicationEmail || session?.email || "" }}
        onCancel={() => setEditingPersonal(false)}
        onNext={(fields, { changed }) => {
          // Keep the cached record in step with what was saved, so the review shows it at once.
          queryClient.setQueryData(["teacher-basic-details", userId], (old) => ({ ...(old || {}), ...fields }));
          setEditingPersonal(false);
          if (changed) toast.success("Personal details updated successfully.");
        }}
      />
    )}
    </>
  );
}

/**
 * Step 3 ("Review") content, rendered inside the shared wizard shell: the read-only review with Edit, Back and the
 * "Note" + Submit confirmation; once the profile is submitted (or while the school holds it) the "Demo Under Review"
 * screen takes its place and stays until the school approves.
 */
export function TeacherReviewStep() {
  const router = useRouter();
  const { school } = useParams();
  const { session, context, ready } = useTeacherRegistrationContext();
  const { redirecting } = useTeacherWizardResume({ currentStep: 3, context, ready });
  // Set the moment the submit succeeds, so the lock screen shows without waiting for the stage to be read again.
  const [submitted, setSubmitted] = useState(false);

  // The school approved the profile while the teacher was waiting here (the status check saw it): on to the next step.
  const nextStep = ready && context.state === TEACHER_STATE_FORM && context.wizardStep > 3 ? context.wizardStep : null;
  useEffect(() => {
    if (nextStep !== null) router.replace(teacherStepPath(school, nextStep));
  }, [nextStep, router, school]);

  if (!ready || redirecting || nextStep !== null) return <FullScreenLoader />;

  if (context.state === TEACHER_STATE_LOCKED || submitted) {
    return <ReviewLock context={context} session={session} />;
  }
  return <ReviewContent context={context} session={session} school={school} onSubmitted={() => setSubmitted(true)} />;
}
