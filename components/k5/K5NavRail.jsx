"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLabelTranslator } from "@/i18n/labels";
import {
  Award, BarChart3, BookMarked, CalendarCheck, CalendarDays, ChevronDown, Circle, ClipboardCheck, FileText, Gamepad2,
  Globe, GraduationCap, Handshake, History, Inbox, LayoutDashboard, MoreHorizontal, ShoppingCart, Wallet, X,
} from "lucide-react";
import { InboxBadge, isInboxMenuItem } from "@/components/student/inbox/InboxBadge";
import { CLUB_ART } from "@/components/k5/clubMarks";
import { NAV_ART, navPictureFor } from "@/components/k5/navIcons";
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

/**
 * Display name of a nav item in the student's language: menu labels are DB module names (menu namespace), club pages
 * are club names (clubs.names). The raw label stays in the item for the picture lookup and everything else.
 */
function useNavLabel() {
  const t = useTranslations("k5.nav");
  const tMenu = useLabelTranslator("menu");
  const tClub = useLabelTranslator("clubs.names");
  const one = (raw) => {
    const menuName = tMenu(raw);
    return menuName !== raw ? menuName : tClub(raw);
  };
  return (item) => {
    if (item.key === "k5-more") return t("more");
    if (item.labelParts) return t("groupItem", { group: one(item.labelParts[0]), item: one(item.labelParts[1]) });
    return one(item.label);
  };
}

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
  const t = useTranslations("k5.nav");

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
      {open && <button type="button" aria-label={t("closeMenu")} onClick={onClose} className="fixed inset-0 z-[45] cursor-pointer bg-[rgba(10,16,34,0.35)]" />}

      <nav
        id="k5-sidenav"
        ref={navRef}
        aria-label={t("mainMenu")}
        data-pin="side"
        data-open={open}
        className="k5-side fixed [scrollbar-width:thin] z-20 flex max-h-[calc(100vh-120px)] flex-col items-center gap-1 overflow-y-auto overflow-x-hidden rounded-[26px] border-[3px] border-k5-line bg-k5-card px-1.5 py-2.5 shadow-k5-chunky"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeMenu")}
          className="k5-nclose hidden h-11 w-11 flex-none items-center justify-center cursor-pointer self-end rounded-full border-[3px] border-red-500 bg-red-500 text-white hover:border-red-600 hover:bg-red-600"
        >
          <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </button>

        {/* While the menu loads: the same tiles as the real items (76px wide, 46px icon box, a short label), pulsing. */}
        {loading && items.length === 0 && (
          <>
            <span role="status" aria-busy="true" aria-live="polite" className="sr-only">
              {t("loading")}
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
  return items.flatMap((item) =>
    item.children?.length ? item.children.map((child) => ({ ...child, label: `${item.label}: ${child.label}`, labelParts: [item.label, child.label] })) : [item],
  );
}

const ITEM_CLASS =
  "k5-ni relative isolate flex w-[46px] h-[46px] flex-none touch-none select-none flex-col items-center gap-1 rounded-2xl text-center text-xs font-black leading-[1.15] no-underline transition-colors duration-150 [overflow-wrap:anywhere]";

function NavTile({ icon, active, picture }) {
  const [Icon, tile, stroke] = iconFor(icon);
  // The mockup's picture (a 36px PNG on a transparent tile); the drawn icon stays as the fallback when there is no
  // picture for the item or it cannot be loaded.
  const [pictureFailed, setPictureFailed] = useState(false);
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
  const navLabel = useNavLabel();
  const label = navLabel(item);
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      draggable={false}
      onClick={(e) => (drag.consumeClick() ? e.preventDefault() : onNavigate())}
      {...drag.handlers(item.key)}
      style={drag.style(item.key)}
      className={`${ITEM_CLASS} ${active ? "text-white delay-100" : "text-k5-ink hover:bg-k5-soft"}`}
    >
      {active && <NavPill />}
      <NavTile icon={item.icon} active={active} picture={navPictureFor(item)} />
      {isInboxMenuItem(item) && <InboxBadge className="absolute left-[32px] top-0 shadow-[0_0_0_2px_var(--k5-card)] [.k5-side:hover_&]:left-[36px] [.k5-side[data-open='true']_&]:left-[36px]" />}
      <span className="k5-nl">{label}</span>
    </Link>
  );
}

function NavGroup({ item, school, isActive, expandRail, onNavigate, drag }) {
  const navLabel = useNavLabel();
  const label = navLabel(item);
  const childActive = item.children.some((child) => isActive(child.segment));
  const [openGroup, setOpenGroup] = useState(childActive);
  // A club group shows its clubs as little pictures (flags / emoji) right under it, even in the narrow rail.
  const hasClubArt = item.children.some((child) => CLUB_ART[child.segment]);

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
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
        <NavTile icon={item.icon} picture={navPictureFor(item)} />
        {isInboxMenuItem(item) && <InboxBadge className="absolute left-[40px] top-0 shadow-[0_0_0_2px_var(--k5-card)]" />}
        <span className="k5-nl">{label}</span>
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
                  title={navLabel(child)}
                  aria-label={navLabel(child)}
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
                  <span className="min-w-0 truncate">{navLabel(child)}</span>
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
  const [failed, setFailed] = useState(false);
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
 * Pointer drag to reorder the rail's top-level items (mouse and touch). A press that moves
 * more than a few pixels becomes a drag; the click that follows the drop is swallowed so
 * dropping an item never navigates.
 */
function useDragReorder({ navRef, keys, onReorder, disabled }) {
  const [dragging, setDragging] = useState(null); // { key, dy }
  const pressRef = useRef(null);
  const swallowClickRef = useRef(false);

  useEffect(() => {
    if (disabled) return;
    const onMove = (e) => {
      const press = pressRef.current;
      if (!press) return;
      const dy = e.clientY - press.startY;
      if (!press.active && Math.abs(dy) < 6) return;
      press.active = true;
      setDragging({ key: press.key, dy });
    };
    const onUp = (e) => {
      const press = pressRef.current;
      pressRef.current = null;
      if (!press?.active) return;
      // Only the click fired by this same release is swallowed.
      swallowClickRef.current = true;
      setTimeout(() => {
        swallowClickRef.current = false;
      }, 0);
      setDragging(null);
      // Drop position: the item whose original middle the pointer has passed.
      const others = press.rects.filter((r) => r.key !== press.key);
      const index = others.filter((r) => e.clientY > r.mid).length;
      const next = others.map((r) => r.key);
      next.splice(index, 0, press.key);
      if (next.join() !== keys.join()) onReorder(next);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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
              const nodes = navRef.current ? [...navRef.current.querySelectorAll(":scope > [data-nav-key]")] : [];
              const rects = nodes.map((node) => {
                const rect = node.getBoundingClientRect();
                return { key: node.dataset.navKey, mid: rect.top + rect.height / 2 };
              });
              pressRef.current = { key, startY: e.clientY, rects, active: false };
            },
          },
    style: (key) =>
      dragging?.key === key
        ? { transform: `translateY(${dragging.dy}px)`, zIndex: 2, boxShadow: "0 10px 24px rgba(10,16,34,0.22)", cursor: "grabbing" }
        : undefined,
    consumeClick: () => {
      const swallow = swallowClickRef.current;
      swallowClickRef.current = false;
      return swallow;
    },
  };
}
