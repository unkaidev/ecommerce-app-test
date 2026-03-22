'use client';

/**
 * Minimal useToast hook — manages a toast queue via React state.
 * Compatible with the Toaster component.
 */
import { useState, useCallback } from 'react';
import type { ToastVariant } from '@/components/ui/toast';

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** Duration in ms — 0 = persist until dismissed. Default 4000 */
  duration?: number;
}

let _setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>> | null = null;
let _counter = 0;

/**
 * Imperative toast() caller — usable outside React components.
 * Registers with the hook instance via the setter captured from useToast().
 */
export function toast(options: ToastOptions) {
  if (!_setToasts) return;

  const id = `toast-${++_counter}`;
  const item: ToastItem = { id, open: true, ...options };

  _setToasts((prev) => [...prev, item]);

  const duration = options.duration ?? 4000;
  if (duration > 0) {
    setTimeout(() => {
      _setToasts?.((prev) =>
        prev.map((t) => (t.id === id ? { ...t, open: false } : t)),
      );
      // Remove after animation
      setTimeout(() => {
        _setToasts?.((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, duration);
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Register the setter so the imperative toast() function can reach it.
  _setToasts = setToasts;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return { toasts, dismiss, toast };
}
