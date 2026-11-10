import { BuyExtraClasses } from "@/components/student/cart/BuyExtraClasses";

// Route segment matches the live sidebar pageLink for "Buy Extra Classes"
// (student-addon), so this page overrides the student/[...module] catch-all.
export default async function BuyExtraClassesPage({ searchParams }) {
  const { subject } = await searchParams;
  return <BuyExtraClasses initialSubjectId={typeof subject === "string" ? subject : null} />;
}
