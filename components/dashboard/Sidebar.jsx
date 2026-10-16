"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, GraduationCap, CalendarCheck, ShoppingCart,
  ClipboardCheck, BarChart3, FileText, Globe, Handshake, Gamepad2, Wallet,
  BookMarked, History, Circle, ChevronDown, X,
} from "lucide-react";
import { studentNavHref } from "@/utils/dashboardNav";

// String-key -> lucide component (keys come from utils/dashboardNav.js; all verified present).
const ICONS = {
  dashboard: LayoutDashboard, calendar: CalendarDays, teacher: GraduationCap,
  "book-class": CalendarCheck, cart: ShoppingCart, attendance: ClipboardCheck,
  chart: BarChart3, file: FileText, globe: Globe, social: Handshake, game: Gamepad2,
  fee: Wallet, handbook: BookMarked, history: History, dot: Circle,
};

function iconFor(key) {
  return ICONS[key] || Circle;
}

/**
 * The student dashboard's left sidebar — mirrors the legacy
 * DashboardLeftSideContentSchool.jsp menu. Supports expandable groups
 * (Academic Reports), a collapsed desktop icon-rail, and a mobile drawer.
 *
 * Props:
 *  - menu: resolved nav items (dynamic DB menu or static STUDENT_NAV)
 *  - open / onClose: mobile drawer state
 *  - collapsed / onExpand: desktop icon-rail state (clicking a group in the
 *    rail expands it so its children are reachable)
 */
export function Sidebar({ menu, open = false, onClose, collapsed = false, onExpand }) {
  const pathname = usePathname();
  const { school } = useParams();

  const isActive = (segment) => {
    const href = studentNavHref(school, segment);
    return segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" aria-hidden="true" onClick={onClose} />}

      <nav
        aria-label="Student dashboard"
        className={`fixed left-0 top-[var(--dash-header-h,56px)] z-40 h-[calc(100vh-var(--dash-header-h,56px))] overflow-y-auto overflow-x-hidden border-r border-slate-200 bg-white py-3 transition-all duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-16 px-2" : "w-64 px-3"}`}
      >
        <div className="mb-2 flex items-center justify-between px-2 md:hidden">
          <span className="text-sm font-bold text-black">Menu</span>
          <button type="button" aria-label="Close menu" onClick={onClose} className="rounded-md p-1 text-black hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="space-y-1">
          {menu.map((item) =>
            item.children && item.children.length ? (
              <GroupItem
                key={item.key}
                item={item}
                school={school}
                collapsed={collapsed}
                onExpand={onExpand}
                onNavigate={onClose}
                isActive={isActive}
              />
            ) : (
              <LinkItem
                key={item.key}
                href={studentNavHref(school, item.segment)}
                label={item.label}
                Icon={iconFor(item.icon)}
                active={isActive(item.segment)}
                collapsed={collapsed}
                onNavigate={onClose}
              />
            )
          )}
        </ul>
      </nav>
    </>
  );
}

function LinkItem({ href, label, Icon, active, collapsed, onNavigate }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          collapsed ? "justify-center px-0" : ""
        } ${active ? "bg-primary/10 text-primary" : "text-black hover:bg-slate-100"}`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : "text-black"}`} aria-hidden="true" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </li>
  );
}

function GroupItem({ item, school, collapsed, onExpand, onNavigate, isActive }) {
  const Icon = iconFor(item.icon);
  const childActive = item.children.some((c) => isActive(c.segment));
  const [openGroup, setOpenGroup] = useState(childActive);

  // In the collapsed rail a group can't show its children — clicking expands the rail.
  if (collapsed) {
    return (
      <li>
        <button
          type="button"
          title={item.label}
          onClick={() => onExpand && onExpand()}
          className={`flex w-full items-center justify-center rounded-lg py-2 text-sm transition-colors ${
            childActive ? "bg-primary/10 text-primary" : "text-black hover:bg-slate-100"
          }`}
        >
          <Icon className={`h-[18px] w-[18px] shrink-0 ${childActive ? "text-primary" : "text-black"}`} aria-hidden="true" />
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpenGroup((v) => !v)}
        aria-expanded={openGroup}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          childActive ? "text-primary" : "text-black hover:bg-slate-100"
        }`}
      >
        <Icon className={`h-[18px] w-[18px] shrink-0 ${childActive ? "text-primary" : "text-black"}`} aria-hidden="true" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openGroup ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {openGroup && (
        <ul className="mt-1 space-y-1 border-l border-slate-200 pl-3">
          {item.children.map((child) => {
            const active = isActive(child.segment);
            return (
              <li key={child.key}>
                <Link
                  href={studentNavHref(school, child.segment)}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-black hover:bg-slate-100"
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
