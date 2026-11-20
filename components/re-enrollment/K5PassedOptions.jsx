"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, CalendarDays, Check, Crown, GraduationCap, Gift, Headphones, Mail, MessageCircle, Phone, RefreshCw, Sparkles, Star } from "lucide-react";
import { CHAT_BASE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from "./ReEnrollmentParts";
import { useLocaleTag } from "@/i18n/dateLocale";
import styles from "./K5PassedOptions.module.css";

function Offer({ discount }) {
  const t = useTranslations("reEnrollment.k5");
  const tag = useLocaleTag();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, discount.dueDateMillis - now);
  const validDate = Number.isFinite(discount.dueDateMillis) && discount.dueDateMillis > 0;
  const values = [Math.floor(remaining / 86400000), Math.floor(remaining / 3600000) % 24, Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60];
  return <div className={styles.offer}>
    <div className={styles.offerCopy}>
      <span className={styles.badge}><Gift size={22} aria-hidden="true" />{t("offerTitle")}</span>
      <h2>{t.rich("save", { amount: `${discount.currencyLabel} ${discount.amount}`, hl: (chunks) => <span>{chunks}</span> })}</h2>
      <p>{t("offerText")}</p>
    </div>
    {validDate && remaining > 0 && <div className={styles.countdown}>
      <div className={styles.ends}><span className={styles.calendar}><CalendarDays aria-hidden="true" /></span><div>{t("offerEnds")}<strong>{new Date(discount.dueDateMillis).toLocaleDateString(tag === "en-US" ? "en-GB" : tag, { day: "numeric", month: "short", year: "numeric" })}</strong></div></div>
      <div className={styles.timer} role="timer" aria-label={t("timeLeft")}>
        {["days", "hrs", "min", "sec"].map((unit, index) => <div key={unit}><strong>{String(values[index]).padStart(2, "0")}</strong><span>{t(`countdown.${unit}`)}</span></div>)}
      </div>
    </div>}
  </div>;
}

export function K5PassedOptions({ passed, isMiddle, isHigh, studentName, grade, currentGrade, academicYear, discount, options, uniqueId, pending, pendingType, choose, programOf }) {
  const t = useTranslations("reEnrollment.k5");
  const ts = useTranslations("reEnrollment.support");
  const tc = useTranslations("common");
  const name = studentName ?? "";
  const hasDiscount = discount?.amount > 0;
  const mature = isMiddle || isHigh;
  const balanced = isMiddle && !isHigh;
  const nextGradeOption = options.find(option => option.enrollmentType === "REGISTRATION_NEXT_GRADE");
  const repeatGradeOption = options.find(option => option.enrollmentType === "REGISTRATION_REPEAT_GRADE");
  const individualCourseOption = options.find(option => option.enrollmentType === "REGISTRATION_IMPORVE_GRADES");
  // Design: "Every comeback starts with one step" when the student has a single path; the neutral "Let's plan your next step" when choosing between Repeat and an Individual Course.
  const completedGrade12 = passed && /^grade\s*12$/i.test(currentGrade?.trim() || "");
  const promoted = passed && Boolean(grade);
  const celebratoryHero = promoted || completedGrade12;
  const comeback = mature && options.length > 0 && !(repeatGradeOption && individualCourseOption);
  const heroGrade = grade || (passed ? currentGrade : undefined);
  const currentProgram = nextGradeOption?.learningProgramLabel
    || options.find(option => option.enrollmentType === "REGISTRATION_REPEAT_GRADE")?.learningProgramLabel;
  return <div className={styles.layout}>
    <div className={styles.main}>
      <section className={`${styles.hero} ${celebratoryHero ? "" : styles.failHero}`} data-result={celebratoryHero ? "pass" : "fail"}>
        {!mature && passed && <div className={styles.confetti} aria-hidden="true"><Star /><Star /><i /><i /><i /><i /></div>}
        {(isHigh || isMiddle) && <div className={styles.heroDecor} aria-hidden="true"><i /><i /><i />{balanced && <><i /><i /><i /><i /></>}</div>}
        <div className={styles.heroCopy}>
          {completedGrade12 ? <>
            <p className={styles.matureBadge}>{t("welcomeBack", { name })}</p>
            <h1>{t("completedGrade12")}</h1>
            <p className={styles.completionDescription}>{t("chooseJourney")}</p>
          </> : mature ? promoted ? <>
            <p className={styles.matureBadge}>{t("congrats", { name })}</p>
            <h1>{grade ? t("promotedTo", { grade }) : heroGrade ? t("completedGrade", { grade: heroGrade }) : t("congratulations")}</h1>
            {grade && currentGrade && <div className={styles.gradePath} aria-label={t("gradePath", { from: currentGrade, to: grade })}>
              <span>{isHigh && <Check size={15} aria-hidden="true" />}{currentGrade}</span><span className={styles.pathLine} aria-hidden="true" /><span className={styles.nextGradePill}>{grade}</span>
              <span className={styles.pathMeta}><span>{t("academicYear")}</span><strong>{academicYear}</strong></span>
              {currentProgram && <span className={styles.pathProgram}><span>{t("program")}</span>{currentProgram}</span>}
            </div>}
          </> : <>
            <p className={styles.matureBadge}>{comeback ? t("believeInYou", { name }) : t("welcomeBack", { name })}</p>
            <h1>{comeback ? t("comebackTitle") : t("planNextStep")}</h1>
            <p className={styles.failDescription}>{comeback ? (currentGrade ? t("comebackText", { grade: currentGrade }) : t("comebackTextNoGrade")) : t("chooseJourney")}</p>
            {currentGrade && <div className={styles.gradePath}><span>{isHigh && <RefreshCw size={15} aria-hidden="true" />}{comeback ? t("repeatGrade", { grade: currentGrade }) : t("freshStart", { grade: currentGrade })}</span></div>}
          </> : passed ? <>
            <p className={styles.congratulations}><Crown size={26} aria-hidden="true" />{t("congrats", { name })}</p>
            <h1>{grade ? t.rich("kidPromotedTo", { grade, br: () => <br />, ribbon: (chunks) => <span className={styles.ribbon}>{chunks}</span> }) : t("kidPromoted")}</h1>
          </> : <>
            <p className={styles.failGreeting}>{t("kidWelcomeBack", { name })}</p>
            <h1>{t("kidPlanNextStep")}</h1>
            <p className={styles.failDescription}>{grade ? t("kidLearnAgain", { grade }) : t("kidLearnAgainNoGrade")}</p>
          </>}
        </div>
        {mature ? <div className={`${styles.highMascot} ${balanced ? styles.middleMascot : ""}`} aria-hidden="true"><svg viewBox="-12 0 224 260"><ellipse cx="100" cy="252" rx="50" ry="7" fill="#171B2E" opacity=".12"/><ellipse cx="76" cy="240" rx="20" ry="11" fill="var(--k5-acd)"/><ellipse cx="124" cy="240" rx="20" ry="11" fill="var(--k5-acd)"/><path d="M30 130Q8 106 14 76" fill="none" stroke="var(--k5-ac)" strokeWidth="13" strokeLinecap="round"/><circle cx="14" cy="70" r="12" fill="var(--k5-ac)"/><path d="M170 130Q192 106 186 76" fill="none" stroke="var(--k5-ac)" strokeWidth="13" strokeLinecap="round"/><circle cx="186" cy="70" r="12" fill="var(--k5-ac)"/><path d="M100 30C52 30 18 66 18 112c0 58 82 124 82 124s82-66 82-124c0-46-34-82-82-82z" fill="var(--k5-ac)"/><circle cx="100" cy="112" r="56" fill="#fff"/><ellipse cx="80" cy="104" rx="9" ry="12" fill="#171B2E"/><circle cx="83" cy="99" r="3.5" fill="#fff"/><ellipse cx="120" cy="104" rx="9" ry="12" fill="#171B2E"/><circle cx="123" cy="99" r="3.5" fill="#fff"/><circle cx="66" cy="126" r="8" fill="#FF9EB5"/><circle cx="134" cy="126" r="8" fill="#FF9EB5"/><path d="M84 128Q100 146 116 128Z" fill="#171B2E"/><path d="M92 136Q100 142 108 136" fill="none" stroke="#FF7A93" strokeWidth="3"/><path d="M70 36v14q30 12 60 0V36z" fill="#171B2E"/><path d="m100 8 56 20-56 20-56-20z" fill="#171B2E"/><path d="M156 28v26" stroke="#FFC531" strokeWidth="4" strokeLinecap="round"/><circle cx="156" cy="58" r="6" fill="#FFC531"/></svg></div> : <div className={styles.art} aria-hidden="true"><Image src={passed ? "/re-enrollment/promotion.webp" : "/re-enrollment/next-step.png"} alt="" width={150} height={161} priority /></div>}
      </section>
      <section className={`${styles.card} ${isHigh && !(passed && hasDiscount) ? styles.standalone : ""}`} aria-label={t("optionsLabel")}>
        {passed && hasDiscount && <Offer discount={discount} />}
        <div className={`${styles.options} ${passed && hasDiscount ? styles.withOffer : ""}`}>
          <h2 className={mature ? styles.matureHeading : undefined}>{mature && !promoted ? t("chooseHowToContinue") : t("continueWith")}{!mature && <Sparkles aria-hidden="true" />}</h2>
          {options.map(option => {
            if (completedGrade12 && option.enrollmentType === "REGISTRATION_REPEAT_GRADE") return null;
            const nextGrade = option.enrollmentType === "REGISTRATION_NEXT_GRADE";
            const optionGrade = option.grade?.name || grade;
            const selectedProgram = programOf(option);
            const programLabel = option.programs?.find(program => program.learningProgram === selectedProgram)?.learningProgramLabel || option.learningProgramLabel;
            const repeatGrade = option.enrollmentType === "REGISTRATION_REPEAT_GRADE";
            const individualCourse = option.enrollmentType === "REGISTRATION_IMPORVE_GRADES";
            const completedCourse = completedGrade12 && individualCourse;
            const title = completedCourse ? t("titles.singleCourse") : nextGrade ? (optionGrade ? t("titles.reEnrollFor", { grade: optionGrade }) : t("titles.reEnroll")) : repeatGrade ? t("titles.repeat") : (isHigh ? t("titles.individualHigh") : t("titles.individual"));
            return <div className={styles.option} key={option.enrollmentType}>
              <span className={styles.tile}>{completedCourse ? <GraduationCap size={22} aria-hidden="true" /> : individualCourse ? (isHigh ? <GraduationCap size={22} aria-hidden="true" /> : <BookOpen size={28} aria-hidden="true" />) : <RefreshCw size={28} aria-hidden="true" />}</span>
              <div className={styles.optionCopy}>
                <div className={styles.optionTitle}><h3>{title}</h3>{hasDiscount && nextGrade && <span className={styles.saving}>{t("saves", { amount: `${discount.currencyLabel} ${discount.amount}` })}</span>}</div>
                <p>{completedCourse ? t("texts.singleCourse") : nextGrade ? t("texts.continueProgram", { program: programLabel ? "named" : "none", programLabel: programLabel ?? "", grade: optionGrade ? "named" : "none", gradeName: optionGrade ?? "" }) : individualCourse ? t("texts.individual") : repeatGrade && !promoted ? (optionGrade ? t("texts.repeat", { grade: optionGrade }) : t("texts.repeatNoGrade")) : promoted ? t("texts.keepLearning") : t("texts.chooseOption")}</p>
              </div>
              <button type="button" className={styles.next} disabled={pending} onClick={() => choose(option)} aria-label={t("nextLabel", { title })}>
                {pending && pendingType === option.enrollmentType ? tc("status.pleaseWait") : <>{tc("actions.next")} <ArrowRight size={20} aria-hidden="true" /></>}
              </button>
            </div>;
          })}
          {options.length === 0 && <p>{t("noOptions")}</p>}
        </div>
      </section>
    </div>
    <aside className={`${styles.card} ${styles.help}`} aria-labelledby="k5-re-help">
      <h2 id="k5-re-help"><Headphones size={30} aria-hidden="true" />{ts("needHelp")}</h2>
      <a className={styles.next} href={`${CHAT_BASE_URL}/onboarding-support?uuid=${encodeURIComponent(uniqueId || "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />{t("talkToUs")}</a>
      <a className={styles.contact} href={`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`}><span><Phone aria-hidden="true" /></span><div><h3>{ts("phone")}</h3><p>{SUPPORT_PHONE}</p></div></a>
      <a className={styles.contact} href={`mailto:${SUPPORT_EMAIL}`}><span><Mail aria-hidden="true" /></span><div><h3>{ts("email")}</h3><p>{SUPPORT_EMAIL.split("@")[0]}@<wbr />{SUPPORT_EMAIL.split("@")[1]}</p></div></a>
    </aside>
  </div>;
}
