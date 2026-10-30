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

// Query keys shared by the plans page, the cart page and the header badge, so a
// cart change refreshes all three.
export const CART_KEYS = {
  plans: (userId) => ["buy-extra-class", userId],
  count: (userId) => ["cart-count", userId],
  details: (userId) => ["cart-details", userId],
  currency: (schoolId) => ["school-currency", schoolId],
};

export function useBuyExtraClass(userId) {
  return useQuery({
    queryKey: CART_KEYS.plans(userId),
    queryFn: () => getBuyExtraClass(),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}

export function useCartDetails(userId) {
  return useQuery({
    queryKey: CART_KEYS.details(userId),
    queryFn: () => getCartDetails(),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}

export function useCartCount(userId) {
  return useQuery({
    queryKey: CART_KEYS.count(userId),
    queryFn: async () => {
      const response = await getCartCount();
      return Number(response?.cartCount) || 0;
    },
    enabled: Boolean(userId),
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
  return useMutation({ mutationFn: (plan) => addPlanToCart(plan), onSuccess: invalidate });
}

export function useRemoveCartItem(userId) {
  const invalidate = useCartInvalidation(userId);
  return useMutation({ mutationFn: (cartId) => removeCartItem({ cartId }), onSuccess: invalidate });
}

export function useApplyCartDiscount(userId) {
  const invalidate = useCartInvalidation(userId);
  return useMutation({ mutationFn: (args) => applyCartDiscount(args), onSuccess: invalidate });
}

export function useCreateCartPayment() {
  return useMutation({ mutationFn: () => createCartPayment() });
}
