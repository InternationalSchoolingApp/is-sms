"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Award, BarChart3, BookMarked, CalendarCheck, CalendarDays, ChevronDown, Circle, ClipboardCheck, FileText, Gamepad2,
  Globe, GraduationCap, Handshake, History, Inbox, LayoutDashboard, MoreHorizontal, ShoppingCart, Wallet, X,
} from "lucide-react";
import { InboxBadge, isInboxMenuItem } from "@/components/student/inbox/InboxBadge";
import { CLUB_ART } from "@/components/k5/clubMarks";
import { MyClassesArt, NAV_ART, highNavIconFor, navPictureFor } from "@/components/k5/navIcons";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5Sk } from "@/components/k5/K5Skeletons";
import { studentNavHref } from "@/utils/dashboardNav";
import { motion } from "framer-motion";
import { DUR, EASE_OUT } from "@/components/motion/motionConfig";
import { useMotionBand } from "@/components/motion/useMotionBand";

// Icon key (utils/dashboardNav.js) -> lucide icon + the mockup's tile tint pair (T background / I icon).
const ICONS = {
  dashboard: [LayoutDashboard, "bg-k5-bt", "text-k5-bi"],
  calendar: [CalendarDays, "bg-k5-ot", "text-k5-oi"],
  "my-classes": [CalendarDays, "bg-k5-bt", "text-k5-bi"],
  teacher: [GraduationCap, "bg-k5-vt", "text-k5-vi"],
  "book-class": [CalendarCheck, "bg-k5-ot", "text-k5-oi"],
  cart: [ShoppingCart, "bg-k5-bt", "text-k5-bi"],
  attendance: [ClipboardCheck, "bg-k5-tt", "text-k5-ti"],
  chart: [BarChart3, "bg-k5-gt", "text-k5-gi"],
  file: [FileText, "bg-k5-mt", "text-k5-mi"],
  globe: [Globe, "bg-k5-bt", "text-k5-bi"],
  social: [Handshake, "bg-k5-ot", "text-k5-oi"],
  game: [Gamepad2, "bg-k5-pt", "text-k5-pi"],
  fee: [Wallet, "bg-k5-yt", "text-k5-yi"],
  handbook: [BookMarked, "bg-k5-rt", "text-k5-ri"],
  history: [History, "bg-k5-vt", "text-k5-vi"],
  certificate: [Award, "bg-k5-pt", "text-k5-pi"],
  inbox: [Inbox, "bg-k5-bt", "text-k5-bi"],
  more: [MoreHorizontal, "bg-k5-soft", "text-k5-mut"],
};
const iconFor = (key) => ICONS[key] || [Circle, "bg-k5-soft", "text-k5-mut"];

// PreK keeps only the essentials on top; everything else goes under "More" (plan section 12.8).
const PREK_PRIMARY_ICONS = new Set(["dashboard", "teacher", "book-class"]);

// Saved drag order, per user (user-scoped so a shared device never mixes students — APP-014).
const NAV_ORDER_PREFIX = "is-k5-nav:";
const noSubscribe = () => () => {};
function readOrder(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseOrder(raw) {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Grade K–5 left nav (Playful.dc.html .side): a 96px icon rail of the DB-driven menu that
 * widens to 300px with labels on hover (pointer devices, >760px) or when opened from the
 * header menu button; below 760px it is a drawer. Items can be dragged into a personal
 * order (localStorage is-k5-nav:{userId}); authorization stays with the backend menu.
 */
export function K5NavRail({ menu, loading = false, open, onOpen, onClose, isPreK = false, userId }) {
  const pathname = usePathname();
  const { school } = useParams();
  const navRef = useRef(null);

  const orderKey = userId ? `${NAV_ORDER_PREFIX}${userId}` : null;
  const savedRaw = useSyncExternalStore(noSubscribe, () => readOrder(orderKey), () => null);
  const [localOrder, setLocalOrder] = useState(null);
  const order = useMemo(() => localOrder ?? parseOrder(savedRaw), [localOrder, savedRaw]);

  const items = useMemo(() => {
    const rank = new Map(order.map((key, i) => [key, i]));
    const sorted = [...menu].sort((a, b) => (rank.get(a.key) ?? order.length + menu.indexOf(a)) - (rank.get(b.key) ?? order.length + menu.indexOf(b)));
    if (!isPreK) return sorted;
    const primary = sorted.filter((item) => PREK_PRIMARY_ICONS.has(item.icon));
    const rest = sorted.filter((item) => !PREK_PRIMARY_ICONS.has(item.icon));
    return rest.length ? [...primary, { key: "k5-more", label: "More", icon: "more", segment: "#", children: flattenItems(rest) }] : primary;
  }, [menu, order, isPreK]);

  const saveOrder = (keys) => {
    setLocalOrder(keys);
    try {
      if (orderKey) window.localStorage.setItem(orderKey, JSON.stringify(keys));
    } catch {
      // storage unavailable: the order just lasts for this visit
    }
  };
  const drag = useDragReorder({ navRef, keys: items.map((item) => item.key), onReorder: saveOrder, disabled: isPreK });

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isActive = (segment) => {
    const href = studentNavHref(school, segment);
    return segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
  };
  return (
    <>
      {open && <button type="button" aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-[45] cursor-pointer bg-[rgba(10,16,34,0.35)]" />}

      <nav
        id="k5-sidenav"
        ref={navRef}
        aria-label="Main menu"
        data-pin="side"
        data-open={open}
        className="k5-side fixed z-20 flex max-h-[calc(100vh-120px)] flex-col items-center gap-1 touch-pan-y overscroll-contain overflow-y-auto overflow-x-hidden rounded-[26px] border-[3px] border-k5-line bg-k5-card px-1.5 py-2.5 shadow-k5-chunky"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="k5-nclose hidden h-11 w-11 flex-none items-center justify-center cursor-pointer self-end rounded-full border-[3px] border-red-500 bg-red-500 text-white hover:border-red-600 hover:bg-red-600"
        >
          <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </button>

        {/* While the menu loads: the same tiles as the real items (76px wide, 46px icon box, a short label), pulsing. */}
        {loading && items.length === 0 && (
          <>
            <span role="status" aria-busy="true" aria-live="polite" className="sr-only">
              Loading the menu…
            </span>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} aria-hidden="true" className="k5-ni relative flex w-[46px] flex-none flex-col items-center gap-1 py-1">
                <K5Sk className="h-[46px] w-[46px] rounded-[15px]" />
                <K5Sk className="k5-nl h-2.5 w-12" />
              </span>
            ))}
          </>
        )}

        {items.map((item) =>
          item.children?.length ? (
            <NavGroup key={item.key} item={item} school={school} isActive={isActive} expandRail={onOpen} onNavigate={onClose} drag={drag} />
          ) : (
            <NavLink
              key={item.key}
              item={item}
              href={studentNavHref(school, item.segment)}
              active={isActive(item.segment)}
              onNavigate={onClose}
              drag={drag}
            />
          ),
        )}
      </nav>
    </>
  );
}

function flattenItems(items) {
  return items.flatMap((item) => (item.children?.length ? item.children.map((child) => ({ ...child, label: `${item.label}: ${child.label}` })) : [item]));
}

// touch-pan-y (not touch-none): a finger that starts on a nav item can still scroll the rail up/down natively. The long-press
// drag keeps working because useDragReorder only calls preventDefault on touchmove once a drag is actually active (the finger was
// held still until then, so no native scroll had begun and preventDefault can still stop it). touch-none blocked native scroll
// outright, which on iPad (where a finger is reported as a "mouse" pointer in desktop mode) left the rail unscrollable.
const ITEM_CLASS =
  "k5-ni relative isolate flex w-[46px] h-[46px] flex-none touch-pan-y select-none flex-col items-center gap-1 rounded-2xl text-center text-xs font-black leading-[1.15] no-underline transition-colors duration-150 [overflow-wrap:anywhere]";

function NavTile({ item, icon, active, picture }) {
  const { isHigh } = useDashboardContext();
  const [Icon, tile, stroke] = iconFor(icon);
  // The mockup's picture (a 36px PNG on a transparent tile); the drawn icon stays as the fallback when there is no
  // picture for the item or it cannot be loaded.
  const [pictureFailed, setPictureFailed] = useState(false);
  // High (Mature) look: the mockup's line icon in the item's colour on a transparent tile, white when active.
  const high = isHigh ? highNavIconFor(item) : null;
  if (high) {
    return (
      <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[10px] bg-transparent">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-[stroke] duration-150 ${active ? "stroke-white delay-100" : high.tone}`}>
          {high.art}
        </svg>
      </span>
    );
  }
  if (icon === "my-classes") {
    return (
      <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[15px] bg-transparent">
        <MyClassesArt />
      </span>
    );
  }
  if (picture && !pictureFailed) {
    return (
      <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[15px] bg-transparent">
        <OptimizedImage src={picture} alt="" width={36} height={36} className="block h-9 w-9 object-contain" onError={() => setPictureFailed(true)} />
      </span>
    );
  }
  return (
    <span className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[15px] transition-colors duration-150 ${active ? "bg-white text-k5-ac delay-100" : `${tile} ${stroke}`}`}>
      {NAV_ART[icon] ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {NAV_ART[icon]}
        </svg>
      ) : (
        <Icon className="h-6 w-6" strokeWidth={2.3} aria-hidden="true" />
      )}
    </span>
  );
}

/**
 * The active item's highlight. One shared element (layoutId) that slides from the old active item to the new one, instead
 * of two backgrounds switching. layout="position" moves it only: the pill's size follows the item's own CSS width
 * (the rail widening on hover is a CSS transition), so a hover never stretches or squashes it. Under Reduced Motion
 * MotionProvider makes the move instant. The label and tile of the item wait 100 ms (delay-100) so white text never
 * shows on a page-coloured background while the pill is still on its way.
 */
function NavPill() {
  const band = useMotionBand();
  return (
    <motion.span
      layoutId="k5-nav-pill"
      layout="position"
      aria-hidden="true"
      className="absolute inset-0 -z-10 rounded-2xl bg-k5-ac"
      transition={band === "high" ? { duration: DUR.card, ease: EASE_OUT } : { type: "spring", stiffness: 520, damping: 40 }}
    />
  );
}

function NavLink({ item, href, active, onNavigate, drag }) {
  return (
    <Link
      href={href}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      draggable={false}
      onClick={(e) => (drag.consumeClick() ? e.preventDefault() : onNavigate())}
      {...drag.handlers(item.key)}
      style={drag.style(item.key)}
      className={`k5-button-motion ${ITEM_CLASS} ${active ? "text-white delay-100" : "text-k5-ink hover:bg-k5-soft"}`}
    >
      {active && <NavPill />}
      <NavTile item={item} icon={item.icon} active={active} picture={navPictureFor(item)} />
      {isInboxMenuItem(item) && <InboxBadge className="absolute left-[32px] top-0 shadow-[0_0_0_2px_var(--k5-card)] [.k5-side:hover_&]:left-[36px] [.k5-side[data-open='true']_&]:left-[36px]" />}
      <span className="k5-nl">{item.label}</span>
    </Link>
  );
}

function NavGroup({ item, school, isActive, expandRail, onNavigate, drag }) {
  const childActive = item.children.some((child) => isActive(child.segment));
  const [openGroup, setOpenGroup] = useState(childActive);
  // A club group shows its clubs as little pictures (flags / emoji) right under it, even in the narrow rail.
  const hasClubArt = item.children.some((child) => CLUB_ART[child.segment]);

  return (
    <>
      <button
        type="button"
        title={item.label}
        aria-label={item.label}
        aria-expanded={openGroup}
        onClick={(e) => {
          if (drag.consumeClick()) return e.preventDefault();
          // In the narrow rail the children have no room: widen the rail first, like the legacy icon-rail.
          if (!hasClubArt && !e.currentTarget.closest(".k5-side")?.matches(".k5-side:hover, .k5-side[data-open='true']")) expandRail();
          setOpenGroup((v) => !v);
        }}
        {...drag.handlers(item.key)}
        style={drag.style(item.key)}
        className={`${ITEM_CLASS} cursor-pointer border-none ${childActive ? "bg-k5-act text-k5-acx" : "bg-transparent text-k5-ink hover:bg-k5-soft"}`}
      >
        <NavTile item={item} icon={item.icon} picture={navPictureFor(item)} />
        {isInboxMenuItem(item) && <InboxBadge className="absolute left-[40px] top-0 shadow-[0_0_0_2px_var(--k5-card)]" />}
        <span className="k5-nl">{item.label}</span>
        <span
          aria-hidden="true"
          className="k5-chev absolute end-1 top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-k5-line bg-k5-card text-k5-mut"
        >
          <ChevronDown className={`h-2.5 w-2.5 transition-transform ${openGroup ? "rotate-180" : ""}`} strokeWidth={4} />
        </span>
      </button>
      {openGroup && hasClubArt && (
        <ul className="k5-subicons m-0 flex w-full list-none flex-col items-center gap-0.5 p-0 pb-1.5">
          {item.children.map((child) => {
            const art = CLUB_ART[child.segment];
            if (!art) return null;
            const active = isActive(child.segment);
            return (
              <li key={child.key} className="flex w-full justify-center">
                <Link
                  href={studentNavHref(school, child.segment)}
                  onClick={onNavigate}
                  title={child.label}
                  aria-label={child.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-[52px] items-center justify-center rounded-xl py-1.5 no-underline transition-colors duration-150 ${active ? "bg-k5-act" : "hover:bg-k5-soft"}`}
                >
                  <ClubMark art={art} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {openGroup && (
        <ul className="k5-sub w-full flex-col gap-1 ps-[30px]">
          {item.children.map((child) => {
            const active = isActive(child.segment);
            return (
              <li key={child.key}>
                <Link
                  href={studentNavHref(school, child.segment)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-1 text-[15px] font-extrabold ${
                    active ? "bg-k5-act text-k5-acx" : "text-k5-ink hover:bg-k5-soft"
                  }`}
                >
                  {CLUB_ART[child.segment] ? <ClubMark art={CLUB_ART[child.segment]} /> : <SubPicture item={child} parent={item} />}
                  <span className="min-w-0 truncate">{child.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/**
 * The little picture of a sub-menu item in the open menu (mockup: Academic Reports > Academic Performance / My Progress Report).
 * Only items that have a mockup picture show one; the Communications group keeps plain names.
 */
function SubPicture({ item, parent }) {
  const { isHigh } = useDashboardContext();
  const [failed, setFailed] = useState(false);
  // High (Mature) look: the mockup's 18px line icon on a soft green 32px tile (Academic Reports' sub-pages only).
  const high = isHigh && parent.icon !== "inbox" ? highNavIconFor(item) : null;
  if (high) {
    return (
      <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-k5-gt shadow-[0_0_0_2px_var(--k5-card),0_0_0_3px_var(--k5-line)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="[stroke:var(--k5-hn-g)]">
          {high.art}
        </svg>
      </span>
    );
  }
  const picture = parent.icon === "inbox" ? "" : navPictureFor(item);
  if (!picture || failed) return null;
  return <OptimizedImage src={picture} alt="" width={32} height={32} className="block h-8 w-8 flex-none object-contain" onError={() => setFailed(true)} />;
}

/** A club's little picture (mockup .nsub): its flag for a language club, an emoji on a soft tile for the others. */
function ClubMark({ art }) {
  if (art.flag) {
    return (
      <span
        aria-hidden="true"
        className="flex h-6 w-[34px] flex-none items-center justify-center rounded-[7px] text-lg leading-none text-[#FFDE00] shadow-[0_0_0_2px_var(--k5-card),0_0_0_3px_var(--k5-line)]"
        style={{ background: art.flag }}
      >
        {art.mark}
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-[7px] bg-k5-soft text-lg leading-none shadow-[0_0_0_2px_var(--k5-card),0_0_0_3px_var(--k5-line)]">
      {art.emoji}
    </span>
  );
}

/**
 * Pointer drag to reorder the rail's top-level items. Mouse: a press that moves more than a few pixels becomes a drag.
 * Touch / pen: only a LONG PRESS (the finger held still for LONG_PRESS_MS) picks the item up - a finger that moves before that
 * is scrolling the menu, so the press is dropped and the menu scrolls as usual; once picked up, the page does not scroll while
 * the item is moved. The click that follows the drop is swallowed so dropping an item never navigates.
 *
 * Touch is NOT decided from e.pointerType: an iPad (Safari / Chrome in desktop mode, which is the default) reports a finger as
 * pointerType "mouse", so that would have made every scroll reorder the menu. Instead a real `touchstart` that lands during the
 * press marks it as touch - a mouse never fires one.
 */
const LONG_PRESS_MS = 450;
// A long press on a phone / iPad must not open the link preview or start selecting the label text.
const NO_TOUCH_MENU = { WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" };
const TOUCH_SLOP = 8;
// The device can take touch at all (iPad maxTouchPoints is 5): only then is the long-press timer armed, so a plain mouse on a
// non-touch desktop still picks an item up the instant it moves.
const TOUCH_CAPABLE = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
function useDragReorder({ navRef, keys, onReorder, disabled }) {
  const [dragging, setDragging] = useState(null); // { key, dy }
  const pressRef = useRef(null);
  const swallowClickRef = useRef(false);
  // Leaving the page while a long press is still waiting: its timer must not fire. (Not in the effect below: that one re-runs
  // on every render, because `keys` is a new list each time, and must keep the press alive across those re-runs.)
  useEffect(() => () => clearTimeout(pressRef.current?.timer), []);

  useEffect(() => {
    if (disabled) return;
    const endPress = () => {
      clearTimeout(pressRef.current?.timer);
      pressRef.current = null;
    };
    // A finger (even one the browser reports as a "mouse" pointer): this press is a touch, so it needs the long press.
    const onTouchStart = () => {
      if (pressRef.current) pressRef.current.sawTouch = true;
    };
    const onMove = (e) => {
      const press = pressRef.current;
      if (!press || e.pointerId !== press.pointerId) return;
      const dy = e.clientY - press.startY;
      if (press.sawTouch && !press.active) {
        // Moved before the long press finished: this is a scroll, not a drag — let the menu scroll.
        if (Math.abs(dy) > TOUCH_SLOP || Math.abs(e.clientX - press.startX) > TOUCH_SLOP) endPress();
        return;
      }
      if (!press.active && Math.abs(dy) < 6) return;
      press.active = true;
      clearTimeout(press.timer);
      setDragging({ key: press.key, dy });
    };
    const onUp = (e) => {
      const press = pressRef.current;
      if (!press || e.pointerId !== press.pointerId) return;
      endPress();
      if (!press.active) return;
      // Only the click fired by this same release is swallowed.
      swallowClickRef.current = true;
      setTimeout(() => {
        swallowClickRef.current = false;
      }, 0);
      setDragging(null);
      // A touch drag the browser cancelled has no drop position: the order stays.
      if (e.type === "pointercancel") return;
      // Drop position: the item whose original middle the pointer has passed.
      const others = press.rects.filter((r) => r.key !== press.key);
      const index = others.filter((r) => e.clientY > r.mid).length;
      const next = others.map((r) => r.key);
      next.splice(index, 0, press.key);
      if (next.join() !== keys.join()) onReorder(next);
    };
    // While a touch drag is on, the finger moves the item, not the page.
    const onTouchMove = (e) => {
      if (pressRef.current?.sawTouch && pressRef.current.active) e.preventDefault();
    };
    window.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [disabled, keys, onReorder]);

  return {
    handlers: (key) =>
      disabled
        ? {}
        : {
            "data-nav-key": key,
            onPointerDown: (e) => {
              if (e.button !== 0) return;
              clearTimeout(pressRef.current?.timer);
              const nodes = navRef.current ? [...navRef.current.querySelectorAll(":scope > [data-nav-key]")] : [];
              const rects = nodes.map((node) => {
                const rect = node.getBoundingClientRect();
                return { key: node.dataset.navKey, mid: rect.top + rect.height / 2 };
              });
              // Treat pointerType "touch"/"pen" as touch at once; on a touch-capable device a "mouse" pointer is still armed with
              // the long-press timer, because an iPad reports a finger as "mouse" (a real touchstart then confirms it).
              const maybeTouch = e.pointerType !== "mouse" || TOUCH_CAPABLE;
              const press = { key, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, rects, active: false, sawTouch: e.pointerType !== "mouse", timer: null };
              if (maybeTouch) {
                press.timer = setTimeout(() => {
                  if (pressRef.current !== press || press.active) return;
                  press.active = true;
                  setDragging({ key, dy: 0 });
                  navigator.vibrate?.(15);
                }, LONG_PRESS_MS);
              }
              pressRef.current = press;
            },
            // A long press must not open the phone's link menu.
            onContextMenu: (e) => {
              if (pressRef.current?.sawTouch) e.preventDefault();
            },
          },
    style: (key) =>
      dragging?.key === key
        ? { transform: `translateY(${dragging.dy}px)`, zIndex: 2, boxShadow: "0 10px 24px rgba(10,16,34,0.22)", cursor: "grabbing", ...NO_TOUCH_MENU }
        : disabled
          ? undefined
          : NO_TOUCH_MENU,
    consumeClick: () => {
      const swallow = swallowClickRef.current;
      swallowClickRef.current = false;
      return swallow;
    },
  };
}
