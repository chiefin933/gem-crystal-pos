export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') || '/api';

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const payload: any = await response.json().catch(() => ({}));
  return typeof payload.error === 'string' ? payload.error : payload.error?.message || fallback;
}

export async function fetchProducts(): Promise<any[]> {
  const response = await fetch(`${API_BASE}/products`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(await errorMessage(response, 'Unable to load the catalogue.'));
  return response.json();
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
