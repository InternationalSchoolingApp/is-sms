import { PaymentGatewayInitView } from "@/components/common/PaymentGatewayInitView";

export default async function AirwallexPaymentInitPage({ params }) {
  const { school } = await params;
  return <PaymentGatewayInitView gateway="airwallex" schoolUUID={school} />;
}
