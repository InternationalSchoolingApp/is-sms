import { ReviewAndPaymentStep } from "./ReviewAndPaymentStep";

// Server Component shell. The interactive wizard logic lives in
// ReviewAndPaymentStep (client); this page keeps the route a Server Component.
export default function StudentEnrollmentStep4Page() {
  return <ReviewAndPaymentStep />;
}
