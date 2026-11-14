"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, CalendarDays, Crown, Gift, Headphones, Mail, MessageCircle, Phone, RefreshCw, Sparkles, Star } from "lucide-react";
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

export function K5PassedOptions({ passed, studentName, grade, discount, options, uniqueId, pending, pendingType, choose, programOf }) {
  const hasDiscount = discount?.amount > 0;
  return <div className={styles.layout}>
    <div className={styles.main}>
      <section className={`${styles.hero} ${passed ? "" : styles.failHero}`}>
        {passed && <div className={styles.confetti} aria-hidden="true"><Star /><Star /><i /><i /><i /><i /></div>}
        <div className={styles.heroCopy}>
          {passed ? <>
            <p className={styles.congratulations}><Crown size={26} aria-hidden="true" />Congratulations, Dear {studentName}!</p>
            <h1>You&apos;ve been promoted{grade ? " to" : "!"}{grade && <><br /><span className={styles.ribbon}>{grade}</span></>}</h1>
          </> : <>
            <p className={styles.failGreeting}>Welcome back, {studentName}!</p>
            <h1>Let&apos;s plan your next step</h1>
            <p className={styles.failDescription}>Let&apos;s learn {grade || "your grade"} again together and grow even stronger!</p>
          </>}
        </div>
        <div className={styles.art} aria-hidden="true"><Image src={passed ? "/re-enrollment/promotion.webp" : "/re-enrollment/next-step.png"} alt="" width={150} height={161} priority /></div>
      </section>
      <section className={styles.card} aria-label="Re-enrollment options">
        {passed && hasDiscount && <Offer discount={discount} />}
        <div className={`${styles.options} ${passed && hasDiscount ? styles.withOffer : ""}`}>
          <h2>Continue with <Sparkles aria-hidden="true" /></h2>
          {options.map(option => {
            const nextGrade = option.enrollmentType === "REGISTRATION_NEXT_GRADE";
            const optionGrade = option.grade?.name || grade;
            const selectedProgram = programOf(option);
            const programLabel = option.programs?.find(program => program.learningProgram === selectedProgram)?.learningProgramLabel || option.learningProgramLabel;
            const title = nextGrade ? `Re-Enroll Today${optionGrade ? ` for ${optionGrade}` : ""}` : option.enrollmentType === "REGISTRATION_REPEAT_GRADE" ? "Repeat the entire grade" : "Take an individual course";
            return <div className={styles.option} key={option.enrollmentType}>
              <span className={styles.tile}><RefreshCw size={28} aria-hidden="true" /></span>
              <div className={styles.optionCopy}>
                <div className={styles.optionTitle}><h3>{title}</h3>{hasDiscount && nextGrade && <span className={styles.saving}>Saves {discount.currencyLabel} {discount.amount}</span>}</div>
                <p>{nextGrade ? `Continue with your ${programLabel ? `${programLabel} program` : "learning program"}${optionGrade ? ` in ${optionGrade}` : ""}` : passed ? "Keep learning and build your skills." : "Choose this option to strengthen your skills and move forward."}</p>
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
