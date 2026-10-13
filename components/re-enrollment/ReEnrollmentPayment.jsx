"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CreditCard } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { ActionButton, PageTitle } from "@/components/re-enrollment/ReEnrollmentParts";
import { FeePaymentPlans } from "@/components/student-enroll/FeePaymentPlans";
import { buildPlanOptions } from "@/components/student-enroll/Stage4ReviewPayment";
import {
  STATUS_SUCCESS,
  useChooseReEnrollmentPlan,
  useFetchReEnrollmentReview,
  useReEnrollmentContext,
  useReEnrollmentPaymentDetails,
} from "@/hooks/useReEnrollment";
import { useReEnrollmentGateway } from "@/hooks/useReEnrollmentGateway";
import { useRequireSelectedOption } from "@/hooks/useRequireSelectedOption";
import { expireSession } from "@/utils/logout";
import { isKnownPaymentMode } from "@/utils/studentSignupValidation";
import {
  nextStepAfter,
  previousStepBefore,
  reEnrollmentBasePath,
  reEnrollmentStepPath,
  STEP_COURSE_SELECTION,
  STEP_PAYMENT,
} from "@/utils/reEnrollmentSteps";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
const FLEX_OR_DUAL = ["ONE_TO_ONE_FLEX", "DUAL_DIPLOMA"];

/**
 * PAYMENT step, laid out like the enrollment's review and payment screen: "Select Payment Option" with the fee plans on
 * the page itself (no modal), and "Continue to Pay". The chosen plan is saved with choose-payment-plan and then:
 *  - payment first (the next step is the course selection): the payment gateway starts right away, the student comes back
 *    after paying and continues with the courses;
 *  - courses first (Flexy / Dual Diploma / individual course): the review screen follows, where the payment is made.
 */
export function ReEnrollmentPayment() {
  const allowed = useRequireSelectedOption(STEP_PAYMENT);
  return allowed ? <PaymentScreen /> : <FullScreenLoader />;
}

function PaymentScreen() {
  const router = useRouter();
  const { school, mode } = useParams();
  const { session, context, option, steps } = useReEnrollmentContext();
  const userId = session.userId;
  const detailsQuery = useReEnrollmentPaymentDetails({ context, userId });
  const choosePlan = useChooseReEnrollmentPlan({ context, userId });
  const fetchReview = useFetchReEnrollmentReview({ context, userId });
  const gateway = useReEnrollmentGateway({
    context,
    uniqueId: session.uniqueId,
    // Paid while this page was waiting on the gateway: the entry screen resumes at the right step.
    onPaid: () => window.location.assign(`${reEnrollmentBasePath(school, mode)}?resume=1`),
    onSessionExpired: () => expireSession(school),
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const data = detailsQuery.data?.status === STATUS_SUCCESS ? detailsQuery.data : null;
  const planOptions = useMemo(() => buildPlanOptions(data, data?.currencyIsoCode), [data]);

  // The student's own pick wins, else the plan saved on the backend, else the first one.
  const preferredMode = data?.paymentMode;
  const preferredOption = planOptions.find((o) => o.mode === preferredMode || o.variants?.some((v) => v.mode === preferredMode));
  const currentPlan = selectedPlan ?? preferredOption?.key ?? planOptions[0]?.key;
  const currentOption = planOptions.find((o) => o.key === currentPlan);
  const currentVariant =
    selectedVariant ??
    (currentOption?.variants?.some((v) => v.mode === preferredMode) ? preferredMode : currentOption?.variants?.[0]?.mode);
  const currentPayMode = currentOption?.variants ? currentVariant : currentOption?.mode;

  const next = nextStepAfter(steps, STEP_PAYMENT);
  const previous = previousStepBefore(steps, STEP_PAYMENT);
  const payNow = next === STEP_COURSE_SELECTION;
  const busy = choosePlan.isPending || fetchReview.isPending || gateway.busy;

  function handleFailure(response, fallback) {
    if (!response) toast.error(GENERIC_ERROR);
    else if (response.status === "3") expireSession(school);
    else toast.error(response.message || fallback);
  }

  async function onContinue() {
    if (busy || !currentOption) return;
    try {
      const plan = await choosePlan.mutateAsync(isKnownPaymentMode(currentPayMode) ? currentPayMode : "annually");
      if (plan?.status !== STATUS_SUCCESS) {
        handleFailure(plan, "Could not save your payment plan. Please try again.");
        return;
      }
      if (!payNow) {
        router.push(reEnrollmentStepPath(school, next, mode));
        return;
      }
      // The payment record just created is what the gateway has to be started for; the review API returns it.
      const review = await fetchReview.mutateAsync();
      if (review?.status !== STATUS_SUCCESS || !review.paymentRequired) {
        handleFailure(review, "Could not find your payment. Please try again.");
        return;
      }
      await gateway.start(review);
    } catch (err) {
      console.error("ReEnrollmentPayment continue failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  if (detailsQuery.isLoading) return <FullScreenLoader />;

  return (
    <>
      <PageTitle icon={CreditCard}>
        <span className="text-primary">Payment for </span>
        <b>{option.grade?.name}</b>
        {option.learningProgramLabel && <span className="ml-2 rounded bg-primary px-2 text-sm text-white">{option.learningProgramLabel}</span>}
      </PageTitle>

      {!data ? (
        <div className="rounded-[15px] bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-red-600">{detailsQuery.data?.message || "Could not load your payment options."}</p>
          <div className="mt-4 flex gap-3">
            {previous && (
              <ActionButton className="bg-slate-500 hover:bg-slate-600" onClick={() => router.push(reEnrollmentStepPath(school, previous, mode))}>
                Back
              </ActionButton>
            )}
            <ActionButton onClick={() => detailsQuery.refetch()} disabled={detailsQuery.isFetching}>
              Try again
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className={`mx-auto max-w-4xl ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
          <h2 className="mb-3 text-center text-base font-semibold text-black md:text-lg">Select Payment Option</h2>
          <FeePaymentPlans
            fee={data}
            options={planOptions}
            selected={currentPlan}
            onSelect={setSelectedPlan}
            selectedVariant={currentVariant}
            onSelectVariant={setSelectedVariant}
            disabled={busy}
            standardId={option.grade?.id}
            isFlexOrDual={FLEX_OR_DUAL.includes(option.learningProgram)}
          />
          {payNow && <p className="mt-3 text-center text-sm text-slate-600">You will choose your courses after the payment.</p>}
          <div className="mt-4 flex items-center justify-between gap-3">
            {previous ? (
              <ActionButton className="px-6" disabled={busy} onClick={() => router.push(reEnrollmentStepPath(school, previous, mode))}>
                Back
              </ActionButton>
            ) : (
              <span />
            )}
            <ActionButton className="bg-green-600 px-6 hover:bg-green-700" disabled={busy || !currentOption} onClick={onContinue}>
              {busy ? "Please wait…" : payNow ? "Continue to Pay" : "Continue"}
            </ActionButton>
          </div>
        </div>
      )}
      {gateway.modals}
    </>
  );
}
