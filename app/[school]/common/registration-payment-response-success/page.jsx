import { PaymentResponseView } from "@/components/common/PaymentResponseView";

export default async function RegistrationPaymentResponseSuccessPage({ params }) {
  const { school } = await params;
  return <PaymentResponseView endpointPath="registration-payment-response-success" schoolUUID={school} />;
}
