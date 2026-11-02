"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useModuleRights } from "@/hooks/useModuleRights";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { resolveBackendOrigin } from "@/utils/backendOrigin";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;
const IS_POLICIES_URL = "https://internationalschooling.org/student-policies-and-code-of-conduct/";

/**
 * Student Handbook — legacy studentHandbook.js + studentHandbookContent.js. The handbook file is
 * the school's schoolSettingsLinks.batchStudHBookUrl; school 1 (International Schooling) gets its
 * own cover image and policies page, other schools link the handbook file itself. Module rights
 * (/api/v1/module) gate the page and give its title.
 */
export function StudentHandbook() {
  const { context } = useDashboardContext();
  const schoolNumericId = context?.schoolNumericId;
  const { waiting, rights, canView } = useModuleRights("student-handbook");
  const linksQuery = useQuery({
    queryKey: ["school-settings-links", schoolNumericId],
    queryFn: () => getSchoolSettingsLinks(schoolNumericId),
    enabled: schoolNumericId != null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const title = rights?.moduleName || "Student Handbook";
  const filePath = linksQuery.data?.batchStudHBookUrl || "";
  const isMainSchool = schoolNumericId == 1;
  const coverImage = assetUrl(isMainSchool ? "updated_handbook.jpeg" : "student-handbook.jpg");
  const policyLink = isMainSchool ? IS_POLICIES_URL : filePath;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3 px-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- legacy backend asset */}
        <img src={assetUrl("Icon/sidebar/Child_Handbook.png")} alt="" className="h-9 w-9 object-contain" />
        <h1 className="text-lg font-bold text-black sm:text-xl">{title}</h1>
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-white px-4 py-6 sm:p-8">
        {waiting || linksQuery.isLoading ? (
          <p className="py-8 text-center text-black/50">Loading…</p>
        ) : !canView ? (
          <p className="py-8 text-center text-black/60">You do not have access to this module.</p>
        ) : (
          <div className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- legacy backend asset */}
            <img src={coverImage} alt="Student Handbook" className="w-full max-w-[250px]" />
            {filePath ? (
              <a
                href={filePath}
                target="_blank"
                rel="noreferrer"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-white hover:opacity-90 sm:w-auto"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download Handbook
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-white opacity-60 sm:w-auto"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download Handbook
              </button>
            )}
            <p className="mt-6 max-w-2xl text-sm text-black/80 sm:text-base">
              It is the responsibility of the student and the parent to keep a check on the updated terms and policies of
              the school.{" "}
              {policyLink ? (
                <a href={policyLink} target="_blank" rel="noreferrer" className="text-primary underline">
                  Click Here
                </a>
              ) : (
                "Click Here"
              )}{" "}
              to know more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
