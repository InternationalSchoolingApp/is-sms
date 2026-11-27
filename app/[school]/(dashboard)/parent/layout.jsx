// Every parent page is about one child. The child picker (cards) is the first screen; the selection itself lives in
// ParentChildProvider, mounted by DashboardChrome. "Select Another Child" is on the home's top row (HomeTopRow), as in the design.
export default function ParentLayout({ children }) {
  return children;
}
