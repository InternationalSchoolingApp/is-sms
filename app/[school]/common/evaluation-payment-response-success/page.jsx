import { PaymentResponseView } from "@/components/common/PaymentResponseView";

export default async function EvaluationPaymentResponseSuccessPage({ params }) {
  const { school } = await params;
  return <PaymentResponseView endpointPath="evaluation-payment-response-success" schoolUUID={school} />;
}
