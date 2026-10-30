"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { FullScreenLoader } from "@/components/common/Loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentGatewayPickerModal } from "@/components/student-enroll/PaymentGatewayPickerModal";
import { CartTermsModal } from "@/components/student/cart/CartTermsModal";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import {
  CART_KEYS,
  useApplyCartDiscount,
  useCartDetails,
  useCreateCartPayment,
  useRemoveCartItem,
  useSchoolCurrency,
} from "@/hooks/useStudentCart";
import { studentNavHref } from "@/utils/dashboardNav";
import { formatAmount, weeksBetween, weeksLabel } from "@/utils/cartPlan";

// cartDetailContent.js: maxlength 15, M.isAlphaNumericWithNoSpecialCharacter on the code field.
const DISCOUNT_CODE_PATTERN = /^[A-Za-z0-9]{1,15}$/;
const DISCOUNT_TOO_LARGE = "Discounted amount is more than the total amount";

function PageTitle({ count }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-4">
      <ShoppingCart className="h-5 w-5 text-primary" aria-hidden="true" />
      <h1 className="text-lg font-extrabold text-black sm:text-xl">Your Cart ({count} Items)</h1>
    </div>
  );
}

function CartItem({ item, symbol, school, busy, onRemove }) {
  const weeks = weeksBetween(item.planStartDate, item.planEndDate);
  return (
    <li className="flex gap-3 rounded-xl border border-slate-200 p-3">
      {item.imgURl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imgURl} alt="" className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-contain" />
      )}
      <div className="min-w-0 flex-1 text-sm text-black">
        <h3 className="mb-1 text-base font-bold">{item.subjectName}</h3>
        <p>
          No. of Classes: <b>{item.classCount} extra {item.classCount === 1 ? "class" : "classes"}</b>
        </p>
        <p>
          Plan Duration:{" "}
          <b>
            {item.planStartDate} - {item.planEndDate} ({weeksLabel(weeks)})
          </b>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span>
            Plan Fee: <b>{formatAmount(symbol, item.planAmount)}</b>
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              aria-label="Remove from cart"
              disabled={busy}
              onClick={() => onRemove(item.cartId)}
              className="rounded-lg bg-red-600 p-2 text-white disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <Link
              href={`${studentNavHref(school, "student-addon")}?subject=${item.subjectId}`}
              aria-label="Change plan"
              className="rounded-lg bg-primary p-2 text-white"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Cart (opened from the header cart button or a plan's Buy) — legacy
 * renderCardDetailsContent() in cartDetailContent.js: line items with remove /
 * edit, the discount code, the fee summary and CONFIRM AND PAY, which raises the
 * payment (cart-payment), shows the Terms and Conditions and then runs the
 * shared payment-gateway flow.
 */
export function Cart() {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [terms, setTerms] = useState(null);

  const cartQuery = useCartDetails(context?.userId);
  const currencyQuery = useSchoolCurrency(context?.schoolNumericId);
  const removeItem = useRemoveCartItem(context?.userId);
  const applyDiscount = useApplyCartDiscount(context?.userId);
  const createPayment = useCreateCartPayment();
  const checkout = useCartCheckout({
    context,
    onPaid: () => {
      setTerms(null);
      queryClient.invalidateQueries({ queryKey: CART_KEYS.count(context?.userId) });
      queryClient.invalidateQueries({ queryKey: CART_KEYS.details(context?.userId) });
      queryClient.invalidateQueries({ queryKey: CART_KEYS.plans(context?.userId) });
      toast.success("Payment received. Your extra classes are ready to book.");
      router.push(studentNavHref(school, "student-addon"));
    },
  });
  const symbol = currencyQuery.data?.symbol ?? "";

  if (!context || cartQuery.isLoading) {
    return (
      <div className="mx-auto w-full">
        <PageTitle count={0} />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg font-bold text-primary">Loading…</div>
      </div>
    );
  }

  const response = cartQuery.data;
  const details = response?.status === "1" ? response.details : null;
  const cart = details?.cart ?? {};
  const items = cart.cartItems ?? [];
  const appliedCode = cart.discountCode || "";
  const busy = removeItem.isPending || applyDiscount.isPending || createPayment.isPending || checkout.preparing;

  async function remove(cartId) {
    const result = await removeItem.mutateAsync(cartId).catch(() => null);
    if (result?.status !== "1") toast.error(result?.message || "Unable to update cart");
  }

  async function toggleDiscount() {
    const removing = Boolean(appliedCode);
    const value = code.trim();
    if (!removing && !DISCOUNT_CODE_PATTERN.test(value)) {
      toast.error(value ? "Please use the English Keyboard while providing information" : "Enter a valid Scholarship code.");
      return;
    }
    const result = await applyDiscount.mutateAsync({ scholarshipCode: value, remove: removing }).catch(() => null);
    if (result?.status !== "1") {
      toast.error(result?.message || "Unable to apply discount on cart");
      return;
    }
    setCode("");
    toast.success(removing ? "Discount code removed successfully" : "Discount code applied successfully");
  }

  async function confirmAndPay() {
    const result = await createPayment.mutateAsync().catch(() => null);
    if (result?.status !== "1" || !result.details?.userPaymentDetailsId) {
      toast.error(result?.message || "Unable to pay cart items");
      return;
    }
    setTerms(result.details);
  }

  if (!details) {
    return (
      <div className="mx-auto w-full">
        <PageTitle count={0} />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg font-bold text-primary">
          {response?.message || "Unable to load your cart right now. Please try again."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <PageTitle count={details.cartCount ?? items.length} />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <h2 className="text-2xl font-bold text-primary">
              Oops!
              <br />
              There are no plans added to your cart.
            </h2>
            <Link href={studentNavHref(school, "student-addon")} className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 font-bold text-white">
              Browse Plans
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <ul className="space-y-3 lg:col-span-2">
              {items.map((item) => (
                <CartItem key={item.cartId} item={item} symbol={symbol} school={school} busy={busy} onRemove={remove} />
              ))}
            </ul>
            <div className="h-fit space-y-3 rounded-xl border border-slate-200 p-4 text-black">
              <h2 className="text-lg font-bold">Fee Details</h2>
              <div className="flex justify-between font-semibold">
                <span>Cart Total</span>
                <span>{formatAmount(symbol, cart.cartTotal)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Discount Code</span>
                <span>{appliedCode ? formatAmount(symbol, cart.cpDiscount) : ""}</span>
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={appliedCode || code}
                  disabled={Boolean(appliedCode) || busy}
                  maxLength={15}
                  onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
                  aria-label="Discount code"
                  className="min-w-0 flex-1 rounded-l-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleDiscount}
                  title={appliedCode ? "Remove Discount Code" : "Apply Discount Code"}
                  className="rounded-r-lg bg-primary px-4 font-semibold text-white disabled:opacity-50"
                >
                  {appliedCode ? "Remove" : "Apply"}
                </button>
              </div>
              {cart.errorMsg && <p className="text-sm text-red-600">{cart.errorMsg}</p>}
              <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold">
                <span>Total</span>
                <span>{formatAmount(symbol, cart.totalPayAmount)}</span>
              </div>
              <button
                type="button"
                disabled={busy || cart.errorMsg === DISCOUNT_TOO_LARGE}
                onClick={confirmAndPay}
                className="w-full rounded-lg bg-primary p-2 text-lg font-bold text-white disabled:opacity-50"
              >
                CONFIRM AND PAY
              </button>
            </div>
          </div>
        )}
      </div>

      <CartTermsModal
        key={terms?.userPaymentDetailsId ?? "none"}
        open={Boolean(terms) && !checkout.picker}
        planStatus={terms?.planStatus}
        schoolNumericId={context.schoolNumericId}
        schoolName={context.schoolName}
        busy={checkout.preparing}
        onClose={() => setTerms(null)}
        onPay={() => checkout.start(terms.userPaymentDetailsId)}
      />
      <PaymentGatewayPickerModal
        open={Boolean(checkout.picker)}
        onOpenChange={(open) => !open && checkout.closePicker()}
        details={checkout.picker?.details}
        airwallexMethods={checkout.picker?.methods}
        payerCountryCode={checkout.picker?.countryCode}
        schoolNumericId={context.schoolNumericId}
        schoolName={context.schoolName}
        busy={checkout.launching}
        onPay={checkout.launchGateway}
        onUploadProof={checkout.uploadProof}
        onSubmitOffline={checkout.submitOffline}
      />
      {checkout.processing && <FullScreenLoader message="Payment is under process..." />}
      <Dialog open={checkout.incomplete} onOpenChange={(open) => !open && checkout.dismissIncomplete()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl">Oops!</DialogTitle>
          </DialogHeader>
          <h3 className="text-lg font-semibold text-red-600">Payment Incomplete</h3>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkout.underReview}
        onOpenChange={(open) => {
          if (open) return;
          checkout.dismissUnderReview();
          setTerms(null);
          cartQuery.refetch();
        }}
      >
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle>Your payment is under review.</DialogTitle>
          </DialogHeader>
          <p className="text-black/70">Your extra classes will be available once the payment is received.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
