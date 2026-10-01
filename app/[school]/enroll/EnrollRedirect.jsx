"use client";

import { useEffect, useRef } from "react";

export function EnrollRedirect({ school, learningProgram, payload, decodedPayload }) {
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;

    const storageKey = `enrollment-bootstrap:${school}:${learningProgram}`;
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ payload, decodedPayload })
    );
    window.location.replace(
      `/${encodeURIComponent(school)}/enrollment/${encodeURIComponent(learningProgram)}`
    );
  }, [school, learningProgram, payload, decodedPayload]);

  return null;
}
