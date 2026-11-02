import { PaymentResponseView } from "@/components/common/PaymentResponseView";

// customReference is read from the path params inside
// PaymentResponseView (useParams); every query param the gateway appended is
// forwarded to the backend failure endpoint.
export default function PaymentResponseFailurePage() {
  return <PaymentResponseView mode="failure" />;
}
