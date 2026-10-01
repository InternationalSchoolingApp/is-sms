import { FullScreenLoader } from "@/components/common/Loader";

// Route-segment loading UI for every wizard step (/step/*). Shown while the
// step's server segment and client chunk load on navigation, before the
// step's own readiness gate takes over. Reuses the shared FullScreenLoader.
export default function StepLoading() {
  return <FullScreenLoader />;
}
