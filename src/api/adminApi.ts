export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('gc_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ──────── Admin Auth ───────────────────────────────────────────────────────

export async function loginAdmin(email: string, password: string) {
  return apiRequest<{
    token: string;
    admin: { id: string; email: string; name: string };
  }>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchAdminMe() {
  return apiRequest<{ id: string; email: string; name: string }>('/admin/me');
}

export async function fetchAdminStats() {
  return apiRequest<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    avgOrderValue: number;
    activeCoupons: number;
    mpesaRevenue: number;
    cardRevenue: number;
    lowStockVariants: {
      variantId: string;
      sku: string;
      size: string;
      color: string;
      stockQuantity: number;
      productTitle: string;
      productCategory: string;
    }[];
  }>('/admin/stats');
}

// ──────── Products ─────────────────────────────────────────────────────────

export interface ProductPayload {
  title: string;
  gender: 'women' | 'men' | 'unisex';
  category: string;
  price: number;
  salePrice?: number;
  description: string;
  fabricCare?: string;
  images: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  stockPerVariant?: number;
}

export async function fetchProducts(filters?: any) {
  const params = new URLSearchParams();
  if (filters?.gender && filters.gender !== 'all') params.set('gender', filters.gender);
  if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiRequest<any[]>(`/products${qs ? '?' + qs : ''}`);
}

export async function createProduct(payload: ProductPayload) {
  return apiRequest<any>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id: string, payload: Partial<ProductPayload>) {
  return apiRequest<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id: string) {
  return apiRequest<{ success: boolean }>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadProductImages(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));

  const res = await fetch(`${API_BASE}/upload/images`, {
    method: 'POST',
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.urls;
}

export async function adjustVariantStock(variantId: string, delta: number) {
  return apiRequest<any>(`/products/variant/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ variantId, delta }),
  });
}

// ──────── Orders ───────────────────────────────────────────────────────────

export async function fetchOrders() {
  return apiRequest<any[]>('/orders');
}

export async function updateOrderStatus(orderId: string, payload: {
  fulfillmentStatus?: string;
  paymentStatus?: string;
  mpesaReceipt?: string;
}) {
  return apiRequest<any>(`/orders/${orderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ──────── Coupons ──────────────────────────────────────────────────────────

export async function fetchCoupons() {
  return apiRequest<any[]>('/coupons');
}

export async function createCoupon(payload: {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount?: number;
  expiryDate: string;
  usageLimit?: number;
}) {
  return apiRequest<any>('/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function toggleCoupon(code: string) {
  return apiRequest<any>(`/coupons/${code}/toggle`, {
    method: 'PATCH',
  });
}

export async function deleteCoupon(code: string) {
  return apiRequest<{ success: boolean }>(`/coupons/${code}`, {
    method: 'DELETE',
  });
}

// ──────── POS Payment Notifications ───────────────────────────────────────

/**
 * Called by the POS AFTER it has successfully displayed/processed a payment
 * notification. Only at this point does the backend mark the notification
 * acknowledged so that it won't be re-delivered on the next poll.
 * HTTP failures are surfaced so the cashier retains the alert and can retry.
 * The backend also re-delivers unacknowledged notifications after reconnect.
 */
export async function acknowledgePaymentNotification(
  notificationId: string,
  posSessionToken: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/pos/payment-notifications/${encodeURIComponent(notificationId)}/acknowledge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${posSessionToken}`,
    },
  });
  if (!response.ok) throw new Error('Sale completed, but payment acknowledgement failed. Retry to finish.');
}

/**
 * Ends the active POS session on the backend so the session token is
 * immediately invalidated. Always call this from a try/finally so local
 * state is cleared even if the network request fails.
 */
export async function posLogout(posSessionToken: string): Promise<void> {
  await fetch(`${API_BASE}/pos/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${posSessionToken}`,
    },
  });
  // Non-throwing: local cleanup in the caller's finally block handles the
  // UI state regardless of whether the network request succeeds.
}

/**
 * Completes a POS sale after M-PESA payment is confirmed.
 * Deducts stock atomically and marks saleStatus=COMPLETED.
 * Returns { success, sale } from the backend.
 */
export async function completePOSSale(saleId: string, posSessionToken: string): Promise<{ success: boolean; sale: any }> {
  const res = await fetch(`${API_BASE}/pos/sales/${encodeURIComponent(saleId)}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${posSessionToken}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: 'Failed to complete sale' } }));
    throw new Error(err.error?.message || 'Failed to complete sale');
  }
  return res.json();
}
