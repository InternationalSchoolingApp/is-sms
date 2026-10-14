"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }) {
  // Polling the session is what refreshes the SMS access token before it expires (15 minutes; refreshed when under 5
  // minutes remain, see utils/tokenRefresh.js). The poll runs in /api/auth/session, which can write the new tokens
  // back to the cookie. Without SMS tokens it is a cheap read of the existing session.
  return <SessionProvider refetchInterval={240}>{children}</SessionProvider>;
}
