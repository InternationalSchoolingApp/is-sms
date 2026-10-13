import { PaymentEmbeddedView } from "@/components/common/PaymentEmbeddedView";

// Stripe Embedded Checkout, shown inside this page (so it can run in the dashboard's iframe).
export default function StripeEmbeddedPage() {
  return <PaymentEmbeddedView gateway="stripe" />;
}
