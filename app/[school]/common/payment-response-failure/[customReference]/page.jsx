import { PaymentResponseView } from "@/components/common/PaymentResponseView";

export default async function PaymentResponseFailurePage({ params }) {
  const { school } = await params;
  return <PaymentResponseView mode="failure" schoolUUID={school} />;
}
