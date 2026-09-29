import { PaymentResponseScaffold } from "@/components/common/PaymentResponseScaffold";

export default function PaymentResponseFailurePage() {
  return (
    <PaymentResponseScaffold
      title="Payment Failed"
      route="/common/payment-response-failure/{customReference}/{UNIQUEUUID}"
    />
  );
}
