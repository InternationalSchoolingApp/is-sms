import { BookClasses } from "@/components/student/bookClass/BookClasses";

// Route segment matches the live sidebar pageLink for "Book Classes"
// (book-a-session), so this page overrides the student/[...module] catch-all.
export default function BookClassesPage() {
  return <BookClasses />;
}
