"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, CalendarDays, Crown, Gift, Headphones, Mail, MessageCircle, Phone, RefreshCw, Sparkles, Star } from "lucide-react";
import { CHAT_BASE_URL, SUPPORT_EMAIL, SUPPORT_PHONE } from "./ReEnrollmentParts";
import styles from "./K5PassedOptions.module.css";

function Offer({ discount }) {
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
      <span className={styles.badge}><Gift size={22} aria-hidden="true" />Early re-enrollment offer</span>
      <h2>Save <span>{discount.currencyLabel} {discount.amount}</span></h2>
      <p>when you re-enroll before the offer ends</p>
    </div>
    {validDate && remaining > 0 && <div className={styles.countdown}>
      <div className={styles.ends}><span className={styles.calendar}><CalendarDays aria-hidden="true" /></span><div>Offer Ends on:<strong>{new Date(discount.dueDateMillis).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</strong></div></div>
      <div className={styles.timer} role="timer" aria-label="Time left in the offer">
        {["Days", "Hrs", "Min", "Sec"].map((label, index) => <div key={label}><strong>{String(values[index]).padStart(2, "0")}</strong><span>{label}</span></div>)}
      </div>
    </div>}
  </div>;
}

export function K5PassedOptions({ passed, isMiddle, isHigh, studentName, grade, currentGrade, discount, options, uniqueId, pending, pendingType, choose, programOf }) {
  const hasDiscount = discount?.amount > 0;
  const mature = isMiddle || isHigh;
  const nextGradeOption = options.find(option => option.enrollmentType === "REGISTRATION_NEXT_GRADE");
  const repeatGradeOption = options.find(option => option.enrollmentType === "REGISTRATION_REPEAT_GRADE");
  const heroGrade = grade || (passed ? currentGrade : undefined);
  const currentProgram = nextGradeOption?.learningProgramLabel
    || options.find(option => option.enrollmentType === "REGISTRATION_REPEAT_GRADE")?.learningProgramLabel;
  return <div className={styles.layout}>
    <div className={styles.main}>
      <section className={`${styles.hero} ${passed ? "" : styles.failHero}`} data-result={passed ? "pass" : "fail"}>
        {!mature && passed && <div className={styles.confetti} aria-hidden="true"><Star /><Star /><i /><i /><i /><i /></div>}
        {(isHigh || isMiddle) && <div className={styles.heroDecor} aria-hidden="true"><i /><i /><i />{isMiddle && <><i /><i /><i /><i /></>}</div>}
        <div className={styles.heroCopy}>
          {mature ? passed ? <>
            <p className={styles.matureBadge}>Congratulations, Dear {studentName}!</p>
            <h1>{grade ? `You've been promoted to ${grade}` : heroGrade ? `Congratulations on completing ${heroGrade}` : "Congratulations!"}</h1>
            {grade && currentGrade && <div className={styles.gradePath} aria-label={`${currentGrade} to ${grade}`}>
              <span>{currentGrade}</span><span className={styles.pathLine} aria-hidden="true" /><span className={styles.nextGradePill}>{grade}</span>
              {currentProgram && <span className={styles.pathProgram}>{currentProgram}</span>}
            </div>}
          </> : <>
            <p className={styles.matureBadge}>{isMiddle && repeatGradeOption ? `Dear ${studentName}, we believe in you!` : `Welcome back, ${studentName}!`}</p>
            <h1>{isMiddle && repeatGradeOption ? "Every comeback starts with one step" : "Let's plan your next step"}</h1>
            <p className={styles.failDescription}>{isMiddle && repeatGradeOption ? `A setback is not the end of the story. Repeat ${currentGrade || "your grade"} and finish stronger this time.` : "Choose how you would like to continue your learning journey."}</p>
            {currentGrade && <div className={styles.gradePath}><span>{isMiddle && repeatGradeOption ? `Repeat Grade ${currentGrade}` : `${currentGrade} · fresh start`}</span></div>}
          </> : passed ? <>
            <p className={styles.congratulations}><Crown size={26} aria-hidden="true" />Congratulations, Dear {studentName}!</p>
            <h1>You&apos;ve been promoted{grade ? " to" : "!"}{grade && <><br /><span className={styles.ribbon}>{grade}</span></>}</h1>
          </> : <>
            <p className={styles.failGreeting}>Welcome back, {studentName}!</p>
            <h1>Let&apos;s plan your next step</h1>
            <p className={styles.failDescription}>Let&apos;s learn {grade || "your grade"} again together and grow even stronger!</p>
          </>}
        </div>
        {mature ? <div className={`${styles.highMascot} ${isMiddle ? styles.middleMascot : ""}`} aria-hidden="true"><svg viewBox="-12 0 224 260"><ellipse cx="100" cy="252" rx="50" ry="7" fill="#171B2E" opacity=".12"/><ellipse cx="76" cy="240" rx="20" ry="11" fill="var(--k5-acd)"/><ellipse cx="124" cy="240" rx="20" ry="11" fill="var(--k5-acd)"/><path d="M30 130Q8 106 14 76" fill="none" stroke="var(--k5-ac)" strokeWidth="13" strokeLinecap="round"/><circle cx="14" cy="70" r="12" fill="var(--k5-ac)"/><path d="M170 130Q192 106 186 76" fill="none" stroke="var(--k5-ac)" strokeWidth="13" strokeLinecap="round"/><circle cx="186" cy="70" r="12" fill="var(--k5-ac)"/><path d="M100 30C52 30 18 66 18 112c0 58 82 124 82 124s82-66 82-124c0-46-34-82-82-82z" fill="var(--k5-ac)"/><circle cx="100" cy="112" r="56" fill="#fff"/><ellipse cx="80" cy="104" rx="9" ry="12" fill="#171B2E"/><circle cx="83" cy="99" r="3.5" fill="#fff"/><ellipse cx="120" cy="104" rx="9" ry="12" fill="#171B2E"/><circle cx="123" cy="99" r="3.5" fill="#fff"/><circle cx="66" cy="126" r="8" fill="#FF9EB5"/><circle cx="134" cy="126" r="8" fill="#FF9EB5"/><path d="M84 128Q100 146 116 128Z" fill="#171B2E"/><path d="M92 136Q100 142 108 136" fill="none" stroke="#FF7A93" strokeWidth="3"/><path d="M70 36v14q30 12 60 0V36z" fill="#171B2E"/><path d="m100 8 56 20-56 20-56-20z" fill="#171B2E"/><path d="M156 28v26" stroke="#FFC531" strokeWidth="4" strokeLinecap="round"/><circle cx="156" cy="58" r="6" fill="#FFC531"/></svg></div> : <div className={styles.art} aria-hidden="true"><Image src={passed ? "/re-enrollment/promotion.webp" : "/re-enrollment/next-step.png"} alt="" width={150} height={161} priority /></div>}
      </section>
      <section className={styles.card} aria-label="Re-enrollment options">
        {passed && hasDiscount && <Offer discount={discount} />}
        <div className={`${styles.options} ${passed && hasDiscount ? styles.withOffer : ""}`}>
          <h2 className={mature ? styles.matureHeading : undefined}>{mature && !passed ? "Choose how you want to continue" : "Continue with"}{!mature && <Sparkles aria-hidden="true" />}</h2>
          {options.map(option => {
            const nextGrade = option.enrollmentType === "REGISTRATION_NEXT_GRADE";
            const optionGrade = option.grade?.name || grade;
            const selectedProgram = programOf(option);
            const programLabel = option.programs?.find(program => program.learningProgram === selectedProgram)?.learningProgramLabel || option.learningProgramLabel;
            const repeatGrade = option.enrollmentType === "REGISTRATION_REPEAT_GRADE";
            const individualCourse = option.enrollmentType === "REGISTRATION_IMPORVE_GRADES";
            const title = nextGrade ? `Re-Enroll Today${optionGrade ? ` for ${optionGrade}` : ""}` : repeatGrade ? "Repeat the entire grade" : "Take an individual course";
            return <div className={styles.option} key={option.enrollmentType}>
              <span className={styles.tile}>{individualCourse ? <BookOpen size={28} aria-hidden="true" /> : <RefreshCw size={28} aria-hidden="true" />}</span>
              <div className={styles.optionCopy}>
                <div className={styles.optionTitle}><h3>{title}</h3>{hasDiscount && nextGrade && <span className={styles.saving}>Saves {discount.currencyLabel} {discount.amount}</span>}</div>
                <p>{nextGrade ? `Continue with your ${programLabel ? `${programLabel} program` : "learning program"}${optionGrade ? ` in ${optionGrade}` : ""}` : individualCourse ? "Retake only the subject you did not pass." : repeatGrade && !passed ? `Repeat ${optionGrade || "this grade"} and finish stronger this time.` : passed ? "Keep learning and build your skills." : "Choose this option to continue your learning journey."}</p>
              </div>
              <button type="button" className={styles.next} disabled={pending} onClick={() => choose(option)} aria-label={`Next: ${title}`}>
                {pending && pendingType === option.enrollmentType ? "Please wait…" : <>Next <ArrowRight size={20} aria-hidden="true" /></>}
              </button>
            </div>;
          })}
          {options.length === 0 && <p>Your next enrollment options are not available yet. Please contact the school for help.</p>}
        </div>
      </section>
    </div>
    <aside className={`${styles.card} ${styles.help}`} aria-labelledby="k5-re-help">
      <h2 id="k5-re-help"><Headphones size={30} aria-hidden="true" />Need Help?</h2>
      <a className={styles.next} href={`${CHAT_BASE_URL}/onboarding-support?uuid=${encodeURIComponent(uniqueId || "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden="true" />Talk to us</a>
      <a className={styles.contact} href={`tel:${SUPPORT_PHONE.replace(/[^+\d]/g, "")}`}><span><Phone aria-hidden="true" /></span><div><h3>Phone Support</h3><p>{SUPPORT_PHONE}</p></div></a>
      <a className={styles.contact} href={`mailto:${SUPPORT_EMAIL}`}><span><Mail aria-hidden="true" /></span><div><h3>Email Support</h3><p>{SUPPORT_EMAIL}</p></div></a>
    </aside>
  </div>;
}
