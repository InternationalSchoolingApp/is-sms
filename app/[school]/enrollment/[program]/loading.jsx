import { FullScreenLoader } from "@/components/common/Loader";

// Route-segment loading UI while the enrollment page's client chunk loads;
// the form then shows its own "Preparing your enrollment form…" state.
export default function EnrollmentLoading() {
  return <FullScreenLoader />;
}
