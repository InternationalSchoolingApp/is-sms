import { Cart } from "@/components/student/cart/Cart";

// Not a sidebar item: opened from the header cart button and from a plan's Buy
// (legacy renderCardDetailsContent).
export default function CartPage() {
  return <Cart />;
}
