import { PaymentResponseView } from "@/components/common/PaymentResponseView";

export default async function OtherPaymentResponseSuccessPage({ params }) {
  const { school } = await params;
  return <PaymentResponseView endpointPath="other-payment-response-success" schoolUUID={school} />;
}
