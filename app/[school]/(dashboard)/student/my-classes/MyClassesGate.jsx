"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { FullScreenLoader } from "@/components/common/Loader";
import { StudentHomeForGrade } from "../StudentHomeForGrade";

/**
 * "My Classes" is a database module (MODULES / USER_RIGHTS): a student whose role has not been given it does not see it in the
 * left menu, and opening the address by hand does not work either - they are sent back to the dashboard home. The menu has to
 * have answered before that is decided (a menu still on its way is empty too), and a failed menu request also means "not given".
 */
export function MyClassesGate() {
  const { school } = useParams();
  const router = useRouter();
  const { menu, menuSettled } = useDashboardContext();
  const allowed = menu.some((item) => item.segment === "my-classes");

  useEffect(() => {
    if (menuSettled && !allowed) router.replace(`/${school}/student`);
  }, [menuSettled, allowed, router, school]);

  if (!menuSettled || !allowed) return <FullScreenLoader />;
  return <StudentHomeForGrade classes />;
}
