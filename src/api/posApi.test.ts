import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  API_BASE,
  acknowledgePaymentNotification,
  completePOSSale,
  fetchProducts,
  posLogout,
} from './posApi';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('POS API client', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('loads the catalogue without sending an owner credential', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([{ id: 'product-1' }]));
    await expect(fetchProducts()).resolves.toEqual([{ id: 'product-1' }]);
    expect(fetch).toHaveBeenCalledWith(API_BASE + '/products', {
      headers: { Accept: 'application/json' },
    });
  });

  it('normalizes PostgreSQL decimal strings before caching or arithmetic', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse([{
      id: 'product-1', price: '20.00', salePrice: null, variants: [{
        id: 'variant-1', sku: 'SKU-1', size: 'M', color: 'Black',
        price: '20', salePrice: '19.50', stockQuantity: 2,
      }],
    }]));

    await expect(fetchProducts()).resolves.toEqual([{
      id: 'product-1', price: 20, salePrice: null, variants: [{
        id: 'variant-1', sku: 'SKU-1', size: 'M', color: 'Black',
        price: 20, salePrice: 19.5, stockQuantity: 2,
      }],
    }]);
  });

  it('encodes identifiers and sends only the short-lived POS session token', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, sale: { id: 'sale/1' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    await completePOSSale('sale/1', 'pos-session');
    await acknowledgePaymentNotification('notice/1', 'pos-session');
    await posLogout('pos-session');

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(API_BASE + '/pos/sales/sale%2F1/complete');
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe(API_BASE + '/pos/payment-notifications/notice%2F1/acknowledge');
    for (const [, request] of vi.mocked(fetch).mock.calls) {
      expect(request?.headers).toEqual(expect.objectContaining({
        Authorization: 'Bearer pos-session',
      }));
    }
  });

  it('surfaces the safe nested server error message', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'POS session expired.' },
    }, 401));

    await expect(posLogout('expired')).rejects.toThrow('POS session expired.');
  });
});
