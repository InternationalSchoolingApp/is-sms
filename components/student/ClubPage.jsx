"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useClubModule } from "@/hooks/useClubModule";
import { useModuleRights } from "@/hooks/useModuleRights";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CLUBS } from "@/constant/Clubs";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5Club, K5ClubDoneDialog } from "@/components/k5/pages/K5Club";
import { picoSay } from "@/components/k5/pico/picoEvents";
import { useLabelTranslator } from "@/i18n/labels";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `/backend-static-assets/images/${file}`;

/**
 * One club page (e.g. Language Club > Spanish) — legacy clubsCommonContent.js getClubsCommonCard:
 * club image, "Be part of our {title}!", "Sign up today." pill and a Register Now button that
 * posts save-club-request, then the "You're all Set!" modal. Module rights come from
 * /api/v1/module, as legacy getContent() loads them before rendering any module.
 */
export function ClubPage({ pageLink }) {
  const t = useTranslations("clubs");
  const tc = useTranslations("common");
  // Club names: clubs.names.<labelKey(title)>; the title itself is still what save-club-request gets.
  const clubName = useLabelTranslator("clubs.names");
  const { context, isK5 } = useDashboardContext();
  const { waiting, canView } = useModuleRights(pageLink);
  const { register } = useClubModule({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const [registered, setRegistered] = useState(false);
  const club = CLUBS[pageLink];

  function applyForClub() {
    register.mutate(club.title, {
      onSuccess: (response) => {
        if (String(response?.status) === "1") {
          setRegistered(true);
          // The K–5 buddy cheers the student on (mockup clYay).
          if (isK5) picoSay(t("picoJoined"));
        }
        else toast.error(response?.message || t("unableToRegister"));
      },
      onError: () => toast.error(t("unableToRegister")),
    });
  }

  if (!club) return null;

  const noAccess = !waiting && !canView;

  if (isK5) {
    return (
      <>
        <K5Club
          pageLink={pageLink}
          club={club}
          imageSrc={assetUrl(`clubs/${club.image}`)}
          waiting={waiting}
          noAccess={noAccess}
          registered={registered}
          onRegister={applyForClub}
          pending={register.isPending}
        />
        <K5ClubDoneDialog open={registered} onClose={() => setRegistered(false)} />
      </>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto mt-2 max-w-[980px] rounded-[10px] border border-slate-200 bg-white px-4 py-6 sm:mt-4 sm:p-8">
        {waiting ? (
          <p className="py-8 text-center text-black/50">{tc("status.loading")}</p>
        ) : noAccess ? (
          <p className="py-8 text-center text-black/60">{t("noAccess")}</p>
        ) : (
          <div className="flex flex-col items-center text-center">
            <OptimizedImage
              src={assetUrl(`clubs/${club.image}`)}
              alt={clubName(club.title)}
              width={980}
              height={560}
              sizes="(max-width: 640px) 100vw, 65vw"
              className="h-auto w-full rounded-[10px] sm:max-w-[65%]"
            />
            <h4 className="mt-4 text-lg font-bold text-black sm:text-2xl">
              {club.subtitle ? t("bePartOfWithSubtitle", { club: clubName(club.title), subtitle: club.subtitle }) : t("bePartOf", { club: clubName(club.title) })}
            </h4>
            <p className="mt-3 flex items-center gap-1.5 rounded-full bg-[#FFEDD5] px-3 py-1 text-sm font-semibold text-[#C2410C]">
              <Rocket className="h-4 w-4" aria-hidden="true" />
              {t("signUpToday")}
            </p>
            <button
              type="button"
              onClick={applyForClub}
              disabled={register.isPending}
              className="mt-6 w-full rounded-[10px] bg-[linear-gradient(90deg,#027FFE_0%,#02B9CB_100%)] px-6 py-3 text-lg text-white disabled:opacity-70 sm:w-auto"
            >
              {register.isPending ? t("registering") : t("registerNow")}
            </button>
          </div>
        )}
      </div>

      <Dialog open={registered} onOpenChange={setRegistered}>
        <DialogContent className="text-center sm:max-w-[500px]">
          <OptimizedImage src={assetUrl("Awesome_Success_Check_Animation.gif")} alt="" width={100} height={100} className="mx-auto h-auto w-full max-w-[100px]" />
          <DialogTitle className="text-2xl font-semibold text-black">{t("allSet")}</DialogTitle>
          <p className="text-base text-black/80">
            {t("registrationReceived")}
            <br />
            {t("keepUpdated")}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
