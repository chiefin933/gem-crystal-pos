export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || '/api';

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const payload: any = await response.json().catch(() => ({}));
  return typeof payload.error === 'string' ? payload.error : payload.error?.message || fallback;
}

function normalizeMoney(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+(?:\.\d{1,2})?$/.test(value)) {
    const normalized = Number(value);
    if (Number.isFinite(normalized) && normalized >= 0) return normalized;
  }
  throw new Error('Catalogue contains an invalid price.');
}

function normalizeProductPrices(value: any): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const product = { ...value };
  if ('price' in product) product.price = normalizeMoney(product.price);
  if ('salePrice' in product) product.salePrice = normalizeMoney(product.salePrice);
  if (Array.isArray(product.variants)) {
    product.variants = product.variants.map((entry: any) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;
      const variant = { ...entry };
      if ('price' in variant) variant.price = normalizeMoney(variant.price);
      if ('salePrice' in variant) variant.salePrice = normalizeMoney(variant.salePrice);
      return variant;
    });
  }
  return product;
}

export async function fetchProducts(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/products`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(await errorMessage(response, 'Unable to load the catalogue.'));
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('Catalogue response is invalid.');
  return payload.map(normalizeProductPrices);
}

export async function acknowledgePaymentNotification(
  notificationId: string,
  posSessionToken: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/pos/payment-notifications/${encodeURIComponent(notificationId)}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${posSessionToken}` },
    body: '{}',
  });
  if (!response.ok) throw new Error(await errorMessage(response, 'Sale completed, but payment acknowledgement failed. Retry to finish.'));
}

export async function posLogout(posSessionToken: string): Promise<void> {
  const response = await fetch(`${API_BASE}/pos/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${posSessionToken}` },
    body: '{}',
  });
  if (!response.ok) throw new Error(await errorMessage(response, 'Unable to close the POS session on the server.'));
}

export async function completePOSSale(
  saleId: string,
  posSessionToken: string,
): Promise<{ success: boolean; sale: any }> {
  const response = await fetch(`${API_BASE}/pos/sales/${encodeURIComponent(saleId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${posSessionToken}` },
    body: '{}',
  });
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to complete sale.'));
  return response.json();
}
