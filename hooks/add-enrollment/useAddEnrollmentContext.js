"use client";

import { createContext, useContext } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { enrollAnotherChild } from "@/services/studentSignupBackendApi";

/**
 * Context for the "Add Another Student" wizard
 * (/{school}/add-enrollment/{parentId}/{sessionUserId}/step/...).
 *
 * Unlike hooks/useEnrollmentContext.js (the main enrollment flow), the
 * student being enrolled here is NOT the logged-in session user:
 *   - session.userId   -> the CALLER (the parent themselves, or a sibling
 *                         student adding a brother/sister) — only used for
 *                         the sessionUserId URL-vs-session match (proxy.js).
 *   - childUserId/childUniqueId -> the child actually being enrolled, read
 *                         from enrollAnotherChild()'s response, never from
 *                         the session.
 *
 * `parentId` is the URL param (always the real parent, in both caller
 * scenarios). enrollAnotherChild() resumes the parent's existing
 * partially-enrolled child or creates a new one — safe to call on every
 * mount/refresh.
 */
const AddEnrollmentContext = createContext(null);

function useResolveAddEnrollmentContext() {
  const { parentId, sessionUserId } = useParams();
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);

  const enrollChild = useQuery({
    queryKey: ["add-enrollment-child", session?.schoolUUID, parentId],
    queryFn: () => enrollAnotherChild(session.schoolUUID, parentId),
    enabled: Boolean(authenticated && parentId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const childData = enrollChild.data?.data;
  const ready = authenticated && enrollChild.isFetched && Boolean(childData);

  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        parentId,
        sessionUserId,
        signupPage: childData.signupPage,
        learningProgram: "O", // resolved from get-student-details inside each stage, same as the main flow
      }
    : null;

  return {
    status,
    session,
    context,
    ready,
    // Child identity — stage pages use these instead of session.userId/uniqueId.
    childUserId: childData?.userId,
    childUniqueId: childData?.uniqueId,
    isError: enrollChild.isError,
  };
}

export function AddEnrollmentProvider({ children }) {
  const value = useResolveAddEnrollmentContext();
  return <AddEnrollmentContext.Provider value={value}>{children}</AddEnrollmentContext.Provider>;
}

export function useAddEnrollmentContext() {
  const value = useContext(AddEnrollmentContext);
  if (value === null) {
    throw new Error("useAddEnrollmentContext must be used within an AddEnrollmentProvider");
  }
  return value;
}
