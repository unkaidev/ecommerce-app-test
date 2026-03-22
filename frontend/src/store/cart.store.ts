'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartWithTotals } from '@/types';
import { api } from '@/lib/api';

interface CartStore {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCart: () => Promise<void>;
  addItem: (variantId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  setCartFromResponse: (data: CartWithTotals) => void;

  // Selectors
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      subtotal: 0,
      totalItems: 0,
      isLoading: false,
      error: null,

      setCartFromResponse: (data: CartWithTotals) => {
        set({
          items: data.cart.items ?? [],
          subtotal: data.subtotal,
          totalItems: data.totalItems,
          error: null,
        });
      },

      fetchCart: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.cart.get();
          get().setCartFromResponse(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to load cart' });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: async (variantId: string, quantity: number) => {
        set({ isLoading: true, error: null });
        // Optimistic update: temporarily bump totalItems
        const prevTotal = get().totalItems;
        set({ totalItems: prevTotal + quantity });

        try {
          const data = await api.cart.addItem({ variantId, quantity });
          get().setCartFromResponse(data);
        } catch (err) {
          // Rollback optimistic update
          set({ totalItems: prevTotal, error: err instanceof Error ? err.message : 'Failed to add item' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      updateItem: async (itemId: string, quantity: number) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.cart.updateItem(itemId, { quantity });
          get().setCartFromResponse(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to update item' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (itemId: string) => {
        set({ isLoading: true, error: null });
        // Optimistic removal
        const prevItems = get().items;
        const removed = prevItems.find((i) => i.id === itemId);
        if (removed) {
          set({
            items: prevItems.filter((i) => i.id !== itemId),
            totalItems: get().totalItems - removed.quantity,
          });
        }

        try {
          const data = await api.cart.removeItem(itemId);
          get().setCartFromResponse(data);
        } catch (err) {
          // Rollback
          set({ items: prevItems, totalItems: get().totalItems + (removed?.quantity ?? 0) });
          set({ error: err instanceof Error ? err.message : 'Failed to remove item' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      clearCart: async () => {
        set({ isLoading: true, error: null });
        try {
          await api.cart.clear();
          set({ items: [], subtotal: 0, totalItems: 0 });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to clear cart' });
        } finally {
          set({ isLoading: false });
        }
      },

      applyCoupon: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.cart.applyCoupon(code);
          get().setCartFromResponse(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Invalid coupon code' });
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      removeCoupon: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.cart.removeCoupon();
          get().setCartFromResponse(data);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to remove coupon' });
        } finally {
          set({ isLoading: false });
        }
      },

      // Selector — computed from current state
      totalPrice: () => {
        return get().items.reduce((sum, item) => {
          return sum + parseFloat(item.unitPrice) * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        subtotal: state.subtotal,
        totalItems: state.totalItems,
      }),
    },
  ),
);
