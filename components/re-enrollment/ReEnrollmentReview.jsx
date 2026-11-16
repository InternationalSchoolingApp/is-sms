"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { FeeBreakdown } from "@/components/re-enrollment/FeeBreakdown";
import { ReEnrollmentStepCard as Card, ReEnrollmentStepTitle as PageTitle } from "./ReEnrollmentFlow";
import { MobileActionBar } from "@/components/student-enroll/wizard/MobileActionBar";
import { Button } from "@/components/ui/button";
import { buildPlanOptions } from "@/components/student-enroll/Stage4ReviewPayment";
import { STATUS_SUCCESS, useCompleteReEnrollment, useReEnrollmentContext, useReEnrollmentReview } from "@/hooks/useReEnrollment";
import { useReEnrollmentGateway } from "@/hooks/useReEnrollmentGateway";
import { useRequireSelectedOption } from "@/hooks/useRequireSelectedOption";
import { dashboardBasePath } from "@/utils/dashboardNav";
import { expireSession } from "@/utils/logout";
import { hidesCourseCredits } from "@/utils/studentSignupValidation";
import { previousStepBefore, reEnrollmentBasePath, reEnrollmentStepPath, STEP_REVIEW } from "@/utils/reEnrollmentSteps";

const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";

/**
 * REVIEW step in the legacy layout: "Kindly Review Your Details" bar, the Selected Courses card on the left and the
 * fee card on the right (when a payment is pending). Bottom: Back on the left, "Pay Now" (green) or
 * "Proceed to Dashboard" on the right.
 */
export function ReEnrollmentReview() {
  const allowed = useRequireSelectedOption(STEP_REVIEW);
  return allowed ? <ReviewScreen /> : <FullScreenLoader />;
}

function ReviewScreen() {
  const router = useRouter();
  const { school } = useParams();
  const { session, context, option, steps } = useReEnrollmentContext();
  const userId = session.userId;
  const reviewQuery = useReEnrollmentReview({ context, userId });
  const complete = useCompleteReEnrollment({ context, userId });
  const gateway = useReEnrollmentGateway({
    context,
    studentUserId: session.studentUserId,
    onPaid: () => window.location.assign(`${reEnrollmentBasePath(school)}?resume=1`),
    onSessionExpired: () => expireSession(school),
  });
  const [finishing, setFinishing] = useState(false);

  const data = reviewQuery.data?.status === STATUS_SUCCESS ? reviewQuery.data : null;
  const planOptions = useMemo(() => buildPlanOptions(data?.fee, data?.currencyIsoCode), [data]);
  const previous = previousStepBefore(steps, STEP_REVIEW);
  const busy = reviewQuery.isFetching || complete.isPending || gateway.busy || finishing;

  async function proceedToDashboard() {
    try {
      const response = await complete.mutateAsync();
      if (response?.status === "3") {
        expireSession(school);
      } else if (response?.status !== STATUS_SUCCESS) {
        toast.error(response?.message || "Could not complete your re-enrollment. Please try again.");
      } else {
        setFinishing(true);
        // Full load: the dashboard (menu, grade) has to be read again for the new academic year.
        window.location.assign(dashboardBasePath(school));
      }
    } catch (err) {
      console.error("ReEnrollmentReview complete failed:", err);
      toast.error(GENERIC_ERROR);
    }
  }

  if (reviewQuery.isLoading || finishing) return <FullScreenLoader />;

  if (!data) {
    return (
      <>
        <PageTitle>Kindly Review Your Details</PageTitle>
        <Card>
          <p className="text-sm font-semibold text-red-600">{reviewQuery.data?.message || "Could not load your review details."}</p>
          <div className="mt-4 flex gap-3">
            {previous && (
              <Button type="button" className="bg-slate-500 hover:bg-slate-600" onClick={() => router.push(reEnrollmentStepPath(school, previous))}>
                Back
              </Button>
            )}
            <Button type="button" onClick={() => reviewQuery.refetch()} disabled={reviewQuery.isFetching}>
              Try again
            </Button>
          </div>
        </Card>
      </>
    );
  }

  const course = data.course;
  const fee = data.fee;
  const showCredits = !hidesCourseCredits(course?.standardId);
  const alreadyPaid = fee?.feeAlreayPaid;
  const selectedOption =
    planOptions.find((o) => o.mode === fee?.paymentMode || o.variants?.some((v) => v.mode === fee?.paymentMode)) ?? planOptions[0];
  const feeTitle = `Selected Fee Plan ${selectedOption?.kind === "annual" ? "(One-Time)" : selectedOption?.kind === "registration" ? "(Reserve an Enrollment Seat)" : "(Pay in easy installments)"}`;
  const hasCourses = (course?.courseDTO || []).length > 0;
  // Legacy review: next grade / repeat with the grade fee already paid shows the advance plan's lines (and payable fee),
  // unless the plan is the reserve-a-seat or a custom one.
  const payMode = course?.payMode || fee?.paymentMode;
  const useAdvanceFee =
    ["REGISTRATION_NEXT_GRADE", "REGISTRATION_REPEAT_GRADE"].includes(data.enrollmentType) &&
    data.advanceFeeApplied &&
    payMode !== "registration" &&
    !String(payMode || "").startsWith("c_");

  return (
    <>
      <PageTitle>Kindly Review Your Details</PageTitle>
      <div className={`grid items-start gap-4 md:gap-8 ${data.paymentRequired && hasCourses ? "lg:grid-cols-[555fr_723fr]" : ""} ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
        {hasCourses && (
          <Card header="Selected Courses" headerRight={course?.standardName}>
            <table className="w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Course Name</th>
                  {showCredits && <th className="px-3 py-2 text-left font-bold">Credit</th>}
                </tr>
              </thead>
              <tbody>
                {course.courseDTO.map((c, index) => (
                  <tr key={index} className="border-t border-slate-200">
                    <td className="px-3 py-2">{c.courseName}</td>
                    {showCredits && <td className="px-3 py-2">{c.creditScore}</td>}
                  </tr>
                ))}
              </tbody>
              {showCredits && (
                <tfoot className="bg-slate-100">
                  <tr className="border-t border-slate-200">
                    <th className="px-3 py-2 text-left">Total Credit</th>
                    <th className="px-3 py-2 text-left">{course.totalCredit}</th>
                  </tr>
                </tfoot>
              )}
            </table>
            {alreadyPaid?.totalEntityFee > 0 && (
              <div className="mt-2 flex items-center gap-3 rounded-[10px] border border-green-500 bg-[#F0FDF4] p-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h6 className="text-xs font-semibold text-black">Fee Already Paid (Advance Fee)</h6>
                  <p className="text-xs text-slate-600">Your advance fee has been received successfully</p>
                  <span className="text-xs font-bold text-black">THANK YOU!</span>
                </div>
                <div className="border-l border-dashed border-green-500 px-2 text-black">
                  <span className="block text-xs font-bold">PAID AMOUNT</span>
                  <h6 className="text-sm font-bold">{alreadyPaid.totalEntityFeeString}</h6>
                </div>
              </div>
            )}
          </Card>
        )}
        {data.paymentRequired && fee && (
          <Card header={feeTitle}>
            <FeeBreakdown fee={fee} option={selectedOption} variantMode={fee.paymentMode} gradeName={course?.standardName || data.grade?.name} advance={useAdvanceFee} courseFeeLabel="Course Fee" />
            <p className="mt-2 text-center text-xs text-slate-500">
              <b>Note:</b> All fees mentioned above are in {data.currencyIsoCode || "USD"}
            </p>
          </Card>
        )}
      </div>

      <MobileActionBar context={context} embedded>
        {previous ? (
          <Button type="button" variant="outline" className="px-4" disabled={busy} onClick={() => router.push(reEnrollmentStepPath(school, previous))}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {data.paymentRequired ? (
          <div className="flex items-center gap-2">
            {/* Legacy "Pay Later": with the advance already paid the student may skip the remaining amount for now. */}
            {data.advanceFeeApplied && (
              <Button type="button" className="px-6" disabled={busy} onClick={proceedToDashboard}>
                {busy ? "Please wait…" : "Pay Later"}
              </Button>
            )}
            <Button type="button" className="px-4" disabled={busy} onClick={() => gateway.start(data)}>
              {busy ? "Please wait…" : "Pay Now"}
            </Button>
          </div>
        ) : (
          <Button type="button" className="px-6" disabled={busy} onClick={proceedToDashboard}>
            {busy ? "Please wait…" : "Proceed to Dashboard"}
          </Button>
        )}
      </MobileActionBar>
      {gateway.modals}
    </>
  );
}
