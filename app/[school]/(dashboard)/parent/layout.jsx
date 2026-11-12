import { ChildTabs } from "@/components/parent/ChildTabs";

// Every parent page is about one child, so the children sit side by side above the page content (legacy
// "Child 1: Mohammed . Grade 8" tabs). The selection itself lives in ParentChildProvider, mounted by DashboardChrome.
export default function ParentLayout({ children }) {
  return (
    <>
      <ChildTabs />
      {children}
    </>
  );
}
