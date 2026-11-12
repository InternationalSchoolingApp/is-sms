"use client";

import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { ChildPicker } from "@/components/parent/ChildPicker";

/**
 * Wraps a parent page that is about one child: renders the page once a child is selected. A parent with children
 * always has one (Child 1 until another tab is chosen), so the fallback only shows for a parent with no children.
 */
export function ParentChildRequired({ children }) {
  const { selectedChild } = useSelectedChild();
  return selectedChild ? children : <ChildPicker />;
}
