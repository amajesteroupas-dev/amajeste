"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  size: string;
  color: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxStock: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (variantId: string) => void;
  updateQty: (variantId: string, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const qty = item.quantity ?? 1;
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? {
                      ...i,
                      quantity: Math.min(i.quantity + qty, i.maxStock),
                    }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(qty, item.maxStock) },
            ],
          };
        });
      },
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQty: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId
                    ? { ...i, quantity: Math.min(quantity, i.maxStock) }
                    : i
                ),
        })),
      clear: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "majeste-cart" }
  )
);
