"use client";

import { ChevronLeft, CirclePlus, MessageSquareText } from "lucide-react";
import { useTranslations } from "next-intl";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { subjectStyle } from "@/utils/k5Calendar";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useTalkToUs } from "@/hooks/useTalkToUs";

const BUTTON =
  "flex min-h-[56px] items-center gap-2.5 self-start rounded-full border-none bg-[#13803F] px-6 font-k5-display text-[19px] font-semibold text-white shadow-[0_5px_0_#0B5A2B] disabled:opacity-50 max-[760px]:w-full max-[760px]:justify-center";

function useCourseColor() {
  const colorFor = useK5CourseColors();
  return (course) => colorFor({ id: course.subjectId, name: course.subjectName }) || subjectStyle(course.subjectName).color;
}

// What the course screen says and offers - the same four cases as the existing page (t: the k5Modules.extension translator).
function describe(data, afterExtension1, t) {
  const cost = `USD ${data.extentionCost}`;
  if (data.showNotEligible) return { lines: [data.notEligibleMessage], action: null };
  if (data.showExtension1 && !afterExtension1) {
    return {
      lines: [t("ext1Used", { count: data.extensionCount }), t("ext1Benefit")],
      action: { type: "EXTENSION-1", label: t("availExt1") },
    };
  }
  if (data.showExtension1 || data.showPaidExtension) {
    const label = data.showExtension1 ? t("ext2Name") : t("paidName");
    return {
      lines: [t("ext2Used", { count: data.extensionCount, label }), t("payToAvail", { cost, label }), t("ext2Benefit", { label })],
      action: { type: "EXTENSION-2", label: data.showExtension1 ? t("availExt2") : t("availPaid") },
    };
  }
  return { lines: [t("allUsed", { subject: data.subjectName })], action: null };
}

/** The course tile of the list and of the course screen (mockup .axcard). */
function CourseTile({ course, image, color, tall, onClick }) {
  const { isMiddle } = useDashboardContext();
  const tc = useTranslations("common");
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`k5h-ax-card flex w-full flex-col overflow-hidden rounded-3xl border-[3px] bg-k5-card p-0 text-start text-inherit ${onClick ? "k5-axcard cursor-pointer" : ""}`}
      style={{ borderColor: color, boxShadow: `0 ${isMiddle && !tall ? 2 : 6}px 0 ${color}`, font: "inherit", ...(isMiddle ? { borderRadius: 16 } : null) }}
    >
      <div className={`relative w-full overflow-hidden bg-k5-soft ${tall ? "h-[260px]" : "h-[170px]"}`}>
        <OptimizedImage src={image} alt={tall ? course.subjectName || "" : ""} width={440} height={320} sizes="(max-width: 760px) 100vw, 25vw" className="block h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-4 pb-3.5 pt-3 text-white" style={{ background: color }}>
        {course.standardName && <span className="text-[13px] font-black tracking-[0.03em] opacity-90">{course.standardName}</span>}
        <span className={`font-k5-display font-semibold leading-[1.2] ${tall ? "text-xl" : "text-[19px]"}`}>{course.subjectName || tc("status.na")}</span>
      </div>
    </Tag>
  );
}

/** "Academic Year Extension" title row. Grade 6–8 (Middle.dc.html): no card, a 62px accent tile, a 30px heading. */
function ExtensionHeader() {
  const { isMiddle } = useDashboardContext();
  const t = useTranslations("k5Modules.extension");
  return (
    <div className={isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span
        className={isMiddle ? "k5h-ax-tile flex h-[62px] w-[62px] flex-none items-center justify-center rounded-[14px] bg-k5-act" : "flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-gt"}
      >
        <CirclePlus className={isMiddle ? "h-[34px] w-[34px] text-k5-ac" : "h-12 w-12 text-k5-gi"} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className={`m-0 font-k5-display font-semibold leading-[1.05] ${isMiddle ? "text-[30px]" : "text-4xl"}`}>{t("title")}</h1>
        <p className={`m-0 font-extrabold text-k5-mut ${isMiddle ? "text-base" : "text-lg"}`}>{t("subtitle")}</p>
      </div>
    </div>
  );
}

/** The course list while it loads: the title, the card with its heading and four course tiles (picture and coloured name), the notice. */
function ExtensionSkeleton() {
  const t = useTranslations("k5Modules.extension");
  return (
    <K5Loading label={t("loading")} className="flex flex-col gap-4">
      <ExtensionHeader />
      <div className={`${K5_CARD} flex flex-col items-center gap-[18px] p-[22px] max-[760px]:p-4`}>
        <K5Sk className="h-8 w-[min(560px,90%)]" />
        <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[18px]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-3xl border-[3px] border-k5-line bg-k5-card">
              <K5Sk className="h-[170px] w-full rounded-none" />
              <span className="flex flex-col gap-2 px-4 pb-3.5 pt-3">
                <K5Sk className="h-3.5 w-24" />
                <K5Sk className="h-5 w-3/4" />
              </span>
            </div>
          ))}
        </div>
      </div>
      <K5Sk className="h-[56px] w-full rounded-[18px]" />
    </K5Loading>
  );
}

function ListView({ loading, message, courses, imageOf, onOpen }) {
  const colorOf = useCourseColor();
  const t = useTranslations("k5Modules.extension");
  usePicoContentReady(!loading);
  if (loading) return <ExtensionSkeleton />;
  return (
    <div className="flex flex-col gap-4">
      <ExtensionHeader />

      {(
        <>
          <section aria-labelledby="k5-ax" className={`${K5_CARD} flex flex-col gap-[18px] p-[22px] max-[760px]:p-4`}>
            <h2 id="k5-ax" className="m-0 text-center font-k5-display text-[28px] font-semibold leading-tight text-k5-acx max-[760px]:text-[22px]">
              {message || t("defaultMessage")}
            </h2>
            <ul aria-label={t("title")} className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[18px] p-0">
              {courses.map((course) => (
                <li key={course.subjectId} className="flex list-none">
                  <CourseTile course={course} image={imageOf(course)} color={colorOf(course)} onClick={() => onOpen(course)} />
                </li>
              ))}
            </ul>
          </section>

          <div role="note" className="flex flex-wrap items-center gap-3 rounded-[18px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3.5">
            <span aria-hidden="true" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#FFC531] font-k5-display text-lg font-bold text-[#3A2A00]">i</span>
            <p className="m-0 flex-[1_1_260px] text-base font-extrabold leading-[1.45]">{t("adminNote")}</p>
          </div>
        </>
      )}
    </div>
  );
}

function DetailView({ selected, afterExtension1, busy, onAvail, onBack }) {
  const colorOf = useCourseColor();
  const { isMiddle } = useDashboardContext();
  const talkToUs = useTalkToUs();
  const t = useTranslations("k5Modules.extension");
  const tc = useTranslations("common");
  const { data, image } = selected;
  const color = colorOf(data);
  const { lines, action } = describe(data, afterExtension1, t);
  usePicoContentReady(true);
  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-3.5 px-5 py-4`}>
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border-[3px] border-k5-line bg-k5-card pe-[18px] ps-3 font-k5-display text-[17px] font-semibold text-k5-ink shadow-[0_4px_0_var(--k5-line)]"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          {tc("actions.back")}
        </button>
        <h1 className="m-0 min-w-0 flex-[1_1_280px] font-k5-display text-[30px] font-semibold leading-[1.15] max-[760px]:text-2xl">{t("extendFor", { subject: data.subjectName })}</h1>
      </div>

      <section aria-labelledby="k5-axd" className={`${K5_CARD} grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] items-center gap-[26px] p-[22px] max-[900px]:grid-cols-1 max-[760px]:gap-[18px] max-[760px]:p-3.5`}>
        <CourseTile course={data} image={image} color={color} tall />
        <div className="flex min-w-0 flex-col gap-3.5">
          <h2 id="k5-axd" className="k5h-ax-h2 m-0 font-k5-display text-[34px] font-semibold leading-[1.1] max-[760px]:text-[28px]">{data.subjectName}</h2>
          <p className="m-0 text-xl font-extrabold leading-[1.45] text-k5-acx">
            {lines.map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </p>
          {data.showNotEligible && (
            <button type="button" onClick={talkToUs} className={BUTTON} style={isMiddle ? { boxShadow: "0 2px 0 #0B5A2B" } : undefined}>
              <MessageSquareText className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
              {t("contactAdmin")}
            </button>
          )}
          {action && (
            <button type="button" disabled={busy} onClick={() => onAvail(action.type)} className={BUTTON} style={isMiddle ? { boxShadow: "0 2px 0 #0B5A2B" } : undefined}>
              {action.label}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * K–5 look of Academic Year Extension (mockup Academic Year Extension): the course tiles, then the course
 * screen with Back. Courses, images (the existing course pictures), texts and the extension / payment steps
 * are the existing page's; its dialogs stay as they are.
 */
export function K5Extension({ loading, message, courses, imageOf, onOpen, selected, afterExtension1, busy, onAvail, onBack }) {
  if (selected) return <DetailView selected={selected} afterExtension1={afterExtension1} busy={busy} onAvail={onAvail} onBack={onBack} />;
  return <ListView loading={loading} message={message} courses={courses} imageOf={imageOf} onOpen={onOpen} />;
}
