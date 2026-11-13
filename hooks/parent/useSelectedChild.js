"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardContext } from "@/hooks/useDashboardContext";

/**
 * Which child the parent is looking at. The parent dashboard's counterpart of "the student is the session
 * user": every parent page is about ONE child, and this holds who.
 *
 * The choice is NOT in the URL, so there is no child id in the address bar to read or edit. It lives in this
 * provider (the page's memory) and in sessionStorage per account (this tab only), which is how it survives a
 * reload. The stored id is only ever trusted after it is found in the children the parent gate returned for
 * this parent: anything else (edited storage, a child that left the account) is ignored. The first child is
 * selected until another is chosen (the legacy tabs open on Child 1).
 *
 * This is not the access check. Every parent endpoint verifies server-side that the child belongs to the signed-in
 * parent (parent-student mapping), so a tampered request is refused whatever the browser sends.
 */
const ParentChildContext = createContext(null);

const storageKey = (uniqueId) => `is-parent-child:${uniqueId}`;
const LEGACY_URL_PARAM = "child"; // an earlier build kept the id in ?child=; old bookmarks are cleaned of it

function readStored(key) {
  if (!key) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null; // storage unavailable (private mode): the choice lasts until reload
  }
}

function writeStored(key, value) {
  if (!key) return;
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    // ignore: see readStored
  }
}

export function ParentChildProvider({ children: content }) {
  const { parentChildren, session, gradeResolved } = useDashboardContext();
  const router = useRouter();
  const pathname = usePathname();
  const key = session?.uniqueId ? storageKey(session.uniqueId) : null;
  const [picked, setPicked] = useState(null);

  const byId = useMemo(() => new Map(parentChildren.map((c) => [String(c.userId), c])), [parentChildren]);

  // The pick made on this page, else the one stored for this tab, else the only child (a parent with one child skips
  // the picker). With several children and no pick yet, nothing is selected and the child picker shows. Each choice is
  // checked against the gate's list, so an id that is not one of this parent's children never selects anything.
  let selectedId = null;
  if (parentChildren.length > 0) {
    const stored = readStored(key);
    if (picked && byId.has(picked)) selectedId = picked;
    else if (stored && byId.has(stored)) selectedId = stored;
    else if (parentChildren.length === 1) selectedId = String(parentChildren[0].userId);
  }

  // A link from the earlier build may still carry ?child=: take it out of the address bar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has(LEGACY_URL_PARAM)) return;
    params.delete(LEGACY_URL_PARAM);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router]);

  const selectChild = (userId) => {
    const id = String(userId);
    if (!byId.has(id)) return;
    writeStored(key, id);
    setPicked(id);
  };

  // "Select Another Child": forget the choice, which brings back the picker.
  const clearChild = () => {
    writeStored(key, null);
    setPicked(null);
  };

  const value = {
    children: parentChildren,
    selectedChild: selectedId ? byId.get(selectedId) : null,
    selectChild,
    clearChild,
    isLoading: !gradeResolved,
  };

  return <ParentChildContext.Provider value={value}>{content}</ParentChildContext.Provider>;
}

/** { children, selectedChild, selectChild(userId), clearChild(), isLoading } — parent dashboard only. */
export function useSelectedChild() {
  const value = useContext(ParentChildContext);
  if (value === null) {
    throw new Error("useSelectedChild must be used within a ParentChildProvider");
  }
  return value;
}

/** The same, or null when not inside a parent dashboard (the shared shell uses it for both roles). */
export function useOptionalSelectedChild() {
  return useContext(ParentChildContext);
}
