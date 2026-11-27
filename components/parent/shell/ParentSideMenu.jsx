"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { dashboardNavHref } from "@/utils/dashboardNav";
import { MENU_ICONS, MENU_ICONS_BY_LABEL } from "@/components/parent/shell/menuIcons";

const FALLBACK_ICON = '<circle cx="12" cy="12" r="3"/>';

// The icons are the design board's static SVG markup (menuIcons.js), never user input.
function MenuIcon({ item }) {
  const inner = MENU_ICONS[item.segment ?? ""] ?? MENU_ICONS_BY_LABEL[item.label] ?? FALLBACK_ICON;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: inner }} />;
}

/**
 * The parent's left menu (design board .side): rounded card, labels on a wide screen, icons only when folded, a drawer on
 * a phone. The items are the dynamic menu from the backend; links stay under /{school}/parent.
 */
export function ParentSideMenu({ menu, wide, open, onClose, phone }) {
  const pathname = usePathname();
  const { school } = useParams();
  const hrefFor = (segment) => dashboardNavHref(school, "parent", segment);
  const isActive = (segment) => {
    const href = hrefFor(segment);
    return segment ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
  };
  // wide: `mini` is the folded state; narrower: `open` is the expanded / drawer state.
  const cls = `side ${wide ? (open ? "" : "mini") : open ? "open" : ""}`.trim();

  return (
    <>
      <nav id="parent-side" className={cls} aria-label="Parent menu">
        <ul className="nav">
          {menu.map((item) =>
            item.children?.length ? (
              <MenuGroup key={item.key} item={item} hrefFor={hrefFor} isActive={isActive} onNavigate={() => !wide && onClose()} />
            ) : (
              <li key={item.key}>
                <Link href={hrefFor(item.segment)} aria-current={isActive(item.segment) ? "page" : undefined} title={item.label} onClick={() => !wide && onClose()}>
                  <MenuIcon item={item} />
                  <span className="lbl">{item.label}</span>
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>
      <div className={`scrim ${open && phone ? "on" : ""}`} onClick={onClose} aria-hidden="true" />
    </>
  );
}

function MenuGroup({ item, hrefFor, isActive, onNavigate }) {
  const childActive = item.children.some((c) => isActive(c.segment));
  const [open, setOpen] = useState(childActive);
  return (
    <li>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} title={item.label}>
        <MenuIcon item={item} />
        <span className="lbl">{item.label}</span>
        <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <ul className={`sub ${open ? "show" : ""}`}>
        {item.children.map((child) => (
          <li key={child.key}>
            <Link href={hrefFor(child.segment)} aria-current={isActive(child.segment) ? "page" : undefined} onClick={onNavigate}>
              <span className="lbl">{child.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </li>
  );
}
