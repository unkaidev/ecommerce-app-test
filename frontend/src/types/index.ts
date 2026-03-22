// ============================================================
// Shared TypeScript types matching backend entities
// ============================================================

export type Role = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  variantId: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
  updatedAt: string;
  /** Computed: quantity - reserved */
  available?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  priceOverride: string | null;
  attributes: Record<string, string>;
  sortOrder: number;
  isActive: boolean;
  inventory?: Inventory;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  sku: string;
  categoryId: string | null;
  category: Category | null;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  tags: string[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  variantId: string;
  variant?: ProductVariant & { product?: Product };
  quantity: number;
  unitPrice: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string | null;
  couponCode: string | null;
  expiresAt: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartWithTotals {
  cart: Cart;
  subtotal: number;
  totalItems: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  shippingAmount: string;
  total: string;
  currency: string;
  couponCode: string | null;
  shippingAddressId: string | null;
  shippingAddressSnapshot: Partial<Address>;
  notes: string | null;
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

// API Response envelope types
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Auth state
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}
