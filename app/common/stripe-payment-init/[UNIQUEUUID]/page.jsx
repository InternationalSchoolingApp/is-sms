import { PaymentGatewayInitView } from "@/components/common/PaymentGatewayInitView";

export default function StripePaymentInitPage() {
  return <PaymentGatewayInitView gateway="stripe" />;
}
