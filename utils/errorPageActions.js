"use client";

import { signOut } from "next-auth/react";

// Primary action on the error/global-error/not-found pages. `signOut` here
// is the plain next-auth helper (not the useSession hook) — it just posts to
// the auth API route, so it's safe to call even where no SessionProvider is
// mounted (global-error.jsx replaces the root layout, so there's no
// provider tree there at all). If there's no session it's a harmless no-op;
// if there is one, it clears it before sending the user home, since landing
// back on the same broken, still-logged-in page would just repeat the error.
export async function goHomeFromErrorPage() {
  try {
    await signOut({ redirect: false });
  } catch {
    // Best-effort — still go home even if sign-out itself failed.
  }
  window.location.assign("/");
}
