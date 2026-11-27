"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { useAddAnotherChild } from "@/hooks/parent/useAddAnotherChild";
import { ParentAppInstallPrompt } from "@/components/parent/profile/ParentAppInstallPrompt";
import { firstName, gradeLabel } from "@/components/parent/childLabels";
import { HeroDoodles } from "@/components/parent/picker/HeroDoodles";
import { greetingForHour } from "@/utils/parentHome";
import styles from "@/components/parent/picker/parentPicker.module.css";

/**
 * The parent's child picker, the first screen of the parent dashboard, in the parent theme (design:
 * Parents-Dashboard-Web/ParentsDashboard.html): a blue banner with the greeting, today's date, "Hi {first name},
 * which dashboard would you like to open?" and the number of linked children; under it one card per child (photo or
 * initials, name, grade, View Dashboard). The whole card is the button. Choosing one opens that child's dashboard
 * (the choice is held in the page, not the URL). A parent with a single child skips it. The "Have another child to
 * enroll?" box shows when the school has Add Another Child on, and the app-install prompt may open here, as in legacy.
 *
 * Not built yet (needs backend, see the plan doc): the badge on each card.
 */
export function ChildPicker() {
  const { context } = useDashboardContext();
  const { children, selectChild } = useSelectedChild();
  const parentName = firstName(context?.userName) || "there";
  const count = children.length;

  return (
    <div className={styles.theme}>
      <PickerHero parentName={parentName} count={count} />
      <div className={styles.main}>
        {count === 0 ? (
          <div className={styles.empty}>
            <h2>No children found</h2>
            <p>There is no active child linked to this account yet.</p>
          </div>
        ) : (
          <ul className={styles.kids}>
            {children.map((child, i) => (
              <li key={child.userId || child.studentId}>
                <ChildCard child={child} delayMs={450 + i * 110} onOpen={() => selectChild(child.userId)} />
              </li>
            ))}
          </ul>
        )}
        <EnrollMoreBox delayMs={450 + count * 110 + 80} />
      </div>
      <ParentAppInstallPrompt />
    </div>
  );
}

function PickerHero({ parentName, count }) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = greetingForHour(hour);
  const daytime = hour >= 5 && hour < 17;
  const today = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <section className={styles.hero}>
      <HeroDoodles />
      <div className={styles.heroIn}>
        <span className={styles.ovl}>Parent Dashboard</span>
        <span className={styles.pills}>
          <span className={`${styles.date} ${styles.greet}`}>
            {daytime ? <SunIcon /> : <MoonIcon />}
            {greeting}
          </span>
          <span className={styles.date}>
            <i className={styles.dot} aria-hidden="true" />
            {today}
          </span>
        </span>
        <h1>
          Hi <b>{parentName}</b>, which dashboard would you like to open?
        </h1>
        {count > 0 && (
          <p>
            You have <b>{count}</b> {count === 1 ? "child" : "children"} linked to this account. Pick one to continue.
          </p>
        )}
      </div>
    </section>
  );
}

// Light spot follows the pointer; a gentle 3D tilt on a desktop mouse only (not on a phone or with reduced motion).
function onCardPointerMove(e) {
  const card = e.currentTarget;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  const tilt =
    window.innerWidth > 640 &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (tilt) {
    card.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
  }
}

function onCardPointerLeave(e) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

function ChildCard({ child, delayMs, onOpen }) {
  const grade = gradeLabel(child.standardName);
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerMove={onCardPointerMove}
      onPointerLeave={onCardPointerLeave}
      className={styles.kid}
      style={{ "--d": `${delayMs}ms` }}
      aria-label={`View ${child.studentName}'s dashboard${grade ? `, ${grade}` : ""}`}
    >
      <span className={styles.band} aria-hidden="true" />
      <span className={styles.av}>
        <PickerAvatar child={child} />
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{child.studentName}</span>
        {grade && (
          <span className={styles.grade}>
            <CapIcon />
            {grade}
          </span>
        )}
      </span>
      <span className={styles.cta}>
        View Dashboard <ArrowIcon />
      </span>
      <span className={styles.go} aria-hidden="true">
        <ArrowIcon />
      </span>
    </button>
  );
}

// "Hussain Hassan" -> "HH".
function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return `${parts[0][0]}${parts[1] ? parts[1][0] : ""}`.toUpperCase();
}

// The child's photo, or their initials when there is none (or it fails to load). The URL comes from the backend per
// child and may be empty, relative or invalid, so only an absolute http(s) URL is tried; it is not run through the
// Next optimizer (any school CDN host), like ChildAvatar.
function PickerAvatar({ child }) {
  const [failed, setFailed] = useState(false);
  const pic = typeof child?.profilePic === "string" ? child.profilePic.trim() : "";
  const showPhoto = !failed && /^https?:\/\//i.test(pic);
  return (
    <span className={styles.avIn}>
      {showPhoto ? (
        <Image src={pic} alt="" width={96} height={96} unoptimized onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden="true">{initials(child?.studentName)}</span>
      )}
    </span>
  );
}

// "Have another child to enroll?": the parent's Add Another Child (or "Resume {name}'s Enrollment"), which opens the
// Add Another Student wizard in a new tab. Shown only when the school has the button on.
function EnrollMoreBox({ delayMs }) {
  const { visible, label, busy, handleClick } = useAddAnotherChild();
  if (!visible) return null;
  const resuming = label !== "Add Another Child";
  return (
    <section className={styles.more} style={{ "--d": `${delayMs}ms` }} aria-labelledby="parent-enroll-more">
      <span className={styles.moreIc} aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="4" />
          <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
          <path d="M19 8v6M16 11h6" />
        </svg>
      </span>
      <div className={styles.moreT}>
        <h3 id="parent-enroll-more">{resuming ? "Finish your child's enrollment" : "Have another child to enroll?"}</h3>
        <p>Your details are already saved, so you only need to fill in your child&apos;s details.</p>
      </div>
      <button type="button" className={styles.moreBtn} onClick={handleClick} disabled={busy}>
        {busy ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden="true" />
        ) : (
          <svg className={styles.plus} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
        {resuming ? label : "Enroll More Child"}
      </button>
    </section>
  );
}

function CapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm-6.82 9.35v3.4L12 19.5l6.82-3.75v-3.4L12 16.1l-6.82-3.75z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="#FFC531" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#FFD25A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 3a9 9 0 1 0 6 15A7.5 7.5 0 0 1 15 3z" fill="#FFE08A" />
    </svg>
  );
}
