"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useModuleRights } from "@/hooks/useModuleRights";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5Handbook } from "@/components/k5/pages/K5Handbook";
import { useLabelTranslator } from "@/i18n/labels";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `/backend-static-assets/images/${file}`;
const IS_POLICIES_URL = "https://internationalschooling.org/policies-and-code-of-conduct-2025/";

/**
 * Student Handbook — legacy studentHandbook.js + studentHandbookContent.js. The handbook file is
 * the school's schoolSettingsLinks.batchStudHBookUrl; school 1 (International Schooling) gets its
 * own cover image and policies page, other schools link the handbook file itself. Module rights
 * (/api/v1/module) gate the page and give its title.
 */
export function StudentHandbook() {
  const t = useTranslations("handbook");
  const tc = useTranslations("common");
  // The module name comes from the rights call: handbook.moduleNames.<labelKey(name)>, else as sent.
  const moduleName = useLabelTranslator("handbook.moduleNames");
  const { context, isK5 } = useDashboardContext();
  const schoolNumericId = context?.schoolNumericId;
  const { waiting, rights, canView } = useModuleRights("student-handbook");
  const linksQuery = useQuery({
    queryKey: ["school-settings-links", schoolNumericId],
    queryFn: () => getSchoolSettingsLinks(schoolNumericId),
    enabled: schoolNumericId != null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const title = moduleName(rights?.moduleName) || t("title");
  const filePath = linksQuery.data?.batchStudHBookUrl || "";
  const isMainSchool = schoolNumericId == 1;
  const coverImage = assetUrl(isMainSchool ? "updated_handbook.jpeg" : "student-handbook.jpg");
  const policyLink = isMainSchool ? IS_POLICIES_URL : filePath;

  if (isK5) {
    return (
      <K5Handbook
        title={title}
        schoolName={context?.schoolName}
        loading={waiting || linksQuery.isLoading}
        canView={canView}
        filePath={filePath}
        policyLink={policyLink}
        coverImage={coverImage}
      />
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-3 px-1">
        <OptimizedImage src={assetUrl("Icon/sidebar/Child_Handbook.png")} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
        <h1 className="text-lg font-bold text-black sm:text-xl">{title}</h1>
      </div>

      <div className="rounded-[10px] border border-slate-200 bg-white px-4 py-6 sm:p-8">
        {waiting || linksQuery.isLoading ? (
          <p className="py-8 text-center text-black/50">{tc("status.loading")}</p>
        ) : !canView ? (
          <p className="py-8 text-center text-black/60">{t("noAccess")}</p>
        ) : (
          <div className="flex flex-col items-center text-center">
            <OptimizedImage src={coverImage} alt={t("title")} width={250} height={325} sizes="250px" className="h-auto w-full max-w-[250px]" />
            {filePath ? (
              <a
                href={filePath}
                target="_blank"
                rel="noreferrer"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-white hover:opacity-90 sm:w-auto"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("download")}
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-white opacity-60 sm:w-auto"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("download")}
              </button>
            )}
            <p className="mt-6 max-w-2xl text-sm text-black/80 sm:text-base">
              {t.rich("policyNote", {
                link: (chunks) =>
                  policyLink ? (
                    <a href={policyLink} target="_blank" rel="noreferrer" className="text-primary underline">
                      {chunks}
                    </a>
                  ) : (
                    chunks
                  ),
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
