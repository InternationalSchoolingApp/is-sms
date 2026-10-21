import { AddCreatePassword } from "@/components/add-enrollment/AddCreatePassword";

// Add-enrollment only: opened from the "Create password and unlock dashboard" button on the thank-you page.
export const metadata = { title: "Unlock your Student Dashboard", robots: { index: false, follow: false } };

export default async function AddEnrollmentCreatePasswordPage({ params }) {
  const { school } = await params;
  return <AddCreatePassword schoolUUID={school} />;
}
