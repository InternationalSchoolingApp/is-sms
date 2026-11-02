"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addPlanToCart,
  applyCartDiscount,
  createCartPayment,
  getBuyExtraClass,
  getCartCount,
  getCartDetails,
  getSchoolCurrency,
  removeCartItem,
} from "@/services/cartApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

// Query keys shared by the plans page, the cart page and the header badge, so a
// cart change refreshes all three. Queries append the dummy-mode key, so these
// stay prefixes for invalidation.
export const CART_KEYS = {
  plans: (userId) => ["buy-extra-class", userId],
  count: (userId) => ["cart-count", userId],
  details: (userId) => ["cart-details", userId],
  currency: (schoolId) => ["school-currency", schoolId],
};

// Dummy (demo) student mode: legacy getDummyBuyExtraClassResponse and the getDummy*Cart* handlers
// (the cart is kept in localStorage, nothing reaches the backend).

export function useBuyExtraClass(userId) {
  const dummy = useDummyStudent();
  return useQuery({
    queryKey: [...CART_KEYS.plans(userId), dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.buyExtraClass() : getBuyExtraClass()),
    enabled: Boolean(userId && dummy.settled),
    staleTime: 0,
  });
}

export function useCartDetails(userId) {
  const dummy = useDummyStudent();
  return useQuery({
    queryKey: [...CART_KEYS.details(userId), dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.cartDetails() : getCartDetails()),
    enabled: Boolean(userId && dummy.settled),
    staleTime: 0,
  });
}

export function useCartCount(userId) {
  const dummy = useDummyStudent();
  return useQuery({
    queryKey: [...CART_KEYS.count(userId), dummy.key],
    queryFn: async () => {
      const response = dummy.enabled ? dummy.student.cartCount() : await getCartCount();
      return Number(response?.cartCount) || 0;
    },
    enabled: Boolean(userId && dummy.settled),
    refetchOnWindowFocus: false,
  });
}

// schoolSettingsTechnical rarely changes; fetched once per school.
export function useSchoolCurrency(schoolId) {
  return useQuery({
    queryKey: CART_KEYS.currency(schoolId),
    queryFn: () => getSchoolCurrency(),
    enabled: Boolean(schoolId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

function useCartInvalidation(userId) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: CART_KEYS.count(userId) });
    queryClient.invalidateQueries({ queryKey: CART_KEYS.details(userId) });
  };
}

export function useAddPlanToCart(userId) {
  const invalidate = useCartInvalidation(userId);
  const dummy = useDummyStudent();
  return useMutation({
    mutationFn: async (plan) => (dummy.enabled ? dummy.student.addToCart(plan) : addPlanToCart(plan)),
    onSuccess: invalidate,
  });
}

export function useRemoveCartItem(userId) {
  const invalidate = useCartInvalidation(userId);
  const dummy = useDummyStudent();
  return useMutation({
    mutationFn: async (cartId) => (dummy.enabled ? dummy.student.removeFromCart(cartId) : removeCartItem({ cartId })),
    onSuccess: invalidate,
  });
}

export function useApplyCartDiscount(userId) {
  const invalidate = useCartInvalidation(userId);
  const dummy = useDummyStudent();
  return useMutation({
    mutationFn: async (args) => (dummy.enabled ? dummy.student.applyCartDiscount() : applyCartDiscount(args)),
    onSuccess: invalidate,
  });
}

export function useCreateCartPayment() {
  const dummy = useDummyStudent();
  return useMutation({ mutationFn: async () => (dummy.enabled ? dummy.student.cartPayment() : createCartPayment()) });
}
