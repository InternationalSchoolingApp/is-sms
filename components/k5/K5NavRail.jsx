"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Award, BarChart3, BookMarked, CalendarCheck, CalendarDays, ChevronDown, Circle, ClipboardCheck, FileText, Gamepad2,
  Globe, GraduationCap, Handshake, History, LayoutDashboard, MoreHorizontal, ShoppingCart, Wallet, X,
} from "lucide-react";
import { CLUB_ART } from "@/components/k5/clubMarks";
import { NAV_ART } from "@/components/k5/navIcons";
import { K5Sk } from "@/components/k5/K5Skeletons";
import { studentNavHref } from "@/utils/dashboardNav";

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
  console.log("K5NavRail render", menu);
  return (
    <>
      {open && <button type="button" aria-label="Close menu" onClick={onClose} className="fixed inset-0 z-[45] cursor-pointer bg-[rgba(10,16,34,0.35)]" />}

      <nav
        id="k5-sidenav"
        ref={navRef}
        aria-label="Main menu"
        data-pin="side"
        data-open={open}
        className="k5-side fixed [scrollbar-width:thin]   z-20 flex max-h-[calc(100vh-120px)] flex-col items-center gap-1 overflow-y-auto overflow-x-hidden rounded-[26px] border-[3px] border-k5-line bg-k5-card px-1.5 py-2.5 shadow-k5-chunky"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="k5-nclose hidden h-11 w-11 flex-none items-center justify-center self-end rounded-full border-[3px] border-k5-line bg-k5-card text-k5-mut"
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
              <span key={i} aria-hidden="true" className="k5-ni relative flex w-[76px] flex-none flex-col items-center gap-1 py-1">
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

const ITEM_CLASS =
  "k5-ni relative flex w-[76px] flex-none touch-none select-none flex-col items-center gap-1 rounded-2xl py-1 text-center text-xs font-black leading-[1.15] no-underline [overflow-wrap:anywhere]";

function NavTile({ icon, active }) {
  const [Icon, tile, stroke] = iconFor(icon);
  return (
    <span className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[15px] ${active ? "bg-white text-k5-ac" : `${tile} ${stroke}`}`}>
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
      className={`${ITEM_CLASS} ${active ? "bg-k5-ac text-white" : "text-k5-ink hover:bg-k5-soft"}`}
    >
      <NavTile icon={item.icon} active={active} />
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
        <NavTile icon={item.icon} />
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
                  className={`flex w-[52px] items-center justify-center rounded-xl py-1.5 no-underline ${active ? "bg-k5-act" : "hover:bg-k5-soft"}`}
                >
                  {art.flag ? (
                    <span
                      aria-hidden="true"
                      className="flex h-6 w-[34px] flex-none items-center justify-center rounded-[7px] text-lg leading-none text-[#FFDE00] shadow-[0_0_0_2px_var(--k5-card),0_0_0_3px_var(--k5-line)]"
                      style={{ background: art.flag }}
                    >
                      {art.mark}
                    </span>
                  ) : (
                    <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-[7px] bg-k5-soft text-lg leading-none shadow-[0_0_0_2px_var(--k5-card),0_0_0_3px_var(--k5-line)]">
                      {art.emoji}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {openGroup && (
        <ul className="k5-sub w-full flex-col gap-1 ps-[58px]">
          {item.children.map((child) => {
            const active = isActive(child.segment);
            return (
              <li key={child.key}>
                <Link
                  href={studentNavHref(school, child.segment)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-[15px] font-extrabold ${
                    active ? "bg-k5-act text-k5-acx" : "text-k5-ink hover:bg-k5-soft"
                  }`}
                >
                  {child.label}
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
