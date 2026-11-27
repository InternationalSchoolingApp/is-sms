"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useCartCount } from "@/hooks/useStudentCart";
import { studentNavHref } from "@/utils/dashboardNav";

/**
 * Header cart button — legacy cartCountContent(): shown only while the cart has
 * items, with the count as a badge; opens the cart.
 */
export function CartHeaderButton() {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const isStudent = context?.role === "student";
  const { data: count = 0 } = useCartCount(isStudent ? context?.userId : null);
  if (!isStudent || count <= 0) return null;

  return (
    <Link
      href={studentNavHref(school, "cart")}
      title="Cart"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      className="relative rounded-full bg-amber-100 p-2 text-amber-600 hover:bg-amber-200"
    >
      <ShoppingCart className="h-4 w-4" />
      <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{count}</span>
    </Link>
  );
}
