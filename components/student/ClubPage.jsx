"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useClubModule } from "@/hooks/useClubModule";
import { useModuleRights } from "@/hooks/useModuleRights";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CLUBS } from "@/constant/Clubs";
import { resolveBackendOrigin } from "@/utils/backendOrigin";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5Club, K5ClubDoneDialog } from "@/components/k5/pages/K5Club";
import { picoSay } from "@/components/k5/pico/picoEvents";

// Backend static assets (legacy PATH_FOLDER_IMAGE2).
const assetUrl = (file) => `${resolveBackendOrigin()}/static/theme2/images/${file}`;

/**
 * One club page (e.g. Language Club > Spanish) — legacy clubsCommonContent.js getClubsCommonCard:
 * club image, "Be part of our {title}!", "Sign up today." pill and a Register Now button that
 * posts save-club-request, then the "You're all Set!" modal. Module rights come from
 * /api/v1/module, as legacy getContent() loads them before rendering any module.
 */
export function ClubPage({ pageLink }) {
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
          if (isK5) picoSay("Yay! You joined the club!");
        }
        else toast.error(response?.message || "Unable to register right now. Please try again.");
      },
      onError: () => toast.error("Unable to register right now. Please try again."),
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
          <p className="py-8 text-center text-black/50">Loading…</p>
        ) : noAccess ? (
          <p className="py-8 text-center text-black/60">You do not have access to this club.</p>
        ) : (
          <div className="flex flex-col items-center text-center">
            <OptimizedImage
              src={assetUrl(`clubs/${club.image}`)}
              alt={club.title}
              width={980}
              height={560}
              sizes="(max-width: 640px) 100vw, 65vw"
              className="h-auto w-full rounded-[10px] sm:max-w-[65%]"
            />
            <h4 className="mt-4 text-lg font-bold text-black sm:text-2xl">
              Be part of our {club.title}!{club.subtitle ? ` – ${club.subtitle}` : ""}
            </h4>
            <p className="mt-3 flex items-center gap-1.5 rounded-full bg-[#FFEDD5] px-3 py-1 text-sm font-semibold text-[#C2410C]">
              <Rocket className="h-4 w-4" aria-hidden="true" />
              Sign up today.
            </p>
            <button
              type="button"
              onClick={applyForClub}
              disabled={register.isPending}
              className="mt-6 w-full rounded-[10px] bg-[linear-gradient(90deg,#027FFE_0%,#02B9CB_100%)] px-6 py-3 text-lg text-white disabled:opacity-70 sm:w-auto"
            >
              {register.isPending ? "Registering…" : "Register Now"}
            </button>
          </div>
        )}
      </div>

      <Dialog open={registered} onOpenChange={setRegistered}>
        <DialogContent className="text-center sm:max-w-[500px]">
          <OptimizedImage src={assetUrl("Awesome_Success_Check_Animation.gif")} alt="" width={100} height={100} className="mx-auto h-auto w-full max-w-[100px]" />
          <DialogTitle className="text-2xl font-semibold text-black">You&apos;re all Set!</DialogTitle>
          <p className="text-base text-black/80">
            Registration received.
            <br />
            We&apos;ll keep you updated.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
