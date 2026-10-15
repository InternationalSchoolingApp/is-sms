import { Suspense } from "react";
import { AddThankYou } from "@/components/add-enrollment/AddThankYou";

export default function AddEnrollmentThankYouPage() {
  // AddThankYou reads ?child= with useSearchParams, which needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <AddThankYou />
    </Suspense>
  );
}
