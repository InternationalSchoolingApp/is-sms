import { PaymentEmbeddedView } from "@/components/common/PaymentEmbeddedView";

// Airwallex Drop-in, shown inside this page (so it can run in the dashboard's iframe).
export default function AirwallexEmbeddedPage() {
  return <PaymentEmbeddedView gateway="airwallex" />;
}
