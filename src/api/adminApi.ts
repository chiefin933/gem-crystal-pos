const API_BASE = '/api';

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
