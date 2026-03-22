'use client';

import Link from 'next/link';
import { ShoppingCart, User, Search, Menu } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import { cn } from '@/lib/utils';

export function Header() {
  const totalItems = useCartStore((s) => s.totalItems);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl text-primary shrink-0">
          ShopNext
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 ml-6 text-sm font-medium">
          <Link href="/products" className="text-muted-foreground hover:text-foreground transition-colors">
            Products
          </Link>
          <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
            Categories
          </Link>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button
            aria-label="Open search"
            className="hidden md:flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            aria-label={`Shopping cart — ${totalItems} items`}
            className="relative flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground tabular-nums">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>

          {/* User */}
          <Link
            href="/account"
            aria-label="My account"
            className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
          >
            <User className="h-5 w-5" />
          </Link>

          {/* Mobile menu */}
          <button
            aria-label="Open mobile menu"
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
