import { SelectAnotherChildButton } from "@/components/parent/SelectAnotherChildButton";

// Every parent page is about one child. The child picker (cards) is the first screen; once a child is chosen, every
// page shows "Select Another Child" above its content to go back to it. The selection itself lives in
// ParentChildProvider, mounted by DashboardChrome.
export default function ParentLayout({ children }) {
  return (
    <>
      <SelectAnotherChildButton />
      {children}
    </>
  );
}
