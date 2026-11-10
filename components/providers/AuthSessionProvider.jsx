"use client";

import { createContext, useContext } from "react";

/**
 * The signed-in user of this page, chosen by proxy.js for this tab's URL and read on the server
 * (lib/auth/session.js). Each tab has its own, so different users can work in different tabs.
 * Never holds a token: the access token stays on the server.
 */
const SessionContext = createContext({ data: null, status: "unauthenticated" });

export function AuthSessionProvider({ session, children }) {
  const value = session ? { data: session, status: "authenticated" } : { data: null, status: "unauthenticated" };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** The page's signed-in user: { data, status } (data is null when nobody is signed in). */
export function useSession() {
  return useContext(SessionContext);
}
