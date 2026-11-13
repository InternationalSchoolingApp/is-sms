"use client";

import { ArrowRight, CheckCircle2, ChevronRight, Feather } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { K5Loading, K5BlockSkeleton, K5CardsSkeleton } from "@/components/k5/K5Skeletons";

// The three groups of the sidebar and how the mockup colours them.
const GROUPS = {
  language: { name: "Language Club", icon: "🌍", tint: "#E4EEFE", ink: "#1D6FE8" },
  social: { name: "Social Club", icon: "🤝", tint: "#FFEBD6", ink: "#C2410C" },
  esports: { name: "E-Sports Club", icon: "🎮", tint: "#EDE5FF", ink: "#5B33C9" },
};
const LANGUAGE_CLUBS = new Set(["spanish-club", "french-club", "german-club", "english-club", "chinese-club"]);
const ESPORTS_CLUBS = new Set([
  "focus-reaction-training-club",
  "skill-development-club",
  "team-communication-club",
  "online-tournaments-club",
  "strategy-games-club",
  "competitive-gaming",
  "global-competitions-club",
  "game-strategy-analysis-club",
]);

export function clubGroup(pageLink) {
  if (LANGUAGE_CLUBS.has(pageLink)) return "language";
  if (ESPORTS_CLUBS.has(pageLink)) return "esports";
  return "social";
}

// Where each language club's culture card takes the student (mockup: Spain for Spanish).
const LANGUAGE_PLACES = {
  "spanish-club": ["Spanish", "Spain"],
  "french-club": ["French", "France"],
  "german-club": ["German", "Germany"],
  "chinese-club": ["Chinese", "China"],
  "english-club": ["English", "English-speaking countries"],
};

/** The "What you'll do" cards (mockup): one set each for the language, social and e-sports clubs. */
function activitiesFor(pageLink) {
  const group = clubGroup(pageLink);
  if (group === "language") {
    const [lang, place] = LANGUAGE_PLACES[pageLink] ?? ["a new language", "the world"];
    return [
      ["🗣️", `Speak ${lang}`, "Say hello, count and chat with friends."],
      ["🎵", "Songs & stories", "Sing fun songs and read short stories."],
      ["🎉", "Culture fun", `Explore food, festivals and places in ${place}.`],
    ];
  }
  if (group === "esports") {
    return [
      ["👫", "Team up", "Play together with friends as one team."],
      ["⚡", "Build skills", "Get faster, smarter and calmer."],
      ["🏅", "Fair play", "Win kindly and lose with a smile."],
    ];
  }
  // Social Club (Student Council, Debate, Book, Art...): the mockup's three cards.
  if (group === "social") {
    return [
      ["💡", "Share ideas", "Tell us how to make school even better."],
      ["🗳️", "Vote together", "Choose class helpers and fun projects."],
      ["🤝", "Help friends", "Plan events and welcome new students."],
    ];
  }
  return [];
}
const CARD_COLORS = [
  { bg: "#E4EEFE", bd: "#9EC3FA" },
  { bg: "#FFF4D6", bd: "#F2C94C" },
  { bg: "#E2F3E6", bd: "#8FD3A2" },
];

/** K–5 look of a club page (mockup Language / Social / E-Sports Club): the same image, rights and Register Now as the existing page. */
export function K5Club({ pageLink, club, imageSrc, waiting, noAccess, registered, onRegister, pending }) {
  const group = GROUPS[clubGroup(pageLink)];
  usePicoContentReady(!waiting);
  const name = club.title.replace(/ Club$/, "");
  const acts = activitiesFor(pageLink);
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 font-k5-display text-base font-semibold" style={{ background: group.tint, color: group.ink }}>
          <span aria-hidden="true" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-k5-card text-base">{group.icon}</span>
          {group.name}
        </span>
        <ChevronRight className="h-[18px] w-[18px] text-k5-mut" strokeWidth={3} aria-hidden="true" />
        <h1 className="m-0 font-k5-display text-[30px] font-semibold leading-[1.1]">{name}</h1>
      </div>

      {waiting ? (
        <K5Loading label="Loading the club">
          <K5BlockSkeleton height={180} />
          <K5CardsSkeleton count={3} />
        </K5Loading>
      ) : noAccess ? (
        <p className={`${K5_CARD} m-0 p-8 text-center font-k5-display text-2xl font-semibold text-k5-mut`}>You do not have access to this club.</p>
      ) : (
        <>
          <section aria-labelledby="k5-club" className={`${K5_CARD} grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] items-stretch gap-5 p-[18px] max-[760px]:grid-cols-1`}>
            <div className="relative min-h-[320px] overflow-hidden rounded-[22px] bg-k5-soft max-[760px]:min-h-[220px]">
              <OptimizedImage src={imageSrc} alt={club.title} fill sizes="(max-width: 760px) 100vw, 60vw" className="object-cover" />
            </div>
            <div className="relative flex flex-col justify-center gap-3.5 px-2.5 py-4">
              <h2 id="k5-club" className="m-0 font-k5-display text-[30px] font-semibold leading-[1.15]">
                Be part of our {club.title}!{club.subtitle ? ` – ${club.subtitle}` : ""}
              </h2>
              <span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-3.5 py-1.5 text-base font-black text-[#C2410C] shadow-[0_3px_0_rgba(10,16,34,0.12)]">
                <Feather className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
                Sign up today.
              </span>
              {registered ? (
                <span className="flex min-h-[60px] items-center justify-center gap-2.5 rounded-full bg-k5-gt font-k5-display text-[22px] font-semibold text-k5-gx">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
                  You&apos;re registered!
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onRegister}
                  disabled={pending}
                  className="flex min-h-[60px] cursor-pointer items-center justify-center gap-2.5 rounded-full border-none bg-k5-ac font-k5-display text-[22px] font-semibold text-white shadow-[0_6px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-70"
                >
                  {pending ? "Registering…" : "Register Now"}
                  {!pending && <ArrowRight className="h-[22px] w-[22px]" strokeWidth={3} aria-hidden="true" />}
                </button>
              )}
            </div>
          </section>

          {acts.length > 0 && (
            <section aria-labelledby="k5-club-do" className="flex flex-col gap-3.5">
              <h2 id="k5-club-do" className="m-0 ps-1 font-k5-display text-2xl font-semibold">What you&apos;ll do</h2>
              <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-[18px] gap-y-[30px] p-0 pt-[30px]">
                {acts.map(([icon, title, text], i) => (
                  <li
                    key={title}
                    className="k5-clact relative flex flex-col items-center gap-1.5 rounded-3xl bg-k5-card px-[18px] pb-[18px] pt-11 text-center"
                    style={{ border: `3px solid ${CARD_COLORS[i].bd}`, boxShadow: `0 6px 0 ${CARD_COLORS[i].bd}` }}
                  >
                    <span
                      aria-hidden="true"
                      className="k5-clactic absolute -top-[30px] left-1/2 -ml-8 flex h-16 w-16 items-center justify-center rounded-full text-[32px] leading-none"
                      style={{ background: CARD_COLORS[i].bg, border: `3px solid ${CARD_COLORS[i].bd}` }}
                    >
                      {icon}
                    </span>
                    <span aria-hidden="true" className="absolute start-3 top-2.5 flex h-7 w-7 items-center justify-center rounded-full font-k5-display text-[15px] font-bold text-[#1C2640]" style={{ background: CARD_COLORS[i].bd }}>
                      {i + 1}
                    </span>
                    <span className="font-k5-display text-xl font-semibold">{title}</span>
                    <span className="text-[15px] font-extrabold leading-[1.4] text-k5-mut">{text}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** "You're all Set!" after registering (mockup club registered dialog). */
export function K5ClubDoneDialog({ open, onClose }) {
  const themeProps = useK5ThemeProps(
    "flex flex-col items-center gap-3 rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[26px] text-center text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[460px]",
  );
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} {...themeProps}>
        <span aria-hidden="true" className="text-[64px] leading-none">🎉</span>
        <DialogTitle className="m-0 font-k5-display text-[28px] font-semibold">You&apos;re all Set!</DialogTitle>
        <DialogDescription className="m-0 text-lg font-extrabold text-k5-mut">
          Registration received.
          <br />
          We&apos;ll keep you updated.
        </DialogDescription>
        <button type="button" onClick={onClose} className="mt-1 min-h-12 cursor-pointer rounded-full border-none bg-[#FFC531] px-8 font-k5-display text-xl font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A]">
          Yay!
        </button>
      </DialogContent>
    </Dialog>
  );
}
