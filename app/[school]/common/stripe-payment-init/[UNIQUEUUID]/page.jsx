import { PaymentGatewayInitView } from "@/components/common/PaymentGatewayInitView";

export default async function StripePaymentInitPage({ params }) {
  const { school } = await params;
  return <PaymentGatewayInitView gateway="stripe" schoolUUID={school} />;
}
